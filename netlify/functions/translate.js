exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const { text, targetLang } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{
        parts: [{ text: `You are an expert academic translator specializing in Biotechnology. Translate the following text into ${targetLang}. Return ONLY the translated text without any quotes or markdown. Text: ${text}` }]
      }]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: "Gemini API Error", details: data }) };
    }

    const translatedText = data.candidates[0].content.parts[0].text;

    return { statusCode: 200, body: JSON.stringify({ translatedText }) };

  } catch (error) {
    console.error("Translation Function Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error", details: error.message }) };
  }
};
