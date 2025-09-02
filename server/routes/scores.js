const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// メモリ内ストレージ（実際のアプリではデータベースを使用）
let scoreRecords = [];

// 全スコア履歴を取得
router.get('/', (req, res) => {
  try {
    const { studentId, level, type, limit = 100, offset = 0 } = req.query;
    
    let filteredRecords = [...scoreRecords];
    
    // フィルタリング
    if (studentId) {
      filteredRecords = filteredRecords.filter(r => r.studentId === studentId);
    }
    if (level) {
      filteredRecords = filteredRecords.filter(r => r.level === level);
    }
    if (type) {
      filteredRecords = filteredRecords.filter(r => r.type === type);
    }
    
    // 日付順でソート
    filteredRecords.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    
    // ページネーション
    const paginatedRecords = filteredRecords.slice(offset, offset + limit);
    
    res.json({
      scoreRecords: paginatedRecords,
      total: filteredRecords.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({
      error: 'スコア履歴の取得中にエラーが発生しました',
      message: error.message
    });
  }
});

// 特定のスコア履歴を取得
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const scoreRecord = scoreRecords.find(r => r.id === id);
    
    if (!scoreRecord) {
      return res.status(404).json({
        error: 'スコア履歴が見つかりません',
        id
      });
    }
    
    res.json(scoreRecord);
  } catch (error) {
    res.status(500).json({
      error: 'スコア履歴の取得中にエラーが発生しました',
      message: error.message
    });
  }
});

// 新しいスコア履歴を作成
router.post('/', (req, res) => {
  try {
    const { 
      studentId, 
      questionSetId, 
      level, 
      type, 
      score, 
      totalQuestions, 
      correctAnswers, 
      timeSpent, 
      answers 
    } = req.body;
    
    // バリデーション
    if (!studentId || !questionSetId || !level || !type || score === undefined) {
      return res.status(400).json({
        error: '必須フィールドが不足しています',
        required: ['studentId', 'questionSetId', 'level', 'type', 'score']
      });
    }
    
    const newScoreRecord = {
      id: uuidv4(),
      studentId,
      questionSetId,
      level,
      type,
      score: parseFloat(score),
      totalQuestions: parseInt(totalQuestions) || 0,
      correctAnswers: parseInt(correctAnswers) || 0,
      timeSpent: parseInt(timeSpent) || 0,
      completedAt: new Date(),
      answers: answers || []
    };
    
    scoreRecords.push(newScoreRecord);
    
    res.status(201).json({
      message: 'スコア履歴が正常に作成されました',
      scoreRecord: newScoreRecord
    });
  } catch (error) {
    res.status(500).json({
      error: 'スコア履歴の作成中にエラーが発生しました',
      message: error.message
    });
  }
});

// スコア履歴を更新
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const recordIndex = scoreRecords.findIndex(r => r.id === id);
    
    if (recordIndex === -1) {
      return res.status(404).json({
        error: 'スコア履歴が見つかりません',
        id
      });
    }
    
    // 更新データを適用
    scoreRecords[recordIndex] = {
      ...scoreRecords[recordIndex],
      ...updateData,
      updatedAt: new Date()
    };
    
    res.json({
      message: 'スコア履歴が正常に更新されました',
      scoreRecord: scoreRecords[recordIndex]
    });
  } catch (error) {
    res.status(500).json({
      error: 'スコア履歴の更新中にエラーが発生しました',
      message: error.message
    });
  }
});

// スコア履歴を削除
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const recordIndex = scoreRecords.findIndex(r => r.id === id);
    
    if (recordIndex === -1) {
      return res.status(404).json({
        error: 'スコア履歴が見つかりません',
        id
      });
    }
    
    const deletedRecord = scoreRecords.splice(recordIndex, 1)[0];
    
    res.json({
      message: 'スコア履歴が正常に削除されました',
      deletedRecord
    });
  } catch (error) {
    res.status(500).json({
      error: 'スコア履歴の削除中にエラーが発生しました',
      message: error.message
    });
  }
});

// 塾生のスコア統計を取得
router.get('/student/:studentId/stats', (req, res) => {
  try {
    const { studentId } = req.params;
    const { level, type, period } = req.query;
    
    let filteredRecords = scoreRecords.filter(r => r.studentId === studentId);
    
    // フィルタリング
    if (level) {
      filteredRecords = filteredRecords.filter(r => r.level === level);
    }
    if (type) {
      filteredRecords = filteredRecords.filter(r => r.type === type);
    }
    if (period) {
      const now = new Date();
      const periodDays = parseInt(period);
      const cutoffDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));
      filteredRecords = filteredRecords.filter(r => new Date(r.completedAt) >= cutoffDate);
    }
    
    if (filteredRecords.length === 0) {
      return res.json({
        studentId,
        totalRecords: 0,
        averageScore: 0,
        bestScore: 0,
        totalQuestions: 0,
        totalTime: 0,
        byLevel: {},
        byType: {},
        progress: []
      });
    }
    
    // 統計計算
    const totalRecords = filteredRecords.length;
    const averageScore = filteredRecords.reduce((sum, r) => sum + r.score, 0) / totalRecords;
    const bestScore = Math.max(...filteredRecords.map(r => r.score));
    const totalQuestions = filteredRecords.reduce((sum, r) => sum + r.totalQuestions, 0);
    const totalTime = filteredRecords.reduce((sum, r) => sum + r.timeSpent, 0);
    
    // 級別・タイプ別統計
    const byLevel = {};
    const byType = {};
    filteredRecords.forEach(r => {
      byLevel[r.level] = byLevel[r.level] || { count: 0, totalScore: 0, averageScore: 0 };
      byLevel[r.level].count++;
      byLevel[r.level].totalScore += r.score;
      
      byType[r.type] = byType[r.type] || { count: 0, totalScore: 0, averageScore: 0 };
      byType[r.type].count++;
      byType[r.type].totalScore += r.score;
    });
    
    // 平均スコアを計算
    Object.keys(byLevel).forEach(level => {
      byLevel[level].averageScore = byLevel[level].totalScore / byLevel[level].count;
    });
    Object.keys(byType).forEach(type => {
      byType[type].averageScore = byType[type].totalScore / byType[type].count;
    });
    
    // 進捗データ（日付順）
    const progress = filteredRecords
      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
      .map(r => ({
        date: r.completedAt,
        score: r.score,
        type: r.type,
        level: r.level
      }));
    
    res.json({
      studentId,
      totalRecords,
      averageScore: Math.round(averageScore * 10) / 10,
      bestScore,
      totalQuestions,
      totalTime,
      byLevel,
      byType,
      progress
    });
  } catch (error) {
    res.status(500).json({
      error: 'スコア統計の取得中にエラーが発生しました',
      message: error.message
    });
  }
});

// 弱点分析
router.get('/analysis/weakness/:studentId', (req, res) => {
  try {
    const { studentId } = req.params;
    const { level, type } = req.query;
    
    let filteredRecords = scoreRecords.filter(r => r.studentId === studentId);
    
    if (level) {
      filteredRecords = filteredRecords.filter(r => r.level === level);
    }
    if (type) {
      filteredRecords = filteredRecords.filter(r => r.type === type);
    }
    
    if (filteredRecords.length === 0) {
      return res.json({
        studentId,
        analysis: null,
        message: '分析するデータが不足しています'
      });
    }
    
    // 弱点分析ロジック
    const analysis = {
      studentId,
      level: level || '全級',
      type: type || '全タイプ',
      weakPoints: [],
      recommendedQuestions: [],
      analysisDate: new Date()
    };
    
    // 低スコアの問題タイプを特定
    const typeScores = {};
    filteredRecords.forEach(r => {
      if (!typeScores[r.type]) {
        typeScores[r.type] = { total: 0, count: 0, average: 0 };
      }
      typeScores[r.type].total += r.score;
      typeScores[r.type].count++;
    });
    
    Object.keys(typeScores).forEach(type => {
      typeScores[type].average = typeScores[type].total / typeScores[type].count;
      if (typeScores[type].average < 70) {
        analysis.weakPoints.push(`${type}の理解が不十分`);
      }
    });
    
    // 推奨問題を生成
    if (analysis.weakPoints.length > 0) {
      analysis.recommendedQuestions = [
        '基礎的な問題から始めて段階的に難易度を上げる',
        '間違えた問題の復習を重点的に行う',
        '類似問題を繰り返し解く'
      ];
    }
    
    res.json({ analysis });
  } catch (error) {
    res.status(500).json({
      error: '弱点分析中にエラーが発生しました',
      message: error.message
    });
  }
});

module.exports = router;

