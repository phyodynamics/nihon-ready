import { useState, useEffect, useCallback } from 'react';
import { Volume2, Square } from 'lucide-react';
import { speak, stop, onTTSStateChange, isTTSSupported } from '../lib/tts';

// Compact speak button for inline use next to text blocks
export function SpeakButton({ text, lang, size = 'sm', label }) {
  const [playing, setPlaying] = useState(false);
  const [currentText, setCurrentText] = useState(null);

  useEffect(() => {
    const handler = (state) => {
      if (state === 'stopped') {
        setPlaying(false);
        setCurrentText(null);
      }
    };
    onTTSStateChange(handler);
    return () => onTTSStateChange(null);
  }, []);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    
    if (playing && currentText === text) {
      stop();
      return;
    }
    
    setPlaying(true);
    setCurrentText(text);
    speak(text, { lang });
  }, [text, lang, playing, currentText]);

  if (!isTTSSupported()) return null;

  const isSmall = size === 'sm';
  
  return (
    <button
      onClick={handleClick}
      className={`speak-btn ${playing && currentText === text ? 'speaking' : ''}`}
      title={playing ? 'ရပ်ရန်' : (label || 'ဖတ်ပြရန်')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isSmall ? 4 : 6,
        padding: isSmall ? '4px 8px' : '6px 12px',
        border: '1px solid var(--gray-200)',
        borderRadius: isSmall ? 6 : 8,
        background: playing && currentText === text ? 'var(--black)' : 'var(--white)',
        color: playing && currentText === text ? 'var(--white)' : 'var(--gray-600)',
        cursor: 'pointer',
        fontSize: isSmall ? 11 : 13,
        fontWeight: 500,
        fontFamily: 'inherit',
        transition: 'all 0.2s ease',
        flexShrink: 0,
      }}
    >
      {playing && currentText === text ? (
        <>
          <Square size={isSmall ? 12 : 14} style={{ fill: 'currentColor' }} />
        </>
      ) : (
        <>
          <Volume2 size={isSmall ? 12 : 14} />
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  );
}

// Language-specific speak buttons group
export function SpeakButtonGroup({ japanese, romaji, burmese }) {
  if (!isTTSSupported()) return null;
  
  const hasContent = japanese || romaji || burmese;
  if (!hasContent) return null;

  return (
    <div style={{
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      alignItems: 'center',
    }}>
      {japanese && (
        <SpeakButton text={japanese} lang="ja-JP" label="JP" size="sm" />
      )}
      {romaji && (
        <SpeakButton text={romaji} lang="en-US" label="RO" size="sm" />
      )}
      {burmese && (
        <SpeakButton text={burmese} lang="my-MM" label="MY" size="sm" />
      )}
    </div>
  );
}
