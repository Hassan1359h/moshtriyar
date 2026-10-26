import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  StatusBar,
  View,
  Text,
  TouchableOpacity,
  BackHandler,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';

import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import CafeBazaarBilling from 'expo-cafebazaar-billing';

const APP_URL = 'https://moshtriyar.ir';
const ZIP_MIME = 'application/zip';

export default function App() {
  const webViewRef = useRef(null);
  const bazaarBillingBusyRef = useRef(false);
  const loadingTimerRef = useRef(null);
  const [webViewKey, setWebViewKey] = useState(0);

  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      }
    );

    return () => backHandler.remove();
  }, [canGoBack]);

  const clearLoadingTimer = () => {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  };

  useEffect(() => () => clearLoadingTimer(), []);

  const handleLoadStart = () => {
    clearLoadingTimer();
    setLoading(true);
    loadingTimerRef.current = setTimeout(() => {
      loadingTimerRef.current = null;
      setLoading(false);
      setError(true);
    }, 20000);
  };

  const handleLoadEnd = () => {
    clearLoadingTimer();
    setLoading(false);
  };

  const handleError = () => {
    clearLoadingTimer();
    setError(true);
    setLoading(false);
  };

  const handleRetry = () => {
    clearLoadingTimer();
    setError(false);
    setLoading(true);
    setWebViewKey(value => value + 1);
  };

  const getFileName = (url, fallback = 'moshtriyar-ai-agent.zip') => {
    try {
      const cleanUrl = String(url || '').split('?')[0];
      const part = cleanUrl.split('/').pop();
      if (part && part.includes('.')) {
        return decodeURIComponent(part);
      }
    } catch (_) {}
    return fallback;
  };

  const isPluginDownloadUrl = (url) => {
    const value = String(url || '').toLowerCase();
    return (
      value.includes('/api/wordpress-plugin') ||
      value.includes('/api/download-plugin') ||
      value.includes('wordpress-plugin') ||
      value.includes('download-plugin') ||
      value.endsWith('.zip') ||
      (value.includes('token=') && value.includes('siteurl='))
    );
  };

  const isApkUrl = (url) => {
    try {
      return /\.apk$/i.test(new URL(url).pathname);
    } catch (_) {
      return /\.apk(?:[?#]|$)/i.test(String(url || ''));
    }
  };

  const downloadFileFromWebView = async (url, requestedFileName) => {
    if (!url || !/^https?:\/\//i.test(url)) {
      Alert.alert('خطا', 'لینک دانلود معتبر نیست.');
      return;
    }

    if (isApkUrl(url)) {
      Alert.alert('به‌روزرسانی برنامه', 'نسخه بازار مشتری‌یار را از طریق کافه‌بازار به‌روزرسانی کنید.');
      return;
    }

    try {
      let fileName = requestedFileName || getFileName(url);
      if (!fileName.toLowerCase().endsWith('.zip')) fileName = 'moshtriyar-ai-agent.zip';
      fileName = fileName.replace(/[\\/:*?"<>|]/g, '_');

      const fileUri = `${FileSystem.cacheDirectory}${Date.now()}-${fileName}`;
      Alert.alert('دانلود افزونه', 'فایل افزونه در حال دانلود است. پس از اتمام، پنجره ذخیره‌سازی باز می‌شود.');

      const result = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Accept: 'application/zip, application/octet-stream, */*' },
      });

      if (result.status < 200 || result.status >= 300) throw new Error(`پاسخ ناموفق سرور: ${result.status}`);
      const info = await FileSystem.getInfoAsync(result.uri);
      if (!info.exists || !info.size || info.size < 100) throw new Error('فایل دانلودشده معتبر نیست.');

      const content = await FileSystem.readAsStringAsync(result.uri, {
        encoding: FileSystem.EncodingType.Base64,
        length: 16,
        position: 0,
      });

      const looksLikeZip = content.startsWith('UEsDB') || content.startsWith('UEsFB') || content.startsWith('UEsBA') || content.startsWith('UEsD');
      if (!looksLikeZip) throw new Error('سرور فایل ZIP برنگرداند.');

      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        Alert.alert('دانلود کامل شد', `فایل در این مسیر ذخیره شد:\n${result.uri}`);
        return;
      }

      await Sharing.shareAsync(result.uri, {
        mimeType: ZIP_MIME,
        dialogTitle: 'ذخیره یا اشتراک‌گذاری افزونه وردپرس',
        UTI: 'public.zip-archive',
      });
    } catch (err) {
      console.error('Plugin download error:', err);
      Alert.alert('خطا در دانلود', err?.message || 'دانلود افزونه انجام نشد.');
    }
  };

  const handleFileDownload = ({ nativeEvent }) => {
    const url = nativeEvent?.downloadUrl;
    if (!url) return;
    if (isApkUrl(url)) {
      Alert.alert('به‌روزرسانی برنامه', 'برای دریافت نسخه جدید مشتری‌یار از کافه‌بازار استفاده کنید.');
      return;
    }
    downloadFileFromWebView(url);
  };
  
const saveFileFromWebView = async (fileData, filename, mimeType) => {
  try {
    if (typeof fileData !== 'string' || !fileData.trim() || !filename) {
      throw new Error('اطلاعات فایل ناقص است.');
    }

    const safeName = String(filename)
      .replace(/[\\/:*?"<>|]/g, '_')
      .slice(0, 120);

    // Accept both a full Data URL and raw Base64.
    let base64Data = fileData.trim();

    if (/^data:/i.test(base64Data)) {
      const commaIndex = base64Data.indexOf(',');

      if (commaIndex === -1) {
        throw new Error('ساختار اطلاعات فایل نامعتبر است.');
      }

      const header = base64Data.slice(0, commaIndex);

      if (!/;base64$/i.test(header)) {
        throw new Error('فرمت فایل ارسالی Base64 نیست.');
      }

      base64Data = base64Data.slice(commaIndex + 1);
    }

    // Remove whitespace introduced during message transfer.
    base64Data = base64Data.replace(/\s/g, '');

    // Basic Base64 validation.
    if (
      !base64Data ||
      base64Data.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)
    ) {
      throw new Error('اطلاعات Base64 فایل معتبر نیست.');
    }

    const uri = `${FileSystem.documentDirectory}${Date.now()}-${safeName}`;

    await FileSystem.writeAsStringAsync(uri, base64Data, {
      encoding: FileSystem.EncodingType.Base64
    });

    const info = await FileSystem.getInfoAsync(uri);

    if (!info.exists || !info.size) {
      throw new Error('فایل ذخیره‌شده خالی است.');
    }

    const sharingAvailable = await Sharing.isAvailableAsync();

    if (sharingAvailable) {
      const extension = safeName.split('.').pop().toLowerCase();

      const detectedMimeType =
        extension === 'png' ? 'image/png' :
        extension === 'svg' ? 'image/svg+xml' :
        extension === 'pdf' ? 'application/pdf' :
        extension === 'zip' ? 'application/zip' :
        'application/octet-stream';

      const finalMimeType = mimeType || detectedMimeType;

      await Sharing.shareAsync(uri, {
        mimeType: finalMimeType,
        dialogTitle: 'ذخیره یا اشتراک‌گذاری فایل',
        UTI: finalMimeType === 'application/pdf'
          ? 'com.adobe.pdf'
          : undefined
      });
    } else {
      Alert.alert(
        'ذخیره شد',
        `فایل در این مسیر ذخیره شد:\n${uri}`
      );
    }

  } catch (err) {
    console.error('Save file error:', err);

    Alert.alert(
      'خطا در ذخیره فایل',
      err?.message || 'خطای نامشخص'
    );
  }
};


  
  const handleMessage = async (event) => {
  try {
    const rawData = event?.nativeEvent?.data;
    const data = JSON.parse(rawData);
    

    if (data.type === 
        'recoverBazaarSubscriptions') {
      if (bazaarBillingBusyRef.current) 
        return;
       bazaarBillingBusyRef.current = true;
      const allowedProducts = [
        'moshtriyar_vip_yearly',
        'moshtriyar_business_30',
        'moshtriyar_pro_30'
      ];

      try {
        await CafeBazaarBilling.connect({
          rsaPublicKey: "MIHNMA0GCSqGSIb3DQEBAQUAA4G7ADCBtwKBrwCgzISx4+sHzIMA0DxRq7cUAMFTeekhYJEeQGEiQ49npxyyHwyWVNIoxP1kntq01qtF+wPr/OuIni5bAbIWPcFmB2xCW98MhNFtoLi1qdkxHu9ARELpFDxn41Wn9begMC6Z6NK6/6Ci1saSBrcf5wYnEvM7/Z3rzx6e1u5QTVYnBY1x+hC+DkHdMGxpqqyOgIek0q6T90ozofI5BIKx5mMpbjE/MLlscZJj+XKRgrECAwEAAQ==",
        });

        const purchases = await CafeBazaarBilling.getSubscribedProducts();

        const subscriptions = (Array.isArray(purchases) ? purchases : [])
          .filter(item =>
            allowedProducts.includes(item.productId) &&
            typeof item.purchaseToken === 'string' &&
            item.purchaseToken.length > 0
          )
          .map(item => ({
            productId: item.productId,
            purchaseToken: item.purchaseToken,
            orderId: item.orderId || null
          }));

        webViewRef.current?.injectJavaScript(
          "window.dispatchEvent(new CustomEvent('moshtriyarBazaarRecoveryResult',{detail:" +
          JSON.stringify({ success: true, subscriptions }) +
          "}));true;"
        );

      } catch (err) {
        console.error('Bazaar recovery error:', err);

        webViewRef.current?.injectJavaScript(
          "window.dispatchEvent(new CustomEvent('moshtriyarBazaarRecoveryResult',{detail:" +
          JSON.stringify({
            success: false,
            error: 'بازیابی خریدها از بازار انجام نشد.'
          }) +
          "}));true;"
        );

      } finally {
        try {
          await CafeBazaarBilling.disconnect();
        } catch (_) {}
      }

      return;
    }

    if (data.type === 'buyBazaarSubscription') {
      // لیست محصولات مجاز (تغییر یافته به trial_subscription)
      const allowed = [
        'moshtriyar_vip_yearly',
        'moshtriyar_business_30',
        'moshtriyar_pro_30',
        'trial_subscription' 
      ];

      if (!allowed.includes(data.productId)) {
        throw new Error('شناسه محصول اشتراک معتبر نیست.');
      }

      const purchaseOptions = {};

      if (data.dynamicPriceToken && data.discountIntentId) {
        purchaseOptions.dynamicPriceToken = data.dynamicPriceToken;
        purchaseOptions.developerPayload = data.discountIntentId;
      }

      try {
        // ۱. اتصال به بازار
        await CafeBazaarBilling.connect({
          rsaPublicKey: "MIHNMA0GCSqGSIb3DQEBAQUAA4G7ADCBtwKBrwCgzISx4+sHzIMA0DxRq7cUAMFTeekhYJEeQGEiQ49npxyyHwyWVNIoxP1kntq01qtF+wPr/OuIni5bAbIWPcFmB2xCW98MhNFtoLi1qdkxHu9ARELpFDxn41Wn9begMC6Z6NK6/6Ci1saSBrcf5wYnEvM7/Z3rzx6e1u5QTVYnBY1x+hC+DkHdMGxpqqyOgIek0q6T90ozofI5BIKx5mMpbjE/MLlscZJj+XKRgrECAwEAAQ==", 
        });

        // ۲. بررسی وضعیت تست رایگان (فقط برای trial_subscription)
        if (String(data.productId) === 'trial_subscription') {
          try {
            const trialInfo = await CafeBazaarBilling.checkTrialSubscription();
            if (!trialInfo.isAvailable) {
              Alert.alert("توجه", "شما قبلاً از تست رایگان استفاده کرده‌اید.");
  
              return; 
            }
          } catch (err) {
            console.log("Trial check error:", err);
          }
        }

        // ۳. انجام خرید
        const purchase = await CafeBazaarBilling.subscribeProduct(
          String(data.productId), 
          purchaseOptions
        );

        const result = {
          success: true,
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
          orderId: purchase.orderId,
        };

        if (data.discountIntentId) {
          result.discountIntentId = data.discountIntentId;
        }

        webViewRef.current?.injectJavaScript(
          "window.dispatchEvent(new CustomEvent('moshtriyarBazaarPurchaseResult',{detail:" +
            JSON.stringify(result) +
            "}));true;"
        );
      } catch (e) {
        // نمایش متن دقیق خطا
        Alert.alert(
          "خطای دقیق بازار",
          String(e?.message || e || 'خطای نامشخص')
        );

        webViewRef.current?.injectJavaScript(
          "window.dispatchEvent(new CustomEvent('moshtriyarBazaarPurchaseResult',{detail:" +
            JSON.stringify({
              success: false,
              error: e?.message || 'خرید ناموفق بود',
            }) +
            "}));true;"
        );
      
          } finally {
        try {
          await CafeBazaarBilling.disconnect();
        } catch (_) {}

        bazaarBillingBusyRef.current = 
          false;
      }  

      return;
    }
    // بقیه کدها (saveFile, downloadAPK, downloadFile, openUrl)
    if (data.type === 'saveFile') {
      await saveFileFromWebView(data.data, data.filename, data.mimeType);
      return;
    }

    if (data.type === 'downloadAPK') {
      Alert.alert('به‌روزرسانی مشتری‌یار', 'برای دریافت نسخه جدید برنامه، از کافه‌بازار استفاده کنید.');
      return;
    }

    if (data.type === 'downloadFile') {
      if (isApkUrl(data.url)) {
        Alert.alert('به‌روزرسانی مشتری‌یار', 'نسخه جدید برنامه را از کافه‌بازار دریافت کنید.');
        return;
      }
      await downloadFileFromWebView(data.url, data.filename);
      return;
    }

    if (data.type === 'openUrl' && data.url) {
      if (isApkUrl(data.url)) {
        Alert.alert('به‌روزرسانی مشتری‌یار', 'نسخه جدید برنامه را از کافه‌بازار دریافت کنید.');
        return;
      }
      await Linking.openURL(data.url);
    }
  } catch (err) {
    console.error('WebView message error:', err);
  }
};
  
  const handleShouldStartLoad = (request) => {
    const url = String(request?.url || '');
    if (!url) return false;

    if (isApkUrl(url)) {
      Alert.alert('به‌روزرسانی مشتری‌یار', 'نسخه جدید برنامه را از طریق کافه‌بازار دریافت کنید.');
      return false;
    }

    if (isPluginDownloadUrl(url)) {
      downloadFileFromWebView(url);
      return false;
    }

    if (
      url.startsWith('https://moshtriyar.ir') ||
      url.startsWith('https://moshtriyar.vercel.app') ||
      url.startsWith('about:blank') ||
      url.startsWith('blob:') ||
      url.startsWith('data:')
    ) {
      return true;
    }

    if (
      url.startsWith('whatsapp://') || url.startsWith('https://wa.me/') ||
      url.startsWith('tg://') || url.startsWith('https://t.me/') ||
      url.startsWith('eitaa://') || url.startsWith('https://eitaa.com/') ||
      url.startsWith('sms:') || url.startsWith('tel:') || url.startsWith('mailto:')
    ) {
      Linking.openURL(url).catch(() => {
        Alert.alert('خطا', 'امکان باز کردن این لینک وجود ندارد.');
      });
      return false;
    }

    Linking.openURL(url).catch(() => {
      Alert.alert('خطا', 'امکان باز کردن لینک خارجی وجود ندارد.');
    });
    return false;
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
        <View style={styles.errorBox}>
          <Text style={styles.errorIcon}>📡</Text>
          <Text style={styles.errorTitle}>اتصال برقرار نشد</Text>
          <Text style={styles.errorText}>لطفاً اتصال اینترنت خود را بررسی کنید و دوباره تلاش کنید.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
            <Text style={styles.retryText}>🔄 تلاش مجدد</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      <WebView
        ref={webViewRef}
        key={webViewKey}
        source={{ uri: APP_URL }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        allowsProtectedMedia
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowFileAccess
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
        cacheEnabled
        cacheMode="LOAD_DEFAULT"
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onFileDownload={Platform.OS === 'android' ? handleFileDownload : undefined}
        onMessage={handleMessage}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onHttpError={({ nativeEvent }) => {
          if (nativeEvent?.isTopFrame && nativeEvent?.statusCode >= 400) handleError();
        }}
        onError={handleError}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        onPermissionRequest={(event) => event.grant(event.resources)}
        userAgent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 MoshtriyarApp"
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>در حال بارگذاری...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2563eb' },
  webview: { flex: 1 },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center',
  },
  loadingText: { marginTop: 15, color: '#64748b', fontSize: 14 },
  errorBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#ffffff' },
  errorIcon: { fontSize: 80, marginBottom: 20 },
  errorTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
  errorText: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 30, lineHeight: 24 },
  retryBtn: { backgroundColor: '#2563eb', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 12 },
  retryText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});
