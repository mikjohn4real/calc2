/**
 * calculator.js
 * 純粋な計算ロジックと電卓の状態管理を担当するクラス。
 * 標準モードとプログラマー（基数変換: HEX/DEC/OCT/BIN）モードの両方に対応し、
 * プログラマーモードでは小数点を含む正確な有理数演算と有限桁判定を行います。
 */
export class Calculator {
  /** 有限小数として許容する最大2進小数桁数（2^32 まで） */
  static MAX_FRAC_BITS = 32n;

  constructor() {
    this.mode = 'programmer'; // 'standard' | 'programmer'
    this.radix = 10;          // 16 (HEX) | 10 (DEC) | 8 (OCT) | 2 (BIN)
    this.clear();
  }

  /**
   * 電卓の全状態を初期化（All Clear: C）
   */
  clear() {
    this.currentOperand = '0';      // 現在入力中または直前に確定した数値文字列（現在の基数表現）
    this.previousOperand = null;    // 二項演算の1項目となる数値文字列（現在の基数表現）
    this.operation = null;          // 選択された演算子 ('+', '−', '×', '÷')
    this.historyText = '';          // 上部の式・履歴表示用文字列
    this.shouldResetScreen = false; // 次の数字入力時に画面をクリアして新規入力とするか
    this.errorMessage = null;       // エラー状態（0除算、割り切れない無限小数など）
  }

  /**
   * モードの切り替え（'standard' | 'programmer'）
   * @param {'standard' | 'programmer'} newMode
   */
  setMode(newMode) {
    if (this.mode === newMode) return;

    if (this.errorMessage) {
      this.mode = newMode;
      this.radix = 10;
      this.clear();
      return;
    }

    if (newMode === 'standard') {
      // プログラマーモードから標準モードへ戻る際は10進数に変換
      if (this.radix !== 10) {
        this.setRadix(10);
      }
      this.mode = 'standard';
      this.previousOperand = null;
      this.operation = null;
      this.historyText = '';
      this.shouldResetScreen = true;
    } else {
      // 標準モードからプログラマーモードへ移行する際、全基数で有限桁表現できるか検証
      const rational = this.parseToRational(this.currentOperand, 10);
      this.mode = 'programmer';
      this.radix = 10;
      this.previousOperand = null;
      this.operation = null;
      this.historyText = '';
      this.shouldResetScreen = true;

      if (!rational || !this.isTerminatingInAllBases(rational)) {
        this.errorMessage = '割り切れない値です';
      } else {
        this.currentOperand = this.rationalToBaseString(rational, 10);
      }
    }
  }

  /**
   * 基数の切り替え（16, 10, 8, 2）
   * @param {number} newRadix
   */
  setRadix(newRadix) {
    const validRadixes = [16, 10, 8, 2];
    if (!validRadixes.includes(newRadix) || this.radix === newRadix) {
      return;
    }

    if (this.errorMessage) {
      this.radix = newRadix;
      this.clear();
      return;
    }

    const currentRational = this.parseToRational(this.currentOperand, this.radix);
    if (!currentRational || !this.isTerminatingInAllBases(currentRational)) {
      this.radix = newRadix;
      this.errorMessage = '割り切れない値です';
      return;
    }

    const convertedCurrent = this.rationalToBaseString(currentRational, newRadix);
    if (convertedCurrent === null) {
      this.radix = newRadix;
      this.errorMessage = '割り切れない値です';
      return;
    }

    if (this.previousOperand !== null) {
      const prevRational = this.parseToRational(this.previousOperand, this.radix);
      if (!prevRational || !this.isTerminatingInAllBases(prevRational)) {
        this.radix = newRadix;
        this.errorMessage = '割り切れない値です';
        return;
      }
      this.previousOperand = this.rationalToBaseString(prevRational, newRadix);
    }

    this.radix = newRadix;
    this.currentOperand = convertedCurrent;
    this.shouldResetScreen = true;

    if (this.previousOperand !== null && this.operation !== null) {
      this.historyText = `${this.formatDisplayNumber(this.previousOperand, this.radix)} ${this.operation}`;
    } else {
      this.historyText = '';
    }
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
   * 指定された文字が現在の基数で有効な数字か判定
   * @param {string} char
   * @returns {boolean}
   */
  isValidDigitForRadix(char) {
    const upper = char.toUpperCase();
    const val = parseInt(upper, 16);
    if (isNaN(val)) return false;
    return val < this.radix;
  }

  /**
   * 数字（0〜9, A〜F）を追加
   * @param {string} number
   */
  appendNumber(number) {
    const digit = number.toUpperCase();
    if (!this.isValidDigitForRadix(digit)) {
      return;
    }

    if (this.errorMessage) {
      this.clear();
    }

    if (this.shouldResetScreen) {
      this.currentOperand = digit;
      this.shouldResetScreen = false;
      return;
    }

    if (this.currentOperand === '0') {
      this.currentOperand = digit;
      return;
    }

    if (this.currentOperand === '-0') {
      this.currentOperand = '-' + digit;
      return;
    }

    // 最大入力桁数の制限（2進数は32桁、その他は16桁）
    const maxDigits = this.radix === 2 ? 32 : 16;
    const digitsOnly = this.currentOperand.replace(/[-.]/g, '');
    if (digitsOnly.length >= maxDigits) {
      return;
    }

    this.currentOperand += digit;
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
    if (this.errorMessage || this.currentOperand === '0' || this.currentOperand === '0.') {
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

    if (this.mode === 'programmer') {
      const currentRat = this.parseToRational(this.currentOperand, this.radix);
      if (!currentRat) return;

      let resultRat;
      const hundredRat = { num: 100n, den: 1n };

      if (this.previousOperand !== null && this.operation !== null) {
        const prevRat = this.parseToRational(this.previousOperand, this.radix);
        if (!prevRat) return;
        const ratio = this.divideRational(currentRat, hundredRat);
        resultRat = this.multiplyRational(prevRat, ratio);
      } else {
        resultRat = this.divideRational(currentRat, hundredRat);
      }

      this.applyProgrammerResult(resultRat);
      return;
    }

    const current = parseFloat(this.currentOperand);
    if (isNaN(current)) return;

    if (this.previousOperand !== null && this.operation !== null) {
      const prev = parseFloat(this.previousOperand);
      const percentValue = prev * (current / 100);
      this.currentOperand = this.formatRawNumber(percentValue);
    } else {
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

    const formattedCurrent = this.formatDisplayNumber(this.currentOperand, this.radix);

    if (this.mode === 'programmer') {
      const currentRat = this.parseToRational(this.currentOperand, this.radix);
      if (!currentRat) return;

      let resultRat = null;

      switch (type) {
        case 'reciprocal':
          if (currentRat.num === 0n) {
            this.errorMessage = '0 で割ることはできません';
            return;
          }
          this.historyText = `1/(${formattedCurrent})`;
          resultRat = this.divideRational({ num: 1n, den: 1n }, currentRat);
          break;

        case 'square':
          this.historyText = `sqr(${formattedCurrent})`;
          resultRat = this.multiplyRational(currentRat, currentRat);
          break;

        case 'sqrt':
          if (currentRat.num < 0n) {
            this.errorMessage = '無効な入力です';
            return;
          }
          this.historyText = `√(${formattedCurrent})`;
          resultRat = this.sqrtRational(currentRat);
          if (!resultRat) {
            this.errorMessage = '割り切れない値です';
            return;
          }
          break;

        default:
          return;
      }

      this.applyProgrammerResult(resultRat);
      return;
    }

    // 標準モード
    const current = parseFloat(this.currentOperand);
    if (isNaN(current)) return;

    let result;
    switch (type) {
      case 'reciprocal':
        if (current === 0) {
          this.errorMessage = '0 で割ることはできません';
          return;
        }
        result = 1 / current;
        this.historyText = `1/(${formattedCurrent})`;
        break;

      case 'square':
        result = current * current;
        this.historyText = `sqr(${formattedCurrent})`;
        break;

      case 'sqrt':
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

    if (this.previousOperand !== null && this.shouldResetScreen) {
      this.operation = operation;
      this.historyText = `${this.formatDisplayNumber(this.previousOperand, this.radix)} ${this.operation}`;
      return;
    }

    if (this.previousOperand !== null && this.operation !== null) {
      this.compute();
      if (this.errorMessage) return;
    }

    if (this.mode === 'programmer') {
      const currentRat = this.parseToRational(this.currentOperand, this.radix);
      if (!currentRat || !this.isTerminatingInAllBases(currentRat)) {
        this.errorMessage = '割り切れない値です';
        return;
      }
      this.currentOperand = this.rationalToBaseString(currentRat, this.radix);
    }

    this.operation = operation;
    this.previousOperand = this.currentOperand;
    this.historyText = `${this.formatDisplayNumber(this.previousOperand, this.radix)} ${this.operation}`;
    this.shouldResetScreen = true;
  }

  /**
   * 計算の実行（=）
   */
  compute() {
    if (this.errorMessage) return;
    if (this.operation === null || this.previousOperand === null) {
      // 単体で「=」が押された場合でも、プログラマーモードでは有限桁チェックを行う
      if (this.mode === 'programmer') {
        const rat = this.parseToRational(this.currentOperand, this.radix);
        if (!rat || !this.isTerminatingInAllBases(rat)) {
          this.errorMessage = '割り切れない値です';
          return;
        }
        this.currentOperand = this.rationalToBaseString(rat, this.radix);
        this.shouldResetScreen = true;
      }
      return;
    }

    if (this.mode === 'programmer') {
      const prevRat = this.parseToRational(this.previousOperand, this.radix);
      const currentRat = this.parseToRational(this.currentOperand, this.radix);
      if (!prevRat || !currentRat) return;

      let resultRat;
      switch (this.operation) {
        case '+':
          resultRat = this.addRational(prevRat, currentRat);
          break;
        case '−':
        case '-':
          resultRat = this.subtractRational(prevRat, currentRat);
          break;
        case '×':
        case '*':
          resultRat = this.multiplyRational(prevRat, currentRat);
          break;
        case '÷':
        case '/':
          if (currentRat.num === 0n) {
            this.errorMessage = '0 で割ることはできません';
            return;
          }
          resultRat = this.divideRational(prevRat, currentRat);
          break;
        default:
          return;
      }

      this.historyText = `${this.formatDisplayNumber(this.previousOperand, this.radix)} ${this.operation} ${this.formatDisplayNumber(this.currentOperand, this.radix)} =`;
      this.operation = null;
      this.previousOperand = null;
      this.applyProgrammerResult(resultRat);
      return;
    }

    // 標準モードの計算
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

    this.historyText = `${this.formatDisplayNumber(this.previousOperand, 10)} ${this.operation} ${this.formatDisplayNumber(this.currentOperand, 10)} =`;
    this.currentOperand = this.formatRawNumber(computation);
    this.operation = null;
    this.previousOperand = null;
    this.shouldResetScreen = true;
  }

  /**
   * プログラマーモードの演算結果を検証し、キリの良い正解であれば反映、不可ならエラーを設定
   * @param {{num: bigint, den: bigint}} rational
   */
  applyProgrammerResult(rational) {
    if (!rational || !this.isTerminatingInAllBases(rational)) {
      this.errorMessage = '割り切れない値です';
      return;
    }

    const str = this.rationalToBaseString(rational, this.radix);
    if (str === null) {
      this.errorMessage = '割り切れない値です';
      return;
    }

    // 桁あふれチェック（整数部が2進数で64bitを超える場合）
    const absInt = (rational.num < 0n ? -rational.num : rational.num) / rational.den;
    if (absInt >= (1n << 64n)) {
      this.errorMessage = 'オーバーフロー';
      return;
    }

    this.currentOperand = str;
    this.shouldResetScreen = true;
  }

  // =========================================================================
  // 有理数（BigInt）演算・基数変換ヘルパー
  // =========================================================================

  /**
   * 最大公約数 (GCD)
   * @param {bigint} a
   * @param {bigint} b
   * @returns {bigint}
   */
  gcd(a, b) {
    let x = a < 0n ? -a : a;
    let y = b < 0n ? -b : b;
    while (y !== 0n) {
      const t = y;
      y = x % y;
      x = t;
    }
    return x === 0n ? 1n : x;
  }

  /**
   * 有理数の約分・正規化
   * @param {bigint} num
   * @param {bigint} den
   * @returns {{num: bigint, den: bigint}}
   */
  normalizeRational(num, den) {
    if (den === 0n) return null;
    if (num === 0n) return { num: 0n, den: 1n };
    const sign = (num < 0n) !== (den < 0n) ? -1n : 1n;
    const absNum = num < 0n ? -num : num;
    const absDen = den < 0n ? -den : den;
    const g = this.gcd(absNum, absDen);
    return {
      num: sign * (absNum / g),
      den: absDen / g,
    };
  }

  addRational(a, b) {
    return this.normalizeRational(a.num * b.den + b.num * a.den, a.den * b.den);
  }

  subtractRational(a, b) {
    return this.normalizeRational(a.num * b.den - b.num * a.den, a.den * b.den);
  }

  multiplyRational(a, b) {
    return this.normalizeRational(a.num * b.num, a.den * b.den);
  }

  divideRational(a, b) {
    if (b.num === 0n) return null;
    return this.normalizeRational(a.num * b.den, a.den * b.num);
  }

  /**
   * BigIntの完全平方根を判定・取得（完全平方数でない場合は null）
   * @param {bigint} n
   * @returns {bigint|null}
   */
  exactSqrtBigInt(n) {
    if (n < 0n) return null;
    if (n === 0n) return 0n;
    if (n === 1n) return 1n;

    let x0 = n / 2n;
    let x1 = (x0 + n / x0) / 2n;
    while (x1 < x0) {
      x0 = x1;
      x1 = (x0 + n / x0) / 2n;
    }
    return x0 * x0 === n ? x0 : null;
  }

  /**
   * 有理数の平方根（キリの良い有理数にならない場合は null）
   * @param {{num: bigint, den: bigint}} rat
   * @returns {{num: bigint, den: bigint}|null}
   */
  sqrtRational(rat) {
    if (rat.num < 0n) return null;
    const sqrtNum = this.exactSqrtBigInt(rat.num);
    if (sqrtNum === null) return null;
    const sqrtDen = this.exactSqrtBigInt(rat.den);
    if (sqrtDen === null) return null;
    return this.normalizeRational(sqrtNum, sqrtDen);
  }

  /**
   * 指定された基数の数値文字列を既約分数 {num: BigInt, den: BigInt} に変換
   * @param {string} str
   * @param {number} radix
   * @returns {{num: bigint, den: bigint}|null}
   */
  parseToRational(str, radix) {
    if (!str || typeof str !== 'string') return null;

    let clean = str.trim().toUpperCase();
    if (!clean) return null;

    let isNegative = false;
    if (clean.startsWith('-')) {
      isNegative = true;
      clean = clean.slice(1);
    }

    const parts = clean.split('.');
    if (parts.length > 2) return null;

    const intStr = parts[0] || '0';
    const fracStr = parts[1] || '';
    const combined = intStr + fracStr;
    const bigRadix = BigInt(radix);

    let num = 0n;
    for (const ch of combined) {
      const digit = parseInt(ch, 16);
      if (isNaN(digit) || digit >= radix) {
        return null;
      }
      num = num * bigRadix + BigInt(digit);
    }

    const den = bigRadix ** BigInt(fracStr.length);
    return this.normalizeRational(isNegative ? -num : num, den);
  }

  /**
   * 全基数（2進・8進・10進・16進）すべてで有限桁の小数（または整数）として割り切れるか判定
   * 既約分数の分母が 2^k (k <= MAX_FRAC_BITS) であれば、2/8/10/16進すべてで有限桁になる。
   * @param {{num: bigint, den: bigint}} rational
   * @returns {boolean}
   */
  isTerminatingInAllBases(rational) {
    if (!rational) return false;
    const { den } = rational;
    if (den <= 0n) return false;
    // 分母が2のべき乗であるか判定: (den & (den - 1n)) === 0n
    if ((den & (den - 1n)) !== 0n) {
      return false;
    }
    // 許容小数ビット数以内か判定
    if (den > (1n << Calculator.MAX_FRAC_BITS)) {
      return false;
    }
    return true;
  }

  /**
   * 指定された基数で有限桁表現が可能か判定
   * @param {{num: bigint, den: bigint}} rational
   * @param {number} targetRadix
   * @returns {boolean}
   */
  isTerminatingInBase(rational, targetRadix) {
    if (!rational) return false;
    if (targetRadix === 2 || targetRadix === 8 || targetRadix === 16) {
      return this.isTerminatingInAllBases(rational);
    }
    if (targetRadix === 10) {
      let d = rational.den;
      let count = 0n;
      while (d % 2n === 0n && count <= Calculator.MAX_FRAC_BITS) {
        d /= 2n;
        count++;
      }
      while (d % 5n === 0n && count <= Calculator.MAX_FRAC_BITS) {
        d /= 5n;
        count++;
      }
      return d === 1n && count <= Calculator.MAX_FRAC_BITS;
    }
    return false;
  }

  /**
   * 有理数を指定した基数の文字列へ正確に変換（有限桁で表せない場合は null）
   * @param {{num: bigint, den: bigint}} rational
   * @param {number} targetRadix
   * @returns {string|null}
   */
  rationalToBaseString(rational, targetRadix) {
    if (!this.isTerminatingInBase(rational, targetRadix)) {
      return null;
    }

    const isNegative = rational.num < 0n;
    const absNum = isNegative ? -rational.num : rational.num;
    const den = rational.den;
    const bigRadix = BigInt(targetRadix);

    const intPart = absNum / den;
    let rem = absNum % den;

    const intStr = intPart.toString(targetRadix).toUpperCase();
    if (rem === 0n) {
      return (isNegative ? '-' : '') + intStr;
    }

    let fracStr = '';
    let safety = 0;
    while (rem > 0n && safety < 64) {
      rem *= bigRadix;
      const digit = rem / den;
      rem %= den;
      fracStr += digit.toString(targetRadix).toUpperCase();
      safety++;
    }

    return (isNegative ? '-' : '') + intStr + '.' + fracStr;
  }

  /**
   * HEX / DEC / OCT / BIN の各基数での表示文字列一覧を取得
   * @returns {{16: string, 10: string, 8: string, 2: string}}
   */
  getRadixConversions() {
    if (this.errorMessage) {
      return {
        16: 'エラー',
        10: 'エラー',
        8: 'エラー',
        2: 'エラー',
      };
    }

    const rational = this.parseToRational(this.currentOperand, this.radix);
    if (!rational) {
      return {
        16: '0',
        10: '0',
        8: '0',
        2: '0',
      };
    }

    const result = {};
    for (const r of [16, 10, 8, 2]) {
      if (r === this.radix) {
        result[r] = this.formatDisplayNumber(this.currentOperand, r);
      } else {
        const converted = this.rationalToBaseString(rational, r);
        result[r] = converted !== null ? this.formatDisplayNumber(converted, r) : 'エラー (無限小数)';
      }
    }
    return result;
  }

  /**
   * 数値を浮動小数点誤差を抑えて文字列化（標準モード用）
   * @param {number} num
   * @returns {string}
   */
  formatRawNumber(num) {
    if (!isFinite(num)) {
      this.errorMessage = 'オーバーフロー';
      return '0';
    }
    const rounded = parseFloat(num.toPrecision(12));
    return rounded.toString();
  }

  /**
   * 表示用フォーマット（基数に応じた桁区切り）
   * - DEC (10進): 3桁カンマ区切り (1,234,567.89)
   * - HEX (16進): 4桁スペース区切り (1A2B 3C4D.8)
   * - OCT (8進):  3桁スペース区切り (123 456.4)
   * - BIN (2進):  4桁スペース区切り (1010 0101.01)
   * @param {string} numberStr
   * @param {number} [radix=this.radix]
   * @returns {string}
   */
  formatDisplayNumber(numberStr, radix = this.radix) {
    if (!numberStr) return '';
    if (this.errorMessage) return this.errorMessage;

    const isNegative = numberStr.startsWith('-');
    const unsigned = isNegative ? numberStr.slice(1) : numberStr;

    const parts = unsigned.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    let formattedInteger;
    if (radix === 10) {
      formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } else if (radix === 8) {
      formattedInteger = integerPart.replace(/\B(?=(.{3})+(?!.))/g, ' ');
    } else {
      // HEX (16) および BIN (2) は4桁ごとにスペース区切り
      formattedInteger = integerPart.replace(/\B(?=(.{4})+(?!.))/g, ' ');
    }

    const prefix = isNegative ? '-' : '';
    if (decimalPart !== undefined) {
      return `${prefix}${formattedInteger}.${decimalPart}`;
    }
    return `${prefix}${formattedInteger}`;
  }

  /**
   * メイン画面用の表示テキストを取得
   * @returns {string}
   */
  getCurrentDisplay() {
    if (this.errorMessage) {
      return this.errorMessage;
    }
    return this.formatDisplayNumber(this.currentOperand, this.radix);
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
