const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Gemini APIクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 問題生成のプロンプトテンプレート
const generatePrompt = (level, type, count, topics, customInstructions) => {
  const basePrompt = `あなたは英検${level}の問題作成の専門家です。
以下の条件で${count}問の問題を作成してください：

問題タイプ: ${type}
英検レベル: ${level}
問題数: ${count}問

${topics ? `トピック: ${topics.join(', ')}` : ''}
${customInstructions ? `追加指示: ${customInstructions}` : ''}

各問題は以下のJSON形式で出力してください：
{
  "questions": [
    {
      "content": "問題文",
      "choices": [
        {"text": "選択肢1", "isCorrect": false},
        {"text": "選択肢2", "isCorrect": false},
        {"text": "選択肢3", "isCorrect": false},
        {"text": "選択肢4", "isCorrect": true}
      ],
      "correctAnswer": "正解の選択肢",
      "explanation": "解説"
    }
  ]
}

注意事項：
- 選択肢は4つ作成してください
- 正解は1つだけにしてください
- 問題文は日本語で作成してください
- 選択肢は英語で作成してください
- 解説は日本語で作成してください
- 英検${level}の難易度に適した内容にしてください
- 必ず有効なJSON形式で出力してください`;

  return basePrompt;
};

// 問題生成エンドポイント
router.post('/generate', async (req, res) => {
  try {
    const { level, type, count, topics, customInstructions } = req.body;

    // バリデーション
    if (!level || !type || !count) {
      return res.status(400).json({
        error: '必須パラメータが不足しています',
        required: ['level', 'type', 'count']
      });
    }

    if (count < 1 || count > 20) {
      return res.status(400).json({
        error: '問題数は1〜20の範囲で指定してください'
      });
    }

    console.log(`問題生成開始: ${level} ${type} ${count}問`);

    // Gemini APIで問題生成
    const prompt = generatePrompt(level, type, count, topics, customInstructions);
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // JSONレスポンスをパース
    let questions;
    try {
      // JSON部分を抽出
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSONレスポンスが見つかりません');
      }
    } catch (parseError) {
      console.error('JSONパースエラー:', parseError);
      console.error('Geminiの応答:', text);
      return res.status(500).json({
        error: 'AIの応答を解析できませんでした',
        rawResponse: text
      });
    }

    // 生成された問題を整形
    const formattedQuestions = questions.questions.map((q, index) => ({
      id: uuidv4(),
      level,
      type,
      difficulty: getDifficultyFromLevel(level),
      content: q.content,
      choices: q.choices || [],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const resultData = {
      questions: formattedQuestions,
      totalGenerated: formattedQuestions.length,
      generationTime: new Date().toISOString(),
      level,
      type
    };

    console.log(`問題生成完了: ${formattedQuestions.length}問`);

    res.json(resultData);

  } catch (error) {
    console.error('問題生成エラー:', error);
    
    if (error.message.includes('API_KEY')) {
      return res.status(401).json({
        error: 'Gemini APIキーが無効です',
        message: '環境変数GEMINI_API_KEYを確認してください'
      });
    }

    if (error.message.includes('quota')) {
      return res.status(429).json({
        error: 'Gemini APIの利用制限に達しました',
        message: 'しばらく待ってから再試行してください'
      });
    }

    res.status(500).json({
      error: '問題生成中にエラーが発生しました',
      message: error.message
    });
  }
});

// 級から難易度を取得
function getDifficultyFromLevel(level) {
  const difficultyMap = {
    '5級': '初級',
    '4級': '初級',
    '3級': '初級',
    '準2級': '中級',
    '2級': '中級',
    '準1級': '上級',
    '1級': '上級'
  };
  return difficultyMap[level] || '中級';
}

// 問題生成の状態確認
router.get('/status', (req, res) => {
  res.json({
    status: 'active',
    service: '岩沢学院 英検問題自動生成サービス (Gemini)',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

module.exports = router;

