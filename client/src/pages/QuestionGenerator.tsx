import React, { useEffect, useState } from 'react';
import { Brain, Printer, Eye, EyeOff } from 'lucide-react';
import { ExamLevel, QuestionType, Question } from '../../shared/types';
import QRCode from 'qrcode';

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
  const [showAnswers, setShowAnswers] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [printMode, setPrintMode] = useState<'questions' | 'answers'>('questions');
  const [studentName, setStudentName] = useState<string>(() => {
    try { return localStorage.getItem('studentName') || ''; } catch { return ''; }
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lv = params.get('level');
    const sn = params.get('studentName');
    if (lv) setFormData(prev => ({ ...prev, level: lv as ExamLevel }));
    if (sn) setStudentName(sn);
  }, []);

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
    setShowAnswers(false);
    setShowPrintView(false);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE || ''}/api/generate`, {
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
      console.log('API Response:', result);
      
      // レスポンス形式を確認
      if (result.questions && Array.isArray(result.questions)) {
        setGeneratedQuestions(result.questions);
      } else if (result.error) {
        throw new Error(result.error);
      } else {
        console.error('Unexpected response format:', result);
        throw new Error('予期しないレスポンス形式です');
      }
    } catch (err) {
      console.error('Error details:', err);
      setError(err instanceof Error ? err.message : '問題生成中にエラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleAnswers = () => {
    setShowAnswers(!showAnswers);
  };

  const handlePrintQuestions = () => {
    setPrintMode('questions');
    openPrintWindow('questions');
  };

  const handlePrintAnswers = () => {
    setPrintMode('answers');
    openPrintWindow('answers');
  };

  const handleClosePrintView = () => {
    setShowPrintView(false);
  };

  const handlePrint = () => {
    openPrintWindow(printMode);
  };

  const buildPrintHTML = async (mode: 'questions' | 'answers') => {
    const title = `${formData.level} ${formData.type}問題`;
    const dateStr = new Date().toLocaleDateString('ja-JP');
    const headerName = studentName ? `受験者名: ${studentName}` : '';
    // QRコード生成
    const generateQR = async (text: string) => {
      try {
        return await QRCode.toDataURL(text, { width: 100, margin: 1 });
      } catch (error) {
        console.error('QR生成エラー:', error);
        return '';
      }
    };

    // 質問票のみQRを付与
    const isQuestions = mode === 'questions';
    const baseId = `${Date.now()}`;
    const studentQrId = `S-${baseId}`;
    const completeQrId = `C-${baseId}`;
    const studentQR = isQuestions
      ? await generateQR(`/api/scores/qr?payload=${encodeURIComponent(JSON.stringify({eventType:'student', studentName, qrId: studentQrId }))}`)
      : '';
    const completeQR = isQuestions
      ? await generateQR(`/api/scores/qr?payload=${encodeURIComponent(JSON.stringify({eventType:'complete', studentName, qrId: completeQrId }))}`)
      : '';

    const questionsHtml = await Promise.all(generatedQuestions.map(async (question, index) => {
      const header = `問題 ${index + 1} (${question.type} - ${question.level})`;
      let body = '';
      if (question.type === '語彙') {
        body += `<div class="question-content">${question.content}</div>`;
        if (question.choices && question.choices.length) {
          body += `<div class="choices">${question.choices.map((c, i) => `<div class="choice">${String.fromCharCode(65+i)}. ${c.text}</div>`).join('')}</div>`;
        }
        if (mode === 'answers' && question.correctAnswer) {
          body += `<div class="answer"><strong>正解:</strong> ${question.correctAnswer}</div>`;
        }
        if (mode === 'answers' && question.explanation) {
          body += `<div class="explanation"><strong>解説:</strong> ${question.explanation}</div>`;
        }
      } else if (question.type === '並び替え') {
        body += `<div class="question-content">${question.content}</div>`;
        if (question.tokens && question.tokens.length) {
          body += `<div class="tokens"><strong>並び替える語句:</strong><br/>${question.tokens.map(t => `<span class="token">${t}</span>`).join('')}</div>`;
        }
        if (mode === 'answers' && question.correctAnswer) {
          body += `<div class="answer"><strong>正解:</strong> ${question.correctAnswer}</div>`;
        }
        if (mode === 'answers' && question.explanation) {
          body += `<div class="explanation"><strong>解説:</strong> ${question.explanation}</div>`;
        }
      } else if (question.type === '長文読解') {
        body += `<div class="question-content">${question.content}</div>`;
        if (question.questions && question.questions.length) {
          body += question.questions.map((q, qIndex) => {
            let qHtml = `<div class="question"><div class="question-number">${qIndex + 1}. ${q.stem}</div>`;
            qHtml += `<div class="choices">${q.options.map((opt, oi) => `<div class="choice">${String.fromCharCode(65+oi)}. ${opt}</div>`).join('')}</div>`;
            if (mode === 'answers') {
              qHtml += `<div class="answer"><strong>正解:</strong> ${q.answer}</div>`;
              if (q.evidence) qHtml += `<div class="explanation"><strong>根拠:</strong> ${q.evidence}</div>`;
            }
            qHtml += `</div>`;
            return qHtml;
          }).join('');
        }
      } else if (question.type === '英作文') {
        body += `<div class="question-content">${question.content}</div>`;
        if (question.wordLimit) {
          body += `<div class="notice"><strong>語数制限:</strong> ${question.wordLimit.min}-${question.wordLimit.max}語</div>`;
        }
        if (mode === 'answers' && question.referenceAnswer) {
          body += `<div class="answer"><strong>参考解答:</strong><br/>${question.referenceAnswer}</div>`;
        }
        if (mode === 'answers' && question.explanation) {
          body += `<div class="explanation"><strong>解説:</strong> ${question.explanation}</div>`;
        }
      }

      // 問題QR生成（問題用紙のみ）
      if (isQuestions) {
        const questionQrId = `Q-${baseId}-${index + 1}`;
        const questionQR = await generateQR(`/api/scores/qr?payload=${encodeURIComponent(JSON.stringify({ eventType: 'question', studentName, questionId: question.id, qrId: questionQrId }))}`);
        if (questionQR) {
          body += `<div style="margin-top:6px; font-size:12px; color:#555;">
            <div style="display:flex; align-items:center; gap:8px;">
              <img src="${questionQR}" style="width:60px;height:60px;" alt="QR #${index + 1}" />
              <div>
                <div><strong>QR #${index + 1}</strong></div>
                <div>ID: ${questionQrId}</div>
              </div>
            </div>
          </div>`;
        }
      }

      return `<div class="question"><div class="question-number">${header}</div>${body}</div>`;
    }));

    return `<!doctype html><html lang="ja"><head><meta charset="utf-8" />
      <title>${title}</title>
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
          <div class="meta"><div>${headerName}</div><div>日付: ${dateStr}</div></div>
          <h1>${mode === 'questions' ? '問題用紙' : '解答用紙'} - ${formData.level} ${formData.type}</h1>
          ${isQuestions ? `
          <div class="qr-section" style="display:flex; justify-content:space-around; margin:20px 0; padding:10px; border:1px solid #ddd;">
            <div class="qr-item" style="text-align:center;">
              <div><strong>生徒QR</strong></div>
              ${studentQR ? `<img src="${studentQR}" style="width:80px;height:80px;" alt="生徒QR" />` : '<div>QR生成エラー</div>'}
              <div style="font-size:12px; color:#555;">ID: ${studentQrId}</div>
            </div>
            <div class="qr-item" style="text-align:center;">
              <div><strong>完了QR</strong></div>
              ${completeQR ? `<img src="${completeQR}" style="width:80px;height:80px;" alt="完了QR" />` : '<div>QR生成エラー</div>'}
              <div style="font-size:12px; color:#555;">ID: ${completeQrId}</div>
            </div>
          </div>
          ` : ''}
          ${questionsHtml.join('')}
        </div>
        <script>window.onload = () => { setTimeout(() => { window.print(); setTimeout(() => window.close(), 300); }, 300); };</script>
      </body></html>`;
  };

  const openPrintWindow = async (mode: 'questions' | 'answers') => {
    // ユーザー操作直後にウィンドウを開く（ポップアップブロック回避）
    const printWin = window.open('', '_blank', 'width=900,height=800');
    if (!printWin) {
      alert('ポップアップがブロックされました。ブラウザの設定を確認してください。');
      return;
    }

    // 一旦プレースホルダーを描画
    printWin.document.open();
    printWin.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>印刷準備中...</title></head><body><p>印刷用データを準備しています...</p></body></html>`);
    printWin.document.close();

    try {
      const html = await buildPrintHTML(mode);
      // 生成後に本HTMLを書き込み
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
    } catch (e) {
      printWin.document.open();
      printWin.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>エラー</title></head><body><pre>${e instanceof Error ? e.message : '印刷データ生成でエラー'}</pre></body></html>`);
      printWin.document.close();
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
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto mb-4">
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
        {/* 生徒名入力 */}
        <div className="max-w-xl mx-auto mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">受験者名（印刷ヘッダーに表示）</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="山田花子"
              className="input-field flex-1"
            />
            <button
              onClick={() => { try { localStorage.setItem('studentName', studentName); alert('受験者名を保存しました'); } catch {} }}
              className="btn-secondary"
            >保存</button>
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
                  <button
                    onClick={handleToggleAnswers}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    {showAnswers ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        <span>解答を隠す</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>解答を表示</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handlePrintQuestions}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>問題用紙を印刷</span>
                  </button>
                  <button
                    onClick={handlePrintAnswers}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <Printer className="w-4 h-4" />
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
                            <div key={choice.id} className="p-3 rounded-lg bg-gray-50">
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
                      {question.tokens && (
                        <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>並び替える語句:</strong>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {question.tokens.map((token, tokenIndex) => (
                              <span
                                key={tokenIndex}
                                className="px-2 py-1 bg-white border border-gray-300 rounded text-sm"
                              >
                                {token}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
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
                                  <div key={optIndex} className="p-2 rounded bg-white">
                                    <span className="font-medium mr-2">
                                      {String.fromCharCode(65 + optIndex)}.
                                    </span>
                                    {option}
                                  </div>
                                ))}
                              </div>
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
                    </>
                  )}

                  {/* 解答表示（解答表示時のみ） */}
                  {showAnswers && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                      <h5 className="font-medium mb-2 text-green-800">解答</h5>
                      {question.type === '語彙' && question.correctAnswer && (
                        <p className="text-green-700">正解: {question.correctAnswer}</p>
                      )}
                      {question.type === '並び替え' && question.correctAnswer && (
                        <p className="text-green-700">正解: {question.correctAnswer}</p>
                      )}
                      {question.type === '長文読解' && question.questions && (
                        <div className="space-y-2">
                          {question.questions.map((q, qIndex) => (
                            <p key={qIndex} className="text-green-700">
                              {qIndex + 1}. {q.answer}
                            </p>
                          ))}
                        </div>
                      )}
                      {question.type === '英作文' && question.referenceAnswer && (
                        <div>
                          <p className="text-green-700 whitespace-pre-wrap">{question.referenceAnswer}</p>
                        </div>
                      )}
                      {question.explanation && (
                        <div className="mt-3 pt-3 border-t border-green-300">
                          <h6 className="font-medium text-green-800 mb-1">解説</h6>
                          <p className="text-green-700 text-sm">{question.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 印刷ビュー */}
      {showPrintView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold">
                {printMode === 'questions' ? '問題用紙' : '解答用紙'} - {formData.level} {formData.type}
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={handlePrint}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>印刷</span>
                </button>
                <button
                  onClick={handleClosePrintView}
                  className="btn-secondary"
                >
                  閉じる
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="print-view">
                <style jsx>{`
                  .print-view {
                    font-family: 'Times New Roman', serif;
                    line-height: 1.6;
                    color: #000;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                  }
                  
                  .print-view h1 {
                    font-size: 24px;
                    font-weight: bold;
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #000;
                    padding-bottom: 10px;
                  }
                  
                  .print-view .question {
                    margin-bottom: 30px;
                    page-break-inside: avoid;
                  }
                  
                  .print-view .question-number {
                    font-weight: bold;
                    font-size: 16px;
                    margin-bottom: 10px;
                  }
                  
                  .print-view .question-content {
                    margin-bottom: 15px;
                    font-size: 14px;
                  }
                  
                  .print-view .choices {
                    margin-left: 20px;
                  }
                  
                  .print-view .choice {
                    margin-bottom: 5px;
                    font-size: 14px;
                  }
                  
                  .print-view .answer {
                    background-color: #f0f0f0;
                    padding: 10px;
                    margin-top: 10px;
                    border-left: 4px solid #000;
                  }
                  
                  .print-view .tokens {
                    background-color: #f9f9f9;
                    padding: 10px;
                    margin: 10px 0;
                    border: 1px solid #ccc;
                  }
                  
                  .print-view .token {
                    display: inline-block;
                    background-color: #fff;
                    border: 1px solid #999;
                    padding: 2px 8px;
                    margin: 2px;
                    border-radius: 3px;
                  }
                  
                  .print-view .header-info {
                    text-align: right;
                    margin-bottom: 20px;
                    font-size: 12px;
                    color: #666;
                  }
                  
                  @media print {
                    body * {
                      visibility: hidden;
                    }
                    
                    .print-view, .print-view * {
                      visibility: visible;
                    }
                    
                    .print-view {
                      position: absolute;
                      left: 0;
                      top: 0;
                      width: 100%;
                      margin: 0;
                      padding: 20px;
                      background: white;
                    }
                    
                    .print-view .question {
                      page-break-inside: avoid;
                    }
                  }
                `}</style>
                
                <div className="header-info">
                  <div>日付: {new Date().toLocaleDateString('ja-JP')}</div>
                </div>
                
                <h1>{printMode === 'questions' ? '問題用紙' : '解答用紙'} - {formData.level} {formData.type}</h1>
                
                {generatedQuestions.map((question, index) => (
                  <div key={question.id} className="question">
                    <div className="question-number">
                      問題 {index + 1} ({question.type} - {question.level})
                    </div>
                    
                    {/* 語彙問題 */}
                    {question.type === '語彙' && (
                      <>
                        <div className="question-content">
                          {question.content}
                        </div>
                        {question.choices && question.choices.length > 0 && (
                          <div className="choices">
                            {question.choices.map((choice, choiceIndex) => (
                              <div key={choice.id} className="choice">
                                {String.fromCharCode(65 + choiceIndex)}. {choice.text}
                              </div>
                            ))}
                          </div>
                        )}
                        {printMode === 'answers' && question.correctAnswer && (
                          <div className="answer">
                            <strong>正解:</strong> {question.correctAnswer}
                          </div>
                        )}
                        {printMode === 'answers' && question.explanation && (
                          <div className="explanation">
                            <strong>解説:</strong> {question.explanation}
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* 並び替え問題 */}
                    {question.type === '並び替え' && (
                      <>
                        <div className="question-content">
                          {question.content}
                        </div>
                        {question.tokens && (
                          <div className="tokens">
                            <strong>並び替える語句:</strong><br />
                            {question.tokens.map((token, tokenIndex) => (
                              <span key={tokenIndex} className="token">
                                {token}
                              </span>
                            ))}
                          </div>
                        )}
                        {printMode === 'answers' && question.correctAnswer && (
                          <div className="answer">
                            <strong>正解:</strong> {question.correctAnswer}
                          </div>
                        )}
                        {printMode === 'answers' && question.explanation && (
                          <div className="explanation">
                            <strong>解説:</strong> {question.explanation}
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* 長文読解問題 */}
                    {question.type === '長文読解' && (
                      <>
                        <div className="question-content">
                          {question.content}
                        </div>
                        {question.questions && question.questions.length > 0 && (
                          <div>
                            {question.questions.map((q, qIndex) => (
                              <div key={q.id} className="question">
                                <div className="question-number">
                                  {qIndex + 1}. {q.stem}
                                </div>
                                <div className="choices">
                                  {q.options.map((option, optIndex) => (
                                    <div key={optIndex} className="choice">
                                      {String.fromCharCode(65 + optIndex)}. {option}
                                    </div>
                                  ))}
                                </div>
                                {printMode === 'answers' && (
                                  <div className="answer">
                                    <strong>正解:</strong> {q.answer}
                                  </div>
                                )}
                                {printMode === 'answers' && q.evidence && (
                                  <div className="explanation">
                                    <strong>根拠:</strong> {q.evidence}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* 英作文問題 */}
                    {question.type === '英作文' && (
                      <>
                        <div className="question-content">
                          {question.content}
                        </div>
                        {question.wordLimit && (
                          <div style={{ margin: '10px 0', padding: '8px', backgroundColor: '#fff5f0', border: '1px solid #ffb366' }}>
                            <strong>語数制限:</strong> {question.wordLimit.min}-{question.wordLimit.max}語
                          </div>
                        )}
                        {printMode === 'answers' && question.referenceAnswer && (
                          <div className="answer">
                            <strong>参考解答:</strong><br />
                            {question.referenceAnswer}
                          </div>
                        )}
                        {printMode === 'answers' && question.explanation && (
                          <div className="explanation">
                            <strong>解説:</strong> {question.explanation}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionGenerator;
