const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// メモリ内ストレージ（実際のアプリではデータベースを使用）
let students = [];

// 全塾生を取得
router.get('/', (req, res) => {
  try {
    const { level, isActive, limit = 100, offset = 0 } = req.query;
    
    let filteredStudents = [...students];
    
    // フィルタリング
    if (level) {
      filteredStudents = filteredStudents.filter(s => s.level === level);
    }
    if (isActive !== undefined) {
      filteredStudents = filteredStudents.filter(s => s.isActive === (isActive === 'true'));
    }
    
    // ページネーション
    const paginatedStudents = filteredStudents.slice(offset, offset + limit);
    
    res.json({
      students: paginatedStudents,
      total: filteredStudents.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({
      error: '塾生の取得中にエラーが発生しました',
      message: error.message
    });
  }
});

// 特定の塾生を取得
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const student = students.find(s => s.id === id);
    
    if (!student) {
      return res.status(404).json({
        error: '塾生が見つかりません',
        id
      });
    }
    
    res.json(student);
  } catch (error) {
    res.status(500).json({
      error: '塾生の取得中にエラーが発生しました',
      message: error.message
    });
  }
});

// 新しい塾生を登録
router.post('/', (req, res) => {
  try {
    const { name, level, email, grade, school } = req.body;
    
    // バリデーション
    if (!name || !level) {
      return res.status(400).json({
        error: '必須フィールドが不足しています',
        required: ['name', 'level']
      });
    }
    
    // 重複チェック
    const existingStudent = students.find(s => s.name === name);
    if (existingStudent) {
      return res.status(400).json({
        error: '同じ名前の塾生が既に存在します'
      });
    }
    
    const newStudent = {
      id: uuidv4(),
      name,
      level,
      email: email || '',
      grade: grade || '',
      school: school || '',
      joinedAt: new Date(),
      isActive: true
    };
    
    students.push(newStudent);
    
    res.status(201).json({
      message: '塾生が正常に登録されました',
      student: newStudent
    });
  } catch (error) {
    res.status(500).json({
      error: '塾生の登録中にエラーが発生しました',
      message: error.message
    });
  }
});

// 塾生情報を更新
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const studentIndex = students.findIndex(s => s.id === id);
    
    if (studentIndex === -1) {
      return res.status(404).json({
        error: '塾生が見つかりません',
        id
      });
    }
    
    // 更新データを適用
    students[studentIndex] = {
      ...students[studentIndex],
      ...updateData,
      updatedAt: new Date()
    };
    
    res.json({
      message: '塾生情報が正常に更新されました',
      student: students[studentIndex]
    });
  } catch (error) {
    res.status(500).json({
      error: '塾生情報の更新中にエラーが発生しました',
      message: error.message
    });
  }
});

// 塾生を削除（論理削除）
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const studentIndex = students.findIndex(s => s.id === id);
    
    if (studentIndex === -1) {
      return res.status(404).json({
        error: '塾生が見つかりません',
        id
      });
    }
    
    // 論理削除（isActiveをfalseに設定）
    students[studentIndex].isActive = false;
    students[studentIndex].updatedAt = new Date();
    
    res.json({
      message: '塾生が正常に削除されました',
      student: students[studentIndex]
    });
  } catch (error) {
    res.status(500).json({
      error: '塾生の削除中にエラーが発生しました',
      message: error.message
    });
  }
});

// 塾生の統計情報を取得
router.get('/stats/summary', (req, res) => {
  try {
    const stats = {
      total: students.length,
      active: students.filter(s => s.isActive).length,
      byLevel: {},
      byGrade: {},
      recent: students
        .filter(s => s.isActive)
        .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))
        .slice(0, 5)
    };
    
    // 級別・学年別統計
    students.forEach(s => {
      if (s.isActive) {
        stats.byLevel[s.level] = (stats.byLevel[s.level] || 0) + 1;
        if (s.grade) {
          stats.byGrade[s.grade] = (stats.byGrade[s.grade] || 0) + 1;
        }
      }
    });
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: '統計情報の取得中にエラーが発生しました',
      message: error.message
    });
  }
});

// 塾生の検索
router.get('/search/:query', (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 20 } = req.query;
    
    const searchResults = students
      .filter(s => s.isActive && (
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.email.toLowerCase().includes(query.toLowerCase()) ||
        s.school.toLowerCase().includes(query.toLowerCase())
      ))
      .slice(0, parseInt(limit));
    
    res.json({
      query,
      results: searchResults,
      total: searchResults.length
    });
  } catch (error) {
    res.status(500).json({
      error: '検索中にエラーが発生しました',
      message: error.message
    });
  }
});

module.exports = router;

