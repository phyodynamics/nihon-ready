import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { callGemini, buildSecondPrompt, buildThirdPrompt, buildMentorPrompt } from '../lib/gemini';
import { saveGeneratedContent, getGeneratedContent, getAllGeneratedContent } from '../lib/database';
import { sendTelegramFile } from '../lib/telegram';
import { ContentRenderer } from './ContentRenderer';
import {
  BookOpen, MessageSquare, BriefcaseBusiness, Brain,
  Lock, ChevronDown, ChevronUp, Copy, Check,
  Download, RefreshCw, CreditCard, Settings, User, RotateCcw
} from 'lucide-react';

function UserProfileCard({ user, isPaid }) {
  const initials = `${(user?.firstName || '')[0] || ''}${(user?.lastName || '')[0] || ''}`.toUpperCase() || 'U';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '16px 20px',
      background: 'var(--gray-50)',
      borderBottom: '1px solid var(--gray-100)',
    }}>
      {/* Avatar */}
      {user?.photoUrl ? (
        <img
          src={user.photoUrl}
          alt={user.firstName}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid var(--white)',
            boxShadow: 'var(--shadow-sm)'
          }}
        />
      ) : (
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'var(--black)',
          color: 'var(--white)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          fontWeight: 700,
          flexShrink: 0,
          border: '2px solid var(--white)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {initials}
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700,
          fontSize: 15,
          color: 'var(--black)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          {user?.firstName} {user?.lastName || ''}
          {isPaid && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: 12,
              background: '#e8f5e9',
              color: '#2e7d32',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.3
            }}>
              PRO
            </span>
          )}
        </div>
        <div style={{
          fontSize: 13,
          color: 'var(--gray-500)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {user?.username ? `@${user.username}` : `ID: ${user?.id}`}
        </div>
      </div>
    </div>
  );
}

export function MainScreen() {
  const { state, dispatch, showToast } = useApp();
  const [expandedAnswer, setExpandedAnswer] = useState(null);
  const [copied, setCopied] = useState(false);
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [generatingThird, setGeneratingThird] = useState(false);
  const [generatingMentor, setGeneratingMentor] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [batchProgress, setBatchProgress] = useState('');
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  const content = state.generatedContent.first;
  const isPaid = state.isPaid;

  useEffect(() => {
    // Load saved content from database
    loadSavedContent();
  }, []);

  async function loadSavedContent() {
    if (!state.user?.id) return;
    try {
      const allContent = await getAllGeneratedContent(state.user.id);
      allContent.forEach(item => {
        if (item.content_type === 'first') {
          dispatch({ type: 'SET_GENERATED_CONTENT', payload: { type: 'first', data: item.content } });
        } else if (item.content_type.startsWith('second_batch_')) {
          const batchNum = parseInt(item.content_type.split('_')[2]);
          dispatch({ type: 'SET_SECOND_BATCH', payload: { batchNumber: batchNum, data: item.content } });
        } else if (item.content_type === 'third') {
          dispatch({ type: 'SET_GENERATED_CONTENT', payload: { type: 'third', data: item.content } });
        } else if (item.content_type === 'mentor') {
          dispatch({ type: 'SET_GENERATED_CONTENT', payload: { type: 'mentor', data: item.content } });
        }
      });
    } catch (e) {
      console.error('Load content error:', e);
    }
  }

  async function generateBatchAnswers() {
    if (!isPaid || !content?.questions) return;
    setGeneratingBatch(true);

    try {
      // 45 questions total, first 4 already answered in Section 4
      // Remaining 41 questions need batch answers
      const remainingQuestions = content.questions.slice(4);
      const BATCH_SIZE = 10;
      const batches = [];
      for (let i = 0; i < remainingQuestions.length; i += BATCH_SIZE) {
        batches.push(remainingQuestions.slice(i, i + BATCH_SIZE));
      }

      for (let i = 0; i < batches.length; i++) {
        // Skip already generated batches
        if (state.generatedContent.second[i + 1]) continue;

        setBatchProgress(`Batch ${i + 1}/${batches.length} ဖန်တီးနေပါသည်...`);
        setCurrentBatch(i + 1);

        // Build question texts with both Japanese and Burmese for context
        const questionsText = batches[i].map(q => {
          if (q.burmese) return `${q.japanese} / ${q.burmese}`;
          return q.japanese || '';
        }).filter(Boolean);

        const prompt = buildSecondPrompt(state.onboardingData, questionsText, i + 1);
        const result = await callGemini(prompt);

        dispatch({ type: 'SET_SECOND_BATCH', payload: { batchNumber: i + 1, data: result } });

        if (state.user?.id) {
          await saveGeneratedContent(state.user.id, `second_batch_${i + 1}`, result);
        }

        // Small delay between batches
        if (i < batches.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      showToast('မေးခွန်းအဖြေအားလုံး ပြီးပြီ');
    } catch (error) {
      console.error('Batch generation error:', error);
      showToast('တစ်ခုခု မှားယွင်းနေပါသည်', 'error');
    } finally {
      setGeneratingBatch(false);
      setBatchProgress('');
    }
  }

  async function generateThirdContent() {
    if (!isPaid) return;
    setGeneratingThird(true);

    try {
      const prompt = buildThirdPrompt(state.onboardingData);
      const result = await callGemini(prompt);

      dispatch({ type: 'SET_GENERATED_CONTENT', payload: { type: 'third', data: result } });

      if (state.user?.id) {
        await saveGeneratedContent(state.user.id, 'third', result);
      }

      showToast('လုပ်ငန်းခွင်အတွေ့အကြုံ ပြီးပါပြီ');
    } catch (error) {
      console.error('Third generation error:', error);
      showToast('တစ်ခုခု မှားယွင်းနေပါသည်', 'error');
    } finally {
      setGeneratingThird(false);
    }
  }

  async function generateMentorPrompt() {
    if (!isPaid) return;
    setGeneratingMentor(true);

    try {
      const generatedContent = {
        workExperience: state.generatedContent.third ? 'Generated from third.txt' : '',
        manners: 'Ho-Ren-So, Aisatsu, Punctuality',
        mindset: 'Stoic principles for resilience',
        interviewSummary: `Prepared ${content?.questions?.length || 45} interview questions`
      };

      const prompt = buildMentorPrompt(state.onboardingData, generatedContent);
      const result = await callGemini(prompt);

      dispatch({ type: 'SET_GENERATED_CONTENT', payload: { type: 'mentor', data: result } });

      if (state.user?.id) {
        await saveGeneratedContent(state.user.id, 'mentor', result);
      }

      showToast('AI Master Prompt ပြီးပါပြီ');
    } catch (error) {
      console.error('Mentor generation error:', error);
      showToast('တစ်ခုခု မှားယွင်းနေပါသည်', 'error');
    } finally {
      setGeneratingMentor(false);
    }
  }

  async function handleDownload() {
    let allContent = '';
    allContent += '=== NIHON READY - Interview Preparation Package ===\n\n';
    allContent += `Name: ${state.onboardingData.name}\n`;
    allContent += `Job: ${state.onboardingData.targetJob}\n`;
    allContent += `Japanese Level: ${state.onboardingData.japaneseLevel}\n\n`;

    if (content?.raw) {
      allContent += '=== Self-Introduction & Interview Questions ===\n\n';
      allContent += content.raw + '\n\n';
    }

    // Add batch answers
    const secondContent = state.generatedContent.second;
    if (Object.keys(secondContent).length > 0) {
      allContent += '=== Detailed Interview Answers ===\n\n';
      Object.keys(secondContent).sort().forEach(key => {
        allContent += secondContent[key] + '\n\n';
      });
    }

    if (state.generatedContent.third) {
      allContent += '=== Work Experience & Manners ===\n\n';
      allContent += state.generatedContent.third + '\n\n';
    }

    if (state.generatedContent.mentor) {
      allContent += '=== AI Master Prompt ===\n\n';
      allContent += state.generatedContent.mentor + '\n\n';
    }

    // Try to send via Telegram bot
    try {
      if (state.user?.id) {
        await sendTelegramFile(
          state.user.id,
          allContent,
          `NihonReady_${state.onboardingData.name || 'user'}.txt`
        );
        showToast('Telegram သို့ ဖိုင်ပို့ပြီးပါပြီ');
      }
    } catch (e) {
      console.error('Send file error:', e);
      // Fallback: download locally
      const blob = new Blob([allContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NihonReady_${state.onboardingData.name || 'user'}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('ဖိုင် ဒေါင်းလုတ် ပြီးပါပြီ');
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      showToast('Copy ကူးပြီးပါပြီ');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const tabs = [
    { id: 'intro', label: 'မိတ်ဆက်', icon: <BookOpen size={16} /> },
    { id: 'questions', label: 'မေးခွန်းများ', icon: <MessageSquare size={16} /> },
    { id: 'experiences', label: 'အတွေ့အကြုံ', icon: <BriefcaseBusiness size={16} /> },
    { id: 'mentor', label: 'AI Mentor', icon: <Brain size={16} /> },
  ];

  if (!content) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Content ကို ရှာနေပါသည်...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--gray-100)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        background: 'var(--white)',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/assets/logo.png" alt="Logo" style={{ width: 28, height: 'auto' }} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Nihon Ready</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-outline"
            style={{ padding: '8px 12px', fontSize: 13 }}
            onClick={() => setShowRestartConfirm(true)}
            title="Onboarding ပြန်လုပ်ရန်"
          >
            <RotateCcw size={16} />
          </button>
          {isPaid && (
            <button className="btn btn-outline" style={{ padding: '8px 12px', fontSize: 13 }} onClick={handleDownload}>
              <Download size={16} />
            </button>
          )}
          <button
            className="btn btn-outline"
            style={{ padding: '8px 12px', fontSize: 13 }}
            onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'payment' })}
          >
            <CreditCard size={16} />
          </button>
        </div>
      </div>

      {/* User Profile */}
      <UserProfileCard user={state.user} isPaid={isPaid} />

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${state.activeTab === tab.id ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab.id })}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {tab.icon}
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 20, paddingBottom: 100 }}>
        {state.activeTab === 'intro' && (
          <IntroTab content={content} copyToClipboard={copyToClipboard} copied={copied} />
        )}
        {state.activeTab === 'questions' && (
          <QuestionsTab
            content={content}
            secondContent={state.generatedContent.second}
            isPaid={isPaid}
            generatingBatch={generatingBatch}
            batchProgress={batchProgress}
            onGenerate={generateBatchAnswers}
            onPayment={() => dispatch({ type: 'SET_SCREEN', payload: 'payment' })}
            expandedAnswer={expandedAnswer}
            setExpandedAnswer={setExpandedAnswer}
          />
        )}
        {state.activeTab === 'experiences' && (
          <ExperiencesTab
            content={state.generatedContent.third}
            isPaid={isPaid}
            generating={generatingThird}
            onGenerate={generateThirdContent}
            onPayment={() => dispatch({ type: 'SET_SCREEN', payload: 'payment' })}
          />
        )}
        {state.activeTab === 'mentor' && (
          <MentorTab
            content={state.generatedContent.mentor}
            isPaid={isPaid}
            generating={generatingMentor}
            onGenerate={generateMentorPrompt}
            onPayment={() => dispatch({ type: 'SET_SCREEN', payload: 'payment' })}
            copyToClipboard={copyToClipboard}
            copied={copied}
          />
        )}
      </div>

      {/* Bottom Nav */}
      <div className="bottom-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`nav-item ${state.activeTab === tab.id ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab.id })}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Restart Onboarding Confirmation */}
      {showRestartConfirm && (() => {
        const onboardingCount = state.dbUser?.onboarding_count || 0;
        // Unpaid users can always redo onboarding (first content is free)
        // Paid users get 2 free restarts, then need to pay 15,000 each
        const needsExtraPayment = isPaid && onboardingCount >= 2;
        const canFreeRestart = !needsExtraPayment;
        const freeRemaining = isPaid ? Math.max(0, 2 - onboardingCount) : null;

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: 20,
          }}>
            <div style={{
              background: 'var(--white)',
              borderRadius: 16,
              padding: 24,
              maxWidth: 340,
              width: '100%',
              boxShadow: 'var(--shadow-lg)',
            }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <RotateCcw size={36} style={{ color: 'var(--gray-400)', marginBottom: 12 }} />
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                  အချက်အလက်များကို ပြန်လည်ရေးသွင်းမလား?
                </h3>
                {needsExtraPayment ? (
                  <p style={{ fontSize: 14, color: 'var(--gray-500)', lineHeight: 1.6 }}>
                    ခွင့်ပြုထားသော အခမဲ့ ၂ ကြိမ် ပြည့်သွားပါပြီ။ ထပ်မံပြုလုပ်လိုပါက
                    <br />
                    <span style={{ fontWeight: 700, color: 'var(--black)', fontSize: 16 }}>
                      15,000 MMK
                    </span>
                    <br />
                    ထပ်ပေးရပါမည်။
                  </p>
                ) : (
                  <p style={{ fontSize: 14, color: 'var(--gray-500)', lineHeight: 1.6 }}>
                    အချက်အလက် အသစ်များကို အသုံးပြု၍ Interview Content အသစ်များကို ထပ်မံဖန်တီးနိုင်ပါသည်။
                    {freeRemaining !== null && (
                      <>
                        <br />
                        <span style={{ fontWeight: 600, color: 'var(--black)' }}>
                          သင့်အနေဖြင့် အခမဲ့ {freeRemaining} ကြိမ် ထပ်မံ ပြုလုပ်ခွင့် ကျန်ရှိပါသေးသည်။
                        </span>
                      </>
                    )}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowRestartConfirm(false)}
                >
                  မလုပ်တော့ပါ
                </button>
                {canFreeRestart ? (
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setShowRestartConfirm(false);
                      dispatch({ type: 'RESET_ONBOARDING' });
                      dispatch({ type: 'SET_SCREEN', payload: 'onboarding' });
                    }}
                  >
                    <RotateCcw size={16} />
                    ပြန်လုပ်မည်
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setShowRestartConfirm(false);
                      dispatch({ type: 'SET_SCREEN', payload: 'payment' });
                    }}
                  >
                    <CreditCard size={16} />
                    Payment ပေးချေမည်
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ===== SUB-COMPONENTS =====

function IntroTab({ content, copyToClipboard, copied }) {
  return (
    <div className="fade-in">
      {/* Self Introduction */}
      <div className="content-section">
        <div className="content-section-title">
          <BookOpen size={20} />
          မိမိကိုယ်ကို မိတ်ဆက်ခြင်း (自己紹介)
        </div>
        <div className="card card-elevated" style={{ position: 'relative' }}>
          <button
            className="copy-btn"
            style={{ position: 'absolute', top: 12, right: 12 }}
            onClick={() => copyToClipboard(content.selfIntro)}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <ContentRenderer content={content.selfIntro || content.raw} />
        </div>
      </div>

      {/* Vocabulary */}
      <div className="content-section">
        <div className="content-section-title">
          <MessageSquare size={20} />
          Vocabulary
        </div>
        {content.vocabulary?.map((vocab, i) => (
          <div key={i} className="vocab-item fade-in-up" style={{ animationDelay: `${i * 0.03}s`, animationFillMode: 'both' }}>
            <div className="vocab-japanese">{vocab.raw}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionsTab({ content, secondContent, isPaid, generatingBatch, batchProgress, onGenerate, onPayment, expandedAnswer, setExpandedAnswer }) {
  // Calculate expected batches: 41 remaining questions / 10 per batch = 5 batches
  const remainingCount = Math.max(0, (content.questions?.length || 45) - 4);
  const expectedBatches = Math.ceil(remainingCount / 10);
  const allAnswered = Object.keys(secondContent).length >= expectedBatches;

  return (
    <div className="fade-in">
      {/* Answered Questions (first 4) - Always visible */}
      <div className="content-section">
        <div className="content-section-title">
          <Check size={20} />
          ဖြေပြီးသား မေးခွန်းများ
        </div>
        {content.answeredQuestions?.map((q, i) => (
          <div key={i} className="accordion-item fade-in-up" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }}>
            <button
              className={`accordion-header ${expandedAnswer === `first-${i}` ? 'open' : ''}`}
              onClick={() => setExpandedAnswer(expandedAnswer === `first-${i}` ? null : `first-${i}`)}
            >
              <span>မေးခွန်း {i + 1}</span>
              <ChevronDown size={18} />
            </button>
            <div className={`accordion-body ${expandedAnswer === `first-${i}` ? 'open' : ''}`}>
              <div className="accordion-content">
                <ContentRenderer content={q.raw} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 45 Questions List */}
      <div className="content-section">
        <div className="content-section-title">
          <MessageSquare size={20} />
          Interview မေးခွန်း ({content.questions?.length || 45}) ခု
        </div>

        {/* First 4 questions - visible */}
        {content.questions?.slice(0, 4).map((q, i) => (
          <div key={i} className="question-item fade-in-up" style={{ animationDelay: `${i * 0.03}s`, animationFillMode: 'both' }}>
            <div className="question-number">Q{i + 1}</div>
            <div className="question-text">{q.japanese}</div>
            {q.burmese && <div className="question-translation">{q.burmese}</div>}
          </div>
        ))}

        {/* Paywall for remaining questions */}
        {!isPaid ? (
          <div style={{ position: 'relative', marginTop: 16 }}>
            <div className="lock-overlay" style={{ maxHeight: 200 }}>
              {content.questions?.slice(4, 8).map((q, i) => (
                <div key={i} className="question-item" style={{ opacity: 0.3 }}>
                  <div className="question-number">Q{i + 5}</div>
                  <div className="question-text">{q.japanese}</div>
                </div>
              ))}
            </div>
            <div className="lock-content">
              <div className="lock-icon">
                <Lock />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                ကျန်ရှိသော မေးခွန်းများအားလုံးကို ရယူရန်
              </p>
              <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
                မေးခွန်း ၄၅ ခုတိတိ၊ အလုပ်အတွေ့အကြုံများ၊ လိုက်နာရမည့် Manners များနှင့် AI Mentor Prompt များ
              </p>
              <button className="btn btn-primary btn-full" onClick={onPayment}>
                <Lock size={16} />
                Payment ပေးချေ၍ ရယူပါ
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Show remaining questions */}
            {content.questions?.slice(4).map((q, i) => (
              <div key={i + 4} className="question-item">
                <div className="question-number">Q{i + 5}</div>
                <div className="question-text">{q.japanese}</div>
                {q.burmese && <div className="question-translation">{q.burmese}</div>}
              </div>
            ))}

            {/* Generate batch answers button */}
            {!allAnswered && (
              <div style={{ marginTop: 20 }}>
                <button
                  className="btn btn-accent btn-full btn-lg"
                  onClick={onGenerate}
                  disabled={generatingBatch}
                >
                  {generatingBatch ? (
                    <>
                      <div className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
                      {batchProgress}
                    </>
                  ) : (
                    <>
                      <RefreshCw size={18} />
                      မေးခွန်းနှင့် အဖြေများကို ထပ်မံဖန်တီးရန်
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Show batch answers */}
            {Object.keys(secondContent).sort().map(batchKey => (
              <div key={batchKey} className="content-section" style={{ marginTop: 20 }}>
                <div className="content-section-title">
                  <Check size={20} />
                  Batch {batchKey} အဖြေများ
                </div>
                <div className="card">
                  <ContentRenderer content={secondContent[batchKey]} />
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function ExperiencesTab({ content, isPaid, generating, onGenerate, onPayment }) {
  if (!isPaid) {
    return (
      <div className="fade-in">
        <div style={{ position: 'relative', marginTop: 16 }}>
          <div className="lock-overlay" style={{ maxHeight: 300 }}>
            <div className="card" style={{ opacity: 0.15 }}>
              <h3 style={{ marginBottom: 12 }}>လုပ်ငန်းခွင် အတွေ့အကြုံ</h3>
              <p>ဂျပန်လုပ်ငန်းခွင်တွင် ကြုံတွေ့ရမည့် အခက်အခဲများ...</p>
              <p>Ho-Ren-So (報連相) - Report, Contact, Consult...</p>
              <p>Aisatsu (挨拶) - Greeting etiquette...</p>
            </div>
          </div>
          <div className="lock-content">
            <div className="lock-icon"><Lock /></div>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>အပြည့်အစုံကို ရယူရန်</p>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
              အလုပ်အတွေ့အကြုံများ၊ စိတ်နေစိတ်ထား နှင့် မဖြစ်မနေသိထားရမည့် Manners များ
            </p>
            <button className="btn btn-primary btn-full" onClick={onPayment}>
              <Lock size={16} />
              Payment ပေးချေ၍ ရယူပါ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="fade-in text-center" style={{ padding: '40px 0' }}>
        <BriefcaseBusiness size={48} style={{ color: 'var(--gray-300)', marginBottom: 16 }} />
        <h3 style={{ marginBottom: 8, fontSize: 18, fontWeight: 600 }}>လုပ်ငန်းခွင် အတွေ့အကြုံ</h3>
        <p style={{ fontSize: 14, color: 'var(--gray-500)', marginBottom: 24 }}>
          လုပ်ငန်းခွင် အတွေ့အကြုံ၊ Mindset နှင့် Manners များ ဖန်တီးရန်
        </p>
        <button
          className="btn btn-accent btn-lg"
          onClick={onGenerate}
          disabled={generating}
        >
          {generating ? (
            <>
              <div className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
              ဖန်တီးနေပါသည်...
            </>
          ) : (
            <>
              <RefreshCw size={18} />
              ဖန်တီးရန်
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="card">
        <ContentRenderer content={content} />
      </div>
    </div>
  );
}

function MentorTab({ content, isPaid, generating, onGenerate, onPayment, copyToClipboard, copied }) {
  if (!isPaid) {
    return (
      <div className="fade-in">
        <div style={{ position: 'relative', marginTop: 16 }}>
          <div className="lock-overlay" style={{ maxHeight: 300 }}>
            <div className="card" style={{ opacity: 0.15 }}>
              <h3 style={{ marginBottom: 12 }}>AI Master Prompt</h3>
              <p>From now on, act as my dedicated Career Mentor...</p>
              <p>Your Persona: You are a friendly, highly practical...</p>
            </div>
          </div>
          <div className="lock-content">
            <div className="lock-icon"><Lock /></div>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Unlock လုပ်ရန်</p>
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
              AI Master Prompt ရယူရန်
            </p>
            <button className="btn btn-primary btn-full" onClick={onPayment}>
              <Lock size={16} />
              Payment ချေ၍ Unlock လုပ်ရန်
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="fade-in text-center" style={{ padding: '40px 0' }}>
        <Brain size={48} style={{ color: 'var(--gray-300)', marginBottom: 16 }} />
        <h3 style={{ marginBottom: 8, fontSize: 18, fontWeight: 600 }}>AI Master Prompt</h3>
        <p style={{ fontSize: 14, color: 'var(--gray-500)', marginBottom: 24 }}>
          ChatGPT / Gemini တွင် သုံးရန် ကိုယ်ပိုင် AI Mentor Prompt ဖန်တီးရန်
        </p>
        <button
          className="btn btn-accent btn-lg"
          onClick={onGenerate}
          disabled={generating}
        >
          {generating ? (
            <>
              <div className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
              ဖန်တီးနေပါသည်...
            </>
          ) : (
            <>
              <RefreshCw size={18} />
              ဖန်တီးရန်
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="card card-elevated" style={{ position: 'relative' }}>
        <button
          className="copy-btn"
          style={{ position: 'absolute', top: 12, right: 12 }}
          onClick={() => copyToClipboard(content)}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <ContentRenderer content={content} />
      </div>
    </div>
  );
}
