const mongoose = require('mongoose');
require('dotenv').config(); // 讀取 .env 裡的連線字串

// --- 設定 ---
const TOTAL_RECORDS = 800; // 要產生幾筆資料 (建議 500-1000)
const YEARS_BACK = 4;      // 產生幾年內的資料

// 分類清單 (跟你 App.js 的一樣)
const EXPENSE_CATS = ["飲食", "交通", "水電", "教育", "投資", "房租", "美裝與服飾", "通訊", "休閒", "其他"];
const INCOME_CATS = ["薪水", "兼職", "投資", "零用錢", "其他"];

// 資料庫連線
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("❌ 錯誤：找不到 .env，請確認你在 server 資料夾下執行");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ 連線成功，開始產生資料...'))
    .catch(err => console.error(err));

// 定義 Schema (跟 index.js 一樣)
const RecordSchema = new mongoose.Schema({
    item: String,
    cost: Number,
    category: String,
    type: String,
    date: Date,
    mobileBarcode: String
});
const Record = mongoose.model('Record', RecordSchema);

// --- 隨機產生器 ---
const getRandomDate = (start, end) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const generateData = async () => {
    try {
        // 1. 清空舊資料 (如果你想保留舊的，把這行註解掉)
        await Record.deleteMany({});
        console.log("🧹 舊資料已清空");

        const records = [];
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - YEARS_BACK);

        for (let i = 0; i < TOTAL_RECORDS; i++) {
            // 80% 機率是支出，20% 是收入
            const isExpense = Math.random() > 0.2;
            const type = isExpense ? 'expense' : 'income';
            
            // 隨機分類
            const cats = isExpense ? EXPENSE_CATS : INCOME_CATS;
            const category = cats[Math.floor(Math.random() * cats.length)];

            // 隨機金額 (支出 50-2000，收入 1000-50000)
            const cost = isExpense 
                ? getRandomInt(50, 2000) 
                : getRandomInt(1000, 50000);

            // 隨機日期 (4年內)
            const date = getRandomDate(startDate, endDate);

            records.push({
                item: `測試${type === 'income' ? '收入' : '消費'} #${i}`,
                cost,
                category,
                type,
                date,
                mobileBarcode: Math.random() > 0.8 ? '/AB.1234' : '' // 偶爾有載具
            });
        }

        // 2. 一次寫入資料庫
        await Record.insertMany(records);
        console.log(`🎉 成功產生 ${TOTAL_RECORDS} 筆資料！(涵蓋過去 ${YEARS_BACK} 年)`);
        console.log("👉 請回到網頁重新整理看看圖表！");

    } catch (err) {
        console.error("❌ 失敗:", err);
    } finally {
        mongoose.connection.close(); // 關閉連線
    }
};

// 執行
generateData();
