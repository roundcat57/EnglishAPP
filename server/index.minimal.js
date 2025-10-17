const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

// Railway環境での環境変数設定
if (process.env.RAILWAY_ENVIRONMENT) {
  process.env.NODE_ENV = 'production';
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDvEGLt-BW4o3ig8j1TYjIu6cjXPAfPBhA';
  process.env.GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  process.env.ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'secure-admin-2024';
  process.env.CLIENT_URL = process.env.CLIENT_URL || 'https://english-ayvuok004-mitama.vercel.app';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'sqlite:./data/database.sqlite';
  console.log('🚂 Railway環境で起動中...');
}

// CORS設定
app.use(cors({
  origin: true,
  credentials: true
}));

// ボディパーサー
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: '岩沢学院 英検問題特化API',
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// テストエンドポイント
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

// 404ハンドラー
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'エンドポイントが見つかりません',
    path: req.originalUrl
  });
});

// サーバー起動
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 サーバーが起動しました: http://0.0.0.0:${PORT}`);
  console.log(`📚 岩沢学院 英検問題特化APIが利用可能です`);
  console.log(`🌍 環境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 ヘルスチェック: http://0.0.0.0:${PORT}/api/health`);
  console.log('✅ 最小限のサーバーが正常に起動しました');
});

// エラーハンドリング
server.on('error', (err) => {
  console.error('❌ サーバーエラー:', err);
  process.exit(1);
});

module.exports = app;
