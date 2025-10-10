const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async function handler(req, res) {
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
    const { level, type, count } = req.body;

    // Gemini APIキーの確認
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set');
      return res.status(500).json({ error: 'Gemini APIキーが設定されていません' });
    }

    // Gemini APIクライアントの初期化
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 問題生成のプロンプト
    const prompt = `あなたは英検の問題作成者です。以下の条件で${count || 1}問の${level}${type}問題を作成してください。

条件：
- 級：${level}
- 問題タイプ：${type}
- 問題数：${count || 1}問

${type === '語彙' ? `
語彙問題の要件：
- 英文の空所に適切な単語を選ぶ4択問題
- 選択肢は品詞が一致する
- 文の長さは10-20語程度
- 級に応じた語彙レベルを使用
` : type === '並び替え' ? `
並び替え問題の要件：
- 日本語の意味に合うように英単語を並び替える
- 5-8個の単語を並び替え
- 級に応じた文法レベルを使用
` : type === '長文読解' ? `
長文読解問題の要件：
- 100-200語程度の英文
- 3-4問の設問
- 主旨、詳細、推論問題を含む
` : type === '英作文' ? `
英作文問題の要件：
- 級に応じた語数指定（3級：30-50語、準2級：50-70語、2級：80-120語）
- 賛否、意見説明、体験談などの形式
` : ''}

出力形式（JSON）：
{
  "questions": [
    {
      "id": "q1",
      "level": "${level}",
      "type": "${type}",
      "difficulty": "初級",
      "content": "問題文",
      "choices": [
        {"id": "choice_1", "text": "選択肢A", "isCorrect": true},
        {"id": "choice_2", "text": "選択肢B", "isCorrect": false},
        {"id": "choice_3", "text": "選択肢C", "isCorrect": false},
        {"id": "choice_4", "text": "選択肢D", "isCorrect": false}
      ],
      "correctAnswer": "選択肢A",
      "explanation": "正解の説明"
    }
  ]
}

必ず有効なJSON形式で出力してください。`;

    console.log('Gemini API呼び出し開始');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini API応答:', text);

    // JSONレスポンスをパース
    let questions;
    try {
      // JSON部分を抽出
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        questions = parsed.questions || [];
      } else {
        throw new Error('JSONレスポンスが見つかりません');
      }
    } catch (parseError) {
      console.error('JSONパースエラー:', parseError);
      console.error('Geminiの応答:', text);
      
      // パースに失敗した場合はダミーデータを返す
      questions = [];
      for (let i = 0; i < (count || 1); i++) {
        questions.push({
          id: `q-${i + 1}`,
          level: level || '3級',
          type: type || '語彙',
          difficulty: '初級',
          content: `${level || '3級'} ${type || '語彙'} 問題 ${i + 1} (AI生成失敗)`,
          choices: [
            { id: 'choice_1', text: '選択肢A', isCorrect: true },
            { id: 'choice_2', text: '選択肢B', isCorrect: false },
            { id: 'choice_3', text: '選択肢C', isCorrect: false },
            { id: 'choice_4', text: '選択肢D', isCorrect: false }
          ],
          correctAnswer: '選択肢A',
          explanation: 'AI生成に失敗したため、ダミーデータを表示しています。',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    res.status(200).json({
      questions,
      totalGenerated: questions.length,
      generationTime: new Date().toISOString(),
      level: level || '3級',
      type: type || '語彙'
    });

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
}
