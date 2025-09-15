const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '../../.env' });

const router = express.Router();

// Gemini APIクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 問題生成のプロンプトテンプレート
const generatePrompt = (level, type, count, topics, customInstructions) => {
  const levelInfo = {
    '5級': { vocab: '600語', description: '初歩的な英語の基礎知識', age: '小学生高学年〜中学生' },
    '4級': { vocab: '1300語', description: '中学中級程度の英語力', age: '中学生' },
    '3級': { vocab: '2100語', description: '中学卒業程度の英語力', age: '中学生〜高校生' },
    '準2級': { vocab: '3600語', description: '高校中級程度の英語力', age: '高校生' },
    '2級': { vocab: '5100語', description: '高校卒業程度の英語力', age: '高校生〜大学生' },
    '準1級': { vocab: '7500語', description: '大学中級程度の英語力', age: '大学生〜社会人' },
    '1級': { vocab: '10000語', description: '大学上級程度の英語力', age: '大学生〜社会人' }
  };

  const typeInstructions = {
    '語彙': `語彙問題の作成指示：
- 問題文は全て英文で作成してください
- 選択肢は4つ全て英文で作成してください
- 英検${level}の語彙レベル（${levelInfo[level].vocab}）に合わせてください
- 固有名詞以外は小文字で表記してください
- 問題文の例: "Choose the word that best fits the blank: I like to _____ books in my free time."`,

    '並び替え': `並び替え問題の作成指示：
- 日本語の文を提示してください
- 英単語と記号をランダムに並べて提示してください
- 固有名詞とI以外は全て小文字で表記してください
- 正解と同じ順番にならないように注意してください
- 問題文の例: "私は昨日学校に行きました。\n[went, to, school, yesterday, I]"
- 正解: "I went to school yesterday."`,

    '長文読解': `長文読解問題の作成指示：
- 英検${level}の長文レベルに合わせた文章を作成してください
- 設問文と選択肢は全て英文で作成してください
- 文章の長さは級に応じて調整してください（5級: 50-100語、1級: 300-500語）
- 内容は一般的で理解しやすいものにしてください`,

    '英作文': `英作文問題の作成指示：
- 英検${level}の過去問題形式に合わせてください
- 指定語数は級に応じて調整してください（5級: 20-30語、1級: 200-250語）
- テーマは級に応じた適切な内容にしてください
- 日本語で指示を出してください`
  };

  const basePrompt = `あなたは英検${level}の問題作成の専門家です。
以下の条件で${count}問の問題を作成してください：

問題タイプ: ${type}
英検レベル: ${level} (${levelInfo[level].description}, 語彙レベル: ${levelInfo[level].vocab})
問題数: ${count}問

${topics ? `トピック: ${topics.join(', ')}` : ''}
${customInstructions ? `追加指示: ${customInstructions}` : ''}

${typeInstructions[type]}

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
      "correctAnswer": "正解の選択肢または正解文",
      "explanation": "日本語での詳細な解説"
    }
  ]
}

注意事項：
- 選択肢がある問題は4つ作成してください
- 正解は1つだけにしてください
- 解説は日本語で詳細に作成してください
- 英検${level}の難易度に適した内容にしてください
- 必ず有効なJSON形式で出力してください
- 近年の英検過去問題を参考にしてください`;

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
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
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

