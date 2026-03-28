// Text-to-Speech utility using Web Speech API
// Supports Japanese (ja-JP), English/Romaji (en-US)

let currentId = null; // track which text is being spoken
let currentUtterance = null; // track the active utterance
let listeners = new Set();

// Notify all listeners
function notifyAll(state, id) {
  listeners.forEach(fn => fn(state, id));
}

// Subscribe to state changes (returns unsubscribe function)
export function subscribeTTS(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// Language detection
function detectLanguage(text) {
  const cleaned = text.trim();
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(cleaned)) return 'ja-JP';
  if (/[\u1000-\u109F\uAA60-\uAA7F]/.test(cleaned)) return 'my-MM';
  return 'en-US';
}

// Check if a voice exists for a language
let voicesLoaded = false;
let availableLangs = new Set();

function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    voicesLoaded = true;
    availableLangs.clear();
    voices.forEach(v => {
      availableLangs.add(v.lang);
      availableLangs.add(v.lang.split('-')[0]); // also add prefix
    });
  }
}

export function isLangSupported(lang) {
  if (!voicesLoaded) loadVoices();
  if (!voicesLoaded) return true; // assume supported until voices load
  const prefix = lang.split('-')[0];
  return availableLangs.has(lang) || availableLangs.has(prefix);
}

// Get best available voice for language
function getVoice(lang) {
  const voices = speechSynthesis.getVoices();
  let voice = voices.find(v => v.lang === lang);
  if (!voice) {
    const prefix = lang.split('-')[0];
    voice = voices.find(v => v.lang.startsWith(prefix));
  }
  return voice;
}

// Generate a unique ID for a text+lang combo
function makeId(text, lang) {
  return `${lang}:${text.slice(0, 50)}`;
}

// Speak text
export function speak(text, options = {}) {
  if (!('speechSynthesis' in window)) return false;

  const lang = options.lang || detectLanguage(text);
  const id = makeId(text, lang);

  // If same text is playing, stop it (toggle)
  if (currentId === id) {
    stop();
    return false;
  }

  // Stop any current speech first
  stop();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = options.rate || (lang === 'ja-JP' ? 0.85 : 0.9);
  utterance.pitch = options.pitch || 1;
  utterance.volume = options.volume || 1;

  const voice = getVoice(lang);
  if (voice) utterance.voice = voice;

  currentId = id;
  currentUtterance = utterance;

  utterance.onstart = () => {
    // Only notify if this utterance is still the active one
    if (currentUtterance === utterance) {
      notifyAll('playing', id);
    }
  };

  utterance.onend = () => {
    if (currentUtterance === utterance) {
      currentId = null;
      currentUtterance = null;
      notifyAll('stopped', null);
    }
  };

  utterance.onerror = (e) => {
    // Ignore 'interrupted' errors from cancel()
    if (e.error === 'interrupted') return;
    if (currentUtterance === utterance) {
      currentId = null;
      currentUtterance = null;
      notifyAll('stopped', null);
    }
  };

  // Small delay to ensure previous cancel() completed
  setTimeout(() => {
    if (currentUtterance === utterance) {
      speechSynthesis.speak(utterance);
      notifyAll('playing', id);
    }
  }, 50);

  return true;
}

// Stop speaking
export function stop() {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
  currentId = null;
  currentUtterance = null;
  notifyAll('stopped', null);
}

// Get current speaking ID
export function getCurrentId() {
  return currentId;
}

// Check if TTS is supported
export function isTTSSupported() {
  return 'speechSynthesis' in window;
}

// Preload voices
export function preloadVoices() {
  if ('speechSynthesis' in window) {
    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => loadVoices();
    }
  }
}
