export default async function handler(req, res) {
  const APK_URL = 'https://github.com/Hassan1359h/moshtriyar/releases/download/v1.0.9/app-release.apk';
  
  try {
    const response = await fetch(APK_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return res.status(404).send('فایل پیدا نشد');
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="moshtriyar.apk"');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const arrayBuffer = await response.arrayBuffer();
    res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).send('خطا در دانلود فایل');
  }
}
