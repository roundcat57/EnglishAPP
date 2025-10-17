const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// 環境変数の読み込み（エラーを防ぐため）
try {
  require('dotenv').config();
} catch (error) {
  console.log('⚠️ dotenv読み込みエラー（本番環境では正常）:', error.message);
}

const app = express();
const PORT = process.env.PORT || 8000;

// Railway用の環境変数設定
if (process.env.RAILWAY_ENVIRONMENT) {
  process.env.NODE_ENV = 'production';
  console.log('🚂 Railway環境で起動中...');
}

// データベース初期化（エラーを防ぐため）
let db;
try {
  db = require('./database');
  console.log('📊 データベース接続確認中...');
} catch (error) {
  console.log('⚠️ データベース初期化エラー:', error.message);
}

// ルートの読み込み（エラーを防ぐため）
let questionRoutes, questionSetRoutes, generationRoutes, studentRoutes, scoreRoutes, printRoutes;

try {
  questionRoutes = require('./routes/questions');
  questionSetRoutes = require('./routes/questionSets');
  generationRoutes = require('./routes/generation');
  studentRoutes = require('./routes/students');
  scoreRoutes = require('./routes/scores');
  printRoutes = require('./routes/print');
  console.log('✅ ルート読み込み完了');
} catch (error) {
  console.log('⚠️ ルート読み込みエラー:', error.message);
}

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
if (questionRoutes) app.use('/api/questions', questionRoutes);
if (questionSetRoutes) app.use('/api/question-sets', questionSetRoutes);
if (generationRoutes) app.use('/api/generation', generationRoutes);
if (studentRoutes) app.use('/api/students', studentRoutes);
if (scoreRoutes) app.use('/api/scores', scoreRoutes);
if (printRoutes) app.use('/api/print', printRoutes);

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
  console.log(`💾 データベース: ${dbPath}`);
  console.log(`🌍 環境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Railway環境: ${process.env.RAILWAY_ENVIRONMENT || 'false'}`);
  console.log(`🔗 ヘルスチェック: http://0.0.0.0:${PORT}/api/health`);
});

// Railway用の起動確認
if (process.env.RAILWAY_ENVIRONMENT) {
  console.log('✅ Railway環境で起動中...');
  process.env.NODE_ENV = 'production';
}

// 起動確認のための追加ログ
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
