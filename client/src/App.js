// 1. 引入 React 的功能 (useState, useEffect) 和 axios
import React, { useState, useEffect } from 'react';
import axios from 'axios'; 

// 引入基本的 CSS 樣式
import './App.css'; 

// 引入圖表元件
import StatisticsChart from './StatisticsChart';

// 引入匯出工具
import * as XLSX from 'xlsx'; 

// 分類定義
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
  // --- 狀態 (State) ---
  const [records, setRecords] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(''); 
  const [category, setCategory] = useState('其他'); 
  const [error, setError] = useState(null);

  // 【!! FIXED !!】 正確的 API 網址 (確認無誤)
  const API_URL = 'https://my-accounting-app-ev44.onrender.com/api/records';
  
  // 【!! FIXED !!】 正確的 PDF 匯出網址 (確認無誤)
  const PDF_EXPORT_URL = 'https://my-accounting-app-ev44.onrender.com/api/export-pdf';

  // --- 效果 (Effect) ---
  useEffect(() => {
    fetchRecords();
  }, []); 

  // --- 功能函式 (Functions) ---

  // A. 抓取所有資料 (GET)
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

  // B. 處理表單送出 (POST)
  const handleSubmit = async (e) => {
    e.preventDefault(); 
    if (!description || !amount || !category) {
      alert('請填寫所有欄位！');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      alert('請輸入有效的金額！');
      return;
    }
    try {
      setError(null); 
      const response = await axios.post(API_URL, {
        description: description,
        amount: numAmount, 
        category: category  
      });
      setRecords([response.data, ...records]);
      setDescription('');
      setAmount('');
      setCategory('其他'); 
    } catch (err) {
      console.error('新增資料失敗:', err.response ? err.response.data : err.message);
      if (err.response && err.response.data && err.response.data.message) {
        setError(`新增失敗：${err.response.data.message}`);
      } else {
        setError('新增失敗，請檢查輸入。');
      }
    }
  };

  // C. 處理「刪除」資料
  const handleDelete = async (idToDelete) => {
    if (!window.confirm('你確定要刪除這筆紀錄嗎？')) {
      return; 
    }
    try {
      setError(null);
      await axios.delete(`${API_URL}/${idToDelete}`);
      setRecords(prevRecords => 
        prevRecords.filter(record => record._id !== idToDelete)
      );
    } catch (err) {
      console.error('刪除資料失敗:', err);
      setError('刪除失敗，請稍後再試。');
    }
  };

  // D. 匯出 Excel
  const handleExportExcel = () => {
    const dataToExport = records.map(record => ({
      '日期': new Date(record.createdAt).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      '分類': record.category,
      '描述': record.description,
      '金額': record.amount
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    XLSX.utils.book_append_sheet(wb, ws, "Records");
    XLSX.writeFile(wb, "MyRecords.xlsx");
  };

  // E. 匯出 PDF (後端產生)
  const handleExportPDF = async () => {
    alert("後端 PDF 產生中... 請稍候");

    try {
      const response = await axios.post(
        PDF_EXPORT_URL, 
        { records: records }, 
        { responseType: 'blob' } 
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'MyRecords-CH.pdf';
      link.click(); 
      window.URL.revokeObjectURL(link.href);

    } catch (err) {
      console.error("後端 PDF 匯出失敗:", err);
      alert("PDF 產生失敗，請檢查 Console。");
    }
  };

  // --- 畫面 (JSX) ---
  return (
    <div className="App">
      <header>
        <h1>我的全端記帳 App (含匯出)</h1>
      </header>

      {error && <p className="error">{error}</p>}

      {/* 1. 新增資料的表單 */}
      <form onSubmit={handleSubmit} className="record-form">
        <h3>新增一筆紀錄</h3>
        <div className="form-control">
          <label>描述：</label>
          <input 
            type="text" 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例如：晚餐"
            required 
          />
        </div>
        <div className="form-control">
          <label>分類：</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-control">
          <label>金額：</label>
          <input 
            type="number"
            step="any" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="支出請填負數 (例如：-150)"
            required 
          />
        </div>
        <button type="submit">新增紀錄</button>
      </form>

      {/* 2. 顯示「統計圖表」元件 */}
      <StatisticsChart records={records} />

      {/* 3. 匯出按鈕區塊 */}
      <div className="export-container">
        <h3>匯出報表</h3>
        <button onClick={handleExportExcel} className="export-btn excel">
          匯出 Excel (.xlsx)
        </button>
        <button onClick={handleExportPDF} className="export-btn pdf">
          匯出 PDF (後端中文版)
        </button>
        <p className="export-note">
          (PDF 由伺服器產生，支援完整中文內容)
        </p>
      </div>

      {/* 4. 顯示所有資料的列表 */}
      <div className="records-list">
        <h3>歷史紀錄</h3>
        {records.length === 0 ? (
          <p>目前沒有任何紀錄...</p>
        ) : (
          <ul>
            {records.map(record => (
              <li key={record._id} className={record.amount < 0 ? 'expense' : 'income'}>
                
                <div className="record-details">
                  <span className="record-category">
                    {CATEGORIES.find(c => c.value === record.category)?.label.split(' ')[0] || '📎'}
                  </span>
                  <span>{record.description}</span>
                </div>
                
                <strong className={record.amount < 0 ? 'expense-text' : 'income-text'}>
                  {record.amount.toLocaleString()} 元
                </strong>

                <button 
                  className="delete-btn"
                  onClick={() => handleDelete(record._id)}
                >
                  X
                </button>

              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
