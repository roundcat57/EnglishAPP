import React, { useEffect, useState } from 'react';

interface AnswerItem {
  questionId: string;
  correct: boolean;
}

const ScoreEntry: React.FC = () => {
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [level, setLevel] = useState('3級');
  const [type, setType] = useState('語彙');
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const name = localStorage.getItem('studentName') || '';
      setStudentName(name);
    } catch {}
  }, []);

  useEffect(() => {
    if (totalQuestions > 0) {
      const s = Math.round((correctAnswers / totalQuestions) * 100);
      setScore(s);
    }
  }, [totalQuestions, correctAnswers]);

  const handleSubmit = async () => {
    try {
      const payload = {
        studentId: studentId || 'unknown',
        questionSetId: 'manual-entry',
        level,
        type,
        score,
        totalQuestions,
        correctAnswers,
        timeSpent,
        answers: [] as AnswerItem[]
      };

      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || '登録に失敗しました');
      }
      setMessage('採点結果を登録しました');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'エラーが発生しました');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">採点入力</h1>
      <div className="card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">受験者名</label>
            <input className="input-field" value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="山田花子" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">受験者ID（任意）</label>
            <input className="input-field" value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="student-001" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">英検級</label>
            <select className="select-field" value={level} onChange={e => setLevel(e.target.value)}>
              {['5級','4級','3級','準2級','2級','準1級','1級'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">問題タイプ</label>
            <select className="select-field" value={type} onChange={e => setType(e.target.value)}>
              {['語彙','並び替え','長文読解','英作文'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">総問題数</label>
            <input type="number" className="input-field" value={totalQuestions} onChange={e => setTotalQuestions(parseInt(e.target.value)||0)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">正解数</label>
            <input type="number" className="input-field" value={correctAnswers} onChange={e => setCorrectAnswers(parseInt(e.target.value)||0)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">所要時間（秒）</label>
            <input type="number" className="input-field" value={timeSpent} onChange={e => setTimeSpent(parseInt(e.target.value)||0)} />
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded border">
          <span className="font-semibold">スコア：</span>{score} 点
        </div>

        <div className="flex space-x-2">
          <button className="btn-primary" onClick={handleSubmit}>登録</button>
        </div>
        {message && <div className="text-sm text-gray-700">{message}</div>}
      </div>
    </div>
  );
};

export default ScoreEntry;


