# よしくんGPT Render 完成版

Node.js / Express / OpenAI Responses API / Web Search / PWA をまとめた、Renderへそのままデプロイできる構成です。

## Renderへのデプロイ

1. このフォルダーをGitHubの新しいリポジトリへアップロードします。
2. Renderで **New → Blueprint** を選び、そのリポジトリを接続します。
3. `render.yaml` が自動検出されます。
4. 環境変数 `OPENAI_API_KEY` にOpenAI APIキーを設定します。
5. デプロイ完了後、RenderのURLを開きます。

## 手動でWeb Serviceを作る場合

- Runtime: Node
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/api/health`
- Environment Variable: `OPENAI_API_KEY`

## ローカル確認

```bash
npm install
# Windows PowerShell
$env:OPENAI_API_KEY="sk-..."
npm start
```

ブラウザで `http://localhost:3000` を開きます。

## GitHub PagesからAPIだけRenderへ接続する場合

画面左の「API接続先」にRenderのURLを入力します。

例: `https://your-service.onrender.com`

Render側の `ALLOWED_ORIGINS` にはGitHub PagesのURLを設定してください。

例: `https://ユーザー名.github.io`

## 注意

- APIキーを `index.html` やGitHubへ書かないでください。
- OpenAI APIの利用にはAPI側の請求設定・利用枠が必要です。
- Render無料プランでは、停止後の初回起動に時間がかかる場合があります。
