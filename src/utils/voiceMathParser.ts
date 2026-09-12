/**
 * Voice Math Parser for Indonesian Language
 * Converts spoken Indonesian math expressions into structured mathematical tokens and evaluates them safely.
 *
 * Crucial Rule:
 * - Does NOT calculate until "sama dengan", "hitung", "berapa", "total", or "equals" is explicitly uttered or clicked.
 * - Accurately parses Indonesian spoken numbers ("dua puluh lima", "seratus dua puluh lima ribu", "dua koma lima")
 *   and direct digit strings ("25", "100", "1.500", "50000").
 * - Normalizes Indonesian operators: tambah/plus, kurang/minus, kali/dikali, bagi/dibagi, persen, kurung, dll.
 */

export interface ParsedVoiceResult {
  rawTranscript: string;
  cleanExpression: string; // e.g. "25 + 50 * 2 - 10 / 5"
  displayExpression: string; // e.g. "25 + 50 × 2 - 10 ÷ 5"
  shouldCalculate: boolean; // true ONLY when "sama dengan", "hitung", "berapa", "total", or "=" is uttered
  shouldClear: boolean;
  shouldUndo: boolean;
  shouldMute?: boolean;
  shouldUnmute?: boolean;
  shouldStop?: boolean;
  spokenFeedback?: string;
  error?: string;
}

const INDO_DIGITS: Record<string, number> = {
  nol: 0,
  kosong: 0,
  zero: 0,
  satu: 1,
  one: 1,
  dua: 2,
  two: 2,
  tiga: 3,
  three: 3,
  empat: 4,
  four: 4,
  lima: 5,
  five: 5,
  enam: 6,
  six: 6,
  tujuh: 7,
  seven: 7,
  delapan: 8,
  eight: 8,
  sembilan: 9,
  nine: 9,
  sepuluh: 10,
  ten: 10,
  sebelas: 11,
  eleven: 11
};

export function isOperator(token: string): boolean {
  return ['+', '-', '*', '/', '%', '×', '÷'].includes(token);
}

/**
 * Parses an array of Indonesian words representing a single number
 * e.g. ['seratus', 'dua', 'puluh', 'lima', 'ribu'] => 125000
 * e.g. ['dua', 'koma', 'lima'] => 2.5
 * e.g. ['5000'] => 5000
 */
export function parseIndonesianNumberPhrase(words: string[]): number | null {
  if (!words || words.length === 0) return null;

  // Check if it's already a clean number or pure digits
  if (words.length === 1) {
    const raw = words[0].replace(/\./g, '').replace(/,/g, '.');
    if (!isNaN(Number(raw)) && raw.trim() !== '') {
      return Number(raw);
    }
  }

  // Handle decimal points: e.g. ["dua", "koma", "lima"]
  const commaIndex = words.findIndex(w => ['koma', 'titik', 'point', '.'].includes(w.toLowerCase()));
  if (commaIndex !== -1) {
    const beforeWords = words.slice(0, commaIndex);
    const afterWords = words.slice(commaIndex + 1);

    const intVal = beforeWords.length > 0 ? parseIndonesianNumberPhrase(beforeWords) ?? 0 : 0;

    let decStr = '';
    for (const w of afterWords) {
      const lower = w.toLowerCase();
      if (INDO_DIGITS[lower] !== undefined) {
        decStr += INDO_DIGITS[lower];
      } else if (!isNaN(Number(lower))) {
        decStr += lower;
      }
    }

    if (decStr.length > 0) {
      return parseFloat(`${intVal}.${decStr}`);
    }
    return intVal;
  }

  let total = 0;
  let currentMultiplierGroup = 0; // for thousands, millions
  let currentSmall = 0; // for units 1..99 within hundreds/tens
  let hasValidToken = false;

  for (let i = 0; i < words.length; i++) {
    const w = words[i].toLowerCase().trim();
    if (!w) continue;

    if (w === 'miliar' || w === 'milyar' || w === 'billion') {
      currentMultiplierGroup += currentSmall;
      if (currentMultiplierGroup === 0) currentMultiplierGroup = 1;
      total += currentMultiplierGroup * 1000000000;
      currentMultiplierGroup = 0;
      currentSmall = 0;
      hasValidToken = true;
    } else if (w === 'juta' || w === 'million') {
      currentMultiplierGroup += currentSmall;
      if (currentMultiplierGroup === 0) currentMultiplierGroup = 1;
      total += currentMultiplierGroup * 1000000;
      currentMultiplierGroup = 0;
      currentSmall = 0;
      hasValidToken = true;
    } else if (w === 'ribu' || w === 'thousand') {
      currentMultiplierGroup += currentSmall;
      if (currentMultiplierGroup === 0) currentMultiplierGroup = 1;
      total += currentMultiplierGroup * 1000;
      currentMultiplierGroup = 0;
      currentSmall = 0;
      hasValidToken = true;
    } else if (w === 'sejuta') {
      total += 1000000;
      hasValidToken = true;
    } else if (w === 'seribu') {
      total += 1000;
      hasValidToken = true;
    } else if (w === 'seratus') {
      currentMultiplierGroup += 100;
      hasValidToken = true;
    } else if (w === 'ratus' || w === 'hundred') {
      if (currentSmall === 0) currentSmall = 1;
      currentMultiplierGroup += currentSmall * 100;
      currentSmall = 0;
      hasValidToken = true;
    } else if (w === 'puluh') {
      if (currentSmall === 0) currentSmall = 1;
      currentMultiplierGroup += currentSmall * 10;
      currentSmall = 0;
      hasValidToken = true;
    } else if (w === 'belas') {
      if (currentSmall === 0) currentSmall = 1;
      currentMultiplierGroup += 10 + currentSmall;
      currentSmall = 0;
      hasValidToken = true;
    } else if (w === 'sepuluh') {
      currentMultiplierGroup += 10;
      hasValidToken = true;
    } else if (w === 'sebelas') {
      currentMultiplierGroup += 11;
      hasValidToken = true;
    } else if (INDO_DIGITS[w] !== undefined) {
      currentSmall += INDO_DIGITS[w];
      hasValidToken = true;
    } else {
      // Check if pure numbers like "50", "2.500"
      const cleaned = w.replace(/\./g, '').replace(/,/g, '.');
      if (!isNaN(Number(cleaned)) && cleaned !== '') {
        currentSmall += Number(cleaned);
        hasValidToken = true;
      }
    }
  }

  total += currentMultiplierGroup + currentSmall;
  return hasValidToken ? total : null;
}

/**
 * Normalizes spoken Indonesian text into math expression tokens and checks for commands.
 */
export function processVoiceInput(transcript: string): ParsedVoiceResult {
  const rawTranscript = transcript.trim();
  const lower = rawTranscript.toLowerCase();

  // 1. Check for calculate triggers ("sama dengan", "hitung", "berapa", "total", "hasilnya", "equals")
  const calculatePatterns = [
    /\bsama\s*dengan\b/i,
    /\bsamadengan\b/i,
    /\bhasilnya\b/i,
    /\bhasil\b/i,
    /\bhitung\b/i,
    /\bhitunglah\b/i,
    /\bberapa\b/i,
    /\btotal\b/i,
    /\bequals?\b/i,
    /=/
  ];

  let shouldCalculate = false;
  for (const pat of calculatePatterns) {
    if (pat.test(lower)) {
      shouldCalculate = true;
      break;
    }
  }

  // 2. Check for clear/reset triggers
  const clearPatterns = [
    /\b(reset|ulang|bersihkan|hapus\s*semua|clear|kosongkan)\b/i
  ];
  const shouldClear = clearPatterns.some(p => p.test(lower));

  // 3. Check for undo/backspace triggers
  const undoPatterns = [
    /\b(hapus|koreksi|backspace|batal|undo|salah)\b/i
  ];
  const shouldUndo = !shouldClear && undoPatterns.some(p => p.test(lower));

  // 4. Check for mute / pause / jeda triggers
  const mutePatterns = [
    /\b(jeda|mute|pause|tunggu|hening|diam)\b/i
  ];
  const shouldMute = mutePatterns.some(p => p.test(lower));

  // 5. Check for unmute / resume triggers
  const unmutePatterns = [
    /\b(lanjut|lanjutkan|unmute|resume|bicara\s*lagi)\b/i
  ];
  const shouldUnmute = unmutePatterns.some(p => p.test(lower));

  // 6. Check for stop / matikan triggers
  const stopPatterns = [
    /\b(stop|berhenti|matikan|hentikan)\b/i
  ];
  const shouldStop = stopPatterns.some(p => p.test(lower));

  // Strip calculate command triggers from expression text
  let text = lower
    .replace(/\bsama\s*dengan\b/gi, ' ')
    .replace(/\bsamadengan\b/gi, ' ')
    .replace(/\bhasilnya\b/gi, ' ')
    .replace(/\bhasil\b/gi, ' ')
    .replace(/\bhitunglah\b/gi, ' ')
    .replace(/\bhitung\b/gi, ' ')
    .replace(/\bberapa\b/gi, ' ')
    .replace(/\btotal\b/gi, ' ')
    .replace(/\bequals?\b/gi, ' ')
    .replace(/\b(jeda|mute|pause|tunggu|hening|diam)\b/gi, ' ')
    .replace(/\b(lanjut|lanjutkan|unmute|resume)\b/gi, ' ')
    .replace(/\b(stop|berhenti|matikan|hentikan)\b/gi, ' ')
    .replace(/=/g, ' ');

  // Standardize operator phrases into single symbols with surrounding spaces
  text = text
    .replace(/\b(kurung\s*buka|buka\s*kurung)\b/gi, ' ( ')
    .replace(/\b(kurung\s*tutup|tutup\s*kurung)\b/gi, ' ) ')
    .replace(/\b(tambah\s*dengan|ditambah\s*dengan|dijumlahkan\s*dengan|dijumlah\s*dengan|ditambah|dijumlah|tambah|plus|dan)\b/gi, ' + ')
    .replace(/\b(dikurangi\s*dengan|dikurang\s*dengan|dikurangi|dikurang|kurangi|kurang|minus)\b/gi, ' - ')
    .replace(/\b(dikalikan\s*dengan|dikali\s*dengan|dikalikan|dikali|kali|times)\b/gi, ' * ')
    .replace(/\b(dibagikan\s*dengan|dibagi\s*dengan|dibagikan|dibagi|bagi|per|slash)\b/gi, ' / ')
    .replace(/\b(persen|percent)\b/gi, ' % ')
    .replace(/\bx\b/gi, ' * ')
    .replace(/:/g, ' / ');

  // Tokenize
  const rawWords = text.split(/\s+/).filter(Boolean);
  const mathTokens: string[] = [];
  let numberWordBuffer: string[] = [];

  const flushNumberBuffer = () => {
    if (numberWordBuffer.length > 0) {
      const parsedNum = parseIndonesianNumberPhrase(numberWordBuffer);
      if (parsedNum !== null) {
        mathTokens.push(parsedNum.toString());
      }
      numberWordBuffer = [];
    }
  };

  for (const word of rawWords) {
    if (['+', '-', '*', '/', '%', '(', ')'].includes(word)) {
      flushNumberBuffer();
      // Replace duplicate operator if back-to-back (except for opening parenthesis or minus as sign)
      const lastToken = mathTokens[mathTokens.length - 1];
      if (isOperator(lastToken) && isOperator(word)) {
        mathTokens[mathTokens.length - 1] = word;
      } else {
        mathTokens.push(word);
      }
    } else {
      numberWordBuffer.push(word);
    }
  }
  flushNumberBuffer();

  const cleanExpression = mathTokens.join(' ');
  const displayExpression = cleanExpression
    .replace(/\*/g, '×')
    .replace(/\//g, '÷');

  return {
    rawTranscript,
    cleanExpression,
    displayExpression,
    shouldCalculate,
    shouldClear,
    shouldUndo,
    shouldMute,
    shouldUnmute,
    shouldStop
  };
}

/**
 * Safely evaluates a mathematical expression using standard precedence (PEMDAS).
 */
export function evaluateMathExpression(expr: string): { result: number; error?: string } {
  if (!expr || expr.trim() === '') {
    return { result: 0, error: 'Ekspresi masih kosong' };
  }

  // Clean expression
  const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.').trim();

  // Validate allowed characters: numbers, decimals, +, -, *, /, %, (, )
  if (!/^[0-9+\-*/().%\s]+$/.test(sanitized)) {
    return { result: 0, error: 'Karakter matematika tidak valid' };
  }

  // Remove trailing operators if user triggered calculate while ending in an operator (e.g. "25 + 50 +")
  const trimmed = sanitized.replace(/[+\-*/%]+$/, '').trim();
  if (!trimmed) {
    return { result: 0, error: 'Belum ada angka yang lengkap untuk dihitung' };
  }

  try {
    // Percentage conversion: number followed by % becomes (number / 100)
    const formattedForEval = trimmed.replace(/([0-9.]+)%/g, '($1 / 100)');
    
    // eslint-disable-next-line no-new-func
    const rawResult = new Function(`'use strict'; return (${formattedForEval})`)();
    
    if (typeof rawResult !== 'number' || isNaN(rawResult) || !isFinite(rawResult)) {
      return { result: 0, error: 'Hasil kalkulasi tidak terdefinisi atau pembagian dengan nol' };
    }

    // Round to max 8 decimals to prevent floating point inaccuracies (e.g. 0.1 + 0.2 = 0.3)
    const result = Math.round((rawResult + Number.EPSILON) * 100000000) / 100000000;
    return { result };
  } catch (err: any) {
    return { result: 0, error: 'Format ekspresi belum lengkap atau tanda kurung tidak seimbang' };
  }
}

/**
 * Formats a number to Indonesian locale (e.g. 1.250.000,5)
 */
export function formatIndoNumber(val: number): string {
  if (isNaN(val)) return '0';
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 6
  }).format(val);
}

/**
 * Converts a number to Indonesian spoken words for audio feedback (TTS)
 */
export function numberToIndonesianWords(n: number): string {
  if (n === 0) return 'nol';
  if (isNaN(n)) return 'tidak terdefinisi';

  let num = Math.abs(n);
  const isNegative = n < 0;

  const units = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

  function convertInteger(val: number): string {
    if (val < 12) return units[val];
    if (val < 20) return `${convertInteger(val - 10)} belas`;
    if (val < 100) {
      const rest = val % 10;
      return `${convertInteger(Math.floor(val / 10))} puluh${rest ? ' ' + convertInteger(rest) : ''}`;
    }
    if (val < 200) {
      const rest = val - 100;
      return `seratus${rest ? ' ' + convertInteger(rest) : ''}`;
    }
    if (val < 1000) {
      const rest = val % 100;
      return `${convertInteger(Math.floor(val / 100))} ratus${rest ? ' ' + convertInteger(rest) : ''}`;
    }
    if (val < 2000) {
      const rest = val - 1000;
      return `seribu${rest ? ' ' + convertInteger(rest) : ''}`;
    }
    if (val < 1000000) {
      const rest = val % 1000;
      return `${convertInteger(Math.floor(val / 1000))} ribu${rest ? ' ' + convertInteger(rest) : ''}`;
    }
    if (val < 1000000000) {
      const rest = val % 1000000;
      return `${convertInteger(Math.floor(val / 1000000))} juta${rest ? ' ' + convertInteger(rest) : ''}`;
    }
    if (val < 1000000000000) {
      const rest = val % 1000000000;
      return `${convertInteger(Math.floor(val / 1000000000))} miliar${rest ? ' ' + convertInteger(rest) : ''}`;
    }
    return val.toString();
  }

  const intPart = Math.floor(num);
  const decPart = num - intPart;

  let spoken = convertInteger(intPart);
  if (decPart > 0) {
    const decStr = decPart.toFixed(4).replace(/^0\./, '').replace(/0+$/, '');
    const decWords = decStr.split('').map(d => units[parseInt(d, 10)] || d).join(' ');
    spoken += ` koma ${decWords}`;
  }

  return isNegative ? `minus ${spoken}` : spoken;
}
