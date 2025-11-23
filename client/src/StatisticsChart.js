// 1. 引入 React 的 useState
import React, { useState } from 'react';
import { Pie, Line } from 'react-chartjs-2'; 
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,      
  CategoryScale, LinearScale, PointElement, LineElement,
} from 'chart.js';

// 2. 註冊元件 (不變)
ChartJS.register(
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, PointElement, LineElement
);

// --- (A) 輔助函式：定義 X 軸的「分組」方式 ---

// 取得 YYYY/MM/DD 格式 (用於每日)
const getDayKey = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

// 取得 "YYYY/MM 第 W 週" 格式 (用於每週)
const getWeekKey = (date) => {
  const d = new Date(date);
  // 找到本週的第一天 (星期日)
  d.setDate(d.getDate() - d.getDay()); 
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

// 取得 YYYY/MM 格式 (用於每月)
const getMonthKey = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit' }).replace(' ', '');
};

// -------------------------------------------

// 3. 定義我們的圖表元件
const StatisticsChart = ({ records }) => {

  // 4. 建立 state 來儲存目前的時間範圍
  // 預設為 '1y' (1年)，'all' (所有時間)
  const [timeRange, setTimeRange] = useState('1y'); 

  // 5. 根據 timeRange 過濾資料
  const getFilteredRecords = () => {
    const today = new Date();
    // 輔助函式：取得 N 天前的日期
    const getStartDate = (daysAgo) => {
      const date = new Date(today);
      date.setDate(today.getDate() - daysAgo);
      date.setHours(0, 0, 0, 0); 
      return date;
    };

    switch (timeRange) {
      case '1m':
        return records.filter(r => new Date(r.createdAt) >= getStartDate(30));
      case '6m':
        return records.filter(r => new Date(r.createdAt) >= getStartDate(180));
      case '1y':
        return records.filter(r => new Date(r.createdAt) >= getStartDate(365));
      case '3y':
        return records.filter(r => new Date(r.createdAt) >= getStartDate(365 * 3));
      case '5y':
        return records.filter(r => new Date(r.createdAt) >= getStartDate(365 * 5));
      case 'all':
      default:
        return records; // 回傳所有資料
    }
  };

  // 6. 取得「過濾後」的資料
  const filteredRecords = getFilteredRecords();

  // ----------------------------------------------------
  // 7. 圓餅圖邏輯 (使用 filteredRecords)
  // ----------------------------------------------------
  const expenseRecords = filteredRecords.filter(r => r.amount < 0);
  const categoryTotals = expenseRecords.reduce((acc, record) => {
    const category = record.category;
    const amount = Math.abs(record.amount); 
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += amount;
    return acc;
  }, {});
  
  // 圓餅圖 Chart Data
  const chartData = {
    labels: Object.keys(categoryTotals), 
    datasets: [{
        label: '支出分佈',
        data: Object.values(categoryTotals), 
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)', 
          'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)', 
          'rgba(199, 199, 199, 0.7)', 'rgba(83, 109, 254, 0.7)'
        ],
        borderColor: '#ffffff',
        borderWidth: 1,
    }],
  };

  // ----------------------------------------------------
  // 8. 【!! 終極版 摺線圖邏輯 (動態彙整) !!】
  // ----------------------------------------------------
  const processLineChartData = (records, range) => {
    // 確保由舊到新排序
    const sortedRecords = [...records].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    if (sortedRecords.length === 0) {
        return { labels: [], data: [] };
    }

    // Map 用來儲存 { 'X軸標籤': '該時間點的最後一筆餘額' }
    const aggregationMap = new Map();
    let runningTotal = 0;

    // 決定用哪個 Key 產生器 (日、週、月)
    let getKey;
    if (range === '1m') {
        getKey = (date) => getDayKey(date); // 1 個月：每日
    } else if (range === '6m') {
        getKey = (date) => getWeekKey(date); // 6 個月：每週
    } else {
        getKey = (date) => getMonthKey(date); // 1年、3年、5年、所有：每月
    }

    for (const record of sortedRecords) {
        runningTotal += record.amount;
        const key = getKey(record.createdAt);
        // 不斷覆蓋，確保我們只拿到該「時間區間」的「最後餘額」
        aggregationMap.set(key, runningTotal);
    }

    return {
        labels: Array.from(aggregationMap.keys()),
        data: Array.from(aggregationMap.values())
    };
  };

  // 取得彙整後的摺線圖資料
  const { labels: lineLabels, data: lineData } = processLineChartData(filteredRecords, timeRange);
  
  // 摺線圖 Chart Data
  const lineChartData = {
    labels: lineLabels, // 動態 X 軸
    datasets: [{
      label: '累積資產變化',
      data: lineData, // 動態 Y 軸
      borderColor: 'rgba(40, 167, 69, 1)',
      backgroundColor: 'rgba(40, 167, 69, 0.2)',
      tension: 0.1, // 我們用 0.1 讓數據點更清晰
      pointRadius: 4,
    }],
  };
  
  // 摺線圖 Options
  const lineChartOptions = {
    responsive: true,
    scales: { y: { beginAtZero: false } },
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: '累積總資產趨勢圖', font: { size: 18 } }
    }
  };

  // ----------------------------------------------------
  // 9. 渲染 JSX (加入選單)
  // ----------------------------------------------------
  return (
    <div className="chart-container">
      
      {/* 9a. 時間範圍篩選選單 (加入 3y, 5y) */}
      <div className="chart-filter">
        <label>選擇時間範圍：</label>
        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
          <option value="1m">最近 1 個月 (每日)</option>
          <option value="6m">最近 6 個月 (每週)</option>
          <option value="1y">最近 1 年 (每月)</option>
          <option value="3y">最近 3 年 (每月)</option>
          <option value="5y">最近 5 年 (每月)</option>
          <option value="all">所有時間 (每月)</option>
        </select>
      </div>

      {/* 9b. 圓餅圖 (支出分佈) */}
      {expenseRecords.length > 0 ? (
        <div style={{ paddingBottom: '30px', borderBottom: '1px dashed #eee', marginBottom: '20px' }}>
          <Pie data={chartData} options={{plugins: {title: {text: '各類別支出圓餅圖', display: true, font: {size: 18}}}}} />
        </div>
      ) : (
        <p>此時間範圍內尚無支出資料可供統計...</p> 
      )}
      
      {/* 9c. 摺線圖 (累積資產) */}
      {filteredRecords.length > 0 ? (
        <div style={{ paddingTop: '20px' }}>
          <Line data={lineChartData} options={lineChartOptions} />
        </div>
      ) : (
        <p style={{ marginTop: '20px' }}>此時間範圍內尚無紀錄可顯示趨勢...</p> 
      )}
    </div>
  );
};

export default StatisticsChart;
