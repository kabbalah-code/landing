const clientPromise = require('../lib/mongodb');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    // Валидация
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Подключение к MongoDB через общий client
    const client = await clientPromise;
    const db = client.db('kabbalah-code');
    const collection = db.collection('waitlist');

    // Проверка дубликатов
    const existing = await collection.findOne({ 
      email: email.toLowerCase() 
    });
    
    if (existing) {
      return res.status(200).json({ 
        success: true,
        message: 'You are already on the waitlist!',
        alreadyExists: true 
      });
    }

    // Сохранение
    const result = await collection.insertOne({
      email: email.toLowerCase(),
      timestamp: new Date(),
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.headers['x-forwarded-for'] || 'unknown',
      source: 'landing-page'
    });

    return res.status(200).json({
      success: true,
      message: 'Successfully joined the waitlist!',
      id: result.insertedId
    });

  } catch (error) {
    console.error('Waitlist error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
};
