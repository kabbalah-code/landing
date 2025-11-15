const { MongoClient, ServerApiVersion } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'kabbalah-code';

let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) {
        return cachedClient;
    }

    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI is not configured');
    }

    try {
        const client = new MongoClient(MONGODB_URI, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            }
        });

        await client.connect();
        await client.db('admin').command({ ping: 1 });
        
        cachedClient = client;
        return client;
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        throw error;
    }
}

module.exports = async function handler(req, res) {
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

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email' });
        }

        const client = await connectToDatabase();
        const db = client.db(MONGODB_DB);
        const collection = db.collection('waitlist');

        const existing = await collection.findOne({ 
            email: email.toLowerCase() 
        });
        
        if (existing) {
            return res.status(200).json({ 
                success: true,
                message: 'Already on waitlist!',
                alreadyExists: true 
            });
        }

        await collection.insertOne({
            email: email.toLowerCase(),
            timestamp: new Date(),
            userAgent: req.headers['user-agent'] || 'unknown',
            ip: req.headers['x-forwarded-for'] || 'unknown',
            source: 'landing'
        });

        return res.status(200).json({
            success: true,
            message: 'Successfully joined!'
        });

    } catch (error) {
        console.error('Error:', error.message);
        return res.status(500).json({ 
            error: 'Server error',
            details: error.message
        });
    }
};
```

---

## 📝 **Шаг 4: Обновите Environment Variables в Vercel**

1. **Settings** → **Environment Variables**
2. Найдите `MONGODB_URI` и нажмите **Edit** (или удалите и создайте заново)
3. Вставьте **НОВЫЙ** connection string:

**Формат:**
```
mongodb+srv://USERNAME:PASSWORD@clusterNAME.XXXXX.mongodb.net/?retryWrites=true&w=majority
```

**Пример:**
```
mongodb+srv://kabbalah_user:MyPassword123@cluster0.ab12cd.mongodb.net/?retryWrites=true&w=majority
