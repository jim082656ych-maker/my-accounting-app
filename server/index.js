const express = require('express');
const cors = require('cors');
// const mongoose = require('mongoose'); // 註解掉或刪掉：暫時不用資料庫
const app = express();

app.use(cors());
app.use(express.json());

// --- 模擬資料庫 (假資料) ---
// 因為沒有 MongoDB，我們用一個變數來存資料
let records = [
    { id: 1, item: "早餐 (測試資料)", cost: 50, date: "2023-01-01" },
    { id: 2, item: "午餐 (測試資料)", cost: 120, date: "2023-01-01" }
];

// --- API 區域 ---

// 1. 取得所有記帳紀錄 (GET)
app.get('/api/records', (req, res) => {
    console.log('前端來要在列表了...');
    res.json(records); // 直接回傳變數裡的資料
});

// 2. 新增一筆紀錄 (POST)
app.post('/api/records', (req, res) => {
    const newRecord = req.body;
    
    // 幫它加一個隨機 ID (因為沒有資料庫幫我們產生 ID)
    newRecord.id = Date.now(); 
    
    console.log('收到新記帳:', newRecord);
    
    // 存入我們的變數陣列
    records.push(newRecord);
    
    res.status(201).json(newRecord);
});

// 3. 刪除紀錄 (DELETE) - 額外加碼教你
app.delete('/api/records/:id', (req, res) => {
    const id = parseInt(req.params.id);
    // 過濾掉該 ID 的資料 (等於刪除)
    records = records.filter(record => record.id !== id);
    res.json({ message: "刪除成功" });
});

// --- 啟動伺服器 ---
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 簡易版伺服器啟動！在 Port ${PORT}`);
    console.log(`⚠️ 注意：這是無資料庫模式，重啟伺服器後資料會重置`);
});
