import { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, Square } from 'lucide-react';
import { speak, stop, subscribeTTS, isTTSSupported, getCurrentId } from '../lib/tts';

// Compact speak button for inline use next to text blocks
export function SpeakButton({ text, lang, size = 'sm', label }) {
  const [playing, setPlaying] = useState(false);
  const idRef = useRef(`${lang}:${text.slice(0, 50)}`);

  useEffect(() => {
    idRef.current = `${lang}:${text.slice(0, 50)}`;
  }, [text, lang]);

  // Subscribe to global TTS state changes
  useEffect(() => {
    const unsubscribe = subscribeTTS((state, activeId) => {
      setPlaying(state === 'playing' && activeId === idRef.current);
    });
    // Sync with current state on mount
    setPlaying(getCurrentId() === idRef.current);
    return unsubscribe;
  }, []);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (playing) {
      stop();
    } else {
      speak(text, { lang });
    }
  }, [text, lang, playing]);

  if (!isTTSSupported()) return null;

  const isSmall = size === 'sm';
  
  return (
    <button
      onClick={handleClick}
      className={`speak-btn ${playing ? 'speaking' : ''}`}
      title={playing ? 'ရပ်ရန်' : (label || 'ဖတ်ပြရန်')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isSmall ? 4 : 6,
        padding: isSmall ? '4px 8px' : '6px 12px',
        border: '1px solid var(--gray-200)',
        borderRadius: isSmall ? 6 : 8,
        background: playing ? 'var(--black)' : 'var(--white)',
        color: playing ? 'var(--white)' : 'var(--gray-600)',
        cursor: 'pointer',
        fontSize: isSmall ? 11 : 13,
        fontWeight: 500,
        fontFamily: 'inherit',
        transition: 'all 0.2s ease',
        flexShrink: 0,
      }}
    >
      {playing ? (
        <Square size={isSmall ? 10 : 12} style={{ fill: 'currentColor' }} />
      ) : (
        <>
          <Volume2 size={isSmall ? 12 : 14} />
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  );
}
