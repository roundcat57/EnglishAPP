export default function handler(req, res) {
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

    // 簡単な問題生成（テスト用）
    const questions = [];
    for (let i = 0; i < (count || 1); i++) {
      questions.push({
        id: `q-${i + 1}`,
        level: level || '3級',
        type: type || '語彙',
        difficulty: '初級',
        content: `${level || '3級'} ${type || '語彙'} 問題 ${i + 1} (API生成成功!)`,
        choices: [
          { id: 'choice_1', text: '選択肢A', isCorrect: true },
          { id: 'choice_2', text: '選択肢B', isCorrect: false },
          { id: 'choice_3', text: '選択肢C', isCorrect: false },
          { id: 'choice_4', text: '選択肢D', isCorrect: false }
        ],
        correctAnswer: '選択肢A',
        explanation: 'APIから正常に生成された問題です。',
        createdAt: new Date(),
        updatedAt: new Date()
      });
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
    res.status(500).json({ error: '問題生成に失敗しました' });
  }
}
