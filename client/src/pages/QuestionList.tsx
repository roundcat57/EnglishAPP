import React, { useState, useEffect, useCallback } from 'react';
import { List, Filter, Search, Edit, Trash2 } from 'lucide-react';

interface Question {
  id: string;
  level: string;
  type: string;
  difficulty: string;
  content: string;
  createdAt: string;
}

const QuestionList: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [filters, setFilters] = useState({
    level: '',
    type: '',
    difficulty: '',
    search: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE || ''}/api/questions`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error('問題の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    let filtered = [...questions];

    if (filters.level) {
      filtered = filtered.filter(q => q.level === filters.level);
    }
    if (filters.type) {
      filtered = filtered.filter(q => q.type === filters.type);
    }
    if (filters.difficulty) {
      filtered = filtered.filter(q => q.difficulty === filters.difficulty);
    }
    if (filters.search) {
      filtered = filtered.filter(q => 
        q.content.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredQuestions(filtered);
  }, [questions, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('この問題を削除しますか？')) {
      try {
        const response = await fetch(`/api/questions/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          setQuestions(prev => prev.filter(q => q.id !== id));
        }
      } catch (error) {
        console.error('削除に失敗しました:', error);
      }
    }
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
        <h1 className="text-3xl font-bold text-gray-900">問題一覧</h1>
        <div className="text-sm text-gray-600">
          {filteredQuestions.length} / {questions.length} 問
        </div>
      </div>

      {/* フィルター */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">フィルター</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              英検級
            </label>
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="select-field"
            >
              <option value="">すべて</option>
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
              問題タイプ
            </label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="select-field"
            >
              <option value="">すべて</option>
              <option value="語彙">語彙</option>
              <option value="文法">文法</option>
              <option value="読解">読解</option>
              <option value="リスニング">リスニング</option>
              <option value="英作文">英作文</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              難易度
            </label>
            <select
              value={filters.difficulty}
              onChange={(e) => handleFilterChange('difficulty', e.target.value)}
              className="select-field"
            >
              <option value="">すべて</option>
              <option value="初級">初級</option>
              <option value="中級">中級</option>
              <option value="上級">上級</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              検索
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="問題文で検索..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 問題一覧 */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="card text-center py-12">
            <List className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              問題が見つかりません
            </h3>
            <p className="text-gray-600">
              フィルターを調整するか、新しい問題を生成してください
            </p>
          </div>
        ) : (
          filteredQuestions.map((question) => (
            <div key={question.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {question.level}
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {question.type}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                      {question.difficulty}
                    </span>
                  </div>
                  
                  <p className="text-gray-900 mb-3 line-clamp-3">
                    {question.content}
                  </p>
                  
                  <div className="text-sm text-gray-500">
                    作成日: {new Date(question.createdAt).toLocaleDateString('ja-JP')}
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(question.id)}
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

export default QuestionList;

