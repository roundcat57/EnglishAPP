export default function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const students = [
      {
        "id": "student-001",
        "name": "田中太郎",
        "level": "3級",
        "email": "tanaka@example.com",
        "grade": "中学3年",
        "school": "岩沢中学校",
        "joinedAt": "2024-04-01T00:00:00.000Z",
        "isActive": true
      },
      {
        "id": "student-002",
        "name": "佐藤花子",
        "level": "準2級",
        "email": "sato@example.com",
        "grade": "高校1年",
        "school": "岩沢高校",
        "joinedAt": "2024-04-15T00:00:00.000Z",
        "isActive": true
      },
      {
        "id": "student-003",
        "name": "鈴木一郎",
        "level": "2級",
        "email": "suzuki@example.com",
        "grade": "高校2年",
        "school": "岩沢高校",
        "joinedAt": "2024-03-20T00:00:00.000Z",
        "isActive": true
      },
      {
        "id": "student-004",
        "name": "高橋美咲",
        "level": "準1級",
        "email": "takahashi@example.com",
        "grade": "高校3年",
        "school": "岩沢高校",
        "joinedAt": "2024-02-10T00:00:00.000Z",
        "isActive": true
      },
      {
        "id": "student-005",
        "name": "山田健太",
        "level": "4級",
        "email": "yamada@example.com",
        "grade": "中学2年",
        "school": "岩沢中学校",
        "joinedAt": "2024-05-01T00:00:00.000Z",
        "isActive": true
      }
    ];

    res.status(200).json({
      students,
      total: students.length,
      limit: 100,
      offset: 0
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}