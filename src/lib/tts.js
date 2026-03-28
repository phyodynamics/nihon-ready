// Text-to-Speech utility using Web Speech API
// Supports Japanese (ja-JP), English/Romaji (en-US), and Burmese (my-MM)

let currentUtterance = null;
let isSpeaking = false;
let onStateChange = null;

// Language detection
function detectLanguage(text) {
  const cleaned = text.trim();
  
  // Japanese: contains Hiragana, Katakana, or Kanji
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(cleaned)) {
    return 'ja-JP';
  }
  
  // Burmese: contains Myanmar script
  if (/[\u1000-\u109F\uAA60-\uAA7F]/.test(cleaned)) {
    return 'my-MM';
  }
  
  // Default: English (for Romaji)
  return 'en-US';
}

// Get best available voice for language
function getVoice(lang) {
  const voices = speechSynthesis.getVoices();
  
  // Try exact match first
  let voice = voices.find(v => v.lang === lang);
  
  // Try prefix match (e.g., 'ja' for 'ja-JP')
  if (!voice) {
    const prefix = lang.split('-')[0];
    voice = voices.find(v => v.lang.startsWith(prefix));
  }
  
  // For Burmese, fall back to English if no Burmese voice
  if (!voice && lang === 'my-MM') {
    voice = voices.find(v => v.lang.startsWith('en'));
  }
  
  return voice;
}

// Speak text
export function speak(text, options = {}) {
  if (!('speechSynthesis' in window)) {
    console.warn('TTS not supported');
    return false;
  }
  
  // Stop any current speech
  stop();
  
  const lang = options.lang || detectLanguage(text);
  const utterance = new SpeechSynthesisUtterance(text);
  
  utterance.lang = lang;
  utterance.rate = options.rate || (lang === 'ja-JP' ? 0.85 : 0.9);
  utterance.pitch = options.pitch || 1;
  utterance.volume = options.volume || 1;
  
  const voice = getVoice(lang);
  if (voice) {
    utterance.voice = voice;
  }
  
  utterance.onstart = () => {
    isSpeaking = true;
    onStateChange?.('playing');
  };
  
  utterance.onend = () => {
    isSpeaking = false;
    currentUtterance = null;
    onStateChange?.('stopped');
  };
  
  utterance.onerror = () => {
    isSpeaking = false;
    currentUtterance = null;
    onStateChange?.('stopped');
  };
  
  currentUtterance = utterance;
  speechSynthesis.speak(utterance);
  return true;
}

// Stop speaking
export function stop() {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
  isSpeaking = false;
  currentUtterance = null;
  onStateChange?.('stopped');
}

// Check if currently speaking
export function getIsSpeaking() {
  return isSpeaking;
}

// Subscribe to state changes
export function onTTSStateChange(callback) {
  onStateChange = callback;
}

// Check if TTS is supported
export function isTTSSupported() {
  return 'speechSynthesis' in window;
}

// Preload voices (needed on some browsers)
export function preloadVoices() {
  if ('speechSynthesis' in window) {
    speechSynthesis.getVoices();
    // Chrome loads voices async
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
    }
  }
}
