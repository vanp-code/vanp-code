// Vercel 서버리스 함수: 브라우저 대신 서버에서 Google Gemini API를 호출해
// API 키가 외부에 노출되지 않도록 합니다.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." });
  }

  // 사용할 모델 (변경 가능). 사용 가능한 모델명은 https://ai.google.dev/gemini-api/docs/models 참고
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  try {
    const { system, messages } = req.body || {};
    if (!system || !Array.isArray(messages)) {
      return res.status(400).json({ error: "잘못된 요청 형식입니다." });
    }

    // 우리 프론트엔드는 [{ role, content }] 형식으로 보냅니다.
    // Gemini 형식(contents: [{ role, parts:[{text}] }])으로 변환합니다.
    // Gemini는 "assistant" 대신 "model"을 사용합니다.
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: 1000, temperature: 0.4 },
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      const msg = data?.error?.message || "Gemini API 오류";
      return res.status(upstream.status).json({ error: msg });
    }

    // Gemini 응답에서 텍스트만 뽑아, 프론트엔드가 기대하는
    // { content: [{ type:"text", text }] } 형태로 맞춰서 돌려줍니다.
    const text =
      (data.candidates?.[0]?.content?.parts || [])
        .map((p) => p.text || "")
        .join("") || "";

    return res.status(200).json({ content: [{ type: "text", text }] });
  } catch (e) {
    return res.status(500).json({ error: "Gemini API 호출에 실패했습니다." });
  }
}
