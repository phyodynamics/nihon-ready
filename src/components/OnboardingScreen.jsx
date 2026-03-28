import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

const ONBOARDING_QUESTIONS = [
  {
    id: 'targetJob',
    title: 'လျှောက်ထားမည့် အလုပ်အကိုင်',
    subtitle: 'Target Job',
    type: 'radio',
    options: [
      { value: 'elderly_care', label: 'ဘိုးဘွား စောင့်ရှောက် (介護)' },
      { value: 'construction', label: 'ဆောက်လုပ်ရေး (建設)' },
      { value: 'hotel', label: 'ဟိုတယ် (ホテル)' },
      { value: 'restaurant', label: 'စားသောက်ဆိုင် (飲食店)' },
      { value: 'other', label: 'အခြား' },
    ],
    hasCustom: true,
    required: true
  },
  {
    id: 'name',
    title: 'နာမည်',
    subtitle: 'Name',
    type: 'text',
    placeholder: 'ဥပမာ - ဦးမောင်မောင်',
    required: true
  },
  {
    id: 'age',
    title: 'အသက်',
    subtitle: 'Age',
    type: 'text',
    placeholder: 'ဥပမာ - 25',
    required: true
  },
  {
    id: 'location',
    title: 'နေရပ်',
    subtitle: 'Current Location',
    type: 'text',
    placeholder: 'လက်ရှိ ဘယ်မြို့မှာ နေသလဲ',
    required: true
  },
  {
    id: 'japaneseLevel',
    title: 'ဂျပန်စာ အဆင့်',
    subtitle: 'Japanese Level',
    type: 'radio',
    options: [
      { value: 'N5', label: 'N5' },
      { value: 'N4', label: 'N4' },
      { value: 'N3', label: 'N3' },
      { value: 'N2', label: 'N2' },
      { value: 'N1', label: 'N1' },
    ],
    required: true
  },
  {
    id: 'education',
    title: 'အမြင့်ဆုံး ပညာအရည်အချင်း',
    subtitle: 'Education',
    type: 'text',
    placeholder: 'ဥပမာ - ဆယ်တန်းအောင် / ဘွဲ့ရ',
    required: true
  },
  {
    id: 'previousWork',
    title: 'ယခင် အလုပ်အတွေ့အကြုံ',
    subtitle: 'ဘာအလုပ် လုပ်ခဲ့ဖူးလဲ?',
    type: 'text',
    placeholder: 'ဥပမာ - လျှပ်စစ်ပြင်ဖူးတယ်',
    required: true
  },
  {
    id: 'yearsOfExperience',
    title: 'ဘယ်နှနှစ် လုပ်ခဲ့သလဲ?',
    subtitle: 'Years of Experience',
    type: 'text',
    placeholder: 'ဥပမာ - ၃ နှစ်',
    required: true
  },
  {
    id: 'technicalSkills',
    title: 'အထူးကျွမ်းကျင်မှု',
    subtitle: 'Technical Skills',
    type: 'text',
    placeholder: 'ဥပမာ - ကားမောင်း၊ ဂဟေဆော်၊ ကွန်ပျူတာ',
    required: true
  },
  {
    id: 'personality',
    title: 'သင့်ရဲ့ ပင်ကိုယ်စရိုက်',
    subtitle: 'Personality',
    type: 'radio',
    options: [
      { value: 'cheerful', label: 'တက်ကြွဖျတ်လတ်ပြီး ပေါင်းသင်းရလွယ်သူ (Cheerful & Social)' },
      { value: 'calm', label: 'အေးအေးဆေးဆေးနဲ့ တည်ငြိမ်စွာ အလုပ်လုပ်သူ (Calm & Focused)' },
      { value: 'disciplined', label: 'စည်းကမ်းကြီးပြီး အတိအကျ လုပ်တတ်သူ (Disciplined & Precise)' },
    ],
    required: true
  },
  {
    id: 'problemSolving',
    title: 'အလုပ်မှာ အခက်အခဲ ကြုံလာရင် ဘယ်လို ဖြေရှင်းတတ်လဲ?',
    subtitle: 'Problem Solving',
    type: 'radio',
    options: [
      { value: 'self', label: 'ကိုယ့်ဘာသာ အကောင်းဆုံး ကြိုးစားကြည့်မယ်' },
      { value: 'team', label: 'တခြားသူတွေနဲ့ တိုင်ပင်ပြီး ပူးပေါင်းဖြေရှင်းမယ်' },
    ],
    required: true
  },
  {
    id: 'strengths',
    title: 'အားသာချက်',
    subtitle: 'Strengths',
    type: 'text',
    placeholder: 'ဥပမာ - စိတ်ရှည်တယ်၊ အချိန်တိကျတယ်၊ သင်ယူမှုမြန်တယ်',
    required: true
  },
  {
    id: 'weaknesses',
    title: 'အားနည်းချက်',
    subtitle: 'Weaknesses',
    type: 'text',
    placeholder: 'ဥပမာ - အားနာတတ်တယ်၊ စကားနည်းတယ်',
    required: true
  },
  {
    id: 'reasonsForJapan',
    title: 'ဂျပန်ကို သွားချင်တဲ့ အဓိက အကြောင်းရင်း',
    subtitle: 'ဘာလို့ ဂျပန်ကို သွားချင်တာလဲ',
    type: 'checkbox',
    options: [
      { value: 'family', label: 'မိသားစုကို ငွေရေးကြေးရေး ထောက်ပံ့ဖို့' },
      { value: 'learn', label: 'ဂျပန်ရဲ့ စည်းကမ်းနဲ့ နည်းပညာတွေကို သင်ယူဖို့' },
      { value: 'business', label: 'နောင်တစ်ချိန်မှာ ကိုယ်ပိုင်လုပ်ငန်း ထောင်ဖို့ အရင်းအနှီးရှာဖို့' },
    ],
    required: true
  },
  {
    id: 'plannedDuration',
    title: 'ဂျပန်မှာ အနည်းဆုံး ဘယ်နှနှစ်လောက် နေဖို့ စိတ်ကူးထားလဲ?',
    subtitle: 'Planned Duration',
    type: 'radio',
    options: [
      { value: '3_years', label: '၃ နှစ်' },
      { value: '5_years', label: '၅ နှစ်' },
      { value: 'permanent', label: 'အမြဲတမ်း' },
    ],
    required: true
  },
  {
    id: 'physicalEndurance',
    title: 'ပင်ပန်းတဲ့ အလုပ်တွေကို လုပ်နိုင်စွမ်း ရှိပါသလား?',
    subtitle: 'Physical Endurance',
    type: 'radio',
    options: [
      { value: 'yes', label: 'ဟုတ်ကဲ့' },
      { value: 'no', label: 'မဟုတ်ပါ' },
    ],
    required: true
  },
  {
    id: 'sports',
    title: 'အားကစား တစ်ခုခု လုပ်လေ့ရှိသလား?',
    subtitle: 'Sports',
    type: 'text',
    placeholder: 'ဥပမာ - ဘောလုံးကန်၊ ပြေး၊ အလေးမ',
    required: false
  },
];

export function OnboardingScreen() {
  const { state, dispatch, showToast } = useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [customJobText, setCustomJobText] = useState('');
  const [direction, setDirection] = useState('right');

  const question = ONBOARDING_QUESTIONS[currentStep];
  const totalSteps = ONBOARDING_QUESTIONS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const currentValue = state.onboardingData[question.id];

  const canProceed = () => {
    if (!question.required) return true;
    if (question.type === 'checkbox') return currentValue && currentValue.length > 0;
    if (question.id === 'targetJob' && currentValue === 'other') return customJobText.trim() !== '';
    return currentValue && currentValue.toString().trim() !== '';
  };

  const handleNext = () => {
    if (!canProceed()) {
      showToast('ကျေးဇူးပြု၍ ဖြေကြားပါ', 'error');
      return;
    }

    if (question.id === 'targetJob' && currentValue === 'other') {
      dispatch({ type: 'SET_ONBOARDING_DATA', payload: { customJob: customJobText } });
    }

    if (currentStep < totalSteps - 1) {
      setDirection('right');
      setCurrentStep(prev => prev + 1);
    } else {
      // Onboarding complete
      dispatch({ type: 'SET_SCREEN', payload: 'generating' });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection('left');
      setCurrentStep(prev => prev - 1);
    } else {
      dispatch({ type: 'SET_SCREEN', payload: 'welcome' });
    }
  };

  const handleSelect = (value) => {
    if (question.type === 'checkbox') {
      const current = currentValue || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      dispatch({ type: 'SET_ONBOARDING_DATA', payload: { [question.id]: updated } });
    } else {
      dispatch({ type: 'SET_ONBOARDING_DATA', payload: { [question.id]: value } });
    }
  };

  const handleInput = (value) => {
    dispatch({ type: 'SET_ONBOARDING_DATA', payload: { [question.id]: value } });
  };

  const animationClass = direction === 'right' ? 'slide-in-right' : 'slide-in-left';

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Progress */}
      <div className="progress-container">
        <div className="progress-info">
          <span className="progress-step">{currentStep + 1} / {totalSteps}</span>
          <span className="progress-step">{Math.round(progress)}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Question */}
      <div key={currentStep} className={animationClass} style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 16 }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: 1 }}>
            {question.subtitle}
          </span>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--black)', marginBottom: 24, lineHeight: 1.5 }}>
          {question.title}
        </h2>

        {/* Text Input */}
        {(question.type === 'text' || question.type === 'number') && (
          <input
            type={question.type}
            className="input-field"
            placeholder={question.placeholder}
            value={currentValue || ''}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNext()}
            autoFocus
          />
        )}

        {/* Radio Options */}
        {question.type === 'radio' && (
          <div className="option-group">
            {question.options.map((option) => (
              <div
                key={option.value}
                className={`option-item ${currentValue === option.value ? 'selected' : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                <div className="option-radio"></div>
                <span className="option-text">{option.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Custom text for "other" */}
        {question.hasCustom && currentValue === 'other' && (
          <div style={{ marginTop: 12 }}>
            <input
              type="text"
              className="input-field"
              placeholder="အလုပ်အကိုင်ကို ရေးပါ..."
              value={customJobText}
              onChange={(e) => setCustomJobText(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* Checkbox Options */}
        {question.type === 'checkbox' && (
          <div className="option-group">
            {question.options.map((option) => (
              <div
                key={option.value}
                className={`option-item ${(currentValue || []).includes(option.value) ? 'selected' : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                <div className="option-check"></div>
                <span className="option-text">{option.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 12, paddingTop: 20, paddingBottom: 20 }}>
        <button className="btn btn-outline" onClick={handleBack}>
          <ArrowLeft size={18} />
          {currentStep === 0 ? 'ပြန်သွားရန်' : 'နောက်သို့'}
        </button>
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={handleNext}
          disabled={!canProceed()}
        >
          {currentStep === totalSteps - 1 ? (
            <>
              <Check size={18} />
              ပြီးပါပြီ
            </>
          ) : (
            <>
              ရှေ့ဆက်ရန်
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
