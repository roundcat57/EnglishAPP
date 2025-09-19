const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '../../.env' });

const router = express.Router();

// Gemini APIクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

// 問題生成のプロンプトテンプレート（級ズレ防止プロンプト集 v2準拠）
const generatePrompt = (level, type, count, topics, customInstructions) => {
  const config = levelConfig[level];
  const topic = topics && topics.length > 0 ? topics.join(', ') : '一般的な話題';
  
  const typeInstructions = {
    '語彙': `あなたは英検風の問題作成者。以下の grade_profile に**厳密準拠**で、
${count}問の1空所4択を作成し、**JSONのみ**出力してください。

**重要：級に応じた適切な難易度を必ず守ってください**
- 3級：中学卒業レベル（A2）の複雑な文構造と語彙を使用
- 4級：中学中級レベル（A1+）の基本的な複文構造を含む
- 5級：中学初級レベル（A1）の基本的な文構造

要件：
- **文長は必ず ${config.sentence_words.min}-${config.sentence_words.max} 語**、空所は( )。
- **文構造の複雑さ**：級に応じて従属節、関係代名詞、完了形などを適切に使用
- **語彙レベル**：級に応じた中頻度語彙、句動詞、コロケーションを含む
- **重要**：短い文は禁止。必ず指定された語数以上で作成してください。
- 選択肢は**品詞一致**。ダミーは「語法/前置詞/時制/コロケーション」ズレで自然に見せる（場違い語×）。
- 各問に日本語解説 \`rationale_ja\` と、誤答ごとの \`distractor_notes_ja\` を付す。
- \`targets\` に grammar / vocab_tier / length などメタ情報を格納。
- \`self_check\`で5段階自己採点：語彙難度/文法難度/多解リスク/文長適合/級適合（期待=3）。外れたら**自動修正**後に出力。
- 禁止：過去問再現、低頻度専門語、固有名詞、時事依存。

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
    "uniqueness_rule": "${config.uniqueness_rule}",
    "reading_load": ${JSON.stringify(config.reading_load)}
  }
}

出力JSON：
{
  "type":"cloze_mcq",
  "grade":"${level}",
  "items":[
    {
      "stem":"The students who ( ) the exam last week are now preparing for their next challenge.",
      "options":["passed","pass","passing","will pass"],
      "answer":"passed",
      "rationale_ja":"関係代名詞whoの先行詞はstudentsで、last weekという過去の時間表現があるため過去形passedが正解。",
      "distractor_notes_ja":{
        "pass":"現在形で時間表現と矛盾",
        "passing":"進行形で文脈に合わない",
        "will pass":"未来形で時間表現と矛盾"
      },
      "targets":{"grammar":"関係代名詞+過去形","vocab_tier":"中頻度","length":15},
      "self_check":{"lex_level":3,"gram_level":4,"grade_fit":3,"notes_ja":"3級レベルの複雑な文構造"}
    }
  ]
}`,

    '並び替え': `あなたは英検風の問題作成者。以下の grade_profile に**厳密準拠**で、
${count}問の並べ替え問題を作成し、**JSONのみ**出力してください。

**重要：級に応じた適切な難易度を必ず守ってください**
- 3級：中学卒業レベル（A2）の複雑な文構造と語彙を使用
- 4級：中学中級レベル（A1+）の基本的な複文構造を含む
- 5級：中学初級レベル（A1）の基本的な文構造

要件：
- **トークンは必ず ${config.length_tokens.min}-${config.length_tokens.max} 個**。**句読点を1つ**含める（"," "." "?" など）。
- **文構造の複雑さ**：級に応じて従属節、関係代名詞、完了形などを適切に使用
- **語彙レベル**：級に応じた中頻度語彙、句動詞、コロケーションを含む
- **重要**：短い文は禁止。必ず指定されたトークン数以上で作成してください。
- **唯一解**にするため、限定詞・時制・頻度副詞の位置・前置詞の目的語など"位置が決まる要素"を必ず含める。
- 提示トークンは**すべて小文字**。解答は文頭のみ大文字に。
- 各問に \`why_unique_ja\`：唯一解の理由を具体に説明。
- \`self_check\`で5段階自己採点：語彙難度/文法難度/多解リスク/文長適合/級適合（期待=3）。外れたら**自動修正**後に出力。
- 禁止：過去問再現、低頻度専門語、固有名詞、時事依存。

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
    "uniqueness_rule": "${config.uniqueness_rule}",
    "reading_load": ${JSON.stringify(config.reading_load)}
  }
}

出力JSON：
{
  "type":"jumbled_sentence",
  "grade":"${level}",
  "items":[
    {
      "tokens":["because","was","he","tired","stayed","home","at","yesterday","he","."],
      "answer":"He stayed at home yesterday because he was tired.",
      "why_unique_ja":"because節の位置と時制の一致で唯一解。yesterdayの位置とwas tiredの時制で多解を封じる。",
      "rationale_ja":"because節を使った複合文の構成練習。",
      "self_check":{
        "lex_level":3,
        "gram_level":4,
        "multi_solution_risk":2,
        "length_fit":4,
        "grade_fit":3,
        "notes_ja":"3級レベルの複雑な文構造"
      }
    }
  ]
}`,

    '長文読解': `あなたは英検風の読解作成者。grade_profileに従い、${count}本文の読解セットを**JSONのみ**で作成。

要件：
- 本文語数：${config.wMin}-${config.wMax}語、段落数：${config.para}。
- 設問は各本文につき${config.qPer}問。主旨/詳細/推論/語彙(文脈)をバランス良く。
- 各設問は4択(A–D)。本文の文言と意味で正解が一意。
- 各設問に根拠文 \`evidence\` と日本語解説 \`rationale_ja\` を付す。
- 本文末に級相当の見出し語リスト \`glossary\`（<=10語）。
- 固有名詞は一般的な範囲。文化的バイアスは避ける。
- \`self_check\`で語彙/文法/文長/設問難度/級適合を5段階評価（期待=3）。外れたら修正。

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
    "uniqueness_rule": "${config.uniqueness_rule}",
    "reading_load": ${JSON.stringify(config.reading_load)}
  }
}

出力JSON：
{
  "type":"reading_set",
  "grade":"${level}",
  "topic":"${topic}",
  "passage":{ "title":"{auto_title}","text":"{本文}","word_count":{n} },
  "questions":[
    {"qtype":"main_idea","stem":"What is the main idea of the passage?","options":["A ...","B ...","C ...","D ..."],"answer":"B","evidence":"第2段落: '...'","rationale_ja":"..."}
  ],
  "glossary":[ {"word":"habit","ja":"習慣"} ],
  "self_check": {"lex_level":3,"gram_level":3,"length_fit":3,"q_difficulty":3,"grade_fit":3,"notes_ja":"..."}
}`,

    '英作文': `あなたは英検風のライティング作成者。grade_profileに従い、${count}題の英作文タスクを**JSONのみ**で作成。

要件：
- 形式：賛否/意見説明/メール返信。語数：${config.minWords}-${config.maxWords}語。
- 3級：30–50語、準2：50–70語、2級：80–120語、準1：100–140語、1級：170–230語。
- 評価観点：内容/構成/文法/語彙（各0–4）。観点定義をJSONに含める。
- モデル解答は任意（include_reference=true）。含める場合は級に合った自然さで。
- \`self_check\`で語彙/文法/構成/級適合（期待=3）。外れたら修正。

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
    "uniqueness_rule": "${config.uniqueness_rule}",
    "reading_load": ${JSON.stringify(config.reading_load)}
  }
}

出力JSON：
{
  "type":"writing_task",
  "grade":"${level}",
  "prompt":"Do you agree or disagree that {statement}? Give two reasons.",
  "word_limit":{"min":${config.minWords},"max":${config.maxWords}},
  "rubric":{
    "content":"主張と理由が明確か（0–4）",
    "organization":"段落構成・論理の流れ（0–4）",
    "grammar":"時制/一致/語法の正確さ（0–4）",
    "vocabulary":"適切さと多様性（0–4）"
  },
  "reference_answer_optional": null,
  "self_check": {"lex_level":3,"gram_level":3,"organization":3,"grade_fit":3,"notes_ja":"..."}
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

// 検品・自動修正プロンプト
const validationPrompt = (gradeProfile, itemsJson) => {
  return `下の問題JSONを grade_profile に照らして検品。NGがあれば**修正方針**を箇条書き→
**修正済みJSONのみ**を返す（余計なテキストは不要）。

チェック観点：
1) 語彙：高頻度中心か。低頻度/専門語が混入していないか（同義の平易語に置換）。
2) 文法：allowed_grammar内か。banned_grammarが混入していないか。
3) 文長/情報量：規定範囲か。従属節の数が過多でないか。
4) 並べ替え唯一解：句読点・限定詞・時制で多解を封じているか。多解なら具体例を示し修正。
5) 語彙4択ダミー：全て文法的に成立しうるが、意味/語法の一点で外れているか。場違い語は不可。
6) 読解の設問設計：主旨/詳細/推論/語彙のバランス、根拠の妥当性。
7) 作文：語数/形式/ルーブリックの整合。
8) 自己採点：各指標が3±1に収まること。外れる場合は**再設計**してから返す。

入力：
- grade_profile: ${JSON.stringify(gradeProfile)}
- items_json: ${JSON.stringify(itemsJson)}

出力：修正後JSONのみ`;
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

    // 検品・自動修正（オプション）
    if (questions && questions.items && questions.items.length > 0) {
      try {
        const config = levelConfig[level];
        const validationResult = await model.generateContent(validationPrompt(config, questions));
        const validationResponse = await validationResult.response;
        const validationText = validationResponse.text();
        
        // 検品結果をパース（修正されたJSONがある場合）
        const validationJsonMatch = validationText.match(/\{[\s\S]*\}/);
        if (validationJsonMatch) {
          const validatedQuestions = JSON.parse(validationJsonMatch[0]);
          if (validatedQuestions && validatedQuestions.items) {
            questions = validatedQuestions;
            console.log('問題検品・修正完了');
          }
        }
      } catch (validationError) {
        console.warn('検品処理でエラーが発生しましたが、元の問題を使用します:', validationError.message);
      }
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

