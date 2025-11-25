import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// 1. 引入 ChakraProvider
import { ChakraProvider } from '@chakra-ui/react';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* 2. 用 Provider 包住 App，這樣裡面所有的元件才能變漂亮 */}
    <ChakraProvider>
      <App />
    </ChakraProvider>
  </React.StrictMode>
);
