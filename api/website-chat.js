const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export default async function handler(req, res) {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(200).json({
        reply: "TEST_ERROR: GEMINI_API_KEY تنظیم نشده است"
      });
    }

    const message = req.body?.message || "سلام";

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: String(message)
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(200).json({
        reply:
          "TEST_GEMINI_ERROR: " +
          (data?.error?.message || JSON.stringify(data))
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map(p => p.text || "")
        .join("")
        .trim();

    return res.status(200).json({
      reply:
        reply ||
        "TEST_ERROR: Gemini پاسخ خالی برگرداند"
    });

  } catch (error) {
    return res.status(200).json({
      reply:
        "TEST_EXCEPTION: " +
        (error?.message || String(error))
    });
  }
}
