// 引入 mongoose
const mongoose = require('mongoose');

// 1. 定義 Schema (資料結構)
const RecordSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, '請輸入描述'], 
    trim: true 
  },
  amount: {
    type: Number,
    required: [true, '請輸入金額'] 
  },

  // ----------------------------------------------------
  // 【!! NEW !!】 1. 新增 "category" (分類) 欄位
  // ----------------------------------------------------
  category: {
    type: String,
    required: [true, '請選擇分類'],
    trim: true,
    default: '其他' // 我們給一個預設值，叫做「其他」
  },
  // ----------------------------------------------------

  createdAt: {
    type: Date,
    default: Date.now 
  }
});

// 2. 導出 Model (模型)
module.exports = mongoose.model('Record', RecordSchema);

