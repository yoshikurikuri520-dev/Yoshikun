import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const app = express();
const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || "gpt-5-mini";
const apiKey = process.env.OPENAI_API_KEY?.trim();
const client = apiKey ? new OpenAI({ apiKey }) : null;

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const configuredOrigins = (process.env.ALLOWED_ORIGINS || "same-origin")
  .split(",").map(v => v.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || configuredOrigins.includes("*") || configuredOrigins.includes("same-origin") || configuredOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("許可されていない接続元です。"));
  }
}));
app.use(express.json({ limit: "2mb" }));
app.use(rateLimit({
  windowMs: 60_000,
  limit: Math.max(1, Number(process.env.RATE_LIMIT_PER_MINUTE || 30)),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "アクセスが集中しています。少し待ってから再試行してください。" }
}));

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-12).flatMap(item => {
    const role = item?.role === "assistant" || item?.role === "ai" ? "assistant" : "user";
    const text = String(item?.content ?? item?.text ?? "").trim().slice(0, 6000);
    return text ? [{ role, content: text }] : [];
  });
}

function collectSources(response) {
  const found = new Map();
  const add = (title, url) => {
    if (!url || found.has(url)) return;
    found.set(url, { title: title || url, url });
  };
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      for (const ann of content.annotations || []) {
        const citation = ann.url_citation || ann;
        add(citation?.title, citation?.url);
      }
    }
    for (const source of item?.action?.sources || []) add(source?.title, source?.url);
  }
  return [...found.values()].slice(0, 10);
}

function systemPrompt(persona = "friendly") {
  const styles = {
    friendly: "親しみやすく自然に話し、冗談も少し交えます。",
    cheeky: "少し生意気で面白い口調ですが、相手を傷つける侮辱は避けます。",
    teacher: "先生のように順序立てて、初心者にも分かる表現で説明します。",
    gamer: "ゲーム好きの相棒のような軽快な口調で話します。",
    gentle: "穏やかで安心感のある口調を使います。"
  };
  return [
    "あなたは『よしくんGPT』という日本語AIアシスタントです。",
    styles[persona] || styles.friendly,
    "結論を先にし、必要な説明を続けてください。",
    "最新情報、ニュース、価格、天気、法律、予定など時間で変化する質問ではWeb検索を使って確認してください。",
    "検索した場合は情報源に沿って答え、分からないことを作り話で埋めないでください。",
    "ユーザーが文章作成を頼んだ場合は、そのまま使える完成文を返してください。"
  ].join("\n");
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, configured: Boolean(client), model, time: new Date().toISOString() });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!client) return res.status(503).json({ error: "Renderの環境変数 OPENAI_API_KEY が未設定です。" });

    const message = String(req.body?.message || req.body?.query || "").trim();
    if (!message) return res.status(400).json({ error: "メッセージを入力してください。" });
    if (message.length > 12000) return res.status(400).json({ error: "メッセージが長すぎます。" });

    const webEnabled = req.body?.webEnabled !== false;
    const tools = webEnabled ? [{ type: "web_search", search_context_size: "medium" }] : [];
    const response = await client.responses.create({
      model,
      instructions: systemPrompt(String(req.body?.persona || "friendly")),
      input: [...cleanHistory(req.body?.history), { role: "user", content: message }],
      ...(tools.length ? { tools, tool_choice: "auto" } : {}),
      max_output_tokens: 1600
    });

    const answer = response.output_text?.trim();
    if (!answer) throw new Error("AIの回答本文を取得できませんでした。");
    res.json({ answer, sources: collectSources(response), model });
  } catch (error) {
    console.error("/api/chat", error);
    const status = Number.isInteger(error?.status) ? error.status : 500;
    const message = status === 401
      ? "OpenAI APIキーが無効です。Renderの環境変数を確認してください。"
      : status === 429
        ? "OpenAI APIの利用上限または請求設定を確認してください。"
        : status >= 500
          ? "AIサーバーでエラーが発生しました。Renderのログを確認してください。"
          : String(error?.message || "APIエラーが発生しました。");
    res.status(status).json({ error: message });
  }
});

app.use(express.static(publicDir, { extensions: ["html"] }));
app.get("/{*splat}", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
app.use((error, _req, res, _next) => res.status(403).json({ error: error.message || "アクセスが拒否されました。" }));

app.listen(port, "0.0.0.0", () => {
  console.log(`YoshikunGPT listening on port ${port}`);
  console.log(`OpenAI configured: ${Boolean(client)} / model: ${model}`);
});
