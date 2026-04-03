// Text-to-Speech utility using Web Speech API
// Supports Japanese (ja-JP) — robust Android/iOS/Desktop implementation

let currentId = null;
let listeners = new Set();
let speakLock = false;

function notifyAll(state, id) {
  listeners.forEach(fn => fn(state, id));
}

export function subscribeTTS(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// Voice management
let voicesReady = false;
let voiceCache = new Map();
let voiceLoadAttempts = 0;

function ensureVoices() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    voicesReady = true;
    voiceCache.clear();
    voices.forEach(v => {
      const prefix = v.lang.split('-')[0];
      if (!voiceCache.has(prefix)) {
        voiceCache.set(prefix, v);
      }
      if (!voiceCache.has(v.lang)) {
        voiceCache.set(v.lang, v);
      }
    });
  }
}

export function isLangSupported(lang) {
  if (!voicesReady) ensureVoices();
  // On Android, voices may not be loaded yet — still return true to show buttons
  if (!voicesReady) return true;
  const prefix = lang.split('-')[0];
  return voiceCache.has(lang) || voiceCache.has(prefix);
}

function getVoice(lang) {
  ensureVoices();
  return voiceCache.get(lang) || voiceCache.get(lang.split('-')[0]) || null;
}

function makeId(text, lang) {
  return `${lang}:${text.slice(0, 50)}`;
}

// Clean text for better TTS output (strips romaji in parens, stray English)
function cleanJapaneseText(text, lang) {
  if (lang !== 'ja-JP') return text;
  let cleaned = text.replace(/[\(（].*?[\)）]/g, ' ');
  cleaned = cleaned.replace(/[a-zA-Z\-]+/g, ' ');
  return cleaned.trim() || text;
}

// Android WebView workaround: force-warm the speech engine with a silent utterance
// This must be called from a user gesture context on the first interaction
let engineWarmed = false;

function warmEngine() {
  if (engineWarmed) return;
  engineWarmed = true;
  try {
    const silent = new SpeechSynthesisUtterance('');
    silent.volume = 0;
    silent.rate = 10;
    speechSynthesis.speak(silent);
    speechSynthesis.cancel();
  } catch (e) {
    // Ignore — best-effort warm
  }
}

// Core speak function — robust cross-platform
export function speak(text, options = {}) {
  if (!('speechSynthesis' in window)) return false;
  if (speakLock) return false;

  const lang = options.lang || 'ja-JP';
  const id = makeId(text, lang);

  // Toggle: if same text playing, stop it
  if (currentId === id && speechSynthesis.speaking) {
    stop();
    return false;
  }

  // Lock to prevent double-calls
  speakLock = true;

  // Always cancel any current speech first
  speechSynthesis.cancel();
  currentId = null;
  notifyAll('stopped', null);

  // Warm engine on first user interaction (Android requirement)
  warmEngine();

  // Ensure voices are loaded; on Android they may arrive late
  ensureVoices();

  const textToSpeak = cleanJapaneseText(text, lang);

  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  utterance.lang = lang;
  utterance.rate = lang === 'ja-JP' ? 0.85 : 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voice = getVoice(lang);
  if (voice) utterance.voice = voice;

  const thisId = id;

  utterance.onstart = () => {
    currentId = thisId;
    notifyAll('playing', thisId);
  };

  utterance.onend = () => {
    if (currentId === thisId) {
      currentId = null;
      notifyAll('stopped', null);
    }
  };

  utterance.onerror = (e) => {
    if (e.error === 'interrupted' || e.error === 'canceled') return;
    console.warn('TTS error:', e.error);
    if (currentId === thisId) {
      currentId = null;
      notifyAll('stopped', null);
    }
  };

  // Delay speak to let cancel() flush on all platforms
  setTimeout(() => {
    speakLock = false;
    try {
      // On some Android WebViews, speaking can silently fail.
      // Re-cancel just in case something got stuck.
      if (speechSynthesis.speaking || speechSynthesis.pending) {
        speechSynthesis.cancel();
      }
      speechSynthesis.speak(utterance);

      // Android Chrome bug workaround: speech sometimes pauses after 15s.
      // We set up a resume interval that auto-clears when speech ends.
      const isAndroid = /android/i.test(navigator.userAgent);
      if (isAndroid) {
        const resumeInterval = setInterval(() => {
          if (!speechSynthesis.speaking) {
            clearInterval(resumeInterval);
            return;
          }
          if (speechSynthesis.paused) {
            speechSynthesis.resume();
          }
        }, 5000);
        // Safety: clear after 2 minutes max
        setTimeout(() => clearInterval(resumeInterval), 120000);
      }
    } catch (err) {
      console.warn('TTS speak failed:', err);
      speakLock = false;
      currentId = null;
      notifyAll('stopped', null);
    }
  }, 100);

  return true;
}

export function stop() {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
  currentId = null;
  speakLock = false;
  notifyAll('stopped', null);
}

export function getCurrentId() {
  return currentId;
}

export function isTTSSupported() {
  return 'speechSynthesis' in window;
}

export function preloadVoices() {
  if (!('speechSynthesis' in window)) return;

  // Immediate attempt
  ensureVoices();

  // Listen for async voice loading (desktop browsers, some Android)
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => ensureVoices();
  }

  // Android WebView fallback: poll for voices if onvoiceschanged never fires
  if (!voicesReady) {
    const poll = setInterval(() => {
      voiceLoadAttempts++;
      ensureVoices();
      if (voicesReady || voiceLoadAttempts > 20) {
        clearInterval(poll);
      }
    }, 250);
  }
}
