exports.handler = async function(event, context) {
  // Allow CORS if needed
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      console.error("Failed to parse event body:", parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid JSON body" })
      };
    }

    const text = body.text;
    const targetLang = body.targetLang;

    if (!text || !targetLang) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing text or targetLang" })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY environment variable");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Missing API Key configuration" })
      };
    }

    const languageStr = targetLang === 'ar' ? 'Arabic' : 'English';
    const payload = {
      contents: [{
        parts: [{
          text: `You are an expert academic translator specializing in Biotechnology. Translate the following text into ${languageStr}. Return ONLY the translated text. Text: ${text}`
        }]
      }]
    };

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorText = "";
      try {
        errorText = await response.text();
      } catch(e) {}
      console.error("Gemini API Error Status:", response.status, "Details:", errorText);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Gemini API Error", details: errorText })
      };
    }

    const data = await response.json();
    const translatedText = data.candidates[0].content.parts[0].text;

    return { statusCode: 200, headers, body: JSON.stringify({ translatedText }) };

  } catch (error) {
    console.error("Translation Function Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  }
};
