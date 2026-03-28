import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { createPayment } from '../lib/database';
import { notifyAdmin } from '../lib/telegram';
import {
  ArrowLeft, Check, Copy, ExternalLink,
  MessageSquare, BriefcaseBusiness, Brain, BookOpen, RefreshCw
} from 'lucide-react';

export function PaymentScreen() {
  const { state, dispatch, showToast } = useApp();
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userId = state.user?.id || 'N/A';
  const onboardingCount = state.dbUser?.onboarding_count || 0;
  const isExtraOnboarding = state.isPaid && onboardingCount >= 2;
  const basePrice = 30000;
  const extraPrice = 15000;
  // If already paid, extra onboarding only costs 15,000
  // If not paid yet, base price is 30,000
  const totalPrice = isExtraOnboarding ? extraPrice : basePrice;

  const features = [
    { icon: <MessageSquare size={18} />, text: 'Interview မေးခွန်း ၄၅ ခု အဖြေအပြည့်အစုံ' },
    { icon: <BriefcaseBusiness size={18} />, text: 'လုပ်ငန်းခွင် အတွေ့အကြုံနှင့် Manners' },
    { icon: <Brain size={18} />, text: 'AI Master Prompt (ကိုယ်ပိုင် AI Mentor)' },
    { icon: <RefreshCw size={18} />, text: 'Onboarding ၂ ကြိမ် အခမဲ့ လုပ်ခွင့်' },
    { icon: <BookOpen size={18} />, text: 'Download .txt ဖိုင်ရယူခွင့်' },
  ];

  async function handlePaymentComplete() {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (state.user?.id) {
        await createPayment(state.user.id, totalPrice, isExtraOnboarding ? 'extra_onboarding' : 'unlock');
        
        // Notify admin via Telegram (single notification)
        await notifyAdmin(
          `💳 <b>Payment Request</b>\n\n` +
          `User: ${state.user.firstName} ${state.user.lastName}\n` +
          `Username: @${state.user.username || 'N/A'}\n` +
          `Telegram ID: <code>${state.user.id}</code>\n` +
          `Amount: ${totalPrice.toLocaleString()} MMK\n` +
          `Type: ${isExtraOnboarding ? 'Extra Onboarding' : 'Unlock Content'}\n\n` +
          `Please verify and approve in the admin dashboard.`
        );
      }

      setPaymentSubmitted(true);
      dispatch({ type: 'SET_PAYMENT_STATUS', payload: 'pending' });
    } catch (error) {
      console.error('Payment error:', error);
      showToast('တစ်ခုခု မှားယွင်းနေပါသည်', 'error');
      setIsSubmitting(false);
    }
  }

  function copyUserId() {
    navigator.clipboard.writeText(String(userId)).then(() => {
      setCopiedId(true);
      showToast('Telegram ID Copy ကူးပြီးပါပြီ');
      setTimeout(() => setCopiedId(false), 2000);
    });
  }

  if (paymentSubmitted) {
    return (
      <div className="page fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div className="page-header">
          <button
            className="btn btn-outline"
            style={{ padding: '8px 12px' }}
            onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'main' })}
          >
            <ArrowLeft size={18} />
          </button>
          <h1>Payment</h1>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'var(--gray-100)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Check size={32} style={{ color: 'var(--success)' }} />
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Payment ချေပြီးပါပြီ</h2>
          <p style={{ fontSize: 14, color: 'var(--gray-500)', maxWidth: 300, lineHeight: 1.6 }}>
            Admin မှ အတည်ပြုပြီးပါက Content အားလုံးကို အပြည့်အဝ အသုံးပြုနိုင်မည်ဖြစ်ပါသည်။ ပိုမိုမြန်ဆန်စွာ အတည်ပြုနိုင်ရန် ငွေလွှဲပြေစာ (Screenshot) ကို အောက်ပါ Telegram အကောင့်သို့ ပေးပို့ပေးပါရန် မေတ္တာရပ်ခံအပ်ပါသည်။
          </p>

          <div className="card" style={{ width: '100%', textAlign: 'left' }}>
            <div className="payment-info-row">
              <span className="payment-info-label">Telegram ID</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="payment-info-value">{userId}</span>
                <button className="copy-btn" onClick={copyUserId} style={{ padding: '4px 8px' }}>
                  {copiedId ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: 16, width: '100%' }}>
            <p style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.7 }}>
              Telegram ID ကို Copy ကူးပြီး payment screenshot နှင့်အတူ
              <a 
                href="https://t.me/rin311202" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: 'var(--accent)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, margin: '0 4px' }}
              >
                @rin311202
                <ExternalLink size={12} />
              </a>
              သို့ ဆက်သွယ်ပေးပို့ပြီး Unlock ပြုလုပ်နိုင်ပါပြီ။
            </p>
          </div>

          <button
            className="btn btn-primary btn-full"
            onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'main' })}
          >
            ပင်မစာမျက်နှာသို့ ပြန်သွားရန်
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <button
          className="btn btn-outline"
          style={{ padding: '8px 12px' }}
          onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'main' })}
        >
          <ArrowLeft size={18} />
        </button>
        <h1>Payment</h1>
      </div>

      {/* Price */}
      <div className="payment-amount">
        {totalPrice.toLocaleString()} <span>MMK</span>
      </div>

      {isExtraOnboarding && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span className="badge badge-warning">
            Onboarding အပို ({onboardingCount + 1} ကြိမ်မြောက်) - {extraPrice.toLocaleString()} MMK
          </span>
        </div>
      )}

      {/* Features */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--black)' }}>
          ရရှိနိုင်မည့် အကျိုးကျေးဇူးများ (Features):
        </h3>
        <ul className="payment-features">
          {features.map((f, i) => (
            <li key={i}>
              <Check size={18} style={{ color: 'var(--success)' }} />
              {f.text}
            </li>
          ))}
        </ul>
      </div>

      {/* KPay QR */}
      <div className="card card-elevated" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>
          KBZ Pay ဖြင့် ငွေလွှဲရန်
        </h3>
        <div className="qr-container">
          <img src="/assets/kpay.jpeg" alt="KBZ Pay QR Code" style={{ width: '100%', maxWidth: 280 }} />
        </div>
        <div className="payment-info" style={{ marginTop: 16 }}>
          <div className="payment-info-row">
            <span className="payment-info-label">ဖုန်းနံပါတ်</span>
            <span className="payment-info-value">09765028400</span>
          </div>
          <div className="payment-info-row">
            <span className="payment-info-label">အမည်</span>
            <span className="payment-info-value">U Zwe Nyi Lin</span>
          </div>
          <div className="payment-info-row">
            <span className="payment-info-label">ပမာဏ</span>
            <span className="payment-info-value">{totalPrice.toLocaleString()} MMK</span>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        className="btn btn-primary btn-full btn-lg"
        onClick={handlePaymentComplete}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
            အတည်ပြုရန် စောင့်ဆိုင်းနေပါသည်...
          </>
        ) : (
          <>
            <Check size={18} />
            ငွေပေးချေပြီးပါပြီ
          </>
        )}
      </button>

      <p style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
        Payment ချေပြီးနောက် Admin မှ ၂၄ နာရီအတွင်း စစ်ဆေးပြီး Unlock လုပ်ပေးပါမည်။
      </p>
    </div>
  );
}
