import React, { useState } from 'react';
import { Brain, Download, Save, RotateCcw } from 'lucide-react';
import { ExamLevel, QuestionType, Question } from '../../shared/types';

const QuestionGenerator: React.FC = () => {
  const [formData, setFormData] = useState({
    level: '3級' as ExamLevel,
    type: '語彙' as QuestionType,
    count: 5,
    topics: '',
    customInstructions: ''
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);

  const examLevels: ExamLevel[] = ['5級', '4級', '3級', '準2級', '2級', '準1級', '1級'];
  const questionTypes: QuestionType[] = ['語彙', '並び替え', '長文読解', '英作文'];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'count' ? parseInt(value) || 1 : value
    }));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generation/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          topics: formData.topics ? formData.topics.split(',').map(t => t.trim()) : undefined,
          customInstructions: formData.customInstructions || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '問題生成に失敗しました');
      }

      const result = await response.json();
      setGeneratedQuestions(result.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : '問題生成中にエラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          AI問題生成
        </h1>
        <p className="text-gray-600 mb-6">
          英検の各級に対応した問題をGoogle Geminiが自動生成します
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">語彙問題</h3>
            <p className="text-sm text-blue-700">全英文で選択肢4つ</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">並び替え問題</h3>
            <p className="text-sm text-green-700">日本語提示、英単語ランダム配置</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-2">長文読解</h3>
            <p className="text-sm text-purple-700">級に応じた文章長、全英文設問</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="font-semibold text-orange-900 mb-2">英作文</h3>
            <p className="text-sm text-orange-700">級に応じた語数指定</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              生成設定
            </h2>
            
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  英検級
                </label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleInputChange}
                  className="select-field"
                >
                  {examLevels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    {formData.level === '5級' && '初歩的な英語の基礎知識（語彙: 600語）'}
                    {formData.level === '4級' && '中学中級程度の英語力（語彙: 1,300語）'}
                    {formData.level === '3級' && '中学卒業程度の英語力（語彙: 2,100語）'}
                    {formData.level === '準2級' && '高校中級程度の英語力（語彙: 3,600語）'}
                    {formData.level === '2級' && '高校卒業程度の英語力（語彙: 5,100語）'}
                    {formData.level === '準1級' && '大学中級程度の英語力（語彙: 7,500語）'}
                    {formData.level === '1級' && '大学上級程度の英語力（語彙: 10,000語）'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  問題タイプ
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="select-field"
                >
                  {questionTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    {formData.type === '語彙' && '英単語の意味を選択する問題（全英文）'}
                    {formData.type === '並び替え' && '日本語に合うように英単語を並び替える問題'}
                    {formData.type === '長文読解' && '長文を読んで質問に答える問題（全英文）'}
                    {formData.type === '英作文' && '与えられたテーマで英文を書く問題'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  問題数
                </label>
                <input
                  type="number"
                  name="count"
                  min="1"
                  max="20"
                  value={formData.count}
                  onChange={handleInputChange}
                  className="input-field"
                />
                <p className="text-sm text-gray-500 mt-1">1〜20問まで</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  トピック（任意）
                </label>
                <input
                  type="text"
                  name="topics"
                  value={formData.topics}
                  onChange={handleInputChange}
                  placeholder="例: 家族, 学校, 趣味"
                  className="input-field"
                />
                <p className="text-sm text-gray-500 mt-1">カンマ区切りで複数指定可能</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  カスタム指示（任意）
                </label>
                <textarea
                  name="customInstructions"
                  value={formData.customInstructions}
                  onChange={handleInputChange}
                  placeholder="特別な指示があれば入力してください"
                  rows={3}
                  className="input-field"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <div className="spinner"></div>
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    <span>問題を生成</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          {error && (
            <div className="card bg-red-50 border-red-200 mb-6">
              <div className="text-red-800">
                <h3 className="font-semibold mb-2">エラーが発生しました</h3>
                <p>{error}</p>
              </div>
            </div>
          )}

          {generatedQuestions.length > 0 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">
                  生成された問題 ({generatedQuestions.length}問)
                </h3>
                <div className="flex space-x-2">
                  <button className="btn-secondary flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>問題用紙を印刷</span>
                  </button>
                  <button className="btn-secondary flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>解答用紙を印刷</span>
                  </button>
                </div>
              </div>

              {generatedQuestions.map((question, index) => (
                <div key={question.id} className="card">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">
                      問題 {index + 1} ({question.type})
                    </h4>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {question.level}
                    </span>
                  </div>
                  
                  {/* 語彙問題（穴埋め4択） */}
                  {question.type === '語彙' && (
                    <>
                      <div className="mb-4">
                        <p className="text-gray-900 whitespace-pre-wrap">{question.content}</p>
                      </div>
                      {question.choices && question.choices.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {question.choices.map((choice, choiceIndex) => (
                            <div key={choice.id} className={`p-3 rounded-lg ${
                              choice.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                            }`}>
                              <span className="font-medium mr-2">
                                {String.fromCharCode(65 + choiceIndex)}.
                              </span>
                              {choice.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* 並び替え問題 */}
                  {question.type === '並び替え' && (
                    <>
                      <div className="mb-4">
                        <p className="text-gray-900 whitespace-pre-wrap">{question.content}</p>
                      </div>
                      <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>正解:</strong> {question.correctAnswer}
                        </p>
                        {question.whyUnique && (
                          <p className="text-sm text-gray-600 mt-1">
                            <strong>唯一解の理由:</strong> {question.whyUnique}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {/* 長文読解問題 */}
                  {question.type === '長文読解' && (
                    <>
                      <div className="mb-4">
                        <p className="text-gray-900 whitespace-pre-wrap">{question.content}</p>
                      </div>
                      {question.questions && question.questions.length > 0 && (
                        <div className="space-y-4 mb-4">
                          {question.questions.map((q, qIndex) => (
                            <div key={q.id} className="p-4 bg-gray-50 rounded-lg">
                              <p className="font-medium mb-2">{qIndex + 1}. {q.stem}</p>
                              <div className="space-y-1">
                                {q.options.map((option, optIndex) => (
                                  <div key={optIndex} className={`p-2 rounded ${
                                    option === q.answer ? 'bg-green-100' : 'bg-white'
                                  }`}>
                                    <span className="font-medium mr-2">
                                      {String.fromCharCode(65 + optIndex)}.
                                    </span>
                                    {option}
                                  </div>
                                ))}
                              </div>
                              {q.evidence && (
                                <p className="text-sm text-gray-600 mt-2">
                                  <strong>根拠:</strong> {q.evidence}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {question.glossary && question.glossary.length > 0 && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                          <h5 className="font-medium mb-2">重要語彙</h5>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {question.glossary.map((item, i) => (
                              <div key={i} className="flex justify-between">
                                <span className="font-medium">{item.word}</span>
                                <span className="text-gray-600">{item.ja}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* 英作文問題 */}
                  {question.type === '英作文' && (
                    <>
                      <div className="mb-4">
                        <p className="text-gray-900 whitespace-pre-wrap">{question.content}</p>
                      </div>
                      {question.wordLimit && (
                        <div className="mb-4 p-3 bg-orange-50 rounded-lg">
                          <p className="text-sm text-gray-600">
                            <strong>語数制限:</strong> {question.wordLimit.min}-{question.wordLimit.max}語
                          </p>
                        </div>
                      )}
                      {question.rubric && (
                        <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                          <h5 className="font-medium mb-2">評価基準</h5>
                          <div className="space-y-1 text-sm">
                            <p><strong>内容:</strong> {question.rubric.content}</p>
                            <p><strong>構成:</strong> {question.rubric.organization}</p>
                            <p><strong>文法:</strong> {question.rubric.grammar}</p>
                            <p><strong>語彙:</strong> {question.rubric.vocabulary}</p>
                          </div>
                        </div>
                      )}
                      {question.referenceAnswer && (
                        <div className="mb-4 p-3 bg-green-50 rounded-lg">
                          <h5 className="font-medium mb-2">参考解答</h5>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{question.referenceAnswer}</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* 共通の解答・解説表示 */}
                  {question.explanation && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                        解答・解説を見る
                      </summary>
                      <div className="mt-2 p-4 bg-blue-50 rounded-lg">
                        <div className="mb-2">
                          <strong>正解:</strong> {question.correctAnswer}
                        </div>
                        <div>
                          <strong>解説:</strong>
                          <p className="mt-1 text-gray-700">{question.explanation}</p>
                        </div>
                        {question.distractorNotes && Object.keys(question.distractorNotes).length > 0 && (
                          <div className="mt-3">
                            <strong>誤答の理由:</strong>
                            <div className="mt-1 space-y-1">
                              {Object.entries(question.distractorNotes).map(([option, reason]) => (
                                <p key={option} className="text-sm text-gray-600">
                                  <span className="font-medium">{option}:</span> {reason}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionGenerator;
