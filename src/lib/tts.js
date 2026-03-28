// Text-to-Speech utility using Web Speech API
// Supports Japanese (ja-JP) only — clean, single-play implementation

let currentId = null;
let listeners = new Set();
let speakLock = false; // prevents rapid double-clicks

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

function ensureVoices() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    voicesReady = true;
    voiceCache.clear();
    voices.forEach(v => {
      const prefix = v.lang.split('-')[0];
      // Prefer first found voice per language prefix
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

// Clean text to avoid Windows TTS reading romaji incorrectly
function cleanJapaneseText(text, lang) {
  if (lang !== 'ja-JP') return text;
  // Remove everything inside parentheses (both ASCII and fullwidth)
  let cleaned = text.replace(/[\(（].*?[\)）]/g, ' ');
  // Remove leftover isolated english words/letters
  cleaned = cleaned.replace(/[a-zA-Z\-]+/g, ' ');
  return cleaned.trim() || text; // fallback to original if completely empty
}

// Core speak function — simple and reliable
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

  // Always fully cancel first
  speechSynthesis.cancel();
  currentId = null;
  notifyAll('stopped', null);

  // Use cleaned text for better Japanese TTS output
  const textToSpeak = cleanJapaneseText(text, lang);

  // Create utterance
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
    if (currentId === thisId) {
      currentId = null;
      notifyAll('stopped', null);
    }
  };

  // Delay speak to let cancel() finish completely
  setTimeout(() => {
    speakLock = false;
    // Double-check nothing else started
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    speechSynthesis.speak(utterance);
  }, 80);

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
  if ('speechSynthesis' in window) {
    ensureVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => ensureVoices();
    }
  }
}
