exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const bodyData = JSON.parse(event.body);
    const text = bodyData.text;
    const targetLang = bodyData.targetLang;
    const apiKey = process.env.GEMINI_API_KEY;

    // حماية في حال نسيان المفتاح في الإعدادات
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "API Key is missing in Netlify Env" }) };
    }

    // استخدام الموديل المستقر gemini-pro ودمج السلسلة لتفادي أخطاء الـ Template Literals
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + apiKey;

    const payload = {
      contents: [{
        parts: [{
          text: "You are an expert academic translator specializing in Biotechnology. Translate the following text into " + targetLang + ". Return ONLY the translated text without any quotes or markdown. Text: " + text
        }]
      }]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      // إرجاع الخطأ الدقيق من جوجل
      return { statusCode: response.status, body: JSON.stringify({ error: "Gemini API Error", details: data }) };
    }

    // استخراج النص بأمان تام
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      const translatedText = data.candidates[0].content.parts[0].text;
      return { statusCode: 200, body: JSON.stringify({ translatedText: translatedText }) };
    } else {
      return { statusCode: 500, body: JSON.stringify({ error: "Unexpected Response Format", details: data }) };
    }

  } catch (error) {
    console.error("Translation Function Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error", details: error.message }) };
  }
};
