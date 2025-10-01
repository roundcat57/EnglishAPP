# Node.js 18の公式イメージを使用
FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# パッケージファイルをコピー
COPY server/package*.json ./

# 依存関係をインストール
RUN npm ci --only=production

# アプリケーションコードをコピー
COPY server/ ./

# データベースディレクトリを作成
RUN mkdir -p /app/data

# ポート8000を公開
EXPOSE 8000

# 環境変数を設定
ENV NODE_ENV=production
ENV DATABASE_URL=sqlite:/app/data/database.sqlite
ENV PORT=8000

# ヘルスチェック用のスクリプトを作成
RUN echo '#!/bin/sh' > /app/healthcheck.sh && \
    echo 'curl -f http://localhost:8000/api/health || exit 1' >> /app/healthcheck.sh && \
    chmod +x /app/healthcheck.sh

# アプリケーションを起動
CMD ["node", "index.js"]
