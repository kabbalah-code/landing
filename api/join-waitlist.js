const { MongoClient, ServerApiVersion } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'kabbalah-code';

let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) {
        return cachedClient;
    }

    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is not set');
    }

    try {
        // Современные опции подключения для MongoDB 6.x
        const client = new MongoClient(MONGODB_URI, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        await client.connect();
        
        // Проверка подключения
        await client.db('admin').command({ ping: 1 });
        console.log('✅ Successfully connected to MongoDB');
        
        cachedClient = client;
        return client;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        throw error;
    }
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        if (!MONGODB_URI) {
            return res.status(500).json({ 
                error: 'Server configuration error'
            });
        }

        const { email } = req.body;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        const client = await connectToDatabase();
        const db = client.db(MONGODB_DB);
        const collection = db.collection('waitlist');

        const existingEmail = await collection.findOne({ 
            email: email.toLowerCase() 
        });
        
        if (existingEmail) {
            return res.status(200).json({ 
                success: true,
                message: 'You are already on the waitlist!',
                alreadyExists: true 
            });
        }

        const result = await collection.insertOne({
            email: email.toLowerCase(),
            timestamp: new Date(),
            userAgent: req.headers['user-agent'] || 'unknown',
            ip: req.headers['x-forwarded-for'] || 'unknown',
            source: 'landing-page'
        });

        return res.status(200).json({
            success: true,
            message: 'Successfully joined the waitlist!'
        });

    } catch (error) {
        console.error('Waitlist error:', error);
        
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message
        });
    }
};
```

---

## ✅ **Решение 3: Проверьте формат Connection String**

**Правильный формат:**
```
mongodb+srv://USERNAME:PASSWORD@cluster0.oitnygy.mongodb.net/?retryWrites=true&w=majority
```

**Частые ошибки:**

❌ **Пробелы в пароле (не закодированы)**
```
mongodb+srv://user:My Pass@cluster...  ← НЕПРАВИЛЬНО
mongodb+srv://user:My%20Pass@cluster... ← ПРАВИЛЬНО
```

❌ **Забыли заменить `<password>`**
```
mongodb+srv://user:<password>@cluster... ← НЕПРАВИЛЬНО
```

❌ **Неправильный hostname кластера**
```
mongodb+srv://user:pass@cluster.mongodb.net  ← Проверьте точный URL
```

---

## ✅ **Решение 4: Обновите в Vercel Environment Variables**

1. **Settings** → **Environment Variables**
2. **Удалите** старую `MONGODB_URI`
3. **Добавьте новую** с правильным connection string:
```
Name: MONGODB_URI
Value: mongodb+srv://kabbalah_admin:SecurePass123@cluster0.oitnygy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
