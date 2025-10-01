#!/bin/bash

# デプロイスクリプト
echo "🚀 English App デプロイスクリプト"
echo "=================================="

# 環境変数チェック
if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ GEMINI_API_KEY が設定されていません"
    exit 1
fi

if [ -z "$ADMIN_TOKEN" ]; then
    echo "❌ ADMIN_TOKEN が設定されていません"
    exit 1
fi

echo "✅ 環境変数チェック完了"

# 依存関係インストール
echo "📦 依存関係をインストール中..."
cd server && npm install && cd ..

# データベースディレクトリ作成
echo "💾 データベースディレクトリを作成中..."
mkdir -p data

# ローカルテスト
echo "🧪 ローカルテストを実行中..."
cd server
GEMINI_MODEL=gemini-2.5-flash ADMIN_TOKEN=$ADMIN_TOKEN DATABASE_URL=sqlite:./data/database.sqlite node index.js &
SERVER_PID=$!

# サーバー起動待機
sleep 5

# ヘルスチェック
if curl -s http://localhost:8000/api/health > /dev/null; then
    echo "✅ ローカルテスト成功"
    kill $SERVER_PID
else
    echo "❌ ローカルテスト失敗"
    kill $SERVER_PID
    exit 1
fi

cd ..

echo "🎉 デプロイ準備完了！"
echo ""
echo "📋 デプロイ方法:"
echo "1. Railway: https://railway.app でプロジェクト作成"
echo "2. Heroku: https://heroku.com でアプリ作成"
echo "3. Docker: docker-compose up -d"
echo ""
echo "🔑 必要な環境変数:"
echo "- GEMINI_API_KEY: $GEMINI_API_KEY"
echo "- ADMIN_TOKEN: $ADMIN_TOKEN"
