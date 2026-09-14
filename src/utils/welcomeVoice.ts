// Welcome Voice & Audio Synthesizer Utility for Logistics Login & Dashboard
// Designed to be 100% resilient across Chromium, WebKit, iOS, Android, and Desktop browsers.

declare global {
  interface Window {
    __activeSpeechUtterances?: Set<SpeechSynthesisUtterance>;
    __speechKeepAliveTimer?: any;
    __sharedAudioContext?: AudioContext;
  }
}

// Ensure global utterance registry to prevent Garbage Collection during speech (Chromium Issue 339445)
if (typeof window !== 'undefined') {
  if (!window.__activeSpeechUtterances) {
    window.__activeSpeechUtterances = new Set();
  }
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// Get or initialize singleton AudioContext (avoids hitting browser limit of 6 AudioContexts)
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!window.__sharedAudioContext || window.__sharedAudioContext.state === 'closed') {
      window.__sharedAudioContext = new AudioCtx();
    }
    return window.__sharedAudioContext;
  } catch (e) {
    console.warn('AudioContext initialization error:', e);
    return null;
  }
}

// Proactive voice list initialization
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      try {
        window.speechSynthesis.getVoices();
      } catch {}
    };
  } catch {}
}

/**
 * Unlocks audio context and speech synthesis permissions immediately upon user gesture (e.g. clicking login)
 */
export function unlockAudioAndSpeech() {
  try {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    }
  } catch (e) {
    // ignore
  }
}

/**
 * Helper penentuan periode waktu sapaan sesuai ketentuan:
 * - Pagi  : 04.00 – 10.59
 * - Siang : 11.00 – 14.59
 * - Sore  : 15.00 – 17.59
 * - Malam : 18.00 – 03.59
 */
export function getTimeGreeting(date: Date = new Date()): 'pagi' | 'siang' | 'sore' | 'malam' {
  const hour = date.getHours();
  if (hour >= 4 && hour < 11) return 'pagi';
  if (hour >= 11 && hour < 15) return 'siang';
  if (hour >= 15 && hour < 18) return 'sore';
  return 'malam';
}

/**
 * Format Suara & Balon Teks khusus Akses Cepat User DDS:
 * - Pagi (04.00 – 10.59): "Selamat pagi, Dede Suparman"
 * - Siang (11.00 – 14.59): "Selamat siang, Dede Suparman"
 * - Sore (15.00 – 17.59): "Selamat sore, Dede Suparman"
 * - Malam (18.00 – 03.59): "Selamat malam, Dede Suparman"
 */
export function getDdsQuickGreetingText(date: Date = new Date()): string {
  const waktu = getTimeGreeting(date);
  return `Selamat ${waktu}, Dede Suparman`;
}

/**
 * Format Suara & Balon Teks Sapaan Pengguna Logistik
 */
export function getWelcomeGreetingText(userName?: string, _roleTitle?: string): string {
  const waktu = getTimeGreeting();
  const cleanName = (userName || '').trim();

  // Khusus User DDS / Dede Suparman gunakan format resmi sapaan singkat
  if (/dede|suparman|^dds$/i.test(cleanName)) {
    return `Selamat ${waktu}, Dede Suparman`;
  }

  const displayName = cleanName ? cleanName : 'Rekan Logistik';
  return `Selamat ${waktu}, ${displayName}!`;
}

type VoiceStateListener = (isSpeaking: boolean, text?: string) => void;
const voiceStateListeners = new Set<VoiceStateListener>();

export function subscribeVoiceState(listener: VoiceStateListener): () => void {
  voiceStateListeners.add(listener);
  return () => {
    voiceStateListeners.delete(listener);
  };
}

function notifyVoiceState(isSpeaking: boolean, text?: string) {
  voiceStateListeners.forEach(fn => {
    try {
      fn(isSpeaking, text);
    } catch {}
  });
}

/**
 * Plays futuristic chime melody accompanying the voice greeting
 */
export function playWelcomeChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Harmonic Welcoming Chime: C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const startTime = now + idx * 0.12;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.42);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  } catch (e) {
    console.warn('Welcome chime error:', e);
  }
}

/**
 * Resolves available voices asynchronously if not yet loaded by the browser
 */
function getVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isSpeechSupported()) {
      resolve([]);
      return;
    }
    const currentVoices = window.speechSynthesis.getVoices();
    if (currentVoices && currentVoices.length > 0) {
      resolve(currentVoices);
      return;
    }

    // If voices are not yet loaded, listen for the event with a 200ms fallback
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(window.speechSynthesis.getVoices() || []);
      }
    }, 200);

    window.speechSynthesis.onvoiceschanged = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(window.speechSynthesis.getVoices() || []);
      }
    };
  });
}

/**
 * Finds the best suitable Indonesian voice
 */
function pickIndonesianVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // 1. Exact Indonesian match
  const idExact = voices.find(v => 
    v.lang.toLowerCase() === 'id-id' || 
    v.lang.toLowerCase() === 'id_id' ||
    v.lang.toLowerCase() === 'id'
  );
  if (idExact) return idExact;

  // 2. Name contains Indonesian indicators
  const idNamed = voices.find(v => {
    const name = v.name.toLowerCase();
    return name.includes('indonesia') || 
      name.includes('damayanti') || 
      name.includes('gadis') || 
      name.includes('andika');
  });
  if (idNamed) return idNamed;

  // 3. Fallback to Malay (phonetically closest and natural)
  const malay = voices.find(v => v.lang.toLowerCase().startsWith('ms'));
  if (malay) return malay;

  // 4. Default voice
  return voices.find(v => v.default) || voices[0] || null;
}

export interface PlayWelcomeVoiceOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
  text?: string;
  userName?: string;
  roleTitle?: string;
  playChime?: boolean;
  chimeDelayMs?: number;
}

/**
 * Speaks greeting/announcement using browser SpeechSynthesis with full Chromium anti-bug protections.
 * Menjamin melodi nada konfirmasi (chime) selesai berdering dan ada jeda jeda hening sejenak
 * sebelum suara ucapan kata-kata mulai menyapa, sehingga suara tidak pernah bertumpuk.
 */
export async function playWelcomeVoice({
  onStart,
  onEnd,
  onError,
  text,
  userName,
  roleTitle,
  playChime = true,
  chimeDelayMs = 350
}: PlayWelcomeVoiceOptions = {}): Promise<boolean> {
  const speechText = text || getWelcomeGreetingText(userName, roleTitle);

  // 1. Putar nada melodi robot terlebih dahulu jika diminta
  if (playChime) {
    playWelcomeChime();
    // Beri jeda singkat agar nada mulai berdering manis
    if (chimeDelayMs > 0) {
      await new Promise(r => setTimeout(r, chimeDelayMs));
    }
  }

  if (!isSpeechSupported()) {
    notifyVoiceState(true, speechText);
    if (onStart) onStart();
    setTimeout(() => {
      notifyVoiceState(false);
      if (onEnd) onEnd();
    }, 1800);
    return false;
  }

  try {
    // Chromium Bug Fix: If speech is already speaking or pending, cancel it FIRST,
    // but wait 80ms before issuing speak(). Otherwise Chrome flushes the new utterance!
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
      await new Promise(r => setTimeout(r, 80));
    }

    // Ensure synth is unpaused
    window.speechSynthesis.resume();

    // Fetch voices
    const voices = await getVoicesAsync();
    const idVoice = pickIndonesianVoice(voices);

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = 'id-ID';
    utterance.rate = 0.96; // clear and natural cadence
    utterance.pitch = 1.05; // friendly, warm tone

    if (idVoice) {
      utterance.voice = idVoice;
    }

    // Keepalive & GC protection
    const registry = window.__activeSpeechUtterances || new Set();
    registry.add(utterance);
    window.__activeSpeechUtterances = registry;

    let hasEnded = false;

    const stopKeepAlive = () => {
      if (window.__speechKeepAliveTimer) {
        clearInterval(window.__speechKeepAliveTimer);
        window.__speechKeepAliveTimer = null;
      }
    };

    const cleanup = () => {
      if (hasEnded) return;
      hasEnded = true;
      stopKeepAlive();
      notifyVoiceState(false);
      if (window.__activeSpeechUtterances) {
        window.__activeSpeechUtterances.delete(utterance);
      }
    };

    utterance.onstart = () => {
      notifyVoiceState(true, speechText);
      if (onStart) onStart();

      // Chromium keepalive: resume every 2 seconds without calling pause()
      stopKeepAlive();
      window.__speechKeepAliveTimer = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.resume();
        } else {
          cleanup();
        }
      }, 2000);
    };

    utterance.onend = () => {
      cleanup();
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      // 'interrupted' or 'canceled' happens normally when stopped or replaced
      const isInterrupted = e.error === 'interrupted' || e.error === 'canceled';
      if (!isInterrupted) {
        console.warn('SpeechSynthesis error event:', e.error);
        if (onError) onError();
      }
      cleanup();
      if (onEnd) onEnd();
    };

    // Safety timeout in case browser gets stuck and never fires onend
    const estimatedDurationMs = Math.max(4000, speechText.length * 110);
    setTimeout(() => {
      if (!hasEnded) {
        // If browser is genuinely not speaking anymore
        if (!window.speechSynthesis.speaking) {
          cleanup();
          if (onEnd) onEnd();
        }
      }
    }, estimatedDurationMs + 3000);

    window.speechSynthesis.speak(utterance);
    // Explicitly resume right after speaking to bypass potential browser mute locks
    window.speechSynthesis.resume();

    // Fallback watcher: if onstart hasn't fired in 600ms, nudge resume()
    setTimeout(() => {
      if (!hasEnded && window.speechSynthesis.pending) {
        window.speechSynthesis.resume();
      }
    }, 600);

    return true;
  } catch (err) {
    console.warn('Speech synthesis playback error:', err);
    notifyVoiceState(false);
    if (onError) onError();
    if (onEnd) onEnd();
    return false;
  }
}

/**
 * Stops active voice greeting safely
 */
export function stopWelcomeVoice() {
  try {
    notifyVoiceState(false);
    if (window.__speechKeepAliveTimer) {
      clearInterval(window.__speechKeepAliveTimer);
      window.__speechKeepAliveTimer = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (window.__activeSpeechUtterances) {
      window.__activeSpeechUtterances.clear();
    }
  } catch (e) {
    console.warn('Error stopping speech synthesis:', e);
  }
}
