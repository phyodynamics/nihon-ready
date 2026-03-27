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
    // Extract Section 1: Self-Introduction
    const section1Match = text.match(/### Section 1[\s\S]*?(?=### Section 2)/i);
    if (section1Match) {
      sections.selfIntro = section1Match[0]
        .replace(/### Section 1[^\n]*\n/, '')
        .trim();
    }

    // Extract Section 2: Vocabulary
    const section2Match = text.match(/### Section 2[\s\S]*?(?=### Section 3)/i);
    if (section2Match) {
      const vocabText = section2Match[0].replace(/### Section 2[^\n]*\n/, '');
      const vocabLines = vocabText.split('\n').filter(l => l.trim().startsWith('*') || l.trim().startsWith('-'));
      sections.vocabulary = vocabLines.map(line => {
        const cleaned = line.replace(/^[\s*-]+/, '').trim();
        return { raw: cleaned };
      });
    }

    // Extract Section 3: 45 Questions
    const section3Match = text.match(/### Section 3[\s\S]*?(?=### Section 4)/i);
    if (section3Match) {
      const qText = section3Match[0].replace(/### Section 3[^\n]*\n/, '');
      const qLines = qText.split('\n').filter(l => /^\d+\./.test(l.trim()));
      sections.questions = qLines.map(line => {
        const cleaned = line.replace(/^\d+\.\s*/, '').trim();
        const parts = cleaned.split(/\s*-\s*/);
        return {
          japanese: parts[0] || cleaned,
          burmese: parts[1] || ''
        };
      });
    }

    // Extract Section 4: 4 Answered Questions
    const section4Match = text.match(/### Section 4[\s\S]*/i);
    if (section4Match) {
      const ansText = section4Match[0].replace(/### Section 4[^\n]*\n/, '');
      // Split by question markers
      const questionBlocks = ansText.split(/(?=[-*]\s*(?:The\s+)?Question|####|###\s*(?:Question|မေးခွန်း))/i).filter(b => b.trim());
      
      sections.answeredQuestions = questionBlocks.map(block => {
        return { raw: block.trim() };
      }).filter(q => q.raw.length > 20);
    }
  } catch (e) {
    console.error('Parse error:', e);
  }

  return sections;
}
