const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("❌ 嚴重錯誤：找不到 MONGO_URI，請檢查 server/.env 檔案！");
} else {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('✅ 成功連線到 MongoDB Atlas'))
        .catch(err => console.error('❌ MongoDB 連線失敗:', err));
}

// --- 定義資料結構 ---
const RecordSchema = new mongoose.Schema({
    item: { type: String, required: true },
    cost: { type: Number, required: true },
    category: { type: String, required: true },
    type: { type: String, required: true },
    date: { type: Date, default: Date.now },
    mobileBarcode: { type: String, required: false } 
});
const Record = mongoose.model('Record', RecordSchema);

// --- API 路由 ---

app.get('/api/records', async (req, res) => {
    try {
        const records = await Record.find().sort({ date: -1 });
        res.json(records);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/records', async (req, res) => {
    try {
        const newRecord = new Record(req.body);
        const savedRecord = await newRecord.save();
        res.status(201).json(savedRecord);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/api/records/:id', async (req, res) => {
    try {
        await Record.findByIdAndDelete(req.params.id);
        res.json({ message: "刪除成功" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ✨✨✨ 新增：一鍵生成測試資料 API ✨✨✨
app.get('/api/seed', async (req, res) => {
    try {
        // 1. 清空舊資料
        await Record.deleteMany({});
        
        // 2. 準備產生 800 筆資料
        const records = [];
        const EXPENSE_CATS = ["飲食", "交通", "水電", "教育", "投資", "房租", "美裝與服飾", "通訊", "休閒", "其他"];
        const INCOME_CATS = ["薪水", "兼職", "投資", "零用錢", "其他"];
        
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 4); // 過去 4 年

        for (let i = 0; i < 800; i++) {
            const isExpense = Math.random() > 0.2; // 80% 是支出
            const type = isExpense ? 'expense' : 'income';
            const cats = isExpense ? EXPENSE_CATS : INCOME_CATS;
            const category = cats[Math.floor(Math.random() * cats.length)];
            const cost = isExpense ? Math.floor(Math.random() * 2000) + 50 : Math.floor(Math.random() * 50000) + 1000;
            
            // 隨機日期
            const date = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));

            records.push({
                item: `測試${type === 'income' ? '收入' : '消費'} #${i+1}`,
                cost, category, type, date,
                mobileBarcode: Math.random() > 0.8 ? '/AB.1234' : ''
            });
        }

        // 3. 寫入資料庫
        await Record.insertMany(records);
        res.send(`<h1>🎉 成功重置！已產生 800 筆資料。</h1><p>請回到 App 重新整理頁面。</p>`);
    } catch (err) {
        res.status(500).send("❌ 失敗: " + err.message);
    }
});

// --- 啟動伺服器 ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 伺服器正在 Port ${PORT} 上運行...`);
});
