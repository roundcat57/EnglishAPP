const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// メモリ内ストレージ（実際のアプリではデータベースを使用）
let questions = [];

// 全問題を取得
router.get('/', (req, res) => {
  try {
    const { level, type, difficulty, limit = 50, offset = 0 } = req.query;
    
    let filteredQuestions = [...questions];
    
    // フィルタリング
    if (level) {
      filteredQuestions = filteredQuestions.filter(q => q.level === level);
    }
    if (type) {
      filteredQuestions = filteredQuestions.filter(q => q.type === type);
    }
    if (difficulty) {
      filteredQuestions = filteredQuestions.filter(q => q.difficulty === difficulty);
    }
    
    // ページネーション
    const paginatedQuestions = filteredQuestions.slice(offset, offset + limit);
    
    res.json({
      questions: paginatedQuestions,
      total: filteredQuestions.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({
      error: '問題の取得中にエラーが発生しました',
      message: error.message
    });
  }
});

// 特定の問題を取得
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const question = questions.find(q => q.id === id);
    
    if (!question) {
      return res.status(404).json({
        error: '問題が見つかりません',
        id
      });
    }
    
    res.json(question);
  } catch (error) {
    res.status(500).json({
      error: '問題の取得中にエラーが発生しました',
      message: error.message
    });
  }
});

// 新しい問題を作成
router.post('/', (req, res) => {
  try {
    const { level, type, difficulty, content, choices, correctAnswer, explanation } = req.body;
    
    // バリデーション
    if (!level || !type || !content) {
      return res.status(400).json({
        error: '必須フィールドが不足しています',
        required: ['level', 'type', 'content']
      });
    }
    
    const newQuestion = {
      id: uuidv4(),
      level,
      type,
      difficulty: difficulty || '中級',
      content,
      choices: choices || [],
      correctAnswer,
      explanation,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    questions.push(newQuestion);
    
    res.status(201).json({
      message: '問題が正常に作成されました',
      question: newQuestion
    });
  } catch (error) {
    res.status(500).json({
      error: '問題の作成中にエラーが発生しました',
      message: error.message
    });
  }
});

// 問題を更新
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const questionIndex = questions.findIndex(q => q.id === id);
    
    if (questionIndex === -1) {
      return res.status(404).json({
        error: '問題が見つかりません',
        id
      });
    }
    
    // 更新データを適用
    questions[questionIndex] = {
      ...questions[questionIndex],
      ...updateData,
      updatedAt: new Date()
    };
    
    res.json({
      message: '問題が正常に更新されました',
      question: questions[questionIndex]
    });
  } catch (error) {
    res.status(500).json({
      error: '問題の更新中にエラーが発生しました',
      message: error.message
    });
  }
});

// 問題を削除
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const questionIndex = questions.findIndex(q => q.id === id);
    
    if (questionIndex === -1) {
      return res.status(404).json({
        error: '問題が見つかりません',
        id
      });
    }
    
    const deletedQuestion = questions.splice(questionIndex, 1)[0];
    
    res.json({
      message: '問題が正常に削除されました',
      deletedQuestion
    });
  } catch (error) {
    res.status(500).json({
      error: '問題の削除中にエラーが発生しました',
      message: error.message
    });
  }
});

// 問題の統計情報を取得
router.get('/stats/summary', (req, res) => {
  try {
    const stats = {
      total: questions.length,
      byLevel: {},
      byType: {},
      byDifficulty: {},
      recent: questions
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
    };
    
    // 級別統計
    questions.forEach(q => {
      stats.byLevel[q.level] = (stats.byLevel[q.level] || 0) + 1;
      stats.byType[q.type] = (stats.byType[q.type] || 0) + 1;
      stats.byDifficulty[q.difficulty] = (stats.byDifficulty[q.difficulty] || 0) + 1;
    });
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: '統計情報の取得中にエラーが発生しました',
      message: error.message
    });
  }
});

module.exports = router;

