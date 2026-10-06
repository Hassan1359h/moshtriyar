import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, SafeAreaView, StatusBar, View, Text, TouchableOpacity, BackHandler, Alert, ActivityIndicator, Linking } from 'react-native';
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
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [canGoBack]);

  const handleError = () => {
    setError(true);
    setLoading(false);
  };

  const handleRetry = () => {
    setError(false);
    setLoading(true);
    if (webViewRef.current) webViewRef.current.reload();
  };

  // 🎯 مدیریت لینک‌ها
  const handleShouldStartLoad = async (request) => {
    const url = request.url;

    // 🎯 ذخیره PDF از URL scheme
    if (url.startsWith('moshtriyar-save://pdf')) {
      try {
        const query = url.split('?')[1] || '';
        const params = {};
        query.split('&').forEach(p => {
          const [k, v] = p.split('=');
          params[k] = decodeURIComponent(v || '');
        });

        const filename = params.filename || 'factor.pdf';
        const base64 = params.data || '';

        if (!base64) {
          Alert.alert('خطا', 'داده PDF خالی است');
          return false;
        }

        const uri = FileSystem.documentDirectory + filename;
        await FileSystem.writeAsStringAsync(uri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'ذخیره یا اشتراک‌گذاری فاکتور',
            UTI: 'com.adobe.pdf',
          });
        } else {
          Alert.alert('موفق', 'فایل ذخیره شد در:\n' + uri);
        }
      } catch (err) {
        Alert.alert('خطا در ذخیره PDF', err.message || 'نامشخص');
      }
      return false;
    }

    // 🎯 لینک‌های داخلی سایت
    if (url.startsWith('https://moshtriyar.ir') ||
        url.startsWith('https://moshtriyar.vercel.app') ||
        url.startsWith('about:blank')) {
      return true;
    }

    // 🎯 واتساپ
    if (url.startsWith('whatsapp://') || url.startsWith('https://wa.me/')) {
      Linking.openURL(url).catch(() => Alert.alert('خطا', 'واتساپ نصب نیست'));
      return false;
    }

    // 🎯 تلگرام
    if (url.startsWith('tg://') || url.startsWith('https://t.me/')) {
      Linking.openURL(url).catch(() => Alert.alert('خطا', 'تلگرام نصب نیست'));
      return false;
    }

    // 🎯 ایتا
    if (url.startsWith('eitaa://') || url.startsWith('https://eitaa.com/')) {
      Linking.openURL(url).catch(() => Alert.alert('خطا', 'ایتا نصب نیست'));
      return false;
    }

    // 🎯 پیامک، تلفن، ایمیل
    if (url.startsWith('sms:') || url.startsWith('tel:') || url.startsWith('mailto:')) {
      Linking.openURL(url).catch(() => {});
      return false;
    }

    // 🎯 blob و data
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      return true;
    }

    // 🎯 بقیه لینک‌ها تو مرورگر خارجی
    Linking.openURL(url).catch(() => {});
    return false;
  };

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
        userAgent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
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
