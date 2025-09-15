// 英検の級
export type ExamLevel = '5級' | '4級' | '3級' | '準2級' | '2級' | '準1級' | '1級';

// 問題のタイプ
export type QuestionType = '語彙' | '並び替え' | '長文読解' | '英作文';

// 問題の難易度
export type Difficulty = '初級' | '中級' | '上級';

// 選択肢
export interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
}

// 問題
export interface Question {
  id: string;
  level: ExamLevel;
  type: QuestionType;
  difficulty: Difficulty;
  content: string;
  choices?: Choice[];
  correctAnswer?: string;
  explanation?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 塾生情報
export interface Student {
  id: string;
  name: string;
  level: ExamLevel;
  email?: string;
  grade?: string;
  school?: string;
  joinedAt: Date;
  isActive: boolean;
}

// スコア履歴
export interface ScoreRecord {
  id: string;
  studentId: string;
  questionSetId: string;
  level: ExamLevel;
  type: QuestionType;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // 秒
  completedAt: Date;
  answers: StudentAnswer[];
}

// 生徒の回答
export interface StudentAnswer {
  questionId: string;
  studentAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
}

// 問題生成リクエスト
export interface QuestionGenerationRequest {
  level: ExamLevel;
  type: QuestionType;
  count: number;
  topics?: string[];
  customInstructions?: string;
}

// 問題生成レスポンス
export interface QuestionGenerationResponse {
  questions: Question[];
  totalGenerated: number;
  generationTime: number;
}

// 問題セット
export interface QuestionSet {
  id: string;
  name: string;
  description?: string;
  level: ExamLevel;
  type: QuestionType;
  questions: Question[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // 作成者ID
}

// 弱点分析結果
export interface WeaknessAnalysis {
  studentId: string;
  level: ExamLevel;
  type: QuestionType;
  weakPoints: string[];
  recommendedQuestions: string[];
  analysisDate: Date;
}

// 印刷設定
export interface PrintSettings {
  includeAnswers: boolean;
  includeExplanations: boolean;
  fontSize: 'small' | 'medium' | 'large';
  pageBreak: boolean;
  headerFooter: boolean;
}

// ユーザー設定
export interface UserSettings {
  defaultLevel: ExamLevel;
  preferredTypes: QuestionType[];
  language: 'ja' | 'en';
  theme: 'light' | 'dark';
}
