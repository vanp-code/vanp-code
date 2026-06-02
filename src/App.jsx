import { useState, useEffect } from "react";

const GLOSSARY_KEY = "ux-glossary";

const SYSTEM_PROMPT = `You are a senior UX writer. The user gives you ANY raw text — a rough draft, a developer string, a placeholder, a messy note — and you rewrite it as clean, correct UX copy following general UX writing best practices:

- Clear over clever. Plain, everyday language. No jargon unless the user clearly needs it.
- Concise. Cut filler words. Front-load the most important information.
- Useful & action-oriented. Buttons/CTAs use verbs ("Save changes", "변경사항 저장"). Errors say what happened AND what to do next, without blaming the user.
- Consistent, calm, human tone. Polite but not robotic. Avoid exclamation marks unless genuinely celebratory.
- Specific over vague. Prefer concrete nouns/labels over "Click here" / "여기".
- Respect the user's intent and any context they give about where the text appears.

TEAM GLOSSARY: If a glossary is provided, you MUST follow it strictly. Always use the "preferred" term, and replace any "avoid" variant you find in the input with the preferred term. If you change a term because of the glossary, say so explicitly in the notes.

LANGUAGE RULE: Detect the language of the user's input and respond in THE SAME language. Korean input → Korean output. English input → English output. If mixed, follow the dominant language.

Return ONLY a valid JSON object, no markdown, no code fences, with this exact shape:
{
  "language": "ko" or "en",
  "refined": "the single best rewritten version",
  "alternatives": ["one or two alternative phrasings, slightly different tone or length"],
  "notes": ["2-4 short bullets explaining what you changed and why, written in the same language as the input"]
}`;

function stripFences(t) {
  return t.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function App() {
  const [input, setInput] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState("");

  const [glossary, setGlossary] = useState([]);
  const [glossaryReady, setGlossaryReady] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [npPreferred, setNpPreferred] = useState("");
  const [npAvoid, setNpAvoid] = useState("");
  const [npNote, setNpNote] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GLOSSARY_KEY);
      if (raw) setGlossary(JSON.parse(raw));
    } catch (e) {
      /* ignore */
    } finally {
      setGlossaryReady(true);
    }
  }, []);

  const persist = (next) => {
    setGlossary(next);
    try {
      localStorage.setItem(GLOSSARY_KEY, JSON.stringify(next));
    } catch (e) {
      setError("용어집 저장에 실패했어요.");
    }
  };

  const addTerm = () => {
    if (!npPreferred.trim()) return;
    persist([
      ...glossary,
      { id: newId(), preferred: npPreferred.trim(), avoid: npAvoid.trim(), note: npNote.trim() },
    ]);
    setNpPreferred("");
    setNpAvoid("");
    setNpNote("");
  };

  const removeTerm = (id) => persist(glossary.filter((g) => g.id !== id));

  const buildGlossaryText = () => {
    if (glossary.length === 0) return "";
    const lines = glossary.map((g) => {
      let s = `- 사용할 표현: "${g.preferred}"`;
      if (g.avoid) s += ` / 피할 표현: "${g.avoid}"`;
      if (g.note) s += ` (${g.note})`;
      return s;
    });
    return `TEAM GLOSSARY (always enforce these):\n${lines.join("\n")}`;
  };

  const polish = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult(null);

    const parts = [];
    const gloss = buildGlossaryText();
    if (gloss) parts.push(gloss);
    if (context.trim()) parts.push(`Where this text appears / context: ${context.trim()}`);
    parts.push(`Text to rewrite:\n${input.trim()}`);

    try {
      const response = await fetch("/api/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: parts.join("\n\n") }],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "request failed");
      const text = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      setResult(JSON.parse(stripFences(text)));
    } catch (e) {
      setError("정리하는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const copy = (label, value) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(""), 1400);
  };

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <header style={styles.header}>
          <h1 style={styles.title}>UX 라이팅 정리기</h1>
          <div style={styles.headRule} />
        </header>

        <section style={styles.card}>
          <label style={styles.label}>다듬을 텍스트</label>
          <textarea
            style={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"예) 에러났어요 다시해보세요\n예) Click here to continue\n예) 정보를 입력 안하면 못넘어가요"}
            rows={5}
          />

          <label style={{ ...styles.label, marginTop: 18 }}>
            맥락 <span style={styles.optional}>(선택 — 어디에 쓰는 문구인지)</span>
          </label>
          <input
            style={styles.input}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="예) 결제 실패 에러 메시지 / 회원가입 버튼 / 온보딩 안내"
          />

          <button
            style={{
              ...styles.button,
              opacity: !input.trim() || loading ? 0.5 : 1,
              cursor: !input.trim() || loading ? "default" : "pointer",
            }}
            onClick={polish}
            disabled={!input.trim() || loading}
          >
            {loading ? "다듬는 중…" : "다듬기 →"}
          </button>

          {error && <div style={styles.error}>{error}</div>}
        </section>

        <section style={styles.glossWrap}>
          <button style={styles.glossToggle} onClick={() => setShowGlossary((v) => !v)}>
            <span style={styles.glossToggleLabel}>
              용어집{" "}
              <span style={styles.glossCount}>{glossaryReady ? `${glossary.length}개` : "…"}</span>
            </span>
            <span style={styles.chevron}>{showGlossary ? "닫기 ▲" : "열기 ▼"}</span>
          </button>

          {showGlossary && (
            <div style={styles.glossBody}>
              <p style={styles.glossHint}>
                권장 표현을 등록하면 다듬을 때 자동으로 맞춰줘요. 용어집은
                <strong> 이 브라우저에 저장</strong>됩니다.
              </p>

              <div style={styles.addGrid}>
                <input
                  style={styles.glossInput}
                  value={npPreferred}
                  onChange={(e) => setNpPreferred(e.target.value)}
                  placeholder="사용할 표현 *  예) 로그인"
                />
                <input
                  style={styles.glossInput}
                  value={npAvoid}
                  onChange={(e) => setNpAvoid(e.target.value)}
                  placeholder="피할 표현  예) 사인인, 로그인하기"
                />
                <input
                  style={styles.glossInput}
                  value={npNote}
                  onChange={(e) => setNpNote(e.target.value)}
                  placeholder="메모  예) 동사 아닌 명사로 통일"
                  onKeyDown={(e) => e.key === "Enter" && addTerm()}
                />
                <button
                  style={{
                    ...styles.addBtn,
                    opacity: npPreferred.trim() ? 1 : 0.5,
                    cursor: npPreferred.trim() ? "pointer" : "default",
                  }}
                  onClick={addTerm}
                  disabled={!npPreferred.trim()}
                >
                  추가
                </button>
              </div>

              {glossary.length === 0 ? (
                <div style={styles.glossEmpty}>아직 등록된 용어가 없어요.</div>
              ) : (
                <div style={styles.termList}>
                  {glossary.map((g) => (
                    <div key={g.id} style={styles.termRow}>
                      <div style={styles.termMain}>
                        <span style={styles.termPreferred}>{g.preferred}</span>
                        {g.avoid && (
                          <span style={styles.termAvoid}>
                            <s>{g.avoid}</s>
                          </span>
                        )}
                        {g.note && <span style={styles.termNote}>{g.note}</span>}
                      </div>
                      <button style={styles.termDel} onClick={() => removeTerm(g.id)}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {result && (
          <section style={styles.output}>
            <div style={styles.primaryCard}>
              <div style={styles.primaryHead}>
                <span style={styles.badge}>다듬은 결과</span>
                <button style={styles.copyBtn} onClick={() => copy("primary", result.refined)}>
                  {copied === "primary" ? "복사됨 ✓" : "복사"}
                </button>
              </div>
              <p style={styles.primaryText}>{result.refined}</p>
            </div>

            {Array.isArray(result.alternatives) && result.alternatives.length > 0 && (
              <div style={styles.block}>
                <div style={styles.blockLabel}>다른 표현</div>
                {result.alternatives.map((alt, i) => (
                  <div key={i} style={styles.altRow}>
                    <p style={styles.altText}>{alt}</p>
                    <button style={styles.copyBtnSm} onClick={() => copy("alt" + i, alt)}>
                      {copied === "alt" + i ? "✓" : "복사"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {Array.isArray(result.notes) && result.notes.length > 0 && (
              <div style={styles.block}>
                <div style={styles.blockLabel}>무엇을 바꿨나</div>
                <ul style={styles.notes}>
                  {result.notes.map((n, i) => (
                    <li key={i} style={styles.note}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <footer style={styles.footer}>입력한 언어 그대로 결과가 나와요</footer>
      </div>
    </div>
  );
}

const ink = "#1a1a1a";
const bg = "#f1f1ef";
const line = "#e2e2df";
const muted = "#9a9a95";

const styles = {
  page: { minHeight: "100%", background: bg, fontFamily: "'IBM Plex Sans', sans-serif", color: ink, padding: "44px 20px 64px" },
  wrap: { maxWidth: 680, margin: "0 auto" },
  header: { marginBottom: 26 },
  title: { fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 22, letterSpacing: "-0.01em", margin: 0, color: ink },
  headRule: { height: 1, background: line, marginTop: 18 },
  card: { background: "#ffffff", border: `1px solid ${line}`, borderRadius: 14, padding: 24, boxShadow: "0 12px 30px -24px rgba(0,0,0,0.4)" },
  label: { display: "block", fontSize: 12.5, fontWeight: 600, letterSpacing: "0.02em", marginBottom: 9, color: "#333" },
  optional: { fontWeight: 400, color: muted },
  textarea: { width: "100%", border: `1px solid ${line}`, borderRadius: 10, padding: "13px 14px", fontSize: 14.5, lineHeight: 1.55, fontFamily: "'IBM Plex Mono', monospace", resize: "vertical", background: "#fafafa", color: ink },
  input: { width: "100%", border: `1px solid ${line}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, background: "#fafafa", color: ink },
  button: { marginTop: 22, width: "100%", background: ink, color: "#f5f5f4", border: "none", borderRadius: 10, padding: "14px 16px", fontSize: 15, fontWeight: 600, letterSpacing: "0.01em", transition: "opacity 0.15s ease" },
  error: { marginTop: 14, fontSize: 13.5, color: "#333", background: "#ececea", padding: "10px 12px", borderRadius: 8 },
  glossWrap: { marginTop: 16, border: `1px solid ${line}`, borderRadius: 14, background: "#ffffff", overflow: "hidden" },
  glossToggle: { width: "100%", background: "transparent", border: "none", padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" },
  glossToggleLabel: { fontSize: 14, fontWeight: 600, color: "#333" },
  glossCount: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#555", marginLeft: 4 },
  chevron: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: muted },
  glossBody: { padding: "4px 20px 22px", borderTop: `1px solid #efefed` },
  glossHint: { fontSize: 13, lineHeight: 1.55, color: "#6a6a66", margin: "14px 0 16px" },
  addGrid: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  glossInput: { flex: "1 1 150px", border: `1px solid ${line}`, borderRadius: 8, padding: "9px 11px", fontSize: 13.5, background: "#fafafa", color: ink },
  addBtn: { flex: "0 0 auto", background: ink, color: "#f5f5f4", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13.5, fontWeight: 600 },
  glossEmpty: { fontSize: 13, color: muted, fontFamily: "'IBM Plex Mono', monospace", padding: "6px 0" },
  termList: { display: "flex", flexDirection: "column", gap: 8 },
  termRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "#fafafa", border: `1px solid #efefed`, borderRadius: 9, padding: "9px 12px" },
  termMain: { display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 10 },
  termPreferred: { fontSize: 14.5, fontWeight: 600, color: ink },
  termAvoid: { fontSize: 13, color: "#8f8f8a" },
  termNote: { fontSize: 12.5, color: "#7a7a75", fontStyle: "italic", fontFamily: "'Fraunces', serif" },
  termDel: { flexShrink: 0, background: "transparent", border: "none", color: "#b3b3ad", fontSize: 20, lineHeight: 1, cursor: "pointer", padding: "0 4px" },
  output: { marginTop: 26 },
  primaryCard: { background: ink, borderRadius: 14, padding: "22px 24px", color: "#f4f4f3" },
  primaryHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  badge: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.16em", color: "#a6a6a2" },
  copyBtn: { background: "rgba(255,255,255,0.12)", color: "#f4f4f3", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 7, padding: "5px 11px", fontSize: 12.5, cursor: "pointer" },
  primaryText: { fontFamily: "'Fraunces', serif", fontSize: 21, lineHeight: 1.45, margin: 0, fontWeight: 500 },
  block: { marginTop: 18, background: "#ffffff", border: `1px solid ${line}`, borderRadius: 12, padding: "18px 20px" },
  blockLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.14em", color: "#8a8a85", marginBottom: 12 },
  altRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "9px 0", borderTop: `1px solid #efefed` },
  altText: { fontSize: 15, lineHeight: 1.5, margin: 0, color: "#2b2b2b" },
  copyBtnSm: { flexShrink: 0, background: "transparent", color: "#444", border: `1px solid ${line}`, borderRadius: 7, padding: "4px 9px", fontSize: 12, cursor: "pointer" },
  notes: { margin: 0, paddingLeft: 18 },
  note: { fontSize: 14, lineHeight: 1.6, color: "#3f3f3a", marginBottom: 6 },
  footer: { marginTop: 34, textAlign: "center", fontSize: 12.5, color: muted, fontFamily: "'IBM Plex Mono', monospace" },
};
