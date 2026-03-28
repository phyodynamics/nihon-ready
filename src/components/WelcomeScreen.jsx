import { useApp } from '../context/AppContext';
import { ArrowRight, Sparkles, BookOpen, BriefcaseBusiness, Brain, Headphones } from 'lucide-react';

export function WelcomeScreen() {
  const { state, dispatch } = useApp();

  const features = [
    { icon: <BookOpen size={20} />, text: 'မိမိကိုယ်ကို မိတ်ဆက်ခြင်း (ဂျပန်/ရိုမာဂျီ/မြန်မာ)' },
    { icon: <Sparkles size={20} />, text: 'ဖြစ်နိုင်ခြေပိုများသော အင်တာဗျူးမေးခွန်း ၄၅ ခုနှင့် အဖြေများ' },
    { icon: <Headphones size={20} />, text: 'အသံထွက် နားထောင်ပြီး လေ့ကျင့်နိုင်မည့် Interview Test Mode' },
    { icon: <BriefcaseBusiness size={20} />, text: 'လုပ်ငန်းခွင် အတွေ့အကြုံများနှင့် လိုက်နာရမည့် Manners များ' },
    { icon: <Brain size={20} />, text: 'အချိန်မရွေး တိုင်ပင်ဆွေးနွေးနိုင်မည့် ကိုယ်ပိုင် AI Mentor' },
  ];

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="fade-in-up" style={{ textAlign: 'center', marginBottom: 40 }}>
        <img 
          src="/assets/logo.png" 
          alt="Nihon Ready" 
          style={{ width: 140, height: 'auto', marginBottom: 24 }}
        />
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: 'var(--black)' }}>
          Nihon Ready
        </h1>
        <p style={{ fontSize: 15, color: 'var(--gray-500)', maxWidth: 300, margin: '0 auto', lineHeight: 1.7 }}>
          ဂျပန်နိုင်ငံသို့ အလုပ်သွားရောက်လုပ်ကိုင်မည့် မြန်မာများအတွက် အင်တာဗျူးနှင့် လုပ်ငန်းခွင် အထောက်အကူပြု App
        </p>
      </div>

      <div className="fade-in-up" style={{ marginBottom: 32, animationDelay: '0.15s', animationFillMode: 'both' }}>
        {features.map((feature, i) => (
          <div 
            key={i}
            className="fade-in-up"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 14, 
              padding: '14px 0',
              borderBottom: i < features.length - 1 ? '1px solid var(--gray-100)' : 'none',
              animationDelay: `${0.2 + i * 0.08}s`,
              animationFillMode: 'both'
            }}
          >
            <div style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 10, 
              background: 'var(--gray-50)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0 
            }}>
              {feature.icon}
            </div>
            <span style={{ fontSize: 14, color: 'var(--gray-700)', lineHeight: 1.5 }}>
              {feature.text}
            </span>
          </div>
        ))}
      </div>

      {state.user && (
        <div className="fade-in-up" style={{ 
          textAlign: 'center', 
          marginBottom: 20,
          animationDelay: '0.4s',
          animationFillMode: 'both'
        }}>
          <p style={{ fontSize: 15, color: 'var(--gray-600)' }}>
            မင်္ဂလာပါ <strong>{state.user.firstName}</strong>
          </p>
        </div>
      )}

      <button 
        className="btn btn-primary btn-full btn-lg fade-in-up"
        style={{ animationDelay: '0.5s', animationFillMode: 'both' }}
        onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'onboarding' })}
      >
        စတင်ရန်
        <ArrowRight size={18} />
      </button>
    </div>
  );
}
