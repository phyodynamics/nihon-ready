# Nihon Ready - Setup Guide

## 1. Supabase Setup

### 1.1 Create Supabase Project
1. [supabase.com](https://supabase.com) သို့သွားပါ
2. **New Project** ကို နှိပ်ပါ
3. Project name: `nihon-ready` ပေးပါ
4. Password တစ်ခု ထည့်ပါ
5. Region: **Southeast Asia (Singapore)** ရွေးပါ
6. **Create new project** နှိပ်ပါ

### 1.2 Database Tables ဖန်တီးရန်
1. Supabase Dashboard ထဲမှာ **SQL Editor** ကို သွားပါ
2. **New Query** နှိပ်ပါ
3. `supabase-setup.sql` ဖိုင်ထဲက SQL အားလုံးကို Copy Paste လုပ်ပါ
4. **Run** နှိပ်ပါ
5. Tables 4 ခု ဖန်တီးပြီးပါပြီ: `users`, `onboarding_responses`, `generated_content`, `payments`

### 1.3 API Keys ရယူရန်
1. **Settings** → **API** သို့ သွားပါ
2. ဒီဟာတွေကို Note လုပ်ထားပါ:
   - **Project URL** → `VITE_SUPABASE_URL` အဖြစ် သုံးမည်
   - **anon public key** → `VITE_SUPABASE_ANON_KEY` အဖြစ် သုံးမည်

---

## 2. Environment Variables (.env)

`.env` ဖိုင်ကို ဖွင့်ပြီး Supabase credentials ထည့်ပါ:

```env
VITE_TELEGRAM_BOT_TOKEN=8678068969:AAHCWZOP4YJefxjVu6aivsdnuj0S7tcNph0
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-key-here
VITE_GEMINI_API_KEYS=AIzaSyA5Hfe...,AIzaSyD_7PA...,AIzaSyDuX...
VITE_ADMIN_IDS=1827344905,5057037473
```

---

## 3. Telegram Bot Setup

### 3.1 Bot ရှိပြီးသားဖြစ်ပါတယ်
Bot token: `8678068969:AAHCWZOP4YJefxjVu6aivsdnuj0S7tcNph0`

### 3.2 Mini App URL ထည့်ရန်
1. Telegram မှာ [@BotFather](https://t.me/BotFather) ကို ဖွင့်ပါ
2. `/mybots` → သင့် bot ကိုရွေးပါ
3. **Bot Settings** → **Menu Button** ကို နှိပ်ပါ
4. URL ထည့်ပါ: deploy လုပ်ပြီးရင် ရလာတဲ့ URL (ဥပမာ `https://nihon-ready.vercel.app`)

### 3.3 Web App URL ထည့်ရန်
1. `/mybots` → သင့် bot ကိုရွေးပါ
2. **Bot Settings** → **Configure Mini App** ကို နှိပ်ပါ
3. Web App URL ထည့်ပါ

---

## 4. Local Development

```bash
# Dependencies install (ပထမဆုံးတစ်ကြိမ်သာ)
cd /Users/phyozinko/Projects/Web/nihon-ready
npm install

# Dev server ဖွင့်ရန်
npm run dev
```

App ကို http://localhost:5173/ မှာ ဖွင့်ပါ။

> **Note:** Development mode မှာ Telegram မလိုဘဲ mock user (Admin ID) နဲ့ အလုပ်လုပ်ပါတယ်။ Supabase credentials မထည့်ရသေးရင်လည်း localStorage fallback သုံးပြီး အလုပ်လုပ်ပါတယ်။

---

## 5. Deploy to Vercel

### 5.1 Vercel CLI
```bash
npm install -g vercel
cd /Users/phyozinko/Projects/Web/nihon-ready
vercel
```

### 5.2 Environment Variables ထည့်ရန်
Vercel Dashboard → Settings → Environment Variables မှာ `.env` ထဲက variable တွေ အကုန်ထည့်ပါ:
- `VITE_TELEGRAM_BOT_TOKEN`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEYS`
- `VITE_ADMIN_IDS`

### 5.3 Deploy ပြီးရင်
1. Vercel URL ကို copy လုပ်ပါ (ဥပမာ `https://nihon-ready.vercel.app`)
2. BotFather မှာ Mini App URL ထည့်ပါ (အပေါ်မှာ ပြထားတဲ့အတိုင်း)

---

## 6. App Structure

```
nihon-ready/
├── public/
│   └── assets/
│       ├── logo.png          # Burmese Kaigo logo
│       └── kpay.jpeg         # KPay QR code
├── src/
│   ├── components/
│   │   ├── AdminDashboard.jsx  # Admin panel (4 tabs)
│   │   ├── GeneratingScreen.jsx # AI content generation
│   │   ├── LoadingScreen.jsx    # Loading animation
│   │   ├── MainScreen.jsx       # Main app (4 tabs)
│   │   ├── NotTelegramScreen.jsx # Non-Telegram warning
│   │   ├── OnboardingScreen.jsx  # 17-step questionnaire
│   │   ├── PaymentScreen.jsx     # KPay payment flow
│   │   ├── Toast.jsx             # Notifications
│   │   └── WelcomeScreen.jsx     # Welcome page
│   ├── context/
│   │   └── AppContext.jsx       # Global state management
│   ├── lib/
│   │   ├── database.js         # Supabase + localStorage operations
│   │   ├── gemini.js           # Gemini AI API integration
│   │   ├── supabase.js         # Supabase client
│   │   └── telegram.js         # Telegram WebApp SDK
│   ├── App.jsx                 # Root component + routing
│   ├── index.css               # Complete design system
│   └── main.jsx                # Entry point
├── .env                        # Environment variables
├── supabase-setup.sql          # Database schema
└── index.html                  # HTML + Telegram SDK
```

---

## 7. App Flow

```
User ဖွင့်ပါ → Telegram စစ်ပါ → New user? → Welcome Screen
                                    ↓                   ↓
                              Existing user       Onboarding (17 questions)
                                    ↓                   ↓
                              Main Screen         AI Generate (first.txt)
                                    ↓                   ↓
                              4 Tabs View          Main Screen
                                                       ↓
                    ┌──────────────────────────────────────────┐
                    │  Tab 1: မိတ်ဆက် (Self-intro + Vocab)      │
                    │  Tab 2: မေးခွန်းများ (45 Q + 4 Answers)    │  Free
                    │         ──────── PAYWALL ────────         │
                    │  Tab 2: ကျန် Q&A (second.txt batches)     │
                    │  Tab 3: အတွေ့အကြုံ (third.txt)             │  Paid
                    │  Tab 4: AI Mentor (mentor.txt)            │
                    └──────────────────────────────────────────┘
                                    ↓
                            Payment (30,000 MMK)
                                    ↓
                          Admin Approve → Unlock
                                    ↓
                          Download .txt → Telegram ပို့
```

---

## 8. Admin Dashboard

Admin users (ID: `1827344905`, `5057037473`) ဆိုရင် app ထဲမှာ Settings icon (⚙) ပေါ်ပါတယ်။ နှိပ်ရင် Admin Dashboard ကို သွားပါတယ်။

### Tabs:
- **Overview**: Total users, paid users, revenue, daily chart
- **Users**: Search + filter, Unlock/Lock functionality
- **Payments**: Pending/Approved/Rejected filter, Approve/Reject buttons
- **Settings**: App configuration info

---

## 9. Pricing

| Feature | Price |
|---------|-------|
| Base Unlock (45 Q&A + Experiences + AI Mentor) | 30,000 MMK |
| Extra Onboarding (3rd time onwards, per attempt) | +10,000 MMK |
| Free Onboarding | 2 times |
