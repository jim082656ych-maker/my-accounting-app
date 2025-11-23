// client/src/AuthPage.js
import React, { useState } from 'react';
import axios from 'axios'; 
import './AuthPage.css';

const AuthPage = ({ onLoginSuccess }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null); 

  // 【!! FIXED !!】 為了讓手機也能用，這裡必須連線到雲端 Render
  // (不能寫 localhost，因為手機找不到你的電腦)
  const API_URL = 'https://my-accounting-app-ev44.onrender.com/api';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); 

    try {
      if (isLoginMode) {
        // --- 登入邏輯 (之後實作) ---
        alert("登入功能即將推出，請先測試「註冊」！");
      } else {
        // --- 註冊邏輯 ---
        console.log("正在發送註冊請求...", { email, password });
        
        const response = await axios.post(`${API_URL}/register`, {
          email: email,
          password: password
        });

        // 註冊成功
        alert(`註冊成功！歡迎 ${response.data.user.email}`);
        
        // 切換回登入模式
        setIsLoginMode(true);
      }
    } catch (err) {
      console.error("操作失敗:", err);
      if (err.response && err.response.data) {
        setError(err.response.data.message);
      } else {
        setError("連線失敗，請稍後再試");
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* 【!! FIXED !!】 這裡已經改成你的 App 名稱了 */}
        <h2>全端記帳 App</h2>
        <h3>{isLoginMode ? '登入系統' : '註冊帳戶'}</h3>

        {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>電郵：</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="請輸入 email"
              required 
            />
          </div>

          <div className="form-group">
            <label>密碼：</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="請輸入密碼"
              required 
            />
          </div>

          <button type="submit" className="submit-btn">
            {isLoginMode ? '登入' : '註冊'}
          </button>
        </form>

        <p className="toggle-text">
          {isLoginMode ? '還沒有帳號？' : '已經有帳號了？'}
          <span onClick={() => {
            setIsLoginMode(!isLoginMode);
            setError(null);
          }}>
            {isLoginMode ? ' 點此註冊' : ' 點此登入'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
