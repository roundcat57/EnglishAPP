const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// 問題セットを保存するためのメモリストレージ（実際のアプリではデータベースを使用）
const questionSets = new Map();

// 問題セットを保存
router.post('/questions', (req, res) => {
  try {
    const { questions, level, type, title } = req.body;
    const questionSetId = uuidv4();
    
    const questionSet = {
      id: questionSetId,
      title: title || `${level} ${type}問題`,
      level,
      type,
      questions,
      createdAt: new Date().toISOString()
    };
    
    questionSets.set(questionSetId, questionSet);
    
    res.json({
      message: '問題セットが保存されました',
      questionSetId,
      questionSet
    });
  } catch (error) {
    res.status(500).json({
      error: '問題セットの保存中にエラーが発生しました',
      message: error.message
    });
  }
});

// 印刷用の問題セットを取得
router.get('/questions/:questionSetId', (req, res) => {
  try {
    const { questionSetId } = req.params;
    const { includeAnswers, includeExplanations, fontSize, pageBreak } = req.query;
    
    const questionSet = questionSets.get(questionSetId);
    if (!questionSet) {
      return res.status(404).json({
        error: '問題セットが見つかりません'
      });
    }
    
    const printData = {
      questionSet,
      settings: {
        includeAnswers: includeAnswers === 'true',
        includeExplanations: includeExplanations === 'true',
        fontSize: fontSize || 'medium',
        pageBreak: pageBreak === 'true'
      },
      generatedAt: new Date().toISOString()
    };
    
    res.json(printData);
  } catch (error) {
    res.status(500).json({
      error: '印刷データの取得中にエラーが発生しました',
      message: error.message
    });
  }
});

// 問題用紙の印刷データを生成
router.post('/questions/:questionSetId/worksheet', (req, res) => {
  try {
    const { questionSetId } = req.params;
    const { studentName, date, customInstructions } = req.body;
    
    // 実際のアプリでは問題セットをデータベースから取得
    const worksheetData = {
      id: uuidv4(),
      questionSetId,
      studentName: studentName || '',
      date: date || new Date().toISOString(),
      type: 'worksheet',
      customInstructions: customInstructions || '',
      printSettings: {
        includeAnswers: false,
        includeExplanations: false,
        fontSize: 'medium',
        pageBreak: true,
        headerFooter: true
      }
    };
    
    res.json({
      message: '問題用紙の印刷データが生成されました',
      worksheet: worksheetData
    });
  } catch (error) {
    res.status(500).json({
      error: '問題用紙の生成中にエラーが発生しました',
      message: error.message
    });
  }
});

// 解答用紙の印刷データを生成
router.post('/questions/:questionSetId/answer-sheet', (req, res) => {
  try {
    const { questionSetId } = req.params;
    const { studentName, date, includeExplanations } = req.body;
    
    const answerSheetData = {
      id: uuidv4(),
      questionSetId,
      studentName: studentName || '',
      date: date || new Date().toISOString(),
      type: 'answer-sheet',
      includeExplanations: includeExplanations || false,
      printSettings: {
        includeAnswers: true,
        includeExplanations: includeExplanations || false,
        fontSize: 'medium',
        pageBreak: true,
        headerFooter: true
      }
    };
    
    res.json({
      message: '解答用紙の印刷データが生成されました',
      answerSheet: answerSheetData
    });
  } catch (error) {
    res.status(500).json({
      error: '解答用紙の生成中にエラーが発生しました',
      message: error.message
    });
  }
});

// 弱点対策プリントを生成
router.post('/weakness/:studentId', (req, res) => {
  try {
    const { studentId } = req.params;
    const { level, type, focusAreas } = req.body;
    
    // 実際のアプリでは弱点分析結果に基づいて問題を生成
    const weaknessPrintData = {
      id: uuidv4(),
      studentId,
      level: level || '3級',
      type: type || '穴埋め',
      focusAreas: focusAreas || ['文法', '語彙'],
      questions: [
        {
          id: 'w1',
          content: 'This is ___ interesting book.',
          choices: ['a', 'an', 'the', ''],
          correctAnswer: 'an',
          explanation: 'interestingは母音で始まるので、anを使用します。'
        },
        {
          id: 'w2',
          content: 'He ___ to the library yesterday.',
          choices: ['go', 'goes', 'going', 'went'],
          correctAnswer: 'went',
          explanation: 'yesterdayがあるので、過去形wentを使用します。'
        }
      ],
      generatedAt: new Date().toISOString(),
      printSettings: {
        includeAnswers: false,
        includeExplanations: false,
        fontSize: 'medium',
        pageBreak: true,
        headerFooter: true
      }
    };
    
    res.json({
      message: '弱点対策プリントが生成されました',
      weaknessPrint: weaknessPrintData
    });
  } catch (error) {
    res.status(500).json({
      error: '弱点対策プリントの生成中にエラーが発生しました',
      message: error.message
    });
  }
});

// 印刷履歴を取得
router.get('/history', (req, res) => {
  try {
    const { studentId, type, limit = 50, offset = 0 } = req.query;
    
    // 実際のアプリではデータベースから印刷履歴を取得
    const printHistory = [
      {
        id: '1',
        studentId: 'student1',
        studentName: '田中太郎',
        type: 'worksheet',
        questionSetName: '3級 穴埋め問題セット',
        printedAt: new Date().toISOString(),
        status: 'completed'
      },
      {
        id: '2',
        studentId: 'student2',
        studentName: '佐藤花子',
        type: 'answer-sheet',
        questionSetName: '3級 並び替え問題セット',
        printedAt: new Date().toISOString(),
        status: 'completed'
      }
    ];
    
    let filteredHistory = [...printHistory];
    
    if (studentId) {
      filteredHistory = filteredHistory.filter(h => h.studentId === studentId);
    }
    if (type) {
      filteredHistory = filteredHistory.filter(h => h.type === type);
    }
    
    const paginatedHistory = filteredHistory.slice(offset, offset + limit);
    
    res.json({
      printHistory: paginatedHistory,
      total: filteredHistory.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({
      error: '印刷履歴の取得中にエラーが発生しました',
      message: error.message
    });
  }
});

// PDF生成（将来的に実装）
router.post('/generate-pdf', (req, res) => {
  try {
    const { content, settings } = req.body;
    
    // 実際のアプリではPDFライブラリを使用してPDFを生成
    res.json({
      message: 'PDF生成機能は現在開発中です',
      status: 'development'
    });
  } catch (error) {
    res.status(500).json({
      error: 'PDF生成中にエラーが発生しました',
      message: error.message
    });
  }
});

module.exports = router;

