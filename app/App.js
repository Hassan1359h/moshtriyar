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
} from 'react-native';

import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const APP_URL = 'https://moshtriyar.ir';

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
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  // =========================================================
  // دانلود APK با مرورگر خارجی
  // =========================================================

  const downloadAPK = () => {
    Linking.openURL('https://moshtriyar.ir/api/download').catch(() => {
      Alert.alert('خطا', 'مرورگر باز نشد');
    });
  };

  // =========================================================
  // ذخیره فایل‌های PDF و خروجی مشتریان
  // =========================================================

  const saveFileFromWebView = async (base64Data, filename, mimeType) => {
    try {
      const uri = FileSystem.documentDirectory + filename;

      await FileSystem.writeAsStringAsync(uri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: mimeType || 'application/pdf',
          dialogTitle: 'ذخیره یا اشتراک‌گذاری',
          UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined,
        });
      } else {
        Alert.alert('موفق', 'فایل ذخیره شد در:\n' + uri);
      }
    } catch (err) {
      Alert.alert('خطا در ذخیره', err.message || 'نامشخص');
    }
  };

  // =========================================================
  // پیام‌های WebView
  // =========================================================

  const handleMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'saveFile') {
        await saveFileFromWebView(data.data, data.filename, data.mimeType);
      } else if (data.type === 'downloadAPK') {
        downloadAPK();
      } else if (data.type === 'openUrl') {
        const url = data.url;
        if (url) {
          Linking.openURL(url).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Message error:', err);
    }
  };

  // =========================================================
  // مدیریت لینک‌های WebView
  // =========================================================

  const handleShouldStartLoad = (request) => {
    const url = request.url || '';

    // APK → مرورگر خارجی
    if (url.includes('/api/download') || url.endsWith('.apk')) {
      downloadAPK();
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

    // واتساپ
    if (url.startsWith('whatsapp://') || url.startsWith('https://wa.me/')) {
      Linking.openURL(url).catch(() => Alert.alert('خطا', 'واتساپ نصب نیست'));
      return false;
    }

    // تلگرام
    if (url.startsWith('tg://') || url.startsWith('https://t.me/')) {
      Linking.openURL(url).catch(() => Alert.alert('خطا', 'تلگرام نصب نیست'));
      return false;
    }

    // ایتا
    if (url.startsWith('eitaa://') || url.startsWith('https://eitaa.com/')) {
      Linking.openURL(url).catch(() => Alert.alert('خطا', 'ایتا نصب نیست'));
      return false;
    }

    // تماس / پیامک / ایمیل
    if (
      url.startsWith('sms:') ||
      url.startsWith('tel:') ||
      url.startsWith('mailto:')
    ) {
      Linking.openURL(url).catch(() => {});
      return false;
    }

    // سایر لینک‌های خارجی
    Linking.openURL(url).catch(() => {});
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
            لطفاً اتصال اینترنت خود را بررسی کنید
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
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        allowsProtectedMedia={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        allowFileAccess={true}
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
        cacheEnabled={true}
        cacheMode="LOAD_DEFAULT"
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onMessage={handleMessage}
        userAgent={'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={handleError}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        onPermissionRequest={(event) => event.grant(event.resources)}
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
// Style
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
