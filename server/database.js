const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// データベースパスを設定（環境変数またはデフォルト）
const dbPath = process.env.DATABASE_URL || path.join(__dirname, 'database.sqlite');

// データベースディレクトリが存在しない場合は作成
const dbDir = path.dirname(dbPath);
if (!require('fs').existsSync(dbDir)) {
  require('fs').mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ データベース接続エラー:', err);
    console.error('📁 データベースパス:', dbPath);
    console.error('📁 データベースディレクトリ:', dbDir);
    process.exit(1);
  } else {
    console.log('✅ データベースに接続しました:', dbPath);
  }
});

// データベース初期化
db.serialize(() => {
  // 生徒テーブル
  db.run(`CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level TEXT NOT NULL,
    email TEXT,
    grade TEXT,
    school TEXT,
    joinedAt TEXT,
    isActive INTEGER DEFAULT 1
  )`);

  // 問題セットテーブル
  db.run(`CREATE TABLE IF NOT EXISTS question_sets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level TEXT NOT NULL,
    type TEXT NOT NULL,
    questions TEXT NOT NULL,
    createdAt TEXT,
    createdBy TEXT
  )`);

  // スコアテーブル
  db.run(`CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY,
    studentId TEXT NOT NULL,
    questionSetId TEXT,
    level TEXT NOT NULL,
    type TEXT NOT NULL,
    score INTEGER NOT NULL,
    totalQuestions INTEGER NOT NULL,
    correctAnswers INTEGER NOT NULL,
    timeSpent INTEGER,
    answers TEXT,
    createdAt TEXT,
    FOREIGN KEY (studentId) REFERENCES students (id)
  )`);

  // QRイベントテーブル
  db.run(`CREATE TABLE IF NOT EXISTS qr_events (
    id TEXT PRIMARY KEY,
    eventType TEXT NOT NULL,
    studentId TEXT,
    studentName TEXT,
    questionSetId TEXT,
    questionId TEXT,
    correct INTEGER,
    scannedAt TEXT NOT NULL,
    qrId TEXT,
    override INTEGER DEFAULT 0
  )`);

  // 初期データ挿入（既存の生徒データ）
  const students = [
    {
      id: 'student-001',
      name: '田中太郎',
      level: '3級',
      email: 'tanaka@example.com',
      grade: '中学3年',
      school: '岩沢中学校',
      joinedAt: '2024-04-01T00:00:00.000Z',
      isActive: 1
    },
    {
      id: 'student-002',
      name: '佐藤花子',
      level: '準2級',
      email: 'sato@example.com',
      grade: '高校1年',
      school: '岩沢高校',
      joinedAt: '2024-04-15T00:00:00.000Z',
      isActive: 1
    },
    {
      id: 'student-003',
      name: '鈴木一郎',
      level: '2級',
      email: 'suzuki@example.com',
      grade: '高校2年',
      school: '岩沢高校',
      joinedAt: '2024-03-20T00:00:00.000Z',
      isActive: 1
    },
    {
      id: 'student-004',
      name: '高橋美咲',
      level: '準1級',
      email: 'takahashi@example.com',
      grade: '高校3年',
      school: '岩沢高校',
      joinedAt: '2024-02-10T00:00:00.000Z',
      isActive: 1
    },
    {
      id: 'student-005',
      name: '山田健太',
      level: '4級',
      email: 'yamada@example.com',
      grade: '中学2年',
      school: '岩沢中学校',
      joinedAt: '2024-05-01T00:00:00.000Z',
      isActive: 1
    }
  ];

  // 既存データをチェックしてから挿入
  db.get("SELECT COUNT(*) as count FROM students", (err, row) => {
    if (err) {
      console.error('データベース初期化エラー:', err);
      return;
    }
    
    if (row.count === 0) {
      const stmt = db.prepare("INSERT INTO students (id, name, level, email, grade, school, joinedAt, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      students.forEach(student => {
        stmt.run(student.id, student.name, student.level, student.email, student.grade, student.school, student.joinedAt, student.isActive);
      });
      stmt.finalize();
      console.log('初期生徒データを挿入しました');
    }
  });
});

module.exports = db;
