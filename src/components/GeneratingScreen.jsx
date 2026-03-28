import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { callGemini, buildFirstPrompt } from '../lib/gemini';
import { saveOnboardingData, saveGeneratedContent, updateUser } from '../lib/database';

const LOADING_MESSAGES = [
  'သင့်အချက်အလက်များကို ပိုင်းခြားနေပါသည်...',
  'ဂျပန် Interview မေးခွန်းများ ဖန်တီးနေပါသည်...',
  'မိတ်ဆက်စာ ရေးသားနေပါသည်...',
  'Vocabulary များ ကောက်နုတ်နေပါသည်...',
  'အဖြေများ ပြင်ဆင်နေပါသည်...',
  'နောက်ဆုံးအဆင့် စစ်ဆေးနေပါသည်...',
];

export function GeneratingScreen() {
  const { state, dispatch, showToast } = useApp();
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 2, 90));
    }, 500);
    return () => clearInterval(progressInterval);
  }, []);

  useEffect(() => {
    generateContent();
  }, []);

  async function generateContent() {
    try {
      // Save onboarding data first
      if (state.user?.id) {
        await saveOnboardingData(state.user.id, state.onboardingData);
        await updateUser(state.user.id, {
          onboarding_count: (state.dbUser?.onboarding_count || 0) + 1
        });
      }

      // Build prompt and call Gemini
      const prompt = buildFirstPrompt(state.onboardingData);
      const result = await callGemini(prompt);

      // Parse the result
      const parsedContent = parseFirstResult(result);

      // Save to state
      dispatch({
        type: 'SET_GENERATED_CONTENT',
        payload: { type: 'first', data: parsedContent }
      });

      // Save to database
      if (state.user?.id) {
        await saveGeneratedContent(state.user.id, 'first', parsedContent);
      }

      setProgress(100);
      setTimeout(() => {
        dispatch({ type: 'SET_SCREEN', payload: 'main' });
      }, 500);
    } catch (error) {
      console.error('Generation error:', error);
      showToast('တစ်ခုခု မှားယွင်းနေပါသည်။ ထပ်ကြိုးစားပါ။', 'error');
      setTimeout(() => {
        dispatch({ type: 'SET_SCREEN', payload: 'onboarding' });
      }, 2000);
    }
  }

  return (
    <div className="loading-container">
      <img
        src="/assets/logo.png"
        alt="Nihon Ready"
        style={{ width: 100, height: 'auto', animation: 'float 3s ease-in-out infinite' }}
      />
      <div className="loading-spinner"></div>
      <div className="loading-text" key={messageIndex} style={{ animation: 'fadeIn 0.5s ease' }}>
        {LOADING_MESSAGES[messageIndex]}
      </div>
      <div style={{ width: 200 }}>
        <div className="progress-bar" style={{ height: 6 }}>
          <div
            className="progress-fill"
            style={{ width: `${progress}%`, transition: 'width 0.5s ease' }}
          ></div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: 'var(--gray-400)' }}>
          {progress}%
        </div>
      </div>
    </div>
  );
}

function parseFirstResult(text) {
  const sections = {
    selfIntro: '',
    vocabulary: [],
    questions: [],
    answeredQuestions: [],
    raw: text
  };

  try {
    // Match both === SECTION X === and ### Section X formats
    const sectionPattern = (num, nextNum) => {
      const patterns = [
        // === SECTION X: ... === format (from prompt)
        new RegExp(`===\\s*SECTION\\s*${num}[^=]*===([\\s\\S]*?)(?====\\s*SECTION\\s*${nextNum}|$)`, 'i'),
        // ### Section X format (markdown fallback)
        new RegExp(`###\\s*Section\\s*${num}[^\\n]*\\n([\\s\\S]*?)(?=###\\s*Section\\s*${nextNum}|$)`, 'i'),
        // SECTION X: format (plain text)
        new RegExp(`SECTION\\s*${num}[:\\s][^\\n]*\\n([\\s\\S]*?)(?=SECTION\\s*${nextNum}|$)`, 'i'),
      ];
      for (const pat of patterns) {
        const match = text.match(pat);
        if (match && match[1]?.trim()) return match[1].trim();
      }
      return null;
    };

    // Extract Section 1: Self-Introduction
    const section1 = sectionPattern(1, 2);
    if (section1) {
      sections.selfIntro = section1;
    }

    // Extract Section 2: Vocabulary
    const section2 = sectionPattern(2, 3);
    if (section2) {
      const vocabLines = section2.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*') || /^\d+\./.test(l.trim()));
      sections.vocabulary = vocabLines.map(line => {
        const cleaned = line.replace(/^[\s*\-\d.]+/, '').trim();
        return { raw: cleaned };
      }).filter(v => v.raw.length > 0);
    }

    // Extract Section 3: 45 Questions
    const section3 = sectionPattern(3, 4);
    if (section3) {
      const qLines = section3.split('\n').filter(l => /^\d+\./.test(l.trim()));
      sections.questions = qLines.map(line => {
        const cleaned = line.replace(/^\d+\.\s*/, '').trim();
        // Split by " / " to separate Japanese and Burmese
        const slashParts = cleaned.split(/\s*\/\s*/);
        if (slashParts.length >= 2) {
          return {
            japanese: slashParts[0].trim(),
            burmese: slashParts.slice(1).join(' / ').trim()
          };
        }
        return {
          japanese: cleaned,
          burmese: ''
        };
      }).filter(q => q.japanese.length > 0);
    }

    // Extract Section 4: 4 Answered Questions
    const section4 = sectionPattern(4, 999);
    if (section4) {
      // Split by QUESTION markers
      const questionBlocks = section4.split(/(?=QUESTION\s*\[?\d)/i).filter(b => b.trim());

      sections.answeredQuestions = questionBlocks.map(block => {
        return { raw: block.trim() };
      }).filter(q => q.raw.length > 20);
    }
  } catch (e) {
    console.error('Parse error:', e);
  }

  return sections;
}
