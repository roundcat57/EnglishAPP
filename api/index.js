const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// ルートのインポート（相対パスで調整）
const questionRoutes = require('./routes/questions');
const questionSetRoutes = require('./routes/questionSets');
const generationRoutes = require('./routes/generation');
const studentRoutes = require('./routes/students');
const scoreRoutes = require('./routes/scores');
const printRoutes = require('./routes/print');

const app = express();

// セキュリティミドルウェア
app.use(helmet());

// CORS設定
app.use(cors({
  origin: true,
  credentials: true
}));

// レート制限
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 15分間に100リクエストまで
  message: 'リクエストが多すぎます。しばらく待ってから再試行してください。'
});
app.use('/api/', limiter);

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
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: '岩沢学院 英検問題特化API'
  });
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

module.exports = app;
