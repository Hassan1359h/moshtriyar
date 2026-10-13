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

const APP_URL = 'https://moshtriyar.ir';
const ZIP_MIME = 'application/zip';

export default function App() {
  const webViewRef = useRef(null);

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

  const handleError = () => {
    setError(true);
    setLoading(false);
  };

  const handleRetry = () => {
    setError(false);
    setLoading(true);
    webViewRef.current?.reload();
  };

  // =========================================================
  // 🎯 ابزارها
  // =========================================================

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

  // =========================================================
  // 🎯 دانلود فایل‌ها از WebView (ZIP افزونه، PDF و ...)
  // =========================================================

  const downloadFileFromWebView = async (url, requestedFileName) => {
    if (!url || !/^https?:\/\//i.test(url)) {
      Alert.alert('خطا', 'لینک دانلود معتبر نیست.');
      return;
    }

    try {
      let fileName = requestedFileName || getFileName(url);

      if (!fileName.toLowerCase().endsWith('.zip')) {
        fileName = 'moshtriyar-ai-agent.zip';
      }

      // جلوگیری از کاراکترهای غیرمجاز در نام فایل
      fileName = fileName.replace(/[\\/:*?"<>|]/g, '_');

      const fileUri = `${FileSystem.cacheDirectory}${Date.now()}-${fileName}`;

      Alert.alert(
        'دانلود افزونه',
        'فایل افزونه در حال دانلود است. پس از اتمام، پنجره ذخیره‌سازی باز می‌شود.'
      );

      // دانلود فایل
      const result = await FileSystem.downloadAsync(url, fileUri, {
        headers: {
          Accept: 'application/zip, application/octet-stream, */*',
        },
      });

      if (result.status < 200 || result.status >= 300) {
        throw new Error(`پاسخ ناموفق سرور: ${result.status}`);
      }

      const info = await FileSystem.getInfoAsync(result.uri);

      if (!info.exists || !info.size || info.size < 100) {
        throw new Error('فایل دانلودشده معتبر نیست.');
      }

      // بررسی محتوای فایل: ZIP واقعی باید با "PK" شروع شود
      const content = await FileSystem.readAsStringAsync(result.uri, {
        encoding: FileSystem.EncodingType.Base64,
        length: 16,
        position: 0,
      });

      const looksLikeZip =
        content.startsWith('UEsDB') ||
        content.startsWith('UEsFB') ||
        content.startsWith('UEsBA') ||
        content.startsWith('UEsD');

      if (!looksLikeZip) {
        throw new Error(
          'سرور فایل ZIP برنگرداند. احتمالاً لینک منقضی شده یا دسترسی دانلود معتبر نیست.'
        );
      }

      // اشتراک‌گذاری / ذخیره
      const sharingAvailable = await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        Alert.alert(
          'دانلود کامل شد',
          `فایل در این مسیر ذخیره شد:\n${result.uri}`
        );
        return;
      }

      await Sharing.shareAsync(result.uri, {
        mimeType: ZIP_MIME,
        dialogTitle: 'ذخیره یا اشتراک‌گذاری افزونه وردپرس',
        UTI: 'public.zip-archive',
      });
    } catch (err) {
      console.error('Plugin download error:', err);
      Alert.alert(
        'خطا در دانلود',
        err?.message || 'دانلود افزونه انجام نشد. دوباره تلاش کنید.'
      );
    }
  };

  // =========================================================
  // 🎯 مدیریت دانلود Native (فقط اندروید)
  // =========================================================

  const handleFileDownload = ({ nativeEvent }) => {
    const url = nativeEvent?.downloadUrl;
    if (url) {
      downloadFileFromWebView(url);
    }
  };

  // =========================================================
  // دانلود APK اپ مشتری‌یار
  // =========================================================

  const downloadAPK = () => {
    Linking.openURL('https://moshtriyar.ir/download/moshtriyar.apk').catch(() => {
      Alert.alert('خطا', 'مرورگر برای دانلود فایل باز نشد.');
    });
  };

  // =========================================================
  // ذخیره فایل‌های PDF و ... از طریق پیام WebView
  // =========================================================

  const saveFileFromWebView = async (base64Data, filename, mimeType) => {
    try {
      if (!base64Data || !filename) {
        throw new Error('اطلاعات فایل ناقص است.');
      }

      const safeName = String(filename).replace(/[\\/:*?"<>|]/g, '_');
      const uri = `${FileSystem.documentDirectory}${safeName}`;

      await FileSystem.writeAsStringAsync(uri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const sharingAvailable = await Sharing.isAvailableAsync();

      if (sharingAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: mimeType || 'application/octet-stream',
          dialogTitle: 'ذخیره یا اشتراک‌گذاری فایل',
          UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined,
        });
      } else {
        Alert.alert('ذخیره شد', `فایل در این مسیر ذخیره شد:\n${uri}`);
      }
    } catch (err) {
      console.error('Save file error:', err);
      Alert.alert('خطا در ذخیره فایل', err?.message || 'خطای نامشخص');
    }
  };

  // =========================================================
  // پیام‌های WebView
  // =========================================================

  const handleMessage = async (event) => {
    try {
      const rawData = event?.nativeEvent?.data;
      const data = JSON.parse(rawData);

      if (data.type === 'saveFile') {
        await saveFileFromWebView(data.data, data.filename, data.mimeType);
        return;
      }

      if (data.type === 'downloadAPK') {
        downloadAPK();
        return;
      }

      if (data.type === 'downloadFile') {
        await downloadFileFromWebView(data.url, data.filename);
        return;
      }

      if (data.type === 'openUrl' && data.url) {
        await Linking.openURL(data.url);
      }
    } catch (err) {
      console.error('WebView message error:', err);
    }
  };

  // =========================================================
  // مدیریت لینک‌های WebView
  // =========================================================

  const handleShouldStartLoad = (request) => {
    const url = String(request?.url || '');

    if (!url) return false;

    // APK → مرورگر خارجی
    if (
      url.startsWith('https://moshtriyar.ir/download/moshtriyar.apk') ||
      url.toLowerCase().includes('.apk')
    ) {
      downloadAPK();
      return false;
    }

    // ZIP افزونه وردپرس → دانلود Native
    if (isPluginDownloadUrl(url)) {
      downloadFileFromWebView(url);
      return false;
    }

    // لینک‌های داخلی سایت
    if (
      url.startsWith('https://moshtriyar.ir') ||
      url.startsWith('https://moshtriyar.vercel.app') ||
      url.startsWith('about:blank') ||
      url.startsWith('blob:') ||
      url.startsWith('data:')
    ) {
      return true;
    }

    // لینک‌های اپ‌های خارجی
    if (
      url.startsWith('whatsapp://') ||
      url.startsWith('https://wa.me/') ||
      url.startsWith('tg://') ||
      url.startsWith('https://t.me/') ||
      url.startsWith('eitaa://') ||
      url.startsWith('https://eitaa.com/') ||
      url.startsWith('sms:') ||
      url.startsWith('tel:') ||
      url.startsWith('mailto:')
    ) {
      Linking.openURL(url).catch(() => {
        Alert.alert('خطا', 'امکان باز کردن این لینک وجود ندارد.');
      });
      return false;
    }

    // سایر لینک‌های خارجی
    Linking.openURL(url).catch(() => {
      Alert.alert('خطا', 'امکان باز کردن لینک خارجی وجود ندارد.');
    });
    return false;
  };

  // =========================================================
  // صفحه خطا
  // =========================================================

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
        <View style={styles.errorBox}>
          <Text style={styles.errorIcon}>📡</Text>
          <Text style={styles.errorTitle}>اتصال برقرار نشد</Text>
          <Text style={styles.errorText}>
            لطفاً اتصال اینترنت خود را بررسی کنید و دوباره تلاش کنید.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
            <Text style={styles.retryText}>🔄 تلاش مجدد</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================
  // WebView
  // =========================================================

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />

      <WebView
        ref={webViewRef}
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
        onFileDownload={
          Platform.OS === 'android' ? handleFileDownload : undefined
        }
        onMessage={handleMessage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={handleError}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        onPermissionRequest={(event) => event.grant(event.resources)}
        userAgent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
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

// =========================================================
// Styles
// =========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2563eb',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    color: '#64748b',
    fontSize: 14,
  },
  errorBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#ffffff',
  },
  errorIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  retryBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
