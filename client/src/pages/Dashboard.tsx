import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, Eye, Edit, Trash2, BarChart3, Play, Activity, Printer, Unlock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

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

interface WeaknessAnalysis {
  studentId: string;
  studentName: string;
  level: string;
  overallScore: number;
  weaknessTypes: string[];
  recentScores: Array<{
    type: string;
    score: number;
    date: string;
  }>;
  recommendations: string[];
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
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
  const [weaknessAnalysis, setWeaknessAnalysis] = useState<WeaknessAnalysis | null>(null);
  const [showWeaknessModal, setShowWeaknessModal] = useState(false);
  const [unlockQrId, setUnlockQrId] = useState('');
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [unlockLogs, setUnlockLogs] = useState<any[]>([]);
  const [adminToken, setAdminToken] = useState<string>('');

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    const run = () => applyFilters();
    run();
  }, [filters, students, applyFilters]);

  // 最近のスキャン・解除履歴のポーリング（軽量）
  useEffect(() => {
    let active = true;
    const fetchLogs = async () => {
      try {
        const [evRes, ulRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_BASE || 'https://web-production-6e3ec.up.railway.app'}/api/scores/qr-events`),
          fetch(`${process.env.REACT_APP_API_BASE || 'https://web-production-6e3ec.up.railway.app'}/api/scores/qr/unlock-logs`, { headers: adminToken ? { 'x-admin-token': adminToken } : {} })
        ]);
        if (!active) return;
        if (evRes.ok) {
          const ev = await evRes.json();
          setRecentScans(ev.qrEvents?.slice(-20).reverse() || []);
        }
        if (ulRes.ok) {
          const ul = await ulRes.json();
          setUnlockLogs(ul.unlockLogs || []);
        }
      } catch {}
    };
    fetchLogs();
    const id = setInterval(fetchLogs, 5000);
    return () => { active = false; clearInterval(id); };
  }, [adminToken]);

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

  const handleGenerateForStudent = (student: Student) => {
    try { localStorage.setItem('studentName', student.name); } catch {}
    navigate(`/generate?level=${encodeURIComponent(student.level)}&studentName=${encodeURIComponent(student.name)}`);
  };

  const handleUnlockQr = async () => {
    setUnlockMessage(null);
    if (!unlockQrId.trim()) {
      setUnlockMessage('qrIdを入力してください');
      return;
    }
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE || 'https://web-production-6e3ec.up.railway.app'}/api/scores/qr/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(adminToken ? { 'x-admin-token': adminToken } : {}) },
        body: JSON.stringify({ qrId: unlockQrId.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '解除に失敗しました');
      setUnlockMessage(`解除成功: ${data.qrId}`);
    } catch (e) {
      setUnlockMessage(e instanceof Error ? e.message : '解除に失敗しました');
    }
  };

  const handleShowWeakness = async (student: Student) => {
    try {
      const res = await fetch(`/api/scores/analysis/weakness/${student.id}`);
      if (!res.ok) throw new Error('分析の取得に失敗しました');
      const data = await res.json();
      setWeaknessAnalysis({
        studentId: student.id,
        studentName: student.name,
        level: student.level,
        overallScore: data.analysis?.overallScore || 0,
        weaknessTypes: data.analysis?.weaknessTypes || [],
        recentScores: data.analysis?.recentScores || [],
        recommendations: data.analysis?.recommendations || []
      });
      setShowWeaknessModal(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'エラーが発生しました');
    }
  };

  const handleGenerateWeaknessProblems = async (student: Student, weaknessTypes: string[]) => {
    try {
      // 弱点タイプごとに問題を生成
      for (const type of weaknessTypes) {
        const response = await fetch('/api/generation/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: student.level,
            type: type,
            count: 3,
            topics: '',
            customInstructions: `弱点対策用の問題を生成してください。${type}の理解を深めるための基礎的な問題を中心に作成してください。`
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          // 問題を印刷用ウィンドウで表示
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            const html = generateWeaknessPrintHTML(data.questions, student, type);
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
          }
        }
      }
    } catch (error) {
      console.error('弱点対策問題生成エラー:', error);
      alert('弱点対策問題の生成中にエラーが発生しました');
    }
  };

  const generateWeaknessPrintHTML = (questions: any[], student: Student, type: string) => {
    const questionsHtml = questions.map((question, index) => {
      let body = `<div class="question-content">${question.content}</div>`;
      
      if (question.type === '語彙' && question.choices) {
        body += `<div class="choices">${question.choices.map((c: any, i: number) => 
          `<div class="choice">${String.fromCharCode(65+i)}. ${c.text}</div>`
        ).join('')}</div>`;
      } else if (question.type === '並び替え' && question.tokens) {
        body += `<div class="tokens"><strong>並び替える語句:</strong><br/>${question.tokens.map((t: string) => 
          `<span class="token">${t}</span>`
        ).join('')}</div>`;
      }
      
      if (question.correctAnswer) {
        body += `<div class="answer"><strong>正解:</strong> ${question.correctAnswer}</div>`;
      }
      if (question.explanation) {
        body += `<div class="explanation"><strong>解説:</strong> ${question.explanation}</div>`;
      }
      
      return `<div class="question"><div class="question-number">問題 ${index + 1}</div>${body}</div>`;
    }).join('');

    return `<!doctype html><html lang="ja"><head><meta charset="utf-8" />
      <title>弱点対策問題 - ${student.name} - ${type}</title>
      <style>
        body { font-family: 'Times New Roman', serif; line-height:1.6; color:#000; background:#fff; }
        .container { max-width:800px; margin:0 auto; padding:20px; }
        h1{ font-size:24px; font-weight:700; text-align:center; margin:0 0 20px; padding-bottom:10px; border-bottom:2px solid #000; }
        .meta{ display:flex; justify-content:space-between; font-size:12px; color:#666; margin-bottom:20px; }
        .question{ margin-bottom:28px; page-break-inside:avoid; }
        .question-number{ font-weight:700; font-size:16px; margin-bottom:8px; }
        .question-content{ margin-bottom:12px; font-size:14px; white-space:pre-wrap; }
        .choices{ margin-left:20px; }
        .choice{ margin-bottom:4px; font-size:14px; }
        .tokens{ background:#f9f9f9; border:1px solid #ccc; padding:10px; margin:10px 0; }
        .token{ display:inline-block; background:#fff; border:1px solid #999; padding:2px 8px; margin:2px; border-radius:3px; }
        .answer{ background:#f0f0f0; padding:10px; margin-top:10px; border-left:4px solid #000; }
        .explanation{ background:#e8f4f8; padding:10px; margin-top:10px; border-left:4px solid #2196F3; font-size:13px; }
        @media print { .question{ page-break-inside:avoid; } }
      </style></head>
      <body>
        <div class="container">
          <div class="meta">
            <div>生徒: ${student.name} (${student.level})</div>
            <div>日付: ${new Date().toLocaleDateString('ja-JP')}</div>
          </div>
          <h1>弱点対策問題 - ${type}</h1>
          ${questionsHtml}
        </div>
        <script>window.onload = () => { setTimeout(() => { window.print(); setTimeout(() => window.close(), 300); }, 300); };</script>
      </body></html>`;
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
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary flex items-center space-x-2"
          >
          <Plus className="w-4 h-4" />
          <span>塾生を追加</span>
          </button>
          <Link to="/score-entry" className="btn-secondary">採点入力</Link>
        </div>
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
                        <button
                          onClick={() => handleGenerateForStudent(student)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="この生徒の級で問題生成"
                        >
                          <Play className="w-4 h-4" />
                        </button>
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
                          onClick={() => handleShowWeakness(student)}
                          className="text-purple-600 hover:text-purple-900 p-1"
                          title="弱点分析"
                        >
                          <Activity className="w-4 h-4" />
                        </button>
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

      {/* 弱点分析モーダル */}
      {showWeaknessModal && weaknessAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                弱点分析 - {weaknessAnalysis.studentName}
              </h2>
              <button
                onClick={() => setShowWeaknessModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="space-y-6">
              {/* 全体スコア */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">全体スコア</h3>
                <div className="text-3xl font-bold text-blue-600">
                  {weaknessAnalysis.overallScore}%
                </div>
              </div>

              {/* 弱点タイプ */}
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">弱点タイプ</h3>
                <div className="flex flex-wrap gap-2">
                  {weaknessAnalysis.weaknessTypes.map((type, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              {/* 最近のスコア */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">最近のスコア</h3>
                <div className="space-y-2">
                  {weaknessAnalysis.recentScores.map((score, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{score.type}</span>
                      <span className="text-sm font-medium">{score.score}%</span>
                      <span className="text-xs text-gray-500">{score.date}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 推奨事項 */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-2">推奨事項</h3>
                <ul className="space-y-1">
                  {weaknessAnalysis.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-gray-700">• {rec}</li>
                  ))}
                </ul>
              </div>

              {/* アクションボタン */}
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    const student = students.find(s => s.id === weaknessAnalysis.studentId);
                    if (student) {
                      handleGenerateWeaknessProblems(student, weaknessAnalysis.weaknessTypes);
                    }
                  }}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>弱点対策問題を印刷</span>
                </button>
                <button
                  onClick={() => setShowWeaknessModal(false)}
                  className="btn-secondary"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 教師用: QRロック解除 */}
      <div className="card mt-6">
        <div className="flex items-center space-x-2 mb-4">
          <Unlock className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">教師用: QRロック解除</h2>
        </div>
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">管理者トークン</label>
            <input
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="サーバーと共有した管理者トークンを入力"
              className="input-field"
            />
          </div>
          <div className="text-sm text-gray-500">このトークンはローカルでのみ使用され、APIヘッダーに送信されます。</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">qrId</label>
            <input
              type="text"
              value={unlockQrId}
              onChange={(e) => setUnlockQrId(e.target.value)}
              placeholder="例: Q-1727680000000-3"
              className="input-field"
            />
          </div>
          <div>
            <button onClick={handleUnlockQr} className="btn-secondary w-full flex items-center justify-center space-x-2">
              <Unlock className="w-4 h-4" />
              <span>ロック解除</span>
            </button>
          </div>
        </div>
        {unlockMessage && (
          <div className="mt-3 p-3 rounded-lg bg-gray-50 text-gray-800">{unlockMessage}</div>
        )}
        <p className="text-xs text-gray-500 mt-2">※ 生徒が誤って読み取った場合のやり直し用です。qrIdは印刷物に記載されています。</p>

        {/* 直近のスキャン一覧 */}
        <div className="mt-6">
          <h3 className="text-md font-semibold text-gray-900 mb-2">最近のスキャン（最新20件）</h3>
          {recentScans.length === 0 ? (
            <div className="text-sm text-gray-500">記録がありません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">時刻</th>
                    <th className="px-4 py-2 text-left">eventType</th>
                    <th className="px-4 py-2 text-left">生徒</th>
                    <th className="px-4 py-2 text-left">qrId</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentScans.map((e, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">{new Date(e.scannedAt || e.timestamp).toLocaleString('ja-JP')}</td>
                      <td className="px-4 py-2">{e.eventType}</td>
                      <td className="px-4 py-2">{e.studentName || '-'}</td>
                      <td className="px-4 py-2 font-mono">{e.qrId || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 解除履歴 */}
        <div className="mt-6">
          <h3 className="text-md font-semibold text-gray-900 mb-2">解除履歴</h3>
          {unlockLogs.length === 0 ? (
            <div className="text-sm text-gray-500">解除履歴がありません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">解除時刻</th>
                    <th className="px-4 py-2 text-left">qrId</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {unlockLogs.map((u, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">{new Date(u.unlockedAt).toLocaleString('ja-JP')}</td>
                      <td className="px-4 py-2 font-mono">{u.qrId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

