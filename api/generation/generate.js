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
    const { grade, type, numQuestions } = req.body;

    // 簡単な問題生成（実際のGemini APIは後で実装）
    const questions = [];
    for (let i = 0; i < numQuestions; i++) {
      questions.push({
        id: `q-${i + 1}`,
        question: `${grade} ${type} 問題 ${i + 1}`,
        options: ['選択肢A', '選択肢B', '選択肢C', '選択肢D'],
        correctAnswer: '選択肢A',
        explanation: '正解の説明です。'
      });
    }

    res.status(200).json({
      success: true,
      questions,
      metadata: {
        grade,
        type,
        count: questions.length,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('問題生成エラー:', error);
    res.status(500).json({ error: '問題生成に失敗しました' });
  }
}
