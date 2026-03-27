import { ShieldOff } from 'lucide-react';

export function NotTelegramScreen() {
  return (
    <div className="not-telegram">
      <ShieldOff />
      <h2>Telegram Only</h2>
      <p>
        ဤ App ကို Telegram App ထဲမှသာ အသုံးပြုနိုင်ပါသည်။ ကျေးဇူးပြု၍ Telegram မှ ဖွင့်ပါ။
      </p>
      <a 
        href="https://t.me" 
        className="btn btn-primary btn-lg"
        target="_blank"
        rel="noopener noreferrer"
      >
        Telegram ကို ဖွင့်ပါ
      </a>
    </div>
  );
}
