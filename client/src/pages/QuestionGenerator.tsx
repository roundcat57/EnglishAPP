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
  const questionTypes: QuestionType[] = ['語彙', '文法', '読解', 'リスニング', '英作文'];

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
            <div className="space-y-4">
              {generatedQuestions.map((question, index) => (
                <div key={question.id} className="card">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    問題 {index + 1}
                  </h4>
                  <p className="text-gray-900 mb-4">{question.content}</p>
                  {question.choices && (
                    <div className="space-y-2">
                      {question.choices.map((choice, choiceIndex) => (
                        <div key={choice.id} className="p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium mr-2">
                            {String.fromCharCode(65 + choiceIndex)}.
                          </span>
                          {choice.text}
                        </div>
                      ))}
                    </div>
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
