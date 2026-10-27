/**
 * calculator.js
 * 純粋な計算ロジックと電卓の状態管理を担当するクラス。
 * DOM操作は一切行わず、テストしやすく再利用可能な設計になっています。
 */
export class Calculator {
  constructor() {
    this.clear();
  }

  /**
   * 電卓の全状態を初期化（All Clear: C）
   */
  clear() {
    this.currentOperand = '0';      // 現在入力中または直前に確定した数値文字列
    this.previousOperand = null;    // 二項演算の1項目となる数値文字列
    this.operation = null;          // 選択された演算子 ('+', '−', '×', '÷')
    this.historyText = '';          // 上部の式・履歴表示用文字列
    this.shouldResetScreen = false; // 次の数字入力時に画面をクリアして新規入力とするか
    this.errorMessage = null;       // エラー状態（0除算など）
  }

  /**
   * 現在入力中の数値のみをクリア（Clear Entry: CE）
   */
  clearEntry() {
    if (this.errorMessage) {
      this.clear();
      return;
    }
    this.currentOperand = '0';
  }

  /**
   * 現在の数値の末尾1文字を削除（Backspace: ⌫）
   */
  delete() {
    if (this.errorMessage || this.shouldResetScreen) {
      return;
    }
    // 1桁、またはマイナス記号付きの1桁（例: "-5"）の場合は "0" に戻す
    if (
      this.currentOperand.length === 1 ||
      (this.currentOperand.length === 2 && this.currentOperand.startsWith('-'))
    ) {
      this.currentOperand = '0';
    } else {
      this.currentOperand = this.currentOperand.slice(0, -1);
    }
  }

  /**
   * 数字（0〜9）を追加
   * @param {string} number 
   */
  appendNumber(number) {
    if (this.errorMessage) {
      this.clear();
    }

    // 計算直後または演算子選択直後の場合、新しく入力を開始
    if (this.shouldResetScreen) {
      this.currentOperand = number;
      this.shouldResetScreen = false;
      return;
    }

    // 現在が "0" の場合、"00" や "01" にならず置き換える
    if (this.currentOperand === '0') {
      this.currentOperand = number;
      return;
    }

    // 最大有効桁数（16桁）の制限
    const digitsOnly = this.currentOperand.replace(/[-.]/g, '');
    if (digitsOnly.length >= 16) {
      return;
    }

    this.currentOperand += number;
  }

  /**
   * 小数点（.）を追加
   */
  appendDecimal() {
    if (this.errorMessage) {
      this.clear();
    }

    if (this.shouldResetScreen) {
      this.currentOperand = '0.';
      this.shouldResetScreen = false;
      return;
    }

    if (!this.currentOperand.includes('.')) {
      this.currentOperand += '.';
    }
  }

  /**
   * 符号の反転（±: プラス / マイナス）
   */
  toggleSign() {
    if (this.errorMessage || this.currentOperand === '0') {
      return;
    }

    if (this.currentOperand.startsWith('-')) {
      this.currentOperand = this.currentOperand.slice(1);
    } else {
      this.currentOperand = '-' + this.currentOperand;
    }
  }

  /**
   * パーセント計算（%）
   */
  percentage() {
    if (this.errorMessage) return;

    const current = parseFloat(this.currentOperand);
    if (isNaN(current)) return;

    if (this.previousOperand !== null && this.operation !== null) {
      // 基準値がある場合: 例 "200 + 10%" -> 200 + 20
      const prev = parseFloat(this.previousOperand);
      const percentValue = prev * (current / 100);
      this.currentOperand = this.formatRawNumber(percentValue);
    } else {
      // 単独の場合: 例 "50%" -> 0.5
      this.currentOperand = this.formatRawNumber(current / 100);
    }
    this.shouldResetScreen = true;
  }

  /**
   * 単項演算（逆数 1/x, 二乗 x², 平方根 √x）
   * @param {'reciprocal' | 'square' | 'sqrt'} type 
   */
  executeUnaryOperation(type) {
    if (this.errorMessage) return;

    const current = parseFloat(this.currentOperand);
    if (isNaN(current)) return;

    let result;
    const formattedCurrent = this.formatDisplayNumber(this.currentOperand);

    switch (type) {
      case 'reciprocal': // 1/x
        if (current === 0) {
          this.errorMessage = '0 で割ることはできません';
          return;
        }
        result = 1 / current;
        this.historyText = `1/(${formattedCurrent})`;
        break;

      case 'square': // x²
        result = current * current;
        this.historyText = `sqr(${formattedCurrent})`;
        break;

      case 'sqrt': // √x
        if (current < 0) {
          this.errorMessage = '無効な入力です';
          return;
        }
        result = Math.sqrt(current);
        this.historyText = `√(${formattedCurrent})`;
        break;

      default:
        return;
    }

    this.currentOperand = this.formatRawNumber(result);
    this.shouldResetScreen = true;
  }

  /**
   * 四則演算子（+, −, ×, ÷）の選択
   * @param {string} operation 
   */
  chooseOperation(operation) {
    if (this.errorMessage) return;

    // 前の数値と演算子があり、まだ次の数値を入力していない状態で演算子を変更した場合
    if (this.previousOperand !== null && this.shouldResetScreen) {
      this.operation = operation;
      this.historyText = `${this.formatDisplayNumber(this.previousOperand)} ${this.operation}`;
      return;
    }

    // 既に前の数値と演算子がある状態で新しい演算子が押された場合、先に中間計算を実行
    if (this.previousOperand !== null && this.operation !== null) {
      this.compute();
      if (this.errorMessage) return;
    }

    this.operation = operation;
    this.previousOperand = this.currentOperand;
    this.historyText = `${this.formatDisplayNumber(this.previousOperand)} ${this.operation}`;
    this.shouldResetScreen = true;
  }

  /**
   * 計算の実行（=）
   */
  compute() {
    if (this.errorMessage) return;
    if (this.operation === null || this.previousOperand === null) {
      return;
    }

    const prev = parseFloat(this.previousOperand);
    const current = parseFloat(this.currentOperand);

    if (isNaN(prev) || isNaN(current)) {
      return;
    }

    let computation;
    switch (this.operation) {
      case '+':
        computation = prev + current;
        break;
      case '−':
      case '-':
        computation = prev - current;
        break;
      case '×':
      case '*':
        computation = prev * current;
        break;
      case '÷':
      case '/':
        if (current === 0) {
          this.errorMessage = '0 で割ることはできません';
          return;
        }
        computation = prev / current;
        break;
      default:
        return;
    }

    // 計算式の履歴を保存（例: "15 + 3 ="）
    this.historyText = `${this.formatDisplayNumber(this.previousOperand)} ${this.operation} ${this.formatDisplayNumber(this.currentOperand)} =`;
    this.currentOperand = this.formatRawNumber(computation);
    this.operation = null;
    this.previousOperand = null;
    this.shouldResetScreen = true;
  }

  /**
   * 数値を浮動小数点誤差を抑えて文字列化
   * @param {number} num 
   * @returns {string}
   */
  formatRawNumber(num) {
    if (!isFinite(num)) {
      this.errorMessage = 'オーバーフロー';
      return '0';
    }
    // 有効数字12桁に丸めて微小な丸め誤差（0.1 + 0.2 など）を解消
    const rounded = parseFloat(num.toPrecision(12));
    return rounded.toString();
  }

  /**
   * 表示用フォーマット（3桁カンマ区切り）
   * @param {string} numberStr 
   * @returns {string}
   */
  formatDisplayNumber(numberStr) {
    if (!numberStr) return '';
    if (this.errorMessage) return this.errorMessage;

    const parts = numberStr.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // 整数部にカンマを追加
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    if (decimalPart !== undefined) {
      return `${formattedInteger}.${decimalPart}`;
    }
    return formattedInteger;
  }

  /**
   * メイン画面用の表示テキストを取得
   * @returns {string}
   */
  getCurrentDisplay() {
    if (this.errorMessage) {
      return this.errorMessage;
    }
    return this.formatDisplayNumber(this.currentOperand);
  }

  /**
   * 式・履歴画面用の表示テキストを取得
   * @returns {string}
   */
  getHistoryDisplay() {
    return this.historyText;
  }

  /**
   * エラーが発生しているかどうか
   * @returns {boolean}
   */
  hasError() {
    return this.errorMessage !== null;
  }
}
