exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const { text, targetLang } = JSON.parse(event.body);

    if (!text || !targetLang) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing text or targetLang" })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing API Key configuration" })
      };
    }

    // Determine the full language name for better AI context
    const languageStr = targetLang === 'ar' ? 'Arabic' : 'English';

    const prompt = `You are an expert academic translator specializing in Biotechnology and Genetic Engineering. Translate the following text into ${languageStr}. Ensure scientific terminology is highly accurate. Return ONLY the translated text with absolutely no quotes, markdown formatting, or conversational filler. Text: ${text}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Failed to communicate with Gemini API" })
      };
    }

    // Extract the text from the Gemini response structure
    const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    return {
      statusCode: 200,
      body: JSON.stringify({ translatedText })
    };

  } catch (error) {
    console.error("Translation Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  }
};
