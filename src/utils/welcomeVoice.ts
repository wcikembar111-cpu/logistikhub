// Welcome Voice & Audio Synthesizer Utility for Logistics Login & Dashboard

let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeAudioCtx: AudioContext | null = null;
let keepAliveInterval: NodeJS.Timeout | null = null;

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function getWelcomeGreetingText(): string {
  const hour = new Date().getHours();
  let waktu = 'Malam';
  if (hour >= 4 && hour < 11) waktu = 'Pagi';
  else if (hour >= 11 && hour < 15) waktu = 'Siang';
  else if (hour >= 15 && hour < 18) waktu = 'Sore';

  return `Selamat ${waktu.toLowerCase()} rekan logistik. Selamat datang di Warehouse Logistics Studio Cikembar PT Kino Indonesia. Silakan masukkan PIN Anda untuk mengakses sistem.`;
}

/**
 * Plays futuristic chime melody accompanying the voice greeting
 */
export function playWelcomeChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    activeAudioCtx = ctx;

    // Harmonic Welcoming Chime: C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = ctx.currentTime + idx * 0.14;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  } catch (e) {
    console.error('Welcome chime error:', e);
  }
}

function selectIndonesianVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Prioritize Indonesian voices (Google Bahasa Indonesia, Damayanti, Microsoft etc.)
  const idVoice = voices.find(v => 
    v.lang.toLowerCase().startsWith('id') || 
    v.lang.toLowerCase().includes('indonesia') || 
    v.name.toLowerCase().includes('indonesia') ||
    v.name.toLowerCase().includes('damayanti') ||
    v.name.toLowerCase().includes('gadis')
  );
  return idVoice || null;
}

/**
 * Speaks greeting/announcement using browser SpeechSynthesis with reliable keepalive
 */
export function playWelcomeVoice({
  onStart,
  onEnd,
  onError,
  text
}: {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
  text?: string;
} = {}): boolean {
  if (!isSpeechSupported()) {
    playWelcomeChime();
    if (onStart) onStart();
    setTimeout(() => {
      if (onEnd) onEnd();
    }, 1800);
    return false;
  }

  try {
    // Clear any previous speech or keepalive
    stopWelcomeVoice();

    // Play subtle crystal chime first
    playWelcomeChime();

    // Ensure synth is unpaused
    window.speechSynthesis.resume();

    const speechText = text || getWelcomeGreetingText();
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = 'id-ID';
    utterance.rate = 0.98; // slightly more paced for clarity
    utterance.pitch = 1.05; // clear, friendly warm pitch

    const idVoice = selectIndonesianVoice();
    if (idVoice) {
      utterance.voice = idVoice;
    }

    const cleanup = () => {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      activeUtterance = null;
    };

    utterance.onstart = () => {
      activeUtterance = utterance;
      if (onStart) onStart();

      // Chrome speech synthesis workaround for long utterances: ping resume every 5s
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      keepAliveInterval = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else {
          cleanup();
        }
      }, 5000);
    };

    utterance.onend = () => {
      cleanup();
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      // Ignore 'interrupted' or 'canceled' errors caused by user stopping
      console.warn('SpeechSynthesis event error:', e);
      cleanup();
      if (onError) onError();
      if (onEnd) onEnd();
    };

    // Safety timeout in case browser never fires onend
    const estimatedDurationMs = Math.max(3000, speechText.length * 90);
    const safetyTimer = setTimeout(() => {
      if (activeUtterance === utterance) {
        cleanup();
        if (onEnd) onEnd();
      }
    }, estimatedDurationMs + 2000);

    const originalOnEnd = utterance.onend;
    utterance.onend = (e) => {
      clearTimeout(safetyTimer);
      if (originalOnEnd) originalOnEnd.call(utterance, e);
    };

    // Store globally to prevent Garbage Collection during speech
    (window as unknown as { __currentSpeechUtterance: SpeechSynthesisUtterance }).__currentSpeechUtterance = utterance;

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('Speech synthesis playback error:', err);
    if (onError) onError();
    if (onEnd) onEnd();
    return false;
  }
}

/**
 * Stops active voice greeting
 */
export function stopWelcomeVoice() {
  try {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    if (isSpeechSupported()) {
      window.speechSynthesis.cancel();
    }
    if (activeAudioCtx) {
      activeAudioCtx.close().catch(() => {});
      activeAudioCtx = null;
    }
  } catch (e) {
    // ignore
  }
  activeUtterance = null;
}

