// 1. 引入 React 的功能 (useState, useEffect) 和 axios
import React, { useState, useEffect } from 'react';
import axios from 'axios'; 

// 引入基本的 CSS 樣式
import './App.css'; 

// 引入圖表元件
import StatisticsChart from './StatisticsChart';

// 【!! UPDATED !!】 1. 引入匯出工具 (不再需要 jspdf)
import * as XLSX from 'xlsx'; // 匯出 Excel (xlsx)

// 分類定義 (不變)
const CATEGORIES = [
  { value: '食物', label: '🍔 食物' },
  { value: '交通', label: '🚌 交通' },
  { value: '娛樂', label: '🎬 娛樂' },
  { value: '治裝', label: '👕 治裝' }, 
  { value: '教育', label: '📚 教育' }, 
  { value: '投資', label: '📈 投資' },
  { value: '收入', label: '💰 收入' },
  { value: '其他', label: '📎 其他' },
];

function App() {
  // --- 狀態 (State) --- (不變)
  const [records, setRecords] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(''); 
  const [category, setCategory] = useState('其他'); 
  const [error, setError] = useState(null);

  // 【!! FIXED !!】 這裡已經修正為正確的後端網址
  const API_URL = 'https://my-accounting-app-ev44.onrender.com/api/records';
  
  // 【!! FIXED !!】 這裡已經修正為正確的 PDF 匯出網址
  const PDF_EXPORT_URL = 'https://my-accounting-app-ev44.onrender.com/api/export-pdf';

  // --- 效果 (Effect) --- (不變)
  useEffect(() => {
    fetchRecords();
  }, []); 

  // --- 功能函式 (Functions) ---

  // A. 抓取所有資料 (GET) (不變)
  const fetchRecords = async () => {
    try {
      setError(null); 
      const response = await axios.get(API_URL);
      setRecords(response.data); 
    } catch (err) {
      console.error('抓取資料失敗:', err);
      setError('無法載入資料，請稍後再試。');
    }
  };

  // B. 處理表單送出 (POST) (不變)
  const handleSubmit = async (e) => {
    e.preventDefault(); 
    if (!description
      