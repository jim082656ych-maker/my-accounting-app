// 1. 抓取 HTML 上的元素
const descInput = document.getElementById('desc');     // 項目輸入框
const amountInput = document.getElementById('amount'); // 金額輸入框
const addBtn = document.getElementById('addBtn');      // 按鈕
const list = document.getElementById('list');          // 清單區域

// 2. 監聽按鈕的「點擊」事件
addBtn.addEventListener('click', function() {
    
    // 取得輸入的值
    const desc = descInput.value;
    const amount = amountInput.value;

    // 簡單的檢查：如果沒填寫，就跳出警告
    if (desc === '' || amount === '') {
        alert('請輸入項目和金額喔！');
        return;
    }

    // 3. 製作新的清單項目 (HTML)
    // 我們要動態產生像這樣的 HTML: 
    // <li class="item"><span>午餐</span><span>$100</span></li>
    
    const newItem = document.createElement('li'); // 建立 li
    newItem.classList.add('item');                // 加上 CSS class 讓它變漂亮

    // 設定裡面的內容 (使用樣板字串 Template Literals)
    newItem.innerHTML = `
        <span>${desc}</span>
        <span>$${amount}</span>
    `;

    // 4. 把新項目加入清單
    list.appendChild(newItem);

    // 5. 清空輸入框，方便輸入下一筆
    descInput.value = '';
    amountInput.value = '';
});
