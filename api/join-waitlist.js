// Vercel Serverless Function для сохранения email в MongoDB
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'kabbalah-code';

let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) {
        return cachedClient;
    }

    const client = await MongoClient.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    cachedClient = client;
    return client;
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email } = req.body;

        // Валидация email
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        // Подключение к MongoDB
        const client = await connectToDatabase();
        const db = client.db(MONGODB_DB);
        const collection = db.collection('waitlist');

        // Проверка на дубликаты
        const existingEmail = await collection.findOne({ email: email.toLowerCase() });
        
        if (existingEmail) {
            return res.status(200).json({ 
                message: 'You are already on the waitlist!',
                alreadyExists: true 
            });
        }

        // Сохранение в БД
        const result = await collection.insertOne({
            email: email.toLowerCase(),
            timestamp: new Date(),
            userAgent: req.headers['user-agent'],
            ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
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
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
