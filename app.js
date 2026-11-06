/**
 * app.js
 * ユーザー入力（クリックやキーボード）を受け取り、
 * calculator.js の計算ロジックを呼び出してDOMを更新するUI制御ファイル。
 */
import { Calculator } from './calculator.js';

// 1. DOM要素の取得
const appEl = document.getElementById('calculator-app');
const currentDisplayEl = document.getElementById('current-display');
const historyDisplayEl = document.getElementById('history-display');
const keypadEl = document.querySelector('.keypad-section');
const hexKeypadEl = document.getElementById('hex-keypad');
const radixPanelEl = document.getElementById('radix-panel');
const modeSwitcherEl = document.querySelector('.mode-switcher');
const themeToggleBtn = document.getElementById('theme-toggle');
const htmlEl = document.documentElement;

const radixValueEls = {
  16: document.getElementById('radix-val-16'),
  10: document.getElementById('radix-val-10'),
  8: document.getElementById('radix-val-8'),
  2: document.getElementById('radix-val-2'),
};

// 2. Calculator クラスのインスタンス生成
const calculator = new Calculator();

/**
 * 現在の基数に応じて数字キー（0〜9, A〜F）の有効/無効状態を更新する関数
 */
function updateKeypadState() {
  const allNumberButtons = document.querySelectorAll('button[data-action="number"]');
  allNumberButtons.forEach((btn) => {
    const val = btn.dataset.value;
    const isValid = calculator.isValidDigitForRadix(val);
    btn.disabled = !isValid;
  });

  // 基数行のアクティブ表示を更新
  const radixRows = radixPanelEl.querySelectorAll('.radix-row');
  radixRows.forEach((row) => {
    const r = Number(row.dataset.radix);
    row.classList.toggle('active', r === calculator.radix);
  });

  // モードタブのアクティブ表示とメインコンテナのクラスを更新
  const modeTabs = modeSwitcherEl.querySelectorAll('.mode-tab');
  modeTabs.forEach((tab) => {
    const isCurrent = tab.dataset.mode === calculator.mode;
    tab.classList.toggle('active', isCurrent);
    tab.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
  });

  appEl.classList.toggle('mode-programmer', calculator.mode === 'programmer');
  appEl.classList.toggle('mode-standard', calculator.mode === 'standard');
}

/**
 * 画面（DOM）の表示を更新する関数
 * 数値の長さに応じて文字サイズを自動調整し、プログラマーモード時は各基数の値も更新します。
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

  // 基数変換パネル（HEX / DEC / OCT / BIN）の値を更新
  if (calculator.mode === 'programmer') {
    const conversions = calculator.getRadixConversions();
    for (const r of [16, 10, 8, 2]) {
      if (radixValueEls[r]) {
        radixValueEls[r].textContent = conversions[r];
      }
    }
  }

  updateKeypadState();
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
  if (!button || button.disabled) return;
  button.classList.add('pressed');
  setTimeout(() => {
    button.classList.remove('pressed');
  }, 120);
}

// 3. キーパッドクリックイベント（メインキーパッド & 16進キーパッド）
function onKeypadClick(e) {
  const button = e.target.closest('button.key');
  if (!button || button.disabled) return;

  const action = button.dataset.action;
  const value = button.dataset.value || null;

  triggerButtonEffect(button);
  handleAction(action, value);
}

keypadEl.addEventListener('click', onKeypadClick);
hexKeypadEl.addEventListener('click', onKeypadClick);

// 4. 基数変換パネル（HEX / DEC / OCT / BIN）クリックイベント
radixPanelEl.addEventListener('click', (e) => {
  const row = e.target.closest('.radix-row');
  if (!row) return;

  const newRadix = Number(row.dataset.radix);
  calculator.setRadix(newRadix);
  updateDisplay();
});

// 5. モード切り替え（標準 / プログラマー）クリックイベント
modeSwitcherEl.addEventListener('click', (e) => {
  const tab = e.target.closest('.mode-tab');
  if (!tab) return;

  const newMode = tab.dataset.mode;
  calculator.setMode(newMode);
  updateDisplay();
});

// 6. キーボードイベントリスナー
window.addEventListener('keydown', (e) => {
  // Ctrl / Alt / Meta 併用時はショートカットを優先して無視
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  let targetSelector = null;
  let action = null;
  let value = null;

  const upperKey = e.key.toUpperCase();

  // 数字キー (0 - 9)
  if (e.key >= '0' && e.key <= '9') {
    if (!calculator.isValidDigitForRadix(e.key)) return;
    targetSelector = `button[data-action="number"][data-value="${e.key}"]`;
    action = 'number';
    value = e.key;
  }
  // 16進数キー (A - F)
  else if (
    calculator.mode === 'programmer' &&
    upperKey.length === 1 &&
    upperKey >= 'A' &&
    upperKey <= 'F'
  ) {
    if (!calculator.isValidDigitForRadix(upperKey)) return;
    targetSelector = `button[data-action="number"][data-value="${upperKey}"]`;
    action = 'number';
    value = upperKey;
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
  // 符号反転 (F9)
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

// 7. テーマ（ダーク / ライト）切り替え制御
function initTheme() {
  const savedTheme = localStorage.getItem('calc_theme');
  if (savedTheme) {
    htmlEl.setAttribute('data-theme', savedTheme);
  } else {
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
