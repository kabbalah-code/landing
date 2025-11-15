// Admin API для просмотра waitlist
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'kabbalah-code';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN; // Секретный токен для доступа

let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) {
        return cachedClient;
    }

    const client = await MongoClient.connect(MONGODB_URI);
    cachedClient = client;
    return client;
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Простая аутентификация
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || token !== ADMIN_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const client = await connectToDatabase();
        const db = client.db(MONGODB_DB);
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
}
