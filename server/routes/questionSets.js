const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// メモリ内ストレージ（実際のアプリではデータベースを使用）
let questionSets = [];

// 全問題セットを取得
router.get('/', (req, res) => {
  try {
    const { level, limit = 50, offset = 0 } = req.query;
    
    let filteredSets = [...questionSets];
    
    // フィルタリング
    if (level) {
      filteredSets = filteredSets.filter(set => set.level === level);
    }
    
    // ページネーション
    const paginatedSets = filteredSets.slice(offset, offset + limit);
    
    res.json({
      questionSets: paginatedSets,
      total: filteredSets.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({
      error: '問題セットの取得中にエラーが発生しました',
      message: error.message
    });
  }
});

// 特定の問題セットを取得
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const questionSet = questionSets.find(set => set.id === id);
    
    if (!questionSet) {
      return res.status(404).json({
        error: '問題セットが見つかりません',
        id
      });
    }
    
    res.json(questionSet);
  } catch (error) {
    res.status(500).json({
      error: '問題セットの取得中にエラーが発生しました',
      message: error.message
    });
  }
});

// 新しい問題セットを作成
router.post('/', (req, res) => {
  try {
    const { name, description, level, questions } = req.body;
    
    // バリデーション
    if (!name || !level) {
      return res.status(400).json({
        error: '必須フィールドが不足しています',
        required: ['name', 'level']
      });
    }
    
    const newQuestionSet = {
      id: uuidv4(),
      name,
      description: description || '',
      level,
      questions: questions || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    questionSets.push(newQuestionSet);
    
    res.status(201).json({
      message: '問題セットが正常に作成されました',
      questionSet: newQuestionSet
    });
  } catch (error) {
    res.status(500).json({
      error: '問題セットの作成中にエラーが発生しました',
      message: error.message
    });
  }
});

// 問題セットを更新
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const setIndex = questionSets.findIndex(set => set.id === id);
    
    if (setIndex === -1) {
      return res.status(404).json({
        error: '問題セットが見つかりません',
        id
      });
    }
    
    // 更新データを適用
    questionSets[setIndex] = {
      ...questionSets[setIndex],
      ...updateData,
      updatedAt: new Date()
    };
    
    res.json({
      message: '問題セットが正常に更新されました',
      questionSet: questionSets[setIndex]
    });
  } catch (error) {
    res.status(500).json({
      error: '問題セットの更新中にエラーが発生しました',
      message: error.message
    });
  }
});

// 問題セットを削除
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const setIndex = questionSets.findIndex(set => set.id === id);
    
    if (setIndex === -1) {
      return res.status(404).json({
        error: '問題セットが見つかりません',
        id
      });
    }
    
    const deletedSet = questionSets.splice(setIndex, 1)[0];
    
    res.json({
      message: '問題セットが正常に削除されました',
      deletedSet
    });
  } catch (error) {
    res.status(500).json({
      error: '問題セットの削除中にエラーが発生しました',
      message: error.message
    });
  }
});

// 問題セットに問題を追加
router.post('/:id/questions', (req, res) => {
  try {
    const { id } = req.params;
    const { questionIds } = req.body;
    
    const setIndex = questionSets.findIndex(set => set.id === id);
    
    if (setIndex === -1) {
      return res.status(404).json({
        error: '問題セットが見つかりません',
        id
      });
    }
    
    if (!Array.isArray(questionIds)) {
      return res.status(400).json({
        error: 'questionIdsは配列である必要があります'
      });
    }
    
    // 既存の問題IDを取得
    const existingIds = questionSets[setIndex].questions.map(q => q.id);
    
    // 新しい問題IDを追加（重複を避ける）
    const newQuestionIds = questionIds.filter(qId => !existingIds.includes(qId));
    
    if (newQuestionIds.length === 0) {
      return res.status(400).json({
        error: '追加する新しい問題がありません'
      });
    }
    
    // 問題セットを更新
    questionSets[setIndex].questions.push(...newQuestionIds);
    questionSets[setIndex].updatedAt = new Date();
    
    res.json({
      message: `${newQuestionIds.length}問の問題が追加されました`,
      questionSet: questionSets[setIndex]
    });
  } catch (error) {
    res.status(500).json({
      error: '問題の追加中にエラーが発生しました',
      message: error.message
    });
  }
});

// 問題セットから問題を削除
router.delete('/:id/questions/:questionId', (req, res) => {
  try {
    const { id, questionId } = req.params;
    
    const setIndex = questionSets.findIndex(set => set.id === id);
    
    if (setIndex === -1) {
      return res.status(404).json({
        error: '問題セットが見つかりません',
        id
      });
    }
    
    const questionIndex = questionSets[setIndex].questions.findIndex(q => q.id === questionId);
    
    if (questionIndex === -1) {
      return res.status(404).json({
        error: '問題が見つかりません',
        questionId
      });
    }
    
    // 問題を削除
    questionSets[setIndex].questions.splice(questionIndex, 1);
    questionSets[setIndex].updatedAt = new Date();
    
    res.json({
      message: '問題が正常に削除されました',
      questionSet: questionSets[setIndex]
    });
  } catch (error) {
    res.status(500).json({
      error: '問題の削除中にエラーが発生しました',
      message: error.message
    });
  }
});

// 問題セットの統計情報を取得
router.get('/stats/summary', (req, res) => {
  try {
    const stats = {
      total: questionSets.length,
      byLevel: {},
      totalQuestions: 0,
      averageQuestionsPerSet: 0,
      recent: questionSets
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
    };
    
    // 統計を計算
    questionSets.forEach(set => {
      stats.byLevel[set.level] = (stats.byLevel[set.level] || 0) + 1;
      stats.totalQuestions += set.questions.length;
    });
    
    stats.averageQuestionsPerSet = questionSets.length > 0 
      ? Math.round(stats.totalQuestions / questionSets.length * 10) / 10 
      : 0;
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: '統計情報の取得中にエラーが発生しました',
      message: error.message
    });
  }
});

module.exports = router;

