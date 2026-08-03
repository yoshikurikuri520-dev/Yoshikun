# YoshikunGPT Web検索＋AI生成サーバー

## 起動

```bash
npm install
cp .env.example .env
```

`.env` の `OPENAI_API_KEY` を設定してから起動します。

```bash
node --env-file=.env server.mjs
```

ブラウザで `http://localhost:3000` を開いてください。

## 検索設定

同梱の画面には `/api/search` が初期登録されています。同じサーバーから画面を開けば、そのまま利用できます。

別サーバーへ配置する場合は、画面の「検索設定」から次のように登録します。

```text
https://あなたのAPIドメイン/api/search
```

## API形式

`POST /api/search`

入力:

```json
{
  "query": "質問",
  "history": [
    {"role": "user", "text": "過去の質問"},
    {"role": "ai", "text": "過去の回答"}
  ]
}
```

出力:

```json
{
  "answer": "AI回答",
  "sources": [
    {"title": "参照ページ", "url": "https://example.com"}
  ]
}
```

APIキーはHTMLやJavaScriptへ直接書かず、必ずサーバーの環境変数で管理してください。
