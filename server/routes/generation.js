const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '../../.env' });

const router = express.Router();

// Gemini APIクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 英検級別の詳細設定
const levelConfig = {
  '5級': { 
    cefr: 'Pre-A1/A1', 
    vocab: 'NGSL1000中心', 
    sentMin: 5, sentMax: 7, 
    tokenMin: 5, tokenMax: 6,
    wMin: 140, wMax: 220, para: 2, qPer: 3,
    minWords: 30, maxWords: 50
  },
  '4級': { 
    cefr: 'A1', 
    vocab: '日常語彙', 
    sentMin: 6, sentMax: 9, 
    tokenMin: 5, tokenMax: 6,
    wMin: 140, wMax: 220, para: 2, qPer: 3,
    minWords: 30, maxWords: 50
  },
  '3級': { 
    cefr: 'A1-A2', 
    vocab: '基本語彙', 
    sentMin: 8, sentMax: 12, 
    tokenMin: 5, tokenMax: 6,
    wMin: 140, wMax: 220, para: 2, qPer: 4,
    minWords: 30, maxWords: 50
  },
  '準2級': { 
    cefr: 'A2+-B1-', 
    vocab: 'コロケーション/句動詞', 
    sentMin: 10, sentMax: 15, 
    tokenMin: 6, tokenMax: 7,
    wMin: 220, wMax: 350, para: 3, qPer: 4,
    minWords: 50, maxWords: 70
  },
  '2級': { 
    cefr: 'B1', 
    vocab: '一般的語彙', 
    sentMin: 12, sentMax: 18, 
    tokenMin: 6, tokenMax: 7,
    wMin: 350, wMax: 550, para: 3, qPer: 5,
    minWords: 80, maxWords: 120
  },
  '準1級': { 
    cefr: 'B2', 
    vocab: '抽象語彙/学術寄り', 
    sentMin: 15, sentMax: 22, 
    tokenMin: 6, tokenMax: 7,
    wMin: 600, wMax: 800, para: 4, qPer: 5,
    minWords: 100, maxWords: 140
  },
  '1級': { 
    cefr: 'C1', 
    vocab: '学術語彙/複雑な表現', 
    sentMin: 18, sentMax: 28, 
    tokenMin: 6, tokenMax: 7,
    wMin: 800, wMax: 1000, para: 4, qPer: 5,
    minWords: 170, maxWords: 230
  }
};

// 問題生成のプロンプトテンプレート
const generatePrompt = (level, type, count, topics, customInstructions) => {
  const config = levelConfig[level];
  const topic = topics && topics.length > 0 ? topics.join(', ') : '一般的な話題';
  
  const typeInstructions = {
    '語彙': `語彙問題（穴埋め4択）を作成してください。

制約：
- ${count}問の1文穴埋め(4択)を作成
- 級は${level}（${config.cefr}）
- トピックは${topic}
- 各文は${config.sentMin}-${config.sentMax}語
- 空所は1つ「( )」で表記
- 選択肢はA-D、品詞は正解と同一
- ダミーは頻出誤り（語法/コロケーション/時制/前置詞ずれ）を狙う
- 正解は一意、重複正解や多義は避ける
- 各問に日本語解説と誤答ごとの「なぜ違うか」を付す

出力JSONスキーマ：
{
  "type":"cloze_mcq",
  "grade":"${level}",
  "topic":"${topic}",
  "items":[
    {
      "stem":"I ( ) to the library after school.",
      "options":["go","goes","going","gone"],
      "answer":"go",
      "rationale_ja":"主語Iには原形go。三単現ではない。",
      "distractor_notes_ja":{
        "goes":"三人称単数用。",
        "going":"進行形用法/補語が必要。",
        "gone":"過去分詞で単独不可。"
      },
      "targets":{"grammar":"一般動詞現在","vocab_tier":"NGSL1000","length":8}
    }
  ]
}`,

    '並び替え': `英単語並べ替え問題を作成してください。

制約：
- ${count}問の並べ替え問題を作成
- 級は${level}（${config.cefr}）
- トピックは${topic}
- トークンは${config.tokenMin}-${config.tokenMax}個
- 文頭語は必ず小文字で与え、解答時のみ大文字開始
- 句読点トークン[, . ?]も含める
- 同形語による多解を避けるため、時制・数・限定詞をコントロール
- 各問に「唯一解チェック理由」と日本語解説を付す

出力JSON：
{
  "type":"jumbled_sentence",
  "grade":"${level}",
  "items":[
    {
      "tokens":["often","to","I","go","library","the","."],
      "answer":"I often go to the library.",
      "why_unique_ja":"頻度副詞oftenの位置規則でS+often+Vを採用。toの目的語はthe libraryのみで多解なし。",
      "rationale_ja":"頻度副詞の位置練習。"
    }
  ]
}`,

    '長文読解': `長文読解問題を作成してください。

制約：
- ${count}本文の読解セットを作成
- 級は${level}（${config.cefr}）
- トピックは${topic}
- 本文語数：${config.wMin}-${config.wMax}語
- 段落数：${config.para}
- 設問は各本文につき${config.qPer}問
- 内訳：主旨/詳細/推論/語彙(文脈)の比率をバランス
- 各設問は4択(A-D)
- 各設問に根拠文引用と日本語解説を付す
- 本文末に見出し語リスト(級相当)を10語以内で提示

出力JSON：
{
  "type":"reading_set",
  "grade":"${level}",
  "topic":"${topic}",
  "passage":{
    "title":"{auto_title}",
    "text":"{本文}",
    "word_count":{n}
  },
  "questions":[
    {
      "qtype":"main_idea",
      "stem":"What is the main idea of the passage?",
      "options":["A ...","B ...","C ...","D ..."],
      "answer":"B",
      "evidence":"第2段落: \"...\"",
      "rationale_ja":"本文全体はBの要旨に収束。A/Dは枝葉、Cは因果を誤る。"
    }
  ],
  "glossary":[{"word":"habit","ja":"習慣"}]
}`,

    '英作文': `英作文問題を作成してください。

制約：
- ${count}題のライティング課題を作成
- 級は${level}（${config.cefr}）
- トピックは${topic}
- 形式：賛否/意見説明/メール返信
- 語数：${config.minWords}-${config.maxWords}語
- 評価観点：内容/構成/文法/語彙（各0-4）
- 観点定義と例示をJSONに含める
- モデル解答は含める

出力JSON：
{
  "type":"writing_task",
  "grade":"${level}",
  "prompt":"Do you agree or disagree that {statement}? Give two reasons.",
  "word_limit":{"min":${config.minWords},"max":${config.maxWords}},
  "rubric":{
    "content":"主張と理由が明確か（0-4）",
    "organization":"段落構成・論理の流れ（0-4）",
    "grammar":"時制/一致/語法の正確さ（0-4）",
    "vocabulary":"適切さと多様性（0-4）"
  },
  "reference_answer":"{モデル答案}"
}`
  };

  const basePrompt = `あなたは日本の英語検定(英検)に似た形式の問題作成者です。

共通システム指示：
・既存の過去問や文章を記憶から再現・転載しない。必ず新規に創作する。
・各級らしさを語彙/文法/文長/設問タイプで再現する。
・出力は必ず日本語説明つきJSONで返す（コード以外の文章は出力しない）。
・難易度は ${level}（CEFRおおよそ ${config.cefr}）に合わせる。
・トピックは ${topic}（中立的・文化的偏りを避ける）。
・解説は日本語(learners向け)、根拠は英文中の該当箇所を引用して示す。
・選択肢は紛らわしいが文法的に成立するダミーを作る（ただし正解は一つ）。

${typeInstructions[type]}

注意事項：
- 必ず有効なJSON形式で出力してください
- 各級の語彙レベルと文長制限を厳守してください
- 文化的偏りを避け、中立的な内容にしてください
- 既存の過去問を再現せず、必ず新規創作してください`;

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

    // 生成された問題を整形（新しいJSON形式に対応）
    let formattedQuestions = [];
    
    if (questions.type === 'cloze_mcq' && questions.items) {
      // 語彙問題（穴埋め4択）
      formattedQuestions = questions.items.map((item, index) => ({
        id: uuidv4(),
        level,
        type,
        difficulty: getDifficultyFromLevel(level),
        content: item.stem,
        choices: item.options.map((option, i) => ({
          id: `choice_${i}`,
          text: option,
          isCorrect: option === item.answer
        })),
        correctAnswer: item.answer,
        explanation: item.rationale_ja,
        distractorNotes: item.distractor_notes_ja || {},
        targets: item.targets || {},
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    } else if (questions.type === 'jumbled_sentence' && questions.items) {
      // 並び替え問題
      formattedQuestions = questions.items.map((item, index) => ({
        id: uuidv4(),
        level,
        type,
        difficulty: getDifficultyFromLevel(level),
        content: `次の語句を正しい順序に並び替えて英文を作りなさい。\n[${item.tokens.join(', ')}]`,
        correctAnswer: item.answer,
        explanation: item.rationale_ja,
        whyUnique: item.why_unique_ja,
        tokens: item.tokens,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    } else if (questions.type === 'reading_set' && questions.passage && questions.questions) {
      // 長文読解問題
      formattedQuestions = [{
        id: uuidv4(),
        level,
        type,
        difficulty: getDifficultyFromLevel(level),
        content: `【${questions.passage.title}】\n\n${questions.passage.text}`,
        passage: {
          title: questions.passage.title,
          text: questions.passage.text,
          wordCount: questions.passage.word_count
        },
        questions: questions.questions.map((q, i) => ({
          id: `q_${i}`,
          qtype: q.qtype,
          stem: q.stem,
          options: q.options,
          answer: q.answer,
          evidence: q.evidence,
          explanation: q.rationale_ja
        })),
        glossary: questions.glossary || [],
        createdAt: new Date(),
        updatedAt: new Date()
      }];
    } else if (questions.type === 'writing_task') {
      // 英作文問題
      formattedQuestions = [{
        id: uuidv4(),
        level,
        type,
        difficulty: getDifficultyFromLevel(level),
        content: questions.prompt,
        wordLimit: questions.word_limit,
        rubric: questions.rubric,
        referenceAnswer: questions.reference_answer,
        createdAt: new Date(),
        updatedAt: new Date()
      }];
    } else {
      // 従来の形式（後方互換性）
      formattedQuestions = (questions.questions || []).map((q, index) => ({
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
    }

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

