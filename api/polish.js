// Vercel 서버리스 함수: 브라우저 대신 서버에서 Anthropic API를 호출해
// API 키가 외부에 노출되지 않도록 합니다.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다." });
  }

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

  try {
    const { system, messages } = req.body || {};
    if (!system || !Array.isArray(messages)) {
      return res.status(400).json({ error: "잘못된 요청 형식입니다." });
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: 1000, system, messages }),
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: "Anthropic API 호출에 실패했습니다." });
  }
}
