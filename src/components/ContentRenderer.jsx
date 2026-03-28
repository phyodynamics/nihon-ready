// Simple content renderer that handles markdown-like formatting
// Converts raw AI text into clean, styled HTML sections

export function ContentRenderer({ content, className = '' }) {
  if (!content) return null;

  const html = renderContent(content);

  return (
    <div
      className={`content-rendered ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function renderContent(text) {
  let html = escapeHtml(text);

  // === SECTION HEADERS === (=== text ===)
  html = html.replace(/^={3,}\s*(.+?)\s*={3,}$/gm, '<div class="section-header">$1</div>');

  // ### Headers → section headers
  html = html.replace(/^###\s+(.+)$/gm, '<div class="section-header">$1</div>');
  // ## Headers
  html = html.replace(/^##\s+(.+)$/gm, '<div class="section-header">$1</div>');

  // QUESTION [N]: → question block
  html = html.replace(/^QUESTION\s+(\d+):\s*(.+)$/gm, '<div class="q-header"><span class="q-number">Q$1</span> $2</div>');

  // ANSWER: label
  html = html.replace(/^ANSWER:$/gm, '<div class="answer-label">Answer</div>');

  // Key Vocabulary: label
  html = html.replace(/^Key Vocabulary:$/gm, '<div class="vocab-label">Key Vocabulary</div>');

  // [Japanese] / [Romaji] / [Burmese Translation] section labels
  html = html.replace(/^\[Japanese\]$/gm, '<div class="lang-label lang-jp">Japanese</div>');
  html = html.replace(/^\[Romaji\]$/gm, '<div class="lang-label lang-ro">Romaji</div>');
  html = html.replace(/^\[Burmese Translation\]$/gm, '<div class="lang-label lang-my">Burmese</div>');
  html = html.replace(/^\[Burmese\]$/gm, '<div class="lang-label lang-my">Burmese</div>');

  // Sentence N: label
  html = html.replace(/^Sentence\s+(\d+):$/gm, '<div class="sentence-label">Sentence $1</div>');

  // Japanese: / Romaji: / Burmese: inline labels
  html = html.replace(/^\s+Japanese:\s*(.+)$/gm, '<div class="lang-line"><span class="lang-tag jp">JP</span> $1</div>');
  html = html.replace(/^\s+Romaji:\s*(.+)$/gm, '<div class="lang-line"><span class="lang-tag ro">RO</span> $1</div>');
  html = html.replace(/^\s+Burmese:\s*(.+)$/gm, '<div class="lang-line"><span class="lang-tag my">MY</span> $1</div>');

  // **bold text** → strong
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // *italic* → em (but not inside already processed tags)
  html = html.replace(/(?<!\w)\*([^*\n]+?)\*(?!\w)/g, '<em>$1</em>');

  // Numbered list items: 1. text
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<div class="list-item"><span class="list-num">$1.</span> $2</div>');

  // Bullet points: - text
  html = html.replace(/^-\s+(.+)$/gm, '<div class="bullet-item">$1</div>');

  // Horizontal rules ---
  html = html.replace(/^-{3,}$/gm, '<hr class="content-divider" />');

  // Line breaks
  html = html.replace(/\n/g, '<br />');

  // Clean up excessive <br /> tags
  html = html.replace(/(<br \/>){3,}/g, '<br /><br />');

  return html;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
