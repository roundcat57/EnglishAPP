import { ExamLevel, QuestionType } from './types';

// 英検の級の情報
export const EXAM_LEVELS: Record<ExamLevel, { 
  name: string; 
  description: string; 
  difficulty: number;
  vocabularyCount: number;
}> = {
  '5級': {
    name: '5級',
    description: '初歩的な英語の基礎知識',
    difficulty: 1,
    vocabularyCount: 600
  },
  '4級': {
    name: '4級',
    description: '中学中級程度の英語力',
    difficulty: 2,
    vocabularyCount: 1300
  },
  '3級': {
    name: '3級',
    description: '中学卒業程度の英語力',
    difficulty: 3,
    vocabularyCount: 2100
  },
  '準2級': {
    name: '準2級',
    description: '高校中級程度の英語力',
    difficulty: 4,
    vocabularyCount: 3600
  },
  '2級': {
    name: '2級',
    description: '高校卒業程度の英語力',
    difficulty: 5,
    vocabularyCount: 5100
  },
  '準1級': {
    name: '準1級',
    description: '大学中級程度の英語力',
    difficulty: 6,
    vocabularyCount: 7500
  },
  '1級': {
    name: '1級',
    description: '大学上級程度の英語力',
    difficulty: 7,
    vocabularyCount: 10000
  }
};

// 問題タイプの情報
export const QUESTION_TYPES: Record<QuestionType, {
  name: string;
  description: string;
  hasChoices: boolean;
  maxChoices: number;
  printTemplate: string;
}> = {
  '語彙': {
    name: '語彙問題',
    description: '英単語の意味を選択する問題（全英文）',
    hasChoices: true,
    maxChoices: 4,
    printTemplate: 'vocabulary'
  },
  '並び替え': {
    name: '並び替え問題',
    description: '日本語に合うように英単語を並び替える問題',
    hasChoices: false,
    maxChoices: 0,
    printTemplate: 'rearrange'
  },
  '長文読解': {
    name: '長文読解',
    description: '長文を読んで質問に答える問題（全英文）',
    hasChoices: true,
    maxChoices: 4,
    printTemplate: 'reading-comprehension'
  },
  '英作文': {
    name: '英作文',
    description: '与えられたテーマで英文を書く問題',
    hasChoices: false,
    maxChoices: 0,
    printTemplate: 'essay'
  }
};

// 問題生成のデフォルト設定
export const DEFAULT_GENERATION_SETTINGS = {
  defaultCount: 5,
  maxCount: 20,
  defaultLevel: '3級' as ExamLevel,
  defaultType: '語彙' as QuestionType
};

// 印刷設定のデフォルト値
export const DEFAULT_PRINT_SETTINGS = {
  includeAnswers: false,
  includeExplanations: false,
  fontSize: 'medium' as const,
  pageBreak: true,
  headerFooter: true
};

// スコア評価基準
export const SCORE_CRITERIA = {
  excellent: 90, // 優秀
  good: 80,      // 良好
  average: 70,   // 平均
  needsImprovement: 60, // 要改善
  poor: 50       // 要努力
};

// アプリの設定
export const APP_CONFIG = {
  name: '岩沢学院 英検問題特化アプリ',
  version: '1.0.0',
  maxQuestionsPerSet: 100,
  maxCustomInstructionsLength: 1000,
  maxStudents: 1000,
  maxScoreRecords: 10000
};
