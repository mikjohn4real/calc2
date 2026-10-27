/**
 * app.js
 * ユーザー入力（クリックやキーボード）を受け取り、
 * calculator.js の計算ロジックを呼び出してDOMを更新するUI制御ファイル。
 */
import { Calculator } from './calculator.js';

// 1. DOM要素の取得
const currentDisplayEl = document.getElementById('current-display');
const historyDisplayEl = document.getElementById('history-display');
const keypadEl = document.querySelector('.keypad-section');
const themeToggleBtn = document.getElementById('theme-toggle');
const htmlEl = document.documentElement;

// 2. Calculator クラスのインスタンス生成
const calculator = new Calculator();

/**
 * 画面（DOM）の表示を更新する関数
 * 数値の長さに応じて文字サイズを自動調整します。
 */
function updateDisplay() {
  const currentText = calculator.getCurrentDisplay();
  const historyText = calculator.getHistoryDisplay();

  currentDisplayEl.textContent = currentText;
  historyDisplayEl.textContent = historyText;

  // 桁数に応じたフォントサイズ調整（枠からはみ出ないように制御）
  currentDisplayEl.classList.remove('font-medium', 'font-small', 'font-xsmall');
  const len = currentText.length;
  if (len > 15) {
    currentDisplayEl.classList.add('font-xsmall');
  } else if (len > 11) {
    currentDisplayEl.classList.add('font-small');
  } else if (len > 8) {
    currentDisplayEl.classList.add('font-medium');
  }
}

/**
 * アクション種別に応じた計算ロジックの呼び出し
 * @param {string} action - data-action 属性値
 * @param {string|null} value - data-value 属性値
 */
function handleAction(action, value) {
  switch (action) {
    case 'number':
      calculator.appendNumber(value);
      break;

    case 'decimal':
      calculator.appendDecimal();
      break;

    case 'operator':
      calculator.chooseOperation(value);
      break;

    case 'equals':
      calculator.compute();
      break;

    case 'clear':
      calculator.clear();
      break;

    case 'clear-entry':
      calculator.clearEntry();
      break;

    case 'delete':
      calculator.delete();
      break;

    case 'toggle-sign':
      calculator.toggleSign();
      break;

    case 'percent':
      calculator.percentage();
      break;

    case 'reciprocal':
    case 'square':
    case 'sqrt':
      calculator.executeUnaryOperation(action);
      break;

    default:
      console.warn('Unknown action:', action);
      return;
  }

  updateDisplay();
}

/**
 * ボタン要素に一瞬アクティブアニメーションを付与（視覚フィードバック）
 * @param {HTMLElement} button 
 */
function triggerButtonEffect(button) {
  if (!button) return;
  button.classList.add('pressed');
  setTimeout(() => {
    button.classList.remove('pressed');
  }, 120);
}

// 3. クリックイベントリスナー（イベント委譲）
keypadEl.addEventListener('click', (e) => {
  const button = e.target.closest('button.key');
  if (!button) return;

  const action = button.dataset.action;
  const value = button.dataset.value || null;

  triggerButtonEffect(button);
  handleAction(action, value);
});

// 4. キーボードイベントリスナー
window.addEventListener('keydown', (e) => {
  let targetSelector = null;
  let action = null;
  let value = null;

  // 数字キー (0 - 9)
  if (e.key >= '0' && e.key <= '9') {
    targetSelector = `button[data-action="number"][data-value="${e.key}"]`;
    action = 'number';
    value = e.key;
  }
  // 小数点 (. / ,)
  else if (e.key === '.' || e.key === ',') {
    targetSelector = 'button[data-action="decimal"]';
    action = 'decimal';
  }
  // 四則演算子
  else if (e.key === '+') {
    targetSelector = 'button[data-action="operator"][data-value="+"]';
    action = 'operator';
    value = '+';
  } else if (e.key === '-') {
    targetSelector = 'button[data-action="operator"][data-value="−"]';
    action = 'operator';
    value = '−';
  } else if (e.key === '*') {
    targetSelector = 'button[data-action="operator"][data-value="×"]';
    action = 'operator';
    value = '×';
  } else if (e.key === '/') {
    e.preventDefault(); // ブラウザのクイック検索等への誤作動防止
    targetSelector = 'button[data-action="operator"][data-value="÷"]';
    action = 'operator';
    value = '÷';
  }
  // イコール・確定 (Enter / =)
  else if (e.key === 'Enter' || e.key === '=') {
    e.preventDefault();
    targetSelector = 'button[data-action="equals"]';
    action = 'equals';
  }
  // バックスペース (1文字削除)
  else if (e.key === 'Backspace') {
    targetSelector = 'button[data-action="delete"]';
    action = 'delete';
  }
  // エスケープ (全クリア: C)
  else if (e.key === 'Escape') {
    targetSelector = 'button[data-action="clear"]';
    action = 'clear';
  }
  // Deleteキー (入力クリア: CE)
  else if (e.key === 'Delete') {
    targetSelector = 'button[data-action="clear-entry"]';
    action = 'clear-entry';
  }
  // パーセント (%)
  else if (e.key === '%') {
    targetSelector = 'button[data-action="percent"]';
    action = 'percent';
  }
  // 符号反転 (F9 または @)
  else if (e.key === 'F9') {
    e.preventDefault();
    targetSelector = 'button[data-action="toggle-sign"]';
    action = 'toggle-sign';
  }

  if (action) {
    if (targetSelector) {
      const button = document.querySelector(targetSelector);
      triggerButtonEffect(button);
    }
    handleAction(action, value);
  }
});

// 5. テーマ（ダーク / ライト）切り替え制御
function initTheme() {
  const savedTheme = localStorage.getItem('calc_theme');
  if (savedTheme) {
    htmlEl.setAttribute('data-theme', savedTheme);
  } else {
    // OSのカラースキームを初期値として反映
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    htmlEl.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }
}

themeToggleBtn.addEventListener('click', () => {
  const currentTheme = htmlEl.getAttribute('data-theme');
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  htmlEl.setAttribute('data-theme', nextTheme);
  localStorage.setItem('calc_theme', nextTheme);
});

// 初期化実行
initTheme();
updateDisplay();
