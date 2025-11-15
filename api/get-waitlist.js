const clientPromise = require('../lib/mongodb');

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Проверка авторизации
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('kabbalah-code');
    const collection = db.collection('waitlist');

    const emails = await collection
      .find({})
      .sort({ timestamp: -1 })
      .toArray();

    const stats = {
      total: emails.length,
      today: emails.filter(e => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(e.timestamp) >= today;
      }).length,
      thisWeek: emails.filter(e => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(e.timestamp) >= weekAgo;
      }).length
    };

    return res.status(200).json({
      success: true,
      stats,
      emails: emails.map(e => ({
        email: e.email,
        timestamp: e.timestamp,
        source: e.source
      }))
    });

  } catch (error) {
    console.error('Get waitlist error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
