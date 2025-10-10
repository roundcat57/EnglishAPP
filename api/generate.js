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

    // 問題生成のプロンプトを作成（詳細なレベル設定を使用）
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

// 英検級別の詳細設定（級ズレ防止プロンプト集 v2準拠）
const levelConfig = {
  '5級': {
    grade: '5級',
    target_cefr: 'A1',
    length_tokens: { min: 6, max: 8 },
    sentence_words: { min: 8, max: 12 },
    allowed_grammar: ['be動詞/一般動詞（現在）', 'can', '前置詞 in/on/at', '現在進行形', '過去形（基本）'],
    banned_grammar: ['受動態', '完了形', '関係代名詞', '分詞構文', '比較級'],
    vocab_policy: { bands_ok: ['高頻度日常語彙'], bands_caution: ['基本句動詞'], bands_ng: ['専門語', '低頻度イディオム'] },
    distractor_policy: { part_of_speech_match: true, confusability: ['三単現', '時制ズレ', '前置詞ズレ'] },
    uniqueness_rule: '並べ替えは唯一解。句読点と限定詞で多解を封じる。',
    reading_load: { clauses_max: 1 },
    wMin: 140, wMax: 220, para: 2, qPer: 3,
    minWords: 30, maxWords: 50
  },
  '4級': {
    grade: '4級',
    target_cefr: 'A1+',
    length_tokens: { min: 7, max: 9 },
    sentence_words: { min: 10, max: 15 },
    allowed_grammar: ['現在進行形', '過去（規則動詞中心）', '頻度副詞', 'will', '比較級（基本）'],
    banned_grammar: ['受動態(複雑)', '完了形', '関係代名詞', '分詞構文'],
    vocab_policy: { bands_ok: ['高頻度日常語彙', '基本句動詞'], bands_caution: ['中頻度語彙'], bands_ng: ['専門語'] },
    distractor_policy: { part_of_speech_match: true, confusability: ['時制ズレ', '語順ズレ', '比較級ズレ'] },
    uniqueness_rule: 'this/these等は片方のみ使用。',
    reading_load: { clauses_max: 2 },
    wMin: 140, wMax: 220, para: 2, qPer: 3,
    minWords: 30, maxWords: 50
  },
  '3級': {
    grade: '3級',
    target_cefr: 'A2',
    length_tokens: { min: 8, max: 10 },
    sentence_words: { min: 12, max: 18 },
    allowed_grammar: ['because/if節', '比較級/最上級', 'be going to', '現在完了形', '受動態（基本）', '関係代名詞that', '不定詞/動名詞'],
    banned_grammar: ['分詞構文', '高度な倒置', '関係代名詞の省略', '仮定法'],
    vocab_policy: { bands_ok: ['中頻度語彙', '句動詞'], bands_caution: ['高頻度語彙'], bands_ng: ['専門語', '超低頻度語'] },
    distractor_policy: { part_of_speech_match: true, confusability: ['時制ズレ', '比較級ズレ', '語法ズレ', '前置詞ズレ'] },
    uniqueness_rule: 'because/if節の位置と時制で多解を封じる。',
    reading_load: { clauses_max: 3 },
    wMin: 140, wMax: 220, para: 2, qPer: 4,
    minWords: 30, maxWords: 50
  },
  '準2級': {
    grade: '準2級',
    target_cefr: 'A2+/B1-',
    length_tokens: { min: 6, max: 7 },
    sentence_words: { min: 10, max: 15 },
    allowed_grammar: ['受動態(過去/現在)', '不定詞/動名詞', '関係代名詞 that/which'],
    banned_grammar: ['仮定法過去完了', '分詞構文の多重化', '高度な倒置'],
    vocab_policy: { bands_ok: ['コロケーション/句動詞'], bands_caution: ['中頻度語彙'], bands_ng: ['専門語'] },
    distractor_policy: { part_of_speech_match: true, confusability: ['語法ズレ', '前置詞ズレ'] },
    uniqueness_rule: '関係代名詞の先行詞で多解を封じる。',
    reading_load: { clauses_max: 3 },
    wMin: 220, wMax: 350, para: 3, qPer: 4,
    minWords: 50, maxWords: 70
  },
  '2級': {
    grade: '2級',
    target_cefr: 'B1',
    length_tokens: { min: 6, max: 7 },
    sentence_words: { min: 12, max: 18 },
    allowed_grammar: ['現在完了(継続/経験/完了)', '受動', '分詞構文(単純)'],
    banned_grammar: ['仮定法過去完了(高度)', '関係副詞の多重入れ子'],
    vocab_policy: { bands_ok: ['一般的語彙'], bands_caution: ['中頻度語彙'], bands_ng: ['専門語'] },
    distractor_policy: { part_of_speech_match: true, confusability: ['完了形ズレ', '受動態ズレ'] },
    uniqueness_rule: '完了形の時間表現で多解を封じる。',
    reading_load: { clauses_max: 4 },
    wMin: 350, wMax: 550, para: 3, qPer: 5,
    minWords: 80, maxWords: 120
  },
  '準1級': {
    grade: '準1級',
    target_cefr: 'B2',
    length_tokens: { min: 6, max: 7 },
    sentence_words: { min: 15, max: 22 },
    allowed_grammar: ['複文(従属節)の拡張', '抽象話題', 'コロケーション強化'],
    banned_grammar: ['C1相当の学術長文構文(ここでは不可)'],
    vocab_policy: { bands_ok: ['抽象語彙/学術寄り'], bands_caution: ['高頻度語彙'], bands_ng: ['超低頻度語'] },
    distractor_policy: { part_of_speech_match: true, confusability: ['コロケーションズレ', '抽象度ズレ'] },
    uniqueness_rule: '抽象概念の具体例で多解を封じる。',
    reading_load: { clauses_max: 5 },
    wMin: 600, wMax: 800, para: 4, qPer: 5,
    minWords: 100, maxWords: 140
  },
  '1級': {
    grade: '1級',
    target_cefr: 'C1',
    length_tokens: { min: 7, max: 8 },
    sentence_words: { min: 18, max: 28 },
    allowed_grammar: ['高度な従属節', '慣用表現', '抽象的・学術寄り語彙'],
    banned_grammar: ['C2相当の専門領域の超低頻度語'],
    vocab_policy: { bands_ok: ['学術語彙/複雑な表現'], bands_caution: ['中頻度語彙'], bands_ng: ['超専門語'] },
    distractor_policy: { part_of_speech_match: true, confusability: ['慣用表現ズレ', '抽象度ズレ'] },
    uniqueness_rule: '高度な構文の論理関係で多解を封じる。',
    reading_load: { clauses_max: 6 },
    wMin: 800, wMax: 1000, para: 4, qPer: 5,
    minWords: 170, maxWords: 230
  }
};

function createQuestionPrompt(level, type, count, topics, customInstructions) {
  const config = levelConfig[level];
  if (!config) {
    throw new Error(`未対応のレベル: ${level}`);
  }

  const topic = topics && topics.length > 0 ? topics.join(', ') : '一般的な話題';
  
  const typeInstructions = {
    '語彙': `あなたは英検風の問題作成者。以下の grade_profile に**厳密準拠**で、
${count}問の1空所4択を作成し、**JSONのみ**出力してください。

**重要：級に応じた適切な難易度を必ず守ってください**
- 3級：中学卒業レベル（A2）の複雑な文構造と語彙を使用
- 4級：中学中級レベル（A1+）の基本的な複文構造を含む
- 5級：中学初級レベル（A1）の基本的な文構造

**問題の多様性を確保してください：**
- 動詞、名詞、形容詞、副詞、前置詞など様々な品詞をバランスよく出題
- 時制、受動態、比較級、関係代名詞など様々な文法項目を含む
- 日常会話、学校生活、趣味、家族、旅行、環境、科学、文化など様々なトピックから出題
- 文の長さや複雑さも変化をつける
- 単語の意味、文法、語法、慣用表現など様々な観点から出題

要件：
- **文長は必ず ${config.sentence_words.min}-${config.sentence_words.max} 語**、空所は( )。
- **文構造の複雑さ**：級に応じて従属節、関係代名詞、完了形などを適切に使用
- **語彙レベル**：級に応じた中頻度語彙、句動詞、コロケーションを含む
- **重要**：短い文は禁止。必ず指定された語数以上で作成してください。
- 選択肢は**品詞一致**。ダミーは「語法/前置詞/時制/コロケーション」ズレで自然に見せる（場違い語×）。
- 各問に日本語解説 \`rationale_ja\` と、誤答ごとの \`distractor_notes_ja\` を付す。
- \`targets\` に grammar / vocab_tier / length などメタ情報を格納。
- \`self_check\`で5段階自己採点：語彙難度/文法難度/多解リスク/文長適合/級適合（期待=3）。外れたら**自動修正**後に出力。

入力 grade_profile:
{
  "grade_profile": {
    "grade": "${config.grade}",
    "target_cefr": "${config.target_cefr}",
    "length_tokens": { "min": ${config.length_tokens.min}, "max": ${config.length_tokens.max} },
    "sentence_words": { "min": ${config.sentence_words.min}, "max": ${config.sentence_words.max} },
    "allowed_grammar": ${JSON.stringify(config.allowed_grammar)},
    "banned_grammar": ${JSON.stringify(config.banned_grammar)},
    "vocab_policy": ${JSON.stringify(config.vocab_policy)},
    "distractor_policy": ${JSON.stringify(config.distractor_policy)},
    "uniqueness_rule": "${config.uniqueness_rule}"
  }
}

出力JSONスキーマ:
{
  "type": "vocabulary",
  "grade": "${config.grade}",
  "items": [
    {
      "question": "完全な英文（空所は( )で表現）",
      "choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
      "answer": "選択肢1",
      "rationale_ja": "正解の理由（日本語）",
      "distractor_notes_ja": ["誤答1の理由", "誤答2の理由", "誤答3の理由"],
      "targets": {
        "grammar": "使用文法項目",
        "vocab_tier": "語彙レベル",
        "length": ${config.sentence_words.min}
      },
      "self_check": {
        "vocab_difficulty": 3,
        "grammar_difficulty": 3,
        "ambiguity_risk": 3,
        "length_fit": 3,
        "grade_fit": 3
      }
    }
  ]
}`,

    '文法': `あなたは英検風の文法問題作成者。grade_profileに従い、${count}問の文法問題を**JSONのみ**で作成。

要件：
- **文長は必ず ${config.sentence_words.min}-${config.sentence_words.max} 語**、空所は( )。
- **文法項目**：${config.allowed_grammar.join(', ')}を使用
- **禁止文法**：${config.banned_grammar.join(', ')}は使用禁止
- 選択肢は**品詞一致**。ダミーは「語法/前置詞/時制/コロケーション」ズレで自然に見せる
- 各問に日本語解説 \`rationale_ja\` を付す

出力JSONスキーマ:
{
  "type": "grammar",
  "grade": "${config.grade}",
  "items": [
    {
      "question": "完全な英文（空所は( )で表現）",
      "choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
      "answer": "選択肢1",
      "rationale_ja": "正解の理由（日本語）"
    }
  ]
}`,

    '並び替え': `あなたは英検風の並び替え問題作成者。grade_profileに従い、${count}問の並び替え問題を**JSONのみ**で作成。

要件：
- **トークン数**：${config.length_tokens.min}-${config.length_tokens.max}個
- **文法項目**：${config.allowed_grammar.join(', ')}を使用
- **禁止文法**：${config.banned_grammar.join(', ')}は使用禁止
- 各問に日本語解説 \`rationale_ja\` を付す

出力JSONスキーマ:
{
  "type": "jumbled_sentence",
  "grade": "${config.grade}",
  "items": [
    {
      "tokens": ["単語1", "単語2", "単語3", "単語4", "単語5", "単語6"],
      "answer": "正しい英文",
      "rationale_ja": "正解の理由（日本語）"
    }
  ]
}`,

    '長文読解': `あなたは英検風の読解作成者。grade_profileに従い、${count}本文の読解セットを**JSONのみ**で作成。

要件：
- 本文語数：${config.wMin}-${config.wMax}語、段落数：${config.para}。
- 設問は各本文につき${config.qPer}問。主旨/詳細/推論/語彙(文脈)をバランス良く。
- 各設問は4択(A–D)。本文の文言と意味で正解が一意。
- 各設問に根拠文 \`evidence\` と日本語解説 \`rationale_ja\` を付す。

出力JSONスキーマ:
{
  "type": "reading_comprehension",
  "grade": "${config.grade}",
  "items": [
    {
      "passage": "本文（${config.wMin}-${config.wMax}語）",
      "questions": [
        {
          "question": "設問文",
          "choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
          "answer": "選択肢1",
          "evidence": "根拠となる本文の部分",
          "rationale_ja": "正解の理由（日本語）"
        }
      ]
    }
  ]
}`,

    '英作文': `あなたは英検風の英作文問題作成者。grade_profileに従い、${count}問の英作文問題を**JSONのみ**で作成。

要件：
- **語数**：${config.minWords}-${config.maxWords}語
- **文法項目**：${config.allowed_grammar.join(', ')}を使用
- **禁止文法**：${config.banned_grammar.join(', ')}は使用禁止
- 各問に日本語解説 \`rationale_ja\` を付す

出力JSONスキーマ:
{
  "type": "essay",
  "grade": "${config.grade}",
  "items": [
    {
      "topic": "作文テーマ（日本語）",
      "instructions": "作文の指示（日本語）",
      "sample_answer": "模範解答（英語）",
      "rationale_ja": "解答のポイント（日本語）"
    }
  ]
}`
  };

  const instruction = typeInstructions[type];
  if (!instruction) {
    throw new Error(`未対応の問題タイプ: ${type}`);
  }

  let prompt = instruction;

  if (topics && topics.length > 0) {
    prompt += `\n\n【トピック指定】${topics.join(', ')}の内容を含む問題を作成してください。`;
  }

  if (customInstructions) {
    prompt += `\n\n【特別な指示】${customInstructions}`;
  }

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
    
    if (!parsed.items || !Array.isArray(parsed.items)) {
      throw new Error('items配列が見つかりません');
    }

    // 問題にIDとタイムスタンプを追加
    return parsed.items.map((item, index) => {
      const baseQuestion = {
        id: `q-${index + 1}`,
        level: level || '3級',
        type: type || '語彙',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 問題タイプに応じて構造を調整
      if (type === '語彙' || type === '文法') {
        return {
          ...baseQuestion,
          difficulty: '初級',
          content: item.question,
          choices: item.choices.map((choice, i) => ({
            id: `choice_${i + 1}`,
            text: choice,
            isCorrect: choice === item.answer
          })),
          correctAnswer: item.answer,
          explanation: item.rationale_ja
        };
      } else if (type === '並び替え') {
        return {
          ...baseQuestion,
          difficulty: '初級',
          content: `以下の単語を正しい順序に並び替えなさい。\n\n${item.tokens.join(' / ')}`,
          choices: [
            { id: 'choice_1', text: item.answer, isCorrect: true },
            { id: 'choice_2', text: '選択肢B', isCorrect: false },
            { id: 'choice_3', text: '選択肢C', isCorrect: false },
            { id: 'choice_4', text: '選択肢D', isCorrect: false }
          ],
          correctAnswer: item.answer,
          explanation: item.rationale_ja
        };
      } else if (type === '長文読解') {
        return {
          ...baseQuestion,
          difficulty: '初級',
          content: `${item.passage}\n\n質問：${item.questions[0].question}`,
          choices: item.questions[0].choices.map((choice, i) => ({
            id: `choice_${i + 1}`,
            text: choice,
            isCorrect: choice === item.questions[0].answer
          })),
          correctAnswer: item.questions[0].answer,
          explanation: item.questions[0].rationale_ja
        };
      } else if (type === '英作文') {
        return {
          ...baseQuestion,
          difficulty: '初級',
          content: `【テーマ】${item.topic}\n\n【指示】${item.instructions}`,
          choices: [
            { id: 'choice_1', text: '模範解答を表示', isCorrect: true },
            { id: 'choice_2', text: '選択肢B', isCorrect: false },
            { id: 'choice_3', text: '選択肢C', isCorrect: false },
            { id: 'choice_4', text: '選択肢D', isCorrect: false }
          ],
          correctAnswer: '模範解答を表示',
          explanation: `${item.rationale_ja}\n\n【模範解答】\n${item.sample_answer}`
        };
      }

      return baseQuestion;
    });
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
