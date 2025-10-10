import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { level, type, count, topics, customInstructions } = req.body;

    // Gemini APIの初期化
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

    // 問題生成のプロンプトを作成
    const prompt = createQuestionPrompt(level, type, count, topics, customInstructions);

    console.log('Generating questions with prompt:', prompt);

    // Gemini APIで問題を生成
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();

    console.log('Generated text:', generatedText);

    // 生成されたテキストを解析して問題オブジェクトに変換
    const questions = parseGeneratedQuestions(generatedText, level, type, count);

    res.status(200).json({
      questions,
      totalGenerated: questions.length,
      generationTime: new Date().toISOString(),
      level: level || '3級',
      type: type || '語彙'
    });
  } catch (error) {
    console.error('問題生成エラー:', error);
    res.status(500).json({ 
      error: '問題生成に失敗しました',
      details: error.message 
    });
  }
}

function createQuestionPrompt(level, type, count, topics, customInstructions) {
  const levelDescriptions = {
    '5級': '小学6年生程度の英語力（語彙: 600語）',
    '4級': '中学2年生程度の英語力（語彙: 1,300語）',
    '3級': '中学卒業程度の英語力（語彙: 2,100語）',
    '準2級': '高校2年生程度の英語力（語彙: 3,600語）',
    '2級': '高校卒業程度の英語力（語彙: 5,100語）',
    '準1級': '大学中級程度の英語力（語彙: 7,500語）',
    '1級': '大学上級程度の英語力（語彙: 10,000語）'
  };

  const typeDescriptions = {
    '語彙': '英単語の意味を選択する問題（全英文）',
    '文法': '英文法の知識を問う問題（全英文）',
    '並び替え': '単語を正しい順序に並び替える問題',
    '長文読解': '長文を読んで質問に答える問題',
    '英作文': '日本語を英語に翻訳する問題'
  };

  let prompt = `英検${level}の${type}問題を${count}問生成してください。

【レベル】${level} - ${levelDescriptions[level] || '指定されたレベルの英語力'}
【問題タイプ】${type} - ${typeDescriptions[type] || '指定されたタイプの問題'}`;

  if (topics && topics.length > 0) {
    prompt += `\n【トピック】${topics.join(', ')}`;
  }

  if (customInstructions) {
    prompt += `\n【特別な指示】${customInstructions}`;
  }

  prompt += `

【出力形式】
以下のJSON形式で出力してください：

{
  "questions": [
    {
      "id": "q-1",
      "level": "${level}",
      "type": "${type}",
      "difficulty": "初級",
      "content": "問題文（問題の内容を詳しく記載）",
      "choices": [
        {"id": "choice_1", "text": "選択肢1", "isCorrect": true},
        {"id": "choice_2", "text": "選択肢2", "isCorrect": false},
        {"id": "choice_3", "text": "選択肢3", "isCorrect": false},
        {"id": "choice_4", "text": "選択肢4", "isCorrect": false}
      ],
      "correctAnswer": "選択肢1",
      "explanation": "正解の説明"
    }
  ]
}

【注意事項】
- 問題文は日本語で記載してください
- 選択肢は日本語で記載してください
- 正解の説明は日本語で記載してください
- 英検${level}のレベルに適した難易度にしてください
- 実際の英検問題の形式に従ってください`;

  return prompt;
}

function parseGeneratedQuestions(generatedText, level, type, count) {
  try {
    // JSON部分を抽出
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON形式が見つかりません');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('questions配列が見つかりません');
    }

    // 問題にIDとタイムスタンプを追加
    return parsed.questions.map((question, index) => ({
      ...question,
      id: `q-${index + 1}`,
      level: level || '3級',
      type: type || '語彙',
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  } catch (error) {
    console.error('問題解析エラー:', error);
    console.error('生成されたテキスト:', generatedText);
    
    // フォールバック: 基本的な問題を生成
    const questions = [];
    for (let i = 0; i < (count || 1); i++) {
      questions.push({
        id: `q-${i + 1}`,
        level: level || '3級',
        type: type || '語彙',
        difficulty: '初級',
        content: `${level || '3級'} ${type || '語彙'} 問題 ${i + 1}\n\n問題文の解析に失敗しました。Gemini APIの応答を確認してください。`,
        choices: [
          { id: 'choice_1', text: '選択肢A', isCorrect: true },
          { id: 'choice_2', text: '選択肢B', isCorrect: false },
          { id: 'choice_3', text: '選択肢C', isCorrect: false },
          { id: 'choice_4', text: '選択肢D', isCorrect: false }
        ],
        correctAnswer: '選択肢A',
        explanation: '問題解析エラーが発生しました。',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    return questions;
  }
}
