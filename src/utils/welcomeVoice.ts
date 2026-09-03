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

export function getWelcomeGreetingText(userName?: string, roleTitle?: string): string {
  const hour = new Date().getHours();
  let waktu = 'Malam';
  if (hour >= 4 && hour < 11) waktu = 'Pagi';
  else if (hour >= 11 && hour < 15) waktu = 'Siang';
  else if (hour >= 15 && hour < 18) waktu = 'Sore';

  const cleanName = (userName || '').trim();
  const displayName = cleanName ? cleanName : 'Rekan Logistik';
  const roleGreeting = roleTitle ? ` (${roleTitle})` : '';

  return `Selamat ${waktu.toLowerCase()}, ${displayName}${roleGreeting}. Selamat datang di Warehouse Logistics Studio Cikembar PT Kino Indonesia. Sistem operasional siap digunakan. Selamat bertugas!`;
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

/**
 * Speaks greeting/announcement using browser SpeechSynthesis with full Chromium anti-bug protections
 */
export async function playWelcomeVoice({
  onStart,
  onEnd,
  onError,
  text,
  userName,
  roleTitle
}: {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
  text?: string;
  userName?: string;
  roleTitle?: string;
} = {}): Promise<boolean> {
  // Always play harmonic welcoming chime immediately for audio responsiveness
  playWelcomeChime();

  if (!isSpeechSupported()) {
    if (onStart) onStart();
    setTimeout(() => {
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

    const speechText = text || getWelcomeGreetingText(userName, roleTitle);
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
      if (window.__activeSpeechUtterances) {
        window.__activeSpeechUtterances.delete(utterance);
      }
    };

    utterance.onstart = () => {
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
    if (window.__speechKeepAliveTimer) {
      clearInterval(window.__speechKeepAliveTimer);
      window.__speechKeepAliveTimer = null;
    }
    if (isSpeechSupported()) {
      window.speechSynthesis.cancel();
    }
    if (window.__activeSpeechUtterances) {
      window.__activeSpeechUtterances.clear();
    }
  } catch (e) {
    // ignore
  }
}
