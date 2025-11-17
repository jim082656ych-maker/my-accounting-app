// 1. 引入套件
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path'); 
const fs = require('fs');   
const PDFDocument = require('pdfkit'); 

// 【!! NEW !!】 引入加密套件與 User 模型 (會員系統用)
const bcrypt = require('bcryptjs');
const User = require('./models/User'); 

// 引入 Record 模型 (記帳用)
const Record = require('./models/Record'); 

// 設定字體路徑 (修正版)
const fontPath = path.join(__dirname, 'fonts', 'NotoSansTC-Regular.ttf');

// 2. 建立 app
const app = express();

// 3. 中介軟體
app.use(cors());
app.use(express.json());

// 4. 連接 MongoDB 資料庫
const MONGO_URI = "mongodb+srv://jim082656:jim19921205@cluster0.mucx6fo.mongodb.net/?appName=Cluster0";
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ 成功連接到 MongoDB Atlas！'))
  .catch(err => console.error('❌ 連接 MongoDB 失敗:', err));

// ==========================================
// 📝 記帳功能 API (Records)
// ==========================================

// GET: 讀取所有紀錄
app.get('/api/records', async (req, res) => {
  try {
    const records = await Record.find().sort({ createdAt: -1 }); 
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: '讀取資料時發生錯誤', error: err });
  }
});

// POST: 新增紀錄
app.post('/api/records', async (req, res) => {
  try {
    const { description, amount, category } = req.body;
    const newRecord = new Record({
      description: description,
      amount: amount,
      category: category 
    });
    const savedRecord = await newRecord.save();
    res.status(201).json(savedRecord); 
  } catch (err) {
    if (err.name === 'ValidationError') {
      res.status(400).json({ message: err.message });
    } else {
      res.status(500).json({ message: '伺服器內部錯誤', error: err });
    }
  }
});

// DELETE: 刪除紀錄
app.delete('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: '無效的 ID 格式' });
    }
    const deletedRecord = await Record.findByIdAndDelete(id);
    if (!deletedRecord) {
      return res.status(404).json({ message: '找不到該筆紀錄' });
    }
    res.json({ message: '刪除成功', deletedRecord: deletedRecord });
  } catch (err) {
    res.status(500).json({ message: '刪除時發生伺服器錯誤', error: err });
  }
});

// ==========================================
// 🔐 會員系統 API (Auth) - 【!! NEW !!】
// ==========================================

// POST: 註冊 (Register)
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // (1) 檢查欄位
    if (!email || !password) {
      return res.status(400).json({ message: '請輸入 Email 和密碼' });
    }

    // (2) 檢查 Email 是否已被註冊
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: '這個 Email 已經註冊過了' });
    }

    // (3) 密碼加密 (Hash)
    const salt = await bcrypt.genSalt(10); // 產生鹽
    const hashedPassword = await bcrypt.hash(password, salt); // 加密

    // (4) 建立新使用者
    const newUser = new User({
      email: email,
      password: hashedPassword
    });

    const savedUser = await newUser.save();

    res.status(201).json({ 
      message: '註冊成功！', 
      user: { id: savedUser._id, email: savedUser.email } 
    });

  } catch (err) {
    console.error('註冊失敗:', err);
    res.status(500).json({ message: '伺服器錯誤', error: err.message });
  }
});

// ==========================================
// 🖨️ PDF 匯出 API
// ==========================================

app.post('/api/export-pdf', (req, res) => {
  try {
    if (!fs.existsSync(fontPath)) {
      console.error('CRITICAL: 字體檔找不到!', fontPath);
      return res.status(500).json({ message: '後端 PDF 產生失敗: 找不到字體檔' });
    }

    const records = req.body.records;
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="MyRecords-CH.pdf"'); 
    doc.pipe(res);

    doc.registerFont('NotoSansTC', fontPath);
    
    doc.font('NotoSansTC').fontSize(20).text('中文記帳報表', { align: 'center' });
    doc.moveDown();

    // 表格標頭
    doc.fontSize(12);
    const tableTop = doc.y;
    const cellPadding = 10;
    doc.font('NotoSansTC').text('日期', 50, tableTop);
    doc.font('NotoSansTC').text('分類', 150, tableTop);
    doc.font('NotoSansTC').text('描述', 250, tableTop);
    doc.font('NotoSansTC').text('金額', 450, tableTop, { align: 'right', width: 100 });
    
    doc.moveTo(50, tableTop + cellPadding + 5).lineTo(550, tableTop + cellPadding + 5).stroke();
    doc.y = tableTop + cellPadding + 10; 

    // 繪製表格內容
    records.forEach(record => {
      const y = doc.y;
      const date = new Date(record.createdAt).toLocaleDateString('zh-TW');
      const category = record.category;
      const description = record.description;
      const amount = record.amount.toLocaleString();

      doc.font('NotoSansTC').text(date, 50, y);
      doc.font('NotoSansTC').text(category, 150, y);
      doc.font('NotoSansTC').text(description, 250, y, { width: 200 }); 
      doc.font('NotoSansTC').text(amount, 450, y, { align: 'right', width: 100 });
      doc.moveDown(1.5); 
    });
    
    doc.end();

  } catch (err) {
    console.error('後端 PDF 產生失敗:', err);
    res.status(500).json({ message: '後端 PDF 產生失敗', error: err.message });
  }
});

// 8. 啟動伺服器
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`伺服器正在 port ${PORT} 上運行...`);
});
