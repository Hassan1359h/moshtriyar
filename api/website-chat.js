
    // 🔁 تلاش با مدل‌های مختلف + Retry خودکار
    let data = null;
    let response = null;
    let usedModel = null;
    let lastError = null;

    for (const model of GEMINI_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const url = `${GEMINI_BASE_URL}/${model}:generateContent`;
          console.log(`🔄 [${model}] attempt ${attempt}`);

          const r = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": GEMINI_API_KEY,
            },
            body: JSON.stringify(requestBody),
          });

          const d = await r.json();

          if (r.ok && d?.candidates?.[0]?.content?.parts) {
            response = r;
            data = d;
            usedModel = model;
            console.log(`✅ Success: ${model} (attempt ${attempt})`);
            break;
          }

          if ((r.status === 503 || r.status === 429) && attempt === 1) {
            console.warn(`⏳ ${model} busy (${r.status}), retrying in 1s...`);
            await new Promise((res) => setTimeout(res, 1000));
            lastError = d?.error?.message || `Status ${r.status}`;
            continue;
          }

          console.warn(`⚠️ ${model} failed (${r.status}): ${d?.error?.message}`);
          lastError = d?.error?.message || `Status ${r.status}`;
          break;
        } catch (err) {
          console.warn(`❌ ${model} exception:`, err.message);
          lastError = err.message;
          break;
        }
      }
      if (data) break;
    }

    if (!data || !response) {
      return res.status(200).json({
        ok: false,
        reply:
          "⚠️ سرویس هوش مصنوعی الان شلوغه. لطفاً چند لحظه دیگه دوباره تلاش کنید. 🙏",
        error: lastError || "All models failed",
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("")
        .trim() || "";

    const finishReason = data?.candidates?.[0]?.finishReason;
    if (!reply && finishReason === "SAFETY") {
      return res.status(200).json({
        ok: false,
        reply:
          "متأسفم، نمی‌توانم به این درخواست پاسخ دهم. لطفاً سوال خود را به شکل دیگری مطرح کنید. 🙏",
      });
    }

    if (!reply) {
      return res.status(200).json({
        ok: false,
        reply:
          "⚠️ پاسخی دریافت نشد. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.",
      });
    }

    return res.status(200).json({
      ok: true,
      reply,
      model: usedModel,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Server Exception:", error);
    return res.status(500).json({
      ok: false,
      reply:
        "⚠️ خطای غیرمنتظره در سرور. لطفاً بعداً تلاش کنید یا با پشتیبانی انسانی تماس بگیرید.",
      error: error?.message || String(error),
    });
  }
}
