const clientPromise = require('../lib/mongodb');

module.exports = async function handler(req, res) {
  try {
    const client = await clientPromise;
    
    // Проверка подключения
    await client.db('admin').command({ ping: 1 });
    
    // Получаем список баз данных
    const databases = await client.db().admin().listDatabases();
    
    return res.status(200).json({ 
      success: true,
      message: '✅ MongoDB connected successfully!',
      databases: databases.databases.map(db => db.name)
    });
    
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      error: error.message,
      code: error.code
    });
  }
};
```

---

## 📁 **Итоговая структура проекта:**
```
kabbalah-code/
├── lib/
│   └── mongodb.js          ← Новый файл!
├── api/
│   ├── join-waitlist.js    ← Обновлён
│   ├── get-waitlist.js     ← Обновлён
│   └── test-connection.js  ← Новый файл!
├── public/
│   ├── index.html
│   └── admin.html
├── package.json
├── vercel.json
└── .gitignore
