import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, Eye, Edit, Trash2, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Student {
  id: string;
  name: string;
  level: string;
  email: string;
  grade: string;
  school: string;
  joinedAt: string;
  isActive: boolean;
}

const Dashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [filters, setFilters] = useState({
    level: '',
    grade: '',
    search: ''
  });
  const [newStudent, setNewStudent] = useState({
    name: '',
    level: '3級',
    email: '',
    grade: '',
    school: ''
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, students]);

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students');
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error('塾生の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...students];

    if (filters.level) {
      filtered = filtered.filter(s => s.level === filters.level);
    }
    if (filters.grade) {
      filtered = filtered.filter(s => s.grade === filters.grade);
    }
    if (filters.search) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        s.email.toLowerCase().includes(filters.search.toLowerCase()) ||
        s.school.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredStudents(filtered);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleAddStudent = async () => {
    if (!newStudent.name.trim()) {
      alert('塾生の名前を入力してください');
      return;
    }

    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newStudent),
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(prev => [...prev, data.student]);
        setNewStudent({ name: '', level: '3級', email: '', grade: '', school: '' });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('塾生の登録に失敗しました:', error);
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent || !editingStudent.name.trim()) {
      alert('塾生の名前を入力してください');
      return;
    }

    try {
      const response = await fetch(`/api/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingStudent.name,
          level: editingStudent.level,
          email: editingStudent.email,
          grade: editingStudent.grade,
          school: editingStudent.school,
          isActive: editingStudent.isActive
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(prev => prev.map(s => s.id === editingStudent.id ? data.student : s));
        setEditingStudent(null);
      }
    } catch (error) {
      console.error('塾生の更新に失敗しました:', error);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (window.confirm('この塾生を削除しますか？')) {
      try {
        const response = await fetch(`/api/students/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          setStudents(prev => prev.filter(s => s.id !== id));
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
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-600 mt-2">塾生の管理と学習進捗の確認</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>塾生を追加</span>
        </button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600 mb-2">
            {students.filter(s => s.isActive).length}
          </div>
          <div className="text-sm text-gray-600">在籍塾生</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600 mb-2">
            {students.filter(s => s.level === '3級').length}
          </div>
          <div className="text-sm text-gray-600">3級対象者</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-600 mb-2">
            {students.filter(s => s.level === '準2級').length}
          </div>
          <div className="text-sm text-gray-600">準2級対象者</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-orange-600 mb-2">
            {students.filter(s => s.level === '2級').length}
          </div>
          <div className="text-sm text-gray-600">2級対象者</div>
        </div>
      </div>

      {/* 塾生追加フォーム */}
      {showAddForm && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            新しい塾生を登録
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                氏名 *
              </label>
              <input
                type="text"
                value={newStudent.name}
                onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                placeholder="田中太郎"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                英検級 *
              </label>
              <select
                value={newStudent.level}
                onChange={(e) => setNewStudent(prev => ({ ...prev, level: e.target.value }))}
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
                学年
              </label>
              <input
                type="text"
                value={newStudent.grade}
                onChange={(e) => setNewStudent(prev => ({ ...prev, grade: e.target.value }))}
                placeholder="中学3年"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                学校
              </label>
              <input
                type="text"
                value={newStudent.school}
                onChange={(e) => setNewStudent(prev => ({ ...prev, school: e.target.value }))}
                placeholder="○○中学校"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                type="email"
                value={newStudent.email}
                onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                placeholder="example@email.com"
                className="input-field"
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleAddStudent}
              className="btn-primary"
            >
              登録
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="btn-secondary"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 塾生編集フォーム */}
      {editingStudent && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            塾生情報を編集
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                氏名 *
              </label>
              <input
                type="text"
                value={editingStudent.name}
                onChange={(e) => setEditingStudent(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="田中太郎"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                英検級 *
              </label>
              <select
                value={editingStudent.level}
                onChange={(e) => setEditingStudent(prev => prev ? { ...prev, level: e.target.value } : null)}
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
                学年
              </label>
              <input
                type="text"
                value={editingStudent.grade}
                onChange={(e) => setEditingStudent(prev => prev ? { ...prev, grade: e.target.value } : null)}
                placeholder="中学3年"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                学校
              </label>
              <input
                type="text"
                value={editingStudent.school}
                onChange={(e) => setEditingStudent(prev => prev ? { ...prev, school: e.target.value } : null)}
                placeholder="○○中学校"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                type="email"
                value={editingStudent.email}
                onChange={(e) => setEditingStudent(prev => prev ? { ...prev, email: e.target.value } : null)}
                placeholder="example@email.com"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ステータス
              </label>
              <select
                value={editingStudent.isActive ? 'active' : 'inactive'}
                onChange={(e) => setEditingStudent(prev => prev ? { ...prev, isActive: e.target.value === 'active' } : null)}
                className="select-field"
              >
                <option value="active">在籍中</option>
                <option value="inactive">退塾</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleUpdateStudent}
              className="btn-primary"
            >
              更新
            </button>
            <button
              onClick={() => setEditingStudent(null)}
              className="btn-secondary"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* フィルター */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">フィルター</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              学年
            </label>
            <select
              value={filters.grade}
              onChange={(e) => handleFilterChange('grade', e.target.value)}
              className="select-field"
            >
              <option value="">すべて</option>
              <option value="小学6年">小学6年</option>
              <option value="中学1年">中学1年</option>
              <option value="中学2年">中学2年</option>
              <option value="中学3年">中学3年</option>
              <option value="高校1年">高校1年</option>
              <option value="高校2年">高校2年</option>
              <option value="高校3年">高校3年</option>
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
                placeholder="名前、学校で検索..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 塾生一覧 */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">塾生一覧</h2>
          <div className="text-sm text-gray-600">
            {filteredStudents.length} / {students.length} 名
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              塾生が見つかりません
            </h3>
            <p className="text-gray-600">
              フィルターを調整するか、新しい塾生を登録してください
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    氏名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    英検級
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    学年
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    学校
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登録日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {student.name}
                      </div>
                      {student.email && (
                        <div className="text-sm text-gray-500">{student.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        student.level === '3級' ? 'bg-blue-100 text-blue-800' :
                        student.level === '準2級' ? 'bg-green-100 text-green-800' :
                        student.level === '2級' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {student.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.grade || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.school || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(student.joinedAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          to={`/student/${student.id}`}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="詳細表示"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/student/${student.id}/scores`}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="スコア履歴"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleEditStudent(student)}
                          className="text-gray-600 hover:text-blue-900 p-1"
                          title="編集"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

