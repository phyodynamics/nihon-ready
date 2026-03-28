// Content renderer that parses AI output into styled React elements
// Includes TTS speak buttons for language blocks

import { useState, useMemo, memo, Fragment } from 'react';
import { SpeakButton } from './SpeakButton';
import { isTTSSupported, isLangSupported } from '../lib/tts';

export const ContentRenderer = memo(function ContentRenderer({ content, className = '' }) {
  if (!content) return null;

  const elements = useMemo(() => parseContent(content), [content]);

  return (
    <div className={`content-rendered ${className}`}>
      {elements}
    </div>
  );
});

function parseContent(text) {
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      i++;
      continue;
    }

    // === SECTION HEADER ===
    if (/^={3,}\s*(.+?)\s*={3,}$/.test(trimmed)) {
      const match = trimmed.match(/^={3,}\s*(.+?)\s*={3,}$/);
      elements.push(<div key={key++} className="section-header">{match[1]}</div>);
      i++;
      continue;
    }

    // ### or ## Headers
    if (/^#{2,3}\s+(.+)$/.test(trimmed)) {
      const match = trimmed.match(/^#{2,3}\s+(.+)$/);
      elements.push(<div key={key++} className="section-header">{match[1]}</div>);
      i++;
      continue;
    }

    // QUESTION [N]: text
    if (/^QUESTION\s+\[?(\d+)\]?:\s*(.+)$/i.test(trimmed)) {
      const match = trimmed.match(/^QUESTION\s+\[?(\d+)\]?:\s*(.+)$/i);
      elements.push(
        <div key={key++} className="q-header">
          <span className="q-number">Q{match[1]}</span> {match[2]}
        </div>
      );
      i++;
      continue;
    }

    // ANSWER: label
    if (/^ANSWER:$/i.test(trimmed)) {
      elements.push(<div key={key++} className="answer-label">Answer</div>);
      i++;
      continue;
    }

    // Key Vocabulary:
    if (/^Key Vocabulary:$/i.test(trimmed)) {
      elements.push(<div key={key++} className="vocab-label">Key Vocabulary</div>);
      i++;
      continue;
    }

    // [Japanese] label — collect the block below it for TTS
    if (/^\[Japanese\]$/i.test(trimmed)) {
      const { block, endIndex } = collectBlock(lines, i + 1);
      elements.push(
        <LangBlock key={key++} label="Japanese" langClass="lang-jp" lang="ja-JP" text={block} />
      );
      i = endIndex;
      continue;
    }

    // [Romaji] label — no TTS
    if (/^\[Romaji\]$/i.test(trimmed)) {
      const { block, endIndex } = collectBlock(lines, i + 1);
      elements.push(
        <LangBlock key={key++} label="Romaji" langClass="lang-ro" lang="en-US" text={block} noTTS />
      );
      i = endIndex;
      continue;
    }

    // [Burmese Translation] or [Burmese] label — no TTS
    if (/^\[Burmese( Translation)?\]$/i.test(trimmed)) {
      const { block, endIndex } = collectBlock(lines, i + 1);
      elements.push(
        <LangBlock key={key++} label="Burmese" langClass="lang-my" lang="my-MM" text={block} noTTS />
      );
      i = endIndex;
      continue;
    }

    // Sentence N: label
    if (/^Sentence\s+(\d+):$/i.test(trimmed)) {
      const match = trimmed.match(/^Sentence\s+(\d+):$/i);
      elements.push(<div key={key++} className="sentence-label">Sentence {match[1]}</div>);
      i++;
      continue;
    }

    // Japanese: / Romaji: / Burmese: inline labels with TTS
    if (/^\s+Japanese:\s*(.+)$/.test(line)) {
      const match = line.match(/^\s+Japanese:\s*(.+)$/);
      elements.push(
        <LangLine key={key++} tag="JP" tagClass="jp" lang="ja-JP" text={match[1]} />
      );
      i++;
      continue;
    }
    if (/^\s+Romaji:\s*(.+)$/.test(line)) {
      const match = line.match(/^\s+Romaji:\s*(.+)$/);
      elements.push(
        <LangLine key={key++} tag="RO" tagClass="ro" lang="en-US" text={match[1]} noTTS />
      );
      i++;
      continue;
    }
    if (/^\s+Burmese:\s*(.+)$/.test(line)) {
      const match = line.match(/^\s+Burmese:\s*(.+)$/);
      elements.push(
        <LangLine key={key++} tag="MY" tagClass="my" lang="my-MM" text={match[1]} noTTS />
      );
      i++;
      continue;
    }

    // --- Horizontal rule
    if (/^-{3,}$/.test(trimmed)) {
      elements.push(<hr key={key++} className="content-divider" />);
      i++;
      continue;
    }

    // Numbered list: 1. text
    if (/^(\d+)\.\s+(.+)$/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s+(.+)$/);
      elements.push(
        <div key={key++} className="list-item">
          <span className="list-num">{match[1]}.</span> {formatInline(match[2])}
        </div>
      );
      i++;
      continue;
    }

    // Bullet: - text
    if (/^-\s+(.+)$/.test(trimmed)) {
      const match = trimmed.match(/^-\s+(.+)$/);
      elements.push(
        <div key={key++} className="bullet-item">{formatInline(match[1])}</div>
      );
      i++;
      continue;
    }

    // Default: regular text line
    elements.push(
      <div key={key++} style={{ marginBottom: 2 }}>{formatInline(trimmed)}</div>
    );
    i++;
  }

  return elements;
}

// Collect text block until next label or section marker
function collectBlock(lines, startIndex) {
  let block = '';
  let i = startIndex;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    // Stop at section markers, labels, etc.
    if (
      /^={3,}/.test(trimmed) ||
      /^\[.+\]$/.test(trimmed) ||
      /^QUESTION/i.test(trimmed) ||
      /^ANSWER:/i.test(trimmed) ||
      /^Key Vocabulary:/i.test(trimmed) ||
      /^Sentence\s+\d+:/i.test(trimmed) ||
      /^#{2,3}\s+/.test(trimmed)
    ) {
      break;
    }
    if (trimmed) {
      block += (block ? '\n' : '') + trimmed;
    }
    i++;
  }
  return { block: block.trim(), endIndex: i };
}

// Format inline text (bold, italic)
function formatInline(text) {
  if (!text) return text;
  
  // Split by **bold** and *italic* patterns
  const parts = [];
  let remaining = text;
  let partKey = 0;
  
  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch) {
      const idx = remaining.indexOf(boldMatch[0]);
      if (idx > 0) parts.push(<Fragment key={partKey++}>{remaining.slice(0, idx)}</Fragment>);
      parts.push(<strong key={partKey++}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(idx + boldMatch[0].length);
      continue;
    }
    
    // No more patterns
    parts.push(<Fragment key={partKey++}>{remaining}</Fragment>);
    break;
  }
  
  return parts.length === 1 ? parts[0] : parts;
}

// Language block with label + speak button
function LangBlock({ label, langClass, lang, text, noTTS }) {
  if (!text) return null;
  const showSpeak = !noTTS && isTTSSupported();
  
  return (
    <div className="lang-block" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span className={`lang-label ${langClass}`}>{label}</span>
        {showSpeak && <SpeakButton text={text} lang={lang} size="sm" />}
      </div>
      <div style={{ lineHeight: 1.8, paddingLeft: 4 }}>{text}</div>
    </div>
  );
}

// Inline language line with tag + speak button
function LangLine({ tag, tagClass, lang, text, noTTS }) {
  const showSpeak = !noTTS && isTTSSupported();
  return (
    <div className="lang-line">
      <span className={`lang-tag ${tagClass}`}>{tag}</span>
      <span style={{ flex: 1 }}>{text}</span>
      {showSpeak && <SpeakButton text={text} lang={lang} size="sm" />}
    </div>
  );
}
