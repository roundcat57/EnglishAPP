import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Edit, Trash2, Download } from 'lucide-react';

interface QuestionSet {
  id: string;
  name: string;
  description: string;
  level: string;
  questions: string[];
  createdAt: string;
}

const QuestionSets: React.FC = () => {
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSet, setNewSet] = useState({
    name: '',
    description: '',
    level: '3級'
  });

  useEffect(() => {
    fetchQuestionSets();
  }, []);

  const fetchQuestionSets = async () => {
    try {
      const response = await fetch('/api/question-sets');
      if (response.ok) {
        const data = await response.json();
        setQuestionSets(data.questionSets || []);
      }
    } catch (error) {
      console.error('問題セットの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSet = async () => {
    if (!newSet.name.trim()) {
      alert('セット名を入力してください');
      return;
    }

    try {
      const response = await fetch('/api/question-sets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSet),
      });

      if (response.ok) {
        const data = await response.json();
        setQuestionSets(prev => [...prev, data.questionSet]);
        setNewSet({ name: '', description: '', level: '3級' });
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('問題セットの作成に失敗しました:', error);
    }
  };

  const handleDeleteSet = async (id: string) => {
    if (window.confirm('この問題セットを削除しますか？')) {
      try {
        const response = await fetch(`/api/question-sets/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          setQuestionSets(prev => prev.filter(set => set.id !== id));
        }
      } catch (error) {
        console.error('削除に失敗しました:', error);
      }
    }
  };

  const handleExportSet = (questionSet: QuestionSet) => {
    const dataStr = JSON.stringify(questionSet, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${questionSet.name}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">問題セット</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>新しいセット</span>
        </button>
      </div>

      {/* 作成フォーム */}
      {showCreateForm && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            新しい問題セットを作成
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                セット名
              </label>
              <input
                type="text"
                value={newSet.name}
                onChange={(e) => setNewSet(prev => ({ ...prev, name: e.target.value }))}
                placeholder="例: 3級語彙問題セット"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                英検級
              </label>
              <select
                value={newSet.level}
                onChange={(e) => setNewSet(prev => ({ ...prev, level: e.target.value }))}
                className="select-field"
              >
                <option value="5級">5級</option>
                <option value="4級">4級</option>
                <option value="3級">3級</option>
                <option value="準2級">準2級</option>
                <option value="2級">2級</option>
                <option value="準1級">準1級</option>
                <option value="1級">1級</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                説明
              </label>
              <input
                type="text"
                value={newSet.description}
                onChange={(e) => setNewSet(prev => ({ ...prev, description: e.target.value }))}
                placeholder="セットの説明"
                className="input-field"
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleCreateSet}
              className="btn-primary"
            >
              作成
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="btn-secondary"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 問題セット一覧 */}
      <div className="space-y-4">
        {questionSets.length === 0 ? (
          <div className="card text-center py-12">
            <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              問題セットがありません
            </h3>
            <p className="text-gray-600">
              新しい問題セットを作成して、問題を整理しましょう
            </p>
          </div>
        ) : (
          questionSets.map((questionSet) => (
            <div key={questionSet.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {questionSet.name}
                    </h3>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {questionSet.level}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                      {questionSet.questions.length}問
                    </span>
                  </div>
                  
                  {questionSet.description && (
                    <p className="text-gray-600 mb-3">
                      {questionSet.description}
                    </p>
                  )}
                  
                  <div className="text-sm text-gray-500">
                    作成日: {new Date(questionSet.createdAt).toLocaleDateString('ja-JP')}
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleExportSet(questionSet)}
                    className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteSet(questionSet.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QuestionSets;

