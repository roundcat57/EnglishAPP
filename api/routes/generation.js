const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '../../.env' });

const router = express.Router();

// Gemini APIクライアントの初期化
if (!process.env.GEMINI_API_KEY) {
  console.error('[ERROR] GEMINI_API_KEY is not set. Please set your API key in .env file');
  console.error('[ERROR] Example: GEMINI_API_KEY=your_api_key_here');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Gemini モデルの設定
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash"; // 環境変数があればそれを優先
console.log("[Gemini] Using model:", MODEL);

// API制限対策の設定
const API_CONFIG = {
  maxRetries: 3,
  retryDelay: 5000, // 5秒
  enableValidation: process.env.ENABLE_VALIDATION === 'true', // デフォルトで無効
  dailyQuotaLimit: parseInt(process.env.DAILY_QUOTA_LIMIT) || 1400, // 1日1400回（検品なし）
  requestCount: 0,
  lastResetDate: new Date().toDateString()
};

// API使用量をリセットする関数
function resetDailyCount() {
  const today = new Date().toDateString();
  if (API_CONFIG.lastResetDate !== today) {
    API_CONFIG.requestCount = 0;
    API_CONFIG.lastResetDate = today;
    console.log(`[API] Daily count reset. Today: ${today}`);
  }
}

// API使用量をチェックする関数
function checkQuotaLimit() {
  resetDailyCount();
  // テスト用に制限を一時的に無効化
  if (process.env.DISABLE_QUOTA_CHECK === 'true') {
    return;
  }
  if (API_CONFIG.requestCount >= API_CONFIG.dailyQuotaLimit) {
    throw new Error(`API quota exceeded. Daily limit: ${API_CONFIG.dailyQuotaLimit}, Used: ${API_CONFIG.requestCount}`);
  }
}

// API使用量をインクリメントする関数
function incrementRequestCount() {
  resetDailyCount();
  API_CONFIG.requestCount++;
  console.log(`[API] Request count: ${API_CONFIG.requestCount}/${API_CONFIG.dailyQuotaLimit}`);
}

// リトライ機能付きのAPI呼び出し関数
async function callGeminiWithRetry(model, prompt, operation = 'generate') {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set. Please configure your API key in .env file');
  }
  
  checkQuotaLimit();
  
  for (let attempt = 1; attempt <= API_CONFIG.maxRetries; attempt++) {
    try {
      console.log(`[API] ${operation} attempt ${attempt}/${API_CONFIG.maxRetries}`);
      incrementRequestCount();
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log(`[API] ${operation} successful on attempt ${attempt}`);
      return text;
      
    } catch (error) {
      console.error(`[API] ${operation} attempt ${attempt} failed:`, error.message);
      
      // 429エラー（クォータ超過）の場合
      if (error.message.includes('429') || error.message.includes('quota')) {
        if (attempt < API_CONFIG.maxRetries) {
          const retryDelay = API_CONFIG.retryDelay * attempt; // 指数バックオフ
          console.log(`[API] Quota exceeded. Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        } else {
          throw new Error(`API quota exceeded after ${API_CONFIG.maxRetries} attempts. Please try again tomorrow.`);
        }
      }
      
      // その他のエラーの場合
      if (attempt < API_CONFIG.maxRetries) {
        console.log(`[API] Retrying in ${API_CONFIG.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
      } else {
        throw error;
      }
    }
  }
}

// 英検級別の詳細設定（級ズレ防止プロンプト集 v2準拠）
const levelConfig = {
  '5級': {
    grade: '5級',
    target_cefr: 'A1',
    // 並べ替え問題専用設定
    jumbled_tokens: { min: 6, max: 8 },
    jumbled_anchors: { min: 3 },
    jumbled_movables: { min: 1, max: 1 },
    jumbled_grammar_tier: 1,
    jumbled_banned_grammar: ['受動態', '完了形', '関係代名詞', '分詞構文'],
    // 従来の設定（他の問題タイプ用）
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
    // 並べ替え問題専用設定
    jumbled_tokens: { min: 7, max: 9 },
    jumbled_anchors: { min: 3 },
    jumbled_movables: { min: 1, max: 2 },
    jumbled_grammar_tier: 2,
    jumbled_banned_grammar: ['完了形', '複雑受動態', '関係代名詞'],
    // 従来の設定（他の問題タイプ用）
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
    // 並べ替え問題専用設定
    jumbled_tokens: { min: 8, max: 10 },
    jumbled_anchors: { min: 2 },
    jumbled_movables: { min: 2, max: 2 },
    jumbled_grammar_tier: 3,
    jumbled_banned_grammar: ['分詞構文', '高度倒置'],
    // 従来の設定（他の問題タイプ用）
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
    // 並べ替え問題専用設定（詳細仕様準拠）
    jumbled_tokens: { min: 12, max: 16 }, // 語彙問題に合わせて長めに
    jumbled_anchors: { min: 2, max: 3 },
    jumbled_movables: { min: 2, max: 3 }, // 2-3個
    jumbled_grammar_tier: 4,
    jumbled_patterns: ['P1', 'P2', 'P3'], // 構文パターン（いずれか1つだけ必須）
    jumbled_pattern_descriptions: {
      'P1': '受動態 (現在/過去) ※完了形は不可',
      'P2': 'to不定詞（副詞的目的/結果） ※「to + 動詞原形」の一塊',
      'P3': 'that節の目的語（think/say/know + that + SV）※関係代名詞ではない'
    },
    jumbled_banned_grammar: ['現在完了', '過去完了', '関係代名詞', '関係副詞', '高度な倒置', '分詞構文の多重化', '学術語'],
    jumbled_lexicon: '高頻度語(NGSL 1–2000相当)中心',
    jumbled_difficulty_range: { min: 0.54, max: 0.62 },
    // 従来の設定（他の問題タイプ用）
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
    // 並べ替え問題専用設定（詳細仕様準拠）
    jumbled_tokens: { min: 13, max: 18 }, // 準2級より長く
    jumbled_anchors: { min: 2, max: 2 }, // ちょうど2個
    jumbled_movables: { min: 3, max: 5 }, // 3以上
    jumbled_movable_types_min: 2, // 2種以上
    jumbled_grammar_tier: 5,
    jumbled_patterns: ['Q1', 'Q2', 'Q3'], // 構文パターン（いずれか1つだけ必須）
    jumbled_pattern_descriptions: {
      'Q1': '現在完了 + 期間/起点句（for/since〜）※完了の語順固定',
      'Q2': '制限用法の関係代名詞（that/who/which）※非限定(カンマ)は禁止',
      'Q3': 'Wh疑問 + 助動/Do系の倒置（必要に応じて受動/完了を含んでも良い）'
    },
    jumbled_banned_grammar: ['that節(目的語)のみの文', '受動だけ/不定詞だけの文', '過去完了', '分詞構文の連鎖', '学術語'],
    jumbled_lexicon: 'NGSL 1–2800まで許可（専門語NG）',
    jumbled_difficulty_range: { min: 0.64, max: 0.76 },
    // 従来の設定（他の問題タイプ用）
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
    // 並べ替え問題専用設定
    jumbled_tokens: { min: 7, max: 8 },
    jumbled_anchors: { min: 1 },
    jumbled_movables: { min: 3, max: 4 },
    jumbled_grammar_tier: 6,
    jumbled_required_grammar: ['分詞修飾', '非定形節', '前置詞残置'], // いずれか必須
    jumbled_banned_grammar: ['C1相当の学術長文構文'],
    // 従来の設定（他の問題タイプ用）
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
    // 並べ替え問題専用設定
    jumbled_tokens: { min: 7, max: 8 },
    jumbled_anchors: { min: 1 },
    jumbled_movables: { min: 4, max: 5 },
    jumbled_grammar_tier: 7,
    jumbled_required_grammar: ['高度な分詞構文', '複雑な関係節', '倒置構文'],
    jumbled_banned_grammar: ['C2相当の超高度構文'],
    // 従来の設定（他の問題タイプ用）
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

    '並び替え': `あなたは日本の英語検定(英検)に似た形式の問題作成者かつ検査官です。
- 既存の過去問の再現は禁止。すべて新規に創作。
- 出力はJSONのみ。余計なテキストは出さない。
- 固有名詞や時事依存は使わない。
- 「唯一解」を最優先。多解の疑いが残るものは破棄。

**問題の多様性を確保してください：**
- 日常会話、学校生活、趣味、家族、旅行、環境、科学、文化など様々なトピックから出題
- 文の長さや複雑さも変化をつける
- 動詞、名詞、形容詞、副詞、前置詞など様々な品詞を含む文を作成
- 時制、受動態、比較級、関係代名詞など様々な文法項目を含む

${config.grade === '2級' ? `目的: 2級(B1)の並べ替え問題を ${count} 問作る。出力はJSONのみ。準2より文長/構文/可動要素で明確に難化。

【2級の必須構文（いずれか1つのみ）】
- Q1: 現在完了 + 期間/起点句（for/since〜）※完了の語順固定
- Q2: 制限用法の関係代名詞（that/who/which）※非限定(カンマ)は禁止
- Q3: Wh疑問 + 助動/Do系の倒置（必要に応じて受動/完了を含んでも良い）

【禁止】
- that節(目的語)のみの文、受動だけ/不定詞だけの文（準2の再現を禁止）
- 過去完了・分詞構文の連鎖・学術語

【トークン/要素 目標】
- tokens: **13–18**（句読点を必ず1つ含める）
- anchors: **ちょうど2**（句読点1 + 助動/時制マーカー/限定詞のいずれかで合計2）
- movables: **3以上**（**タイプは2種以上**：例=頻度副詞+前置詞句+期間句/関係節/Wh句…）
- 語彙: NGSL 1–2800まで許可（専門語NG）

【唯一解ルール】
- Q1: for/since句は**文末固定**、have/has + 過去分詞の語順固定
- Q2: 関係代名詞は**先行詞直後**、非限定は禁止
- Q3: **Wh + 助動/Do系の倒置**で先頭固定
- this/theseは片方のみ、頻度副詞は be直後/一般動詞直前

【自己検査（各アイテムに必須）】
- grammar_gate: Q1/Q2/Q3のいずれか1つ=Yes
- tokens_in_range: Yes（13–18）
- anchors_count = 2
- movables_count >= 3 かつ movable_types >= 2
- forbidden_detected: No
- difficulty_index 目標 **0.64–0.76**
  - 計算: 0.4*grammar_tier + 0.3*(movables/4) + 0.2*token_norm + 0.1*(1 - anchor_ratio)
  - grammar_tier(2級)=5（完了/関係代名詞/倒置）
  - token_norm: 13→0, 18→1
  - anchor_ratio = anchors/tokens
- 外れた候補は**出力しない**

【出力JSONスキーマ】
{
  "type":"jumbled_sentence",
  "grade":"2級",
  "items":[
    {
      "tokens":["..."],
      "answer":"Sentence ... .",
      "features":{
        "pattern":"Q1|Q2|Q3",
        "anchors":2,
        "movables":3,
        "movable_types":["freq-adv","pp","duration"],
        "grammar_tier":5,
        "tokens":16,
        "difficulty_index":0.71,
        "why_unique_ja":"唯一解の理由（for/since文末固定/関係節位置/倒置など）"
      }
    }
  ]
}` : config.grade === '準2級' ? `目的: 準2級(A2+/B1-)の並べ替え問題を ${count} 問作る。出力はJSONのみ。級差を出すために下記ゲートを厳守。

【構文パターン(準2専用) いずれか1つ"だけ"必須】
- P1: 受動態 (現在/過去) ※完了形は不可
- P2: to不定詞（副詞的目的/結果） ※「to + 動詞原形」の一塊
- P3: that節の目的語（think/say/know + that + SV）※関係代名詞ではない

【明確な禁止】
- 現在完了(継続/経験/完了)・過去完了
- 制限用法の関係代名詞(who/which/that)・関係副詞
- 高度な倒置(Wh以外)・分詞構文の多重化

【トークン/要素 目標】
- tokens: **12–16**（句読点を必ず1つ含める→これは1トークン）
- anchors: **2–3**（句読点1 + 助動/時制マーカー/限定詞のうち合計2〜3）
- movables: **2–3**（頻度副詞/前置詞句/時副詞句/to不定詞句/従属節 から）
- 語彙: NGSL 1–2000中心（専門語NG）

【唯一解ルール（必須）】
- 句読点を1つ入れ、位置で語順を固定（挿入カンマ or 疑問倒置）。
- this/theseは片方しか使わない（両方禁止）。
- 頻度副詞の位置は be動詞の直後 または 一般動詞の直前 に限定。
- 前置詞句は意味上一箇所（ふつう文末）にしか置けない内容語を選ぶ。
- that節は目的語としてのみ使用。位置は動詞直後で固定。

【自己検査(必ず各アイテムに付与)】
- grammar_gate: P1/P2/P3のいずれか1つだけ=Yes
- tokens_in_range: Yes（12–16）
- anchors_count ∈ {2,3}
- movables_count ∈ {2,3}
- forbidden_detected: No
- difficulty_index 目標 **0.54–0.62**
  - 計算: 0.4*grammar_tier + 0.3*(movables/4) + 0.2*token_norm + 0.1*(1 - anchor_ratio)
  - grammar_tier(準2)=4（受動/不定詞/that節）
  - token_norm: 12→0, 16→1 に正規化
  - anchor_ratio = anchors/tokens
- どれか1つでも外れた候補は**出力しない**（内部で破棄し、合格のみを返す）。

【出力JSONスキーマ（合格 ${count} 件）】
{
  "type":"jumbled_sentence",
  "grade":"準2級",
  "items":[
    {
      "tokens":["..."],             // すべて小文字。句読点を1つ含む
      "answer":"Sentence ... .",    // 文頭のみ大文字
      "features":{
        "pattern":"P1|P2|P3",
        "anchors":2,
        "movables":3,
        "grammar_tier":4,
        "tokens":14,
        "difficulty_index":0.58,
        "why_unique_ja":"唯一解の理由（頻度副詞位置/that節/句読点/前置詞句の固定など）"
      }
    }
  ]
}` : config.grade === '5級' ? `目的: 5級(A1)の並べ替え問題を ${count} 問作る。出力はJSONのみ。基本文構造に特化。

【5級の必須要素】
- tokens: **${config.jumbled_tokens.min}–${config.jumbled_tokens.max}**（句読点を必ず1つ含める）
- anchors: **${config.jumbled_anchors.min}個以上**（句読点1 + 助動/時制マーカー/限定詞）
- movables: **${config.jumbled_movables.min}–${config.jumbled_movables.max}個**（頻度副詞/前置詞句/時副詞句）
- grammar_tier: **${config.jumbled_grammar_tier}**（基本文構造）

【禁止事項】
- ${config.jumbled_banned_grammar.join('・')}

【唯一解ルール（必須）】
- 句読点を1つ入れて位置で固定（挿入カンマ or 疑問倒置）
- this/theseは片方のみ使用（両方禁止）
- 頻度副詞は be動詞の直後 or 一般動詞の直前
- 前置詞句は意味上一箇所（ふつう文末）にしか置けない内容語を選ぶ

【自己検査（各アイテムに必須）】
- tokens_in_range: Yes（${config.jumbled_tokens.min}–${config.jumbled_tokens.max}）
- anchors_count >= ${config.jumbled_anchors.min}
- movables_count ∈ {${config.jumbled_movables.min},${config.jumbled_movables.max}}
- forbidden_detected: No
- 外れた候補は**出力しない**

【出力JSONスキーマ】
{
  "type":"jumbled_sentence",
  "grade":"5級",
  "items":[
    {
      "tokens":["..."],
      "answer":"Sentence ... .",
      "features":{
        "anchors":${config.jumbled_anchors.min},
        "movables":${config.jumbled_movables.min},
        "grammar_tier":${config.jumbled_grammar_tier},
        "tokens":${config.jumbled_tokens.min},
        "why_unique_ja":"唯一解の理由（頻度副詞位置/句読点/前置詞句の固定など）"
      }
    }
  ]
}` : config.grade === '4級' ? `目的: 4級(A1+)の並べ替え問題を ${count} 問作る。出力はJSONのみ。5級より複雑な文構造。

【4級の必須要素】
- tokens: **${config.jumbled_tokens.min}–${config.jumbled_tokens.max}**（句読点を必ず1つ含める）
- anchors: **${config.jumbled_anchors.min}個以上**（句読点1 + 助動/時制マーカー/限定詞）
- movables: **${config.jumbled_movables.min}–${config.jumbled_movables.max}個**（頻度副詞/前置詞句/時副詞句/to不定詞句）
- grammar_tier: **${config.jumbled_grammar_tier}**（時制・進行）

【禁止事項】
- ${config.jumbled_banned_grammar.join('・')}

【唯一解ルール（必須）】
- 句読点を1つ入れて位置で固定（挿入カンマ or 疑問倒置）
- this/theseは片方のみ使用（両方禁止）
- 頻度副詞は be動詞の直後 or 一般動詞の直前
- 前置詞句は意味上一箇所（ふつう文末）にしか置けない内容語を選ぶ

【自己検査（各アイテムに必須）】
- tokens_in_range: Yes（${config.jumbled_tokens.min}–${config.jumbled_tokens.max}）
- anchors_count >= ${config.jumbled_anchors.min}
- movables_count ∈ {${config.jumbled_movables.min},${config.jumbled_movables.max}}
- forbidden_detected: No
- 外れた候補は**出力しない**

【出力JSONスキーマ】
{
  "type":"jumbled_sentence",
  "grade":"4級",
  "items":[
    {
      "tokens":["..."],
      "answer":"Sentence ... .",
      "features":{
        "anchors":${config.jumbled_anchors.min},
        "movables":${config.jumbled_movables.min},
        "grammar_tier":${config.jumbled_grammar_tier},
        "tokens":${config.jumbled_tokens.min},
        "why_unique_ja":"唯一解の理由（頻度副詞位置/句読点/前置詞句の固定など）"
      }
    }
  ]
}` : config.grade === '3級' ? `目的: 3級(A2)の並べ替え問題を ${count} 問作る。出力はJSONのみ。従属節を含む複雑な文構造。

【3級の必須要素】
- tokens: **${config.jumbled_tokens.min}–${config.jumbled_tokens.max}**（句読点を必ず1つ含める）
- anchors: **${config.jumbled_anchors.min}個以上**（句読点1 + 助動/時制マーカー/限定詞）
- movables: **${config.jumbled_movables.min}–${config.jumbled_movables.max}個**（頻度副詞/前置詞句/時副詞句/to不定詞句/従属節）
- grammar_tier: **${config.jumbled_grammar_tier}**（because・if・比較）

【禁止事項】
- ${config.jumbled_banned_grammar.join('・')}

【唯一解ルール（必須）】
- 句読点を1つ入れて位置で固定（挿入カンマ or 疑問倒置）
- this/theseは片方のみ使用（両方禁止）
- 頻度副詞は be動詞の直後 or 一般動詞の直前
- 前置詞句は意味上一箇所（ふつう文末）にしか置けない内容語を選ぶ
- because/if節の位置と時制で多解を封じる

【自己検査（各アイテムに必須）】
- tokens_in_range: Yes（${config.jumbled_tokens.min}–${config.jumbled_tokens.max}）
- anchors_count >= ${config.jumbled_anchors.min}
- movables_count ∈ {${config.jumbled_movables.min},${config.jumbled_movables.max}}
- forbidden_detected: No
- 外れた候補は**出力しない**

【出力JSONスキーマ】
{
  "type":"jumbled_sentence",
  "grade":"3級",
  "items":[
    {
      "tokens":["..."],
      "answer":"Sentence ... .",
      "features":{
        "anchors":${config.jumbled_anchors.min},
        "movables":${config.jumbled_movables.min},
        "grammar_tier":${config.jumbled_grammar_tier},
        "tokens":${config.jumbled_tokens.min},
        "why_unique_ja":"唯一解の理由（because/if節位置/頻度副詞位置/句読点など）"
      }
    }
  ]
}` : `目的: ${config.grade} 向け並べ替え問題を ${count} 問作る。生成→検査→基準外は捨てて再生成までここで完結。

【級別ターゲット（内部表）】
- 5級: tokens=${config.jumbled_tokens.min}–${config.jumbled_tokens.max}, anchors>=${config.jumbled_anchors.min}, movables=${config.jumbled_movables.min}–${config.jumbled_movables.max}, grammar_tier=${config.jumbled_grammar_tier}, 禁止:${config.jumbled_banned_grammar.join('/')}
- 4級: tokens=${config.jumbled_tokens.min}–${config.jumbled_tokens.max}, anchors>=${config.jumbled_anchors.min}, movables=${config.jumbled_movables.min}–${config.jumbled_movables.max}, grammar_tier=${config.jumbled_grammar_tier}, 禁止:${config.jumbled_banned_grammar.join('/')}
- 3級: tokens=${config.jumbled_tokens.min}–${config.jumbled_tokens.max}, anchors>=${config.jumbled_anchors.min}, movables=${config.jumbled_movables.min}–${config.jumbled_movables.max}, grammar_tier=${config.jumbled_grammar_tier}, 禁止:${config.jumbled_banned_grammar.join('/')}
${config.jumbled_required_grammar ? `- 2級: tokens=${config.jumbled_tokens.min}–${config.jumbled_tokens.max}, anchors>=${config.jumbled_anchors.min}, movables=${config.jumbled_movables.min}–${config.jumbled_movables.max}, grammar_tier=${config.jumbled_grammar_tier}(${config.jumbled_required_grammar.join(' or ')}のいずれか必須)` : ''}
${config.jumbled_required_grammar ? `- 準1級: tokens=${config.jumbled_tokens.min}–${config.jumbled_tokens.max}, anchors>=${config.jumbled_anchors.min}, movables=${config.jumbled_movables.min}–${config.jumbled_movables.max}, grammar_tier=${config.jumbled_grammar_tier}(${config.jumbled_required_grammar.join(' or ')}のいずれか必須)` : ''}

定義:
- anchors=「句読点1つ」「限定詞(this/the等はどちらか一方のみ)」「助動詞/時制マーカー(does/did/was/has など)」
- movables=「頻度副詞」「前置詞句」「副詞句」「to不定詞句」「従属節」など位置が動かせる要素
- grammar_tier= 1:基本文 / 2:時制・進行 / 3:because・if・比較 / 4:受動・不定詞・that節 / 5:完了・関係代名詞・倒置 / 6:分詞修飾・非定形節

唯一解ルール（必ず適用）:
- 句読点(., ?)を1つ入れて位置を固定。
- 限定詞は this/these のどちらかのみ使用（両方は不可）。
- 頻度副詞は be動詞の直後 or 一般動詞の直前に固定。
- 前置詞句は意味上一箇所（通常は文末）にしか置けない内容語を選ぶ。
- 疑問は Wh + 助動詞/Do系 で倒置して固定（該当級のみ）。

手順（内部で繰り返す）:
1) 候補を最大50件まで生成（級のターゲットに沿うように）。
2) 各候補に対し自己検査:
   - tokens/anchors/movables/grammar_tier が級のレンジ内か
   - 他に文法的に自然な語順が成立しないか（多解チェック）。多解がありそうなら reject。
3) 基準外や多解は破棄。十分に集まらなければ再生成を繰り返す（最大50件まで）。
4) ${count} 問集まった時点で出力。

出力JSONスキーマ:
{
  "type": "jumbled_sentence",
  "grade": "${config.grade}",
  "items": [
    {
      "tokens": ["..."],            // すべて小文字
      "answer": "Sentence ... .",   // 文頭のみ大文字
      "features": {
        "anchors": 3, "movables": 2, "grammar_tier": 4, "tokens": 7,
        "why_unique_ja": "頻度副詞の位置規則と倒置/句読点で一意化。"
      }
    }
  ]
}`}`,

    '長文読解': `あなたは英検風の読解作成者。grade_profileに従い、${count}本文の読解セットを**JSONのみ**で作成。

**問題の多様性を確保してください：**
- 日常会話、学校生活、趣味、家族、旅行、環境、科学、文化、歴史、社会問題など様々なトピックから出題
- 文の長さや複雑さも変化をつける
- 動詞、名詞、形容詞、副詞、前置詞など様々な品詞を含む文を作成
- 時制、受動態、比較級、関係代名詞など様々な文法項目を含む

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

**問題の多様性を確保してください：**
- 日常会話、学校生活、趣味、家族、旅行、環境、科学、文化、歴史、社会問題など様々なトピックから出題
- 賛否、意見説明、メール返信、体験談、将来の計画など様々な形式で出題
- 動詞、名詞、形容詞、副詞、前置詞など様々な品詞を使用する文を作成
- 時制、受動態、比較級、関係代名詞など様々な文法項目を含む

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
    
    const model = genAI.getGenerativeModel({ model: MODEL });
    
    // リトライ機能付きでAPI呼び出し
    const text = await callGeminiWithRetry(model, prompt, 'generate');
    
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

    // 検品・自動修正（オプション）- API制限対策で条件付き実行
    if (questions && questions.items && questions.items.length > 0 && API_CONFIG.enableValidation) {
      try {
        console.log('[API] Starting validation process...');
        const config = levelConfig[level];
        const validationText = await callGeminiWithRetry(model, validationPrompt(config, questions), 'validate');
        
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
    } else if (questions && questions.items && questions.items.length > 0) {
      console.log('[API] Validation disabled. Using original questions.');
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
      // 並び替え問題（新しい仕様対応）
      formattedQuestions = questions.items.map((item, index) => {
        const features = item.features || {};
        const tokens = item.tokens || [];
        const anchors = features.anchors || 0;
        const movables = features.movables || 0;
        const grammarTier = features.grammar_tier || 1;
        const pattern = features.pattern || '';
        
        // 準2級・2級の場合はdifficulty_indexを再計算（Geminiの値を上書き）
        let difficultyIndex = features.difficulty_index;
        if (level === '準2級' && tokens.length > 0) {
          difficultyIndex = calculateDifficultyIndex(tokens.length, anchors, movables, grammarTier, pattern);
        } else if (level === '2級' && tokens.length > 0) {
          difficultyIndex = calculateDifficultyIndex2Kyu(tokens.length, anchors, movables, grammarTier, pattern);
        }
        
        return {
          id: uuidv4(),
          level,
          type,
          difficulty: getDifficultyFromLevel(level),
          content: `次の語句を正しい順序に並び替えて英文を作りなさい。\n[${tokens.join(', ')}]`,
          correctAnswer: item.answer,
          explanation: features.why_unique_ja || item.rationale_ja,
          whyUnique: features.why_unique_ja || item.why_unique_ja,
          tokens: tokens,
          features: {
            pattern: pattern,
            anchors: anchors,
            movables: movables,
            movable_types: features.movable_types || [],
            grammar_tier: grammarTier,
            tokens: tokens.length,
            difficulty_index: difficultyIndex
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });
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

// 準2級並べ替え問題のdifficulty_indexを計算
function calculateDifficultyIndex(tokens, anchors, movables, grammarTier, pattern) {
  // token_norm: tokens(12〜16)を0〜1に線形正規化（12→0, 16→1）
  const tokenNorm = Math.max(0, Math.min(1, (tokens - 12) / 4));
  
  // anchor_ratio = anchors/tokens
  const anchorRatio = anchors / tokens;
  
  // movables/3 の正規化（準2級の最大movablesは3）
  const movablesNorm = Math.min(1, movables / 3);
  
  // grammar_tierを正規化（4を1に正規化）
  const grammarNorm = grammarTier / 4;
  
  // difficulty_index = 0.4*grammar_norm + 0.3*(movables/3) + 0.2*token_norm + 0.1*(1 - anchor_ratio)
  const difficultyIndex = 0.4 * grammarNorm + 0.3 * movablesNorm + 0.2 * tokenNorm + 0.1 * (1 - anchorRatio);
  
  // デバッグログ
  console.log(`Difficulty calculation: tokens=${tokens}, anchors=${anchors}, movables=${movables}, grammarTier=${grammarTier}`);
  console.log(`tokenNorm=${tokenNorm}, anchorRatio=${anchorRatio}, movablesNorm=${movablesNorm}, grammarNorm=${grammarNorm}`);
  console.log(`difficultyIndex=${difficultyIndex}`);
  
  return Math.round(difficultyIndex * 100) / 100; // 小数点第2位まで
}

// 2級並べ替え問題のdifficulty_indexを計算
function calculateDifficultyIndex2Kyu(tokens, anchors, movables, grammarTier, pattern) {
  // token_norm: tokens(13〜18)を0〜1に線形正規化（13→0, 18→1）
  const tokenNorm = Math.max(0, Math.min(1, (tokens - 13) / 5));
  
  // anchor_ratio = anchors/tokens
  const anchorRatio = anchors / tokens;
  
  // movables/5 の正規化（2級の最大movablesは5）
  const movablesNorm = Math.min(1, movables / 5);
  
  // grammar_tierを正規化（5を1に正規化）
  const grammarNorm = grammarTier / 5;
  
  // difficulty_index = 0.4*grammar_norm + 0.3*(movables/5) + 0.2*token_norm + 0.1*(1 - anchor_ratio)
  const difficultyIndex = 0.4 * grammarNorm + 0.3 * movablesNorm + 0.2 * tokenNorm + 0.1 * (1 - anchorRatio);
  
  // デバッグログ
  console.log(`2級 Difficulty calculation: tokens=${tokens}, anchors=${anchors}, movables=${movables}, grammarTier=${grammarTier}`);
  console.log(`tokenNorm=${tokenNorm}, anchorRatio=${anchorRatio}, movablesNorm=${movablesNorm}, grammarNorm=${grammarNorm}`);
  console.log(`difficultyIndex=${difficultyIndex}`);
  
  return Math.round(difficultyIndex * 100) / 100; // 小数点第2位まで
}

// 構文パターンを検証（準2級専用）
function validatePattern(tokens, answer, pattern) {
  const lowerAnswer = answer.toLowerCase();
  
  switch(pattern) {
    case 'P1': // 受動態 (現在/過去)
      return /(is|are|was|were)\s+\w+ed\b/.test(lowerAnswer) || 
             /(is|are|was|were)\s+\w+en\b/.test(lowerAnswer);
    
    case 'P2': // to不定詞（副詞的目的/結果）
      return /\bto\s+\w+\b/.test(lowerAnswer) && 
             !lowerAnswer.includes('that') && 
             !lowerAnswer.includes('who') && 
             !lowerAnswer.includes('which');
    
    case 'P3': // that節の目的語
      return /\b(think|say|know|believe|hope|wish|expect|suppose|imagine|realize|understand|remember|forget)\s+that\b/.test(lowerAnswer);
    
    default:
      return false;
  }
}

// 構文パターンを検証（2級専用）
function validatePattern2Kyu(tokens, answer, pattern) {
  const lowerAnswer = answer.toLowerCase();
  
  switch(pattern) {
    case 'Q1': // 現在完了 + 期間/起点句（for/since〜）
      return /(have|has)\s+\w+(ed|en)\b/.test(lowerAnswer) && 
             (/\bfor\s+\w+/.test(lowerAnswer) || /\bsince\s+\w+/.test(lowerAnswer));
    
    case 'Q2': // 制限用法の関係代名詞（that/who/which）
      return /\b(that|who|which)\s+\w+/.test(lowerAnswer) && 
             !lowerAnswer.includes(',') && // 非限定は禁止
             !lowerAnswer.includes('whom') && // whomは禁止
             !lowerAnswer.includes('whose'); // whoseは禁止
    
    case 'Q3': // Wh疑問 + 助動/Do系の倒置
      return /^(what|when|where|why|how|which|who)\s+/.test(lowerAnswer) && 
             (/\b(do|does|did|is|are|was|were|have|has|had|can|could|will|would|should|may|might)\b/.test(lowerAnswer));
    
    default:
      return false;
  }
}

// 問題生成の状態確認
router.get('/status', (req, res) => {
  resetDailyCount(); // 日付をチェックして必要に応じてリセット
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  
  res.json({
    status: hasApiKey ? 'active' : 'error',
    service: '岩沢学院 英検問題自動生成サービス (Gemini)',
    timestamp: new Date().toISOString(),
    geminiConfigured: hasApiKey,
    model: MODEL,
    apiKeyStatus: hasApiKey ? 'configured' : 'missing',
    error: hasApiKey ? null : 'GEMINI_API_KEY is not set. Please configure your API key in .env file',
    apiUsage: {
      dailyCount: API_CONFIG.requestCount,
      dailyLimit: API_CONFIG.dailyQuotaLimit,
      remaining: API_CONFIG.dailyQuotaLimit - API_CONFIG.requestCount,
      validationEnabled: API_CONFIG.enableValidation
    }
  });
});

// API使用量リセットエンドポイント（開発用）
router.post('/reset-quota', (req, res) => {
  API_CONFIG.requestCount = 0;
  API_CONFIG.lastResetDate = new Date().toDateString();
  res.json({
    message: 'API quota reset successfully',
    newCount: API_CONFIG.requestCount,
    resetDate: API_CONFIG.lastResetDate
  });
});

module.exports = router;

