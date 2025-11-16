// 1. 引入套件
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path'); // 用來處理檔案路徑
const fs = require('fs');   // 用來讀取檔案
const PDFDocument = require('pdfkit'); // PDF 引擎

// ---
// 【!! 最終修正 !!】
// 修正 fontPath，確保它指向 server/fonts/NotoSansTC-Regular.ttf
// ---
const fontPath = path.join(
  __dirname, // 目前 /server 資料夾
  'fonts',   // <-- 【!! 修正點 !!】 加上 'fonts' 資料夾
  'NotoSansTC-Regular.ttf'
);

// 引入 Record 模型 (不變)
const Record = require('./models/Record'); 

// 2. 建立 app (不變)
const app = express();

// 3. 中介軟體 (不變)
app.use(cors());
app.use(express.json());

// 4. 連接 MongoDB 資料庫 (不變)
const MONGO_URI = "mongodb+srv://jim082656:jim19921205@cluster0.mucx6fo.mongodb.net/?appName=Cluster0";
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ 成功連接到 MongoDB Atlas！'))
  .catch(err => console.error('❌ 連接 MongoDB 失敗:', err));

// 6. API 路由 (不變)
// GET, POST, DELETE ... (這三段 API 路由完全不變)
app.get('/api/records', async (req, res) => {
  try {
    const records = await Record.find().sort({ createdAt: -1 }); 
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: '讀取資料時發生錯誤', error: err });
  }
});

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

// 7. 建立「後端 PDF 匯出」 API (不變)
app.post('/api/export-pdf', (req, res) => {
  try {
    // 【!! 關鍵 !!】 檢查字體檔是否存在
    // 這次 fontPath 絕對是正確的
    if (!fs.existsSync(fontPath)) {
      // 如果還是找不到，我們給出最精確的錯誤
      console.error('CRITICAL: 字體檔找不到!');
      console.error('我正在這個路徑尋找:', fontPath);
      console.error('請 100% 確保 NotoSansTC-Regular.ttf 檔案在 server/fonts 資料夾底下！'); // <--- 檢查這裡
      return res.status(500).json({ message: '後端 PDF 產生失敗: 找不到字體檔' });
    }

    const records = req.body.records;
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="MyRecords-CH.pdf"'); 
    doc.pipe(res);

    doc.registerFont('NotoSansTC', fontPath); // <-- 這裡會讀取 .ttf
    
    // --- 開始繪製 PDF 內容 ---
    doc.font('NotoSansTC').fontSize(20).text('中文記帳報表', {
      align: 'center'
    });
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

    // 繪製表格內容 (迴圈)
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
