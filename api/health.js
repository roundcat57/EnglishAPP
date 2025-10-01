export default function handler(req, res) {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: '岩沢学院 英検問題特化API'
  });
}