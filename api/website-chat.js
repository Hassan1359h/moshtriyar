const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }

  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY تنظیم نشده است"
      });
    }

    const { message } = req.body || {};

    if (!message) {
      return res.status(400).json({
        error: "message ارسال نشده است"
      });
    }

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
                  text: `به فارسی و کوتاه پاسخ بده.

سؤال:
${String(message).trim()}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 300
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini ERROR:", data);

      return res.status(502).json({
        error: data?.error?.message || "Gemini API Error"
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!reply) {
      return res.status(502).json({
        error: "Gemini پاسخ خالی داد"
      });
    }

    return res.status(200).json({
      reply
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}
