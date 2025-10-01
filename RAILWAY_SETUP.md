# Railway デプロイ完全ガイド

## 🚀 確実にデプロイする手順

### 1. Railwayアカウント作成
1. [Railway.app](https://railway.app) にアクセス
2. GitHubアカウントでログイン
3. アカウント作成完了

### 2. プロジェクト作成
1. Railwayダッシュボードで「New Project」
2. 「Deploy from GitHub repo」を選択
3. `roundcat57/EnglishAPP` を選択
4. プロジェクト作成完了

### 3. 環境変数設定（重要！）
**Railwayダッシュボードで以下を設定：**

1. プロジェクトページで「Variables」タブをクリック
2. 以下の環境変数を追加：

```
GEMINI_API_KEY = あなたのGemini APIキー
ADMIN_TOKEN = 強固な管理者トークン（例: secure-admin-2024）
NODE_ENV = production
```

**設定方法：**
- 「New Variable」をクリック
- Name: `GEMINI_API_KEY`
- Value: あなたのAPIキーを入力
- 「Add」をクリック
- 他の変数も同様に追加

### 4. デプロイ設定
1. 「Settings」タブをクリック
2. 「Deploy」セクションで以下を設定：
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && node index.js`
   - Health Check Path: `/api/health`

### 5. デプロイ実行
1. 「Deployments」タブをクリック
2. 「Deploy Now」をクリック
3. デプロイ完了まで待機（5-10分）

## 🔧 トラブルシューティング

### ヘルスチェック失敗の場合
1. 「Deployments」→「View Logs」を確認
2. エラーメッセージを確認
3. 環境変数が正しく設定されているか確認

### よくあるエラー
- **GEMINI_API_KEY未設定**: 環境変数を設定
- **ポートエラー**: Railwayが自動でポートを設定
- **データベースエラー**: SQLiteは自動で作成

## ✅ 成功の確認
1. デプロイ完了後、提供されるURLにアクセス
2. `https://your-app.railway.app/api/health` にアクセス
3. JSONレスポンスが返れば成功

## 📱 外部アクセス
- デプロイされたURLをスマホ・タブレットで開く
- ブラウザの「ホーム画面に追加」でアプリのように使用
