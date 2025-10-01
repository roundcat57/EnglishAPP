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

  if (req.method === 'POST') {
    // スコア保存（簡易版）
    const { studentId, questionSetId, level, type, score, totalQuestions, correctAnswers, timeSpent } = req.body;
    
    res.status(200).json({
      success: true,
      message: 'スコアを保存しました',
      score: {
        id: `score-${Date.now()}`,
        studentId,
        questionSetId,
        level,
        type,
        score,
        totalQuestions,
        correctAnswers,
        timeSpent,
        createdAt: new Date().toISOString()
      }
    });
  } else if (req.method === 'GET') {
    // スコア一覧取得（簡易版）
    res.status(200).json({
      scores: [],
      total: 0
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
