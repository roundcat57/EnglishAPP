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
        <p className="text-gray-600">
          英検の各級に対応した問題をAIが自動生成します
        </p>
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
