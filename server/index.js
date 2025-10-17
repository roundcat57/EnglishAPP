const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// 環境変数の読み込み
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Railway環境の設定
if (process.env.RAILWAY_ENVIRONMENT) {
  process.env.NODE_ENV = 'production';
  console.log('🚂 Railway環境で起動中...');
}

// データベース初期化
const db = require('./database');
console.log('📊 データベース接続完了');

// ルートの読み込み
const questionRoutes = require('./routes/questions');
const questionSetRoutes = require('./routes/questionSets');
const generationRoutes = require('./routes/generation');
const studentRoutes = require('./routes/students');
const scoreRoutes = require('./routes/scores');
const printRoutes = require('./routes/print');
console.log('✅ ルート読み込み完了');

// セキュリティミドルウェア
app.use(helmet());

// CORS設定
app.use(cors({
  origin: true,
  credentials: true
}));

// レート制限（本番環境では無効化）
if (process.env.NODE_ENV !== 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 100, // 15分間に100リクエストまで
    message: 'リクエストが多すぎます。しばらく待ってから再試行してください。',
    trustProxy: true // Railway用の設定
  });
  app.use('/api/', limiter);
}

// ボディパーサー
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ルート
app.use('/api/questions', questionRoutes);
app.use('/api/question-sets', questionSetRoutes);
app.use('/api/generation', generationRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/print', printRoutes);

// ヘルスチェック
app.get('/api/health', (req, res) => {
  try {
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: '岩沢学院 英検問題特化API',
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 8000
    });
  } catch (error) {
    console.error('ヘルスチェックエラー:', error);
    res.status(500).json({ 
      status: 'ERROR', 
      error: error.message 
    });
  }
});

// 404ハンドラー
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'エンドポイントが見つかりません',
    path: req.originalUrl
  });
});

// エラーハンドラー
app.use((err, req, res, next) => {
  console.error('エラーが発生しました:', err);
  res.status(500).json({ 
    error: 'サーバー内部エラーが発生しました',
    message: process.env.NODE_ENV === 'development' ? err.message : '不明なエラー'
  });
});

// サーバー起動
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 サーバーが起動しました: http://0.0.0.0:${PORT}`);
  console.log(`📚 岩沢学院 英検問題特化APIが利用可能です`);
  console.log(`🌍 環境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 ヘルスチェック: http://0.0.0.0:${PORT}/api/health`);
  console.log(`📊 データベース: ${process.env.DATABASE_URL || 'default'}`);
});

// Railway環境の確認
if (process.env.RAILWAY_ENVIRONMENT) {
  console.log('🚂 Railway環境で起動中...');
  process.env.NODE_ENV = 'production';
}

// 起動確認
console.log('📋 起動パラメータ:');
console.log(`  - PORT: ${PORT}`);
console.log(`  - NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`  - RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT}`);
console.log(`  - DATABASE_URL: ${process.env.DATABASE_URL || 'default'}`);

// エラーハンドリング
server.on('error', (err) => {
  console.error('❌ サーバーエラー:', err);
  process.exit(1);
});

// プロセス終了時の処理
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM受信、サーバーを終了します');
  server.close(() => {
    console.log('✅ サーバーが正常に終了しました');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT受信、サーバーを終了します');
  server.close(() => {
    console.log('✅ サーバーが正常に終了しました');
    process.exit(0);
  });
});

module.exports = app;
