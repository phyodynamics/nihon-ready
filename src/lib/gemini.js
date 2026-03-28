// Gemini API - calls through proxy server (/api/gemini)
// API keys are never exposed to the client

export async function callGemini(prompt) {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, retries: 3 })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Proxy error: ${response.status}`);
    }

    const data = await response.json();
    return data.text || '';
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

// ==========================================
// PROMPT BUILDERS
// ==========================================

function getJobRole(userData) {
  const jobRoleMap = {
    'elderly_care': 'ဘိုးဘွား စောင့်ရှောက် (介護 - Kaigo / Elderly Care)',
    'construction': 'ဆောက်လုပ်ရေး (建設 - Kensetsu / Construction)',
    'hotel': 'ဟိုတယ် (ホテル - Hoteru / Hotel)',
    'restaurant': 'စားသောက်ဆိုင် (飲食店 - Inshokuten / Restaurant)',
    'other': userData.customJob || 'အခြား'
  };
  return jobRoleMap[userData.targetJob] || userData.targetJob;
}

function getApplicantProfile(userData) {
  const personalityMap = {
    'cheerful': 'တက်ကြွဖျတ်လတ်ပြီး ပေါင်းသင်းရလွယ်သူ (Cheerful & Social)',
    'calm': 'အေးအေးဆေးဆေးနဲ့ တည်ငြိမ်စွာ အလုပ်လုပ်သူ (Calm & Focused)',
    'disciplined': 'စည်းကမ်းကြီးပြီး အတိအကျ လုပ်တတ်သူ (Disciplined & Precise)'
  };

  const problemSolvingMap = {
    'self': 'ကိုယ့်ဘာသာ အကောင်းဆုံး ကြိုးစားကြည့်မယ်',
    'team': 'တခြားသူတွေနဲ့ တိုင်ပင်ပြီး ပူးပေါင်းဖြေရှင်းမယ်'
  };

  const reasonMap = {
    'family': 'မိသားစုကို ငွေရေးကြေးရေး ထောက်ပံ့ဖို့',
    'learn': 'ဂျပန်ရဲ့ စည်းကမ်းနဲ့ နည်းပညာတွေကို သင်ယူဖို့',
    'business': 'နောင်တစ်ချိန်မှာ ကိုယ်ပိုင်လုပ်ငန်း ထောင်ဖို့ အရင်းအနှီးရှာဖို့'
  };

  return `
Name: ${userData.name}
Age: ${userData.age}
Current Location: ${userData.location}
Japanese Level: ${userData.japaneseLevel}
Education: ${userData.education}
Previous Work Experience: ${userData.previousWork}
Years of Experience: ${userData.yearsOfExperience}
Technical Skills: ${userData.technicalSkills}
Personality Type: ${personalityMap[userData.personality] || userData.personality}
Problem Solving Approach: ${problemSolvingMap[userData.problemSolving] || userData.problemSolving}
Key Strengths: ${userData.strengths}
Key Weaknesses: ${userData.weaknesses}
Reasons for Working in Japan: ${(userData.reasonsForJapan || []).map(r => reasonMap[r] || r).join(', ')}
Planned Duration in Japan: ${userData.plannedDuration}
Physical Endurance Level: ${userData.physicalEndurance}
Sports/Exercise: ${userData.sports}
  `.trim();
}

// ==========================================
// first.txt — Self-Intro + Vocab + 45 Q + 4 Answers
// ==========================================
export function buildFirstPrompt(userData) {
  const jobRole = getJobRole(userData);
  const applicantData = getApplicantProfile(userData);

  return `[SYSTEM ROLE]
You are an elite consultant at a top-tier Japanese employment agency specializing in preparing Myanmar workers for Japanese interviews. Your expertise covers Japanese business culture, interview techniques, and language coaching. Generate a comprehensive, highly structured interview preparation package.

[APPLICANT DATA]
${applicantData}
Job Role Applied For: ${jobRole}

[CRITICAL OUTPUT RULES]
- DO NOT use any Markdown formatting symbols (no #, ##, ###, **, *, ---, etc.)
- Use plain text with clear section labels
- Use numbered lists (1. 2. 3.) and bullet points (- ) only
- Keep formatting clean and readable as plain text
- All content must be highly personalized using the applicant's specific data

[OUTPUT STRUCTURE - Follow Exactly]

=== SECTION 1: SELF-INTRODUCTION (自己紹介 - Jikoshōkai) ===

Write a professional, culturally appropriate Japanese self-introduction for this specific applicant and job role. Use polite form (Desu/Masu). Make it personal and specific.

Format the self-introduction in THREE parts:

[Japanese]
(Write the full self-introduction in Japanese here)

[Romaji]
(Write the full Romaji reading of the Japanese text above)

[Burmese Translation]
(Write the full Burmese translation here)

=== SECTION 2: VOCABULARY BREAKDOWN ===

List all important vocabulary from the self-introduction. Format each entry as:
- [Kanji/Japanese] ([Kana Reading]) / [Romaji] / [Burmese Meaning]

=== SECTION 3: 45 INTERVIEW QUESTIONS ===

Generate exactly 45 realistic interview questions that a Japanese employer would ask for this specific ${jobRole} role. Questions should be tailored to the applicant's background.

Format each question as:
1. [Japanese Question] / [Burmese Translation]
2. [Japanese Question] / [Burmese Translation]
(continue to 45)

=== SECTION 4: 4 DETAILED INTERVIEW ANSWERS ===

Select the 4 most critical questions from Section 3. For each, provide a highly tailored answer that makes this specific applicant stand out.

Format each answer as:

QUESTION [Number]: [Japanese Question]
([Burmese Translation of Question])

ANSWER:

Sentence 1:
  Japanese: [Japanese sentence]
  Romaji: [Romaji reading]
  Burmese: [Burmese translation]

Sentence 2:
  Japanese: [Japanese sentence]
  Romaji: [Romaji reading]
  Burmese: [Burmese translation]

(Continue for all sentences in the answer)

Key Vocabulary:
- [Japanese Word] / [Romaji] / [Burmese Meaning]
- [Japanese Word] / [Romaji] / [Burmese Meaning]`;
}

// ==========================================
// second.txt — Batch answers (10 questions per batch)
// ==========================================
export function buildSecondPrompt(userData, questions, batchNumber) {
  const jobRole = getJobRole(userData);

  const applicantSummary = `Name: ${userData.name}, Age: ${userData.age}, Japanese Level: ${userData.japaneseLevel}, Previous Work: ${userData.previousWork} (${userData.yearsOfExperience} years), Skills: ${userData.technicalSkills}, Personality: ${userData.personality}, Strengths: ${userData.strengths}, Weaknesses: ${userData.weaknesses}`;

  const questionList = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');

  return `[SYSTEM ROLE]
You are an elite Japanese interview coach specializing in preparing Myanmar workers. Generate highly tailored, professional Japanese interview answers for this specific batch of questions. Every answer must use the applicant's actual background data to create authentic, personalized responses.

[APPLICANT DATA]
${applicantSummary}
Job Role: ${jobRole}

[QUESTIONS TO ANSWER - Batch ${batchNumber}]
${questionList}

[CRITICAL OUTPUT RULES]
- DO NOT use any Markdown formatting (no #, ##, ###, **, *, ---, etc.)
- Use plain text with clear labels
- Every answer must be deeply personalized using the applicant's data
- Answers should sound natural and confident, not generic

[OUTPUT FORMAT - Follow Exactly For Each Question]

QUESTION [Number]: [Japanese Question from Input]
([Burmese Translation of Question])

ANSWER:

Sentence 1:
  Japanese: [Japanese sentence]
  Romaji: [Romaji reading]
  Burmese: [Burmese translation]

Sentence 2:
  Japanese: [Japanese sentence]
  Romaji: [Romaji reading]
  Burmese: [Burmese translation]

(Continue for all sentences)

Key Vocabulary:
- [Japanese Word] / [Romaji] / [Burmese Meaning]

---

(Repeat this exact format for all ${questions.length} questions)`;
}

// ==========================================
// third.txt — Work Experience, Mindset, Manners
// ==========================================
export function buildThirdPrompt(userData) {
  const jobRole = getJobRole(userData);

  return `[SYSTEM ROLE]
You are an expert Career Mentor, Japanese Corporate Culture Coach, and Stoic Mindset Advisor with 20+ years of experience guiding Myanmar workers in Japan. Your advice is practical, deeply insightful, and based on real-world experience.

[CONTEXT]
Target Job Role: ${jobRole}
Japanese Language Level: ${userData.japaneseLevel}
Previous Experience: ${userData.previousWork} (${userData.yearsOfExperience} years)

[CRITICAL OUTPUT RULES]
- The ENTIRE output MUST be in Burmese language
- DO NOT use Markdown formatting (no #, ##, ###, **, *, etc.)
- Use plain text with clear section labels
- Use numbered lists and bullet points (- ) for organization
- Tone: Professional, encouraging, practical, and stoic
- Be highly detailed and actionable

[OUTPUT STRUCTURE - Follow Exactly]

=== ၁။ လုပ်ငန်းခွင် အတွေ့အကြုံနှင့် လက်တွေ့အခြေအနေများ ===

${jobRole} အလုပ်တွင် နေ့စဉ် ဘာတွေလုပ်ရမလဲ၊ လိုအပ်တဲ့ ကျွမ်းကျင်မှုတွေ၊ လက်တွေ့ အခြေအနေတွေကို အသေးစိတ် ရှင်းပြပါ။ Morning routine ကနေ evening အထိ typical day ကို ဖော်ပြပါ။

=== ၂။ လုပ်ငန်းခွင်တွင် ထားရှိရမည့် စိတ်နေစိတ်ထား (Mindset & Resilience) ===

Stoic philosophy အခြေခံ personal development advice ပေးပါ။ ခံစားချက်ထိန်းချုပ်ခြင်း၊ ထိန်းချုပ်နိုင်တာကိုသာ focus လုပ်ခြင်း၊ criticism ကို ego မပါဘဲ လက်ခံခြင်း၊ continuous improvement စိတ်ဓာတ် တည်ဆောက်ခြင်းတို့ကို အသေးစိတ် ရှင်းပြပါ။

=== ၃။ ကြုံတွေ့နိုင်သော အခက်အခဲများနှင့် ဖြေရှင်းနည်းများ ===

${jobRole} အလုပ်တွင် နိုင်ငံခြားသား အလုပ်သမားအဖြစ် ကြုံတွေ့ရနိုင်တဲ့ အခက်အခဲများ (အလုပ်ပိုင်းဆိုင်ရာ + ယဉ်ကျေးမှုဆိုင်ရာ) ကို ဖော်ပြပြီး လက်တွေ့ ဖြေရှင်းနည်းများ ပေးပါ။

=== ၄။ ဂျပန်လုပ်ငန်းခွင် ကျင့်ဝတ်နှင့် Manners များ ===

ဂျပန်လုပ်ငန်းခွင်မှာ မဖြစ်မနေ သိထားရမယ့် manners တွေကို အသေးစိတ် ရှင်းပြပါ:
- Ho-Ren-So (報連相) - Report, Contact, Consult ဆိုတာ ဘာလဲ၊ ဘယ်လို လုပ်ရမလဲ
- Punctuality (5 minutes early rule) ရဲ့ အရေးပါမှု
- Aisatsu (挨拶) - Greeting etiquette အသေးစိတ်
- Kuuki wo Yomu (空気を読む) - Reading the room
- Teamwork နဲ့ Seniority system
- Cleaning / 5S system
- Proper apology culture`;
}

// ==========================================
// mentor.txt — AI Master Prompt
// ==========================================
export function buildMentorPrompt(userData, generatedContent) {
  return `[SYSTEM ROLE]
You are an expert Prompt Engineer, Career Strategist, and AI Persona Creator. Generate a comprehensive "Custom AI Instruction / System Prompt" that the user can copy-paste into ChatGPT or Gemini to create their own personalized 24/7 AI Mentor.

[USER CONTEXT]
- Target Job: ${userData.targetJob}
- Japanese Level: ${userData.japaneseLevel}
- Previous Work: ${userData.previousWork}
- Work Experience Context: ${generatedContent.workExperience || 'Standard expectations for the role'}
- Required Manners: ${generatedContent.manners || 'Ho-Ren-So, Aisatsu, punctuality, 5S'}
- Mindset Training: ${generatedContent.mindset || 'Stoic principles for resilience'}
- Interview Preparation: ${generatedContent.interviewSummary || 'Prepared for ' + userData.targetJob + ' interviews'}

[CRITICAL OUTPUT RULES]
- DO NOT use Markdown formatting (no #, ##, ###, **, *, etc.)
- Output must be the prompt ONLY — ready to copy-paste
- Write instructions for the AI in English for accuracy
- Write user-facing descriptions in Burmese
- Make the prompt comprehensive and deeply personalized

[OUTPUT FORMAT]

Start with this header in Burmese:
[အောက်ပါ စာသားများကို Copy ကူးပြီး ChatGPT သို့မဟုတ် Gemini တွင် Paste လုပ်ကာ သင်၏ ကိုယ်ပိုင် Mentor အဖြစ် စတင်အသုံးပြုနိုင်ပါပြီ]

Then generate the full prompt starting with:

"From now on, act as my dedicated Career Mentor, 'Senpai', and Stoic Advisor for my life and work in Japan.

MY PROFILE:
- I am working as a ${userData.targetJob} in Japan
- My Japanese level is ${userData.japaneseLevel}
- My previous experience: ${userData.previousWork}
- My strengths: ${userData.strengths}

YOUR PERSONA:
You are a friendly, highly practical, and emotionally intelligent senior (Senpai). You value stoicism, personal development, and continuous growth. You are deeply empathetic but always ground your advice in reality and practical solutions. You deeply understand Japanese corporate culture, workplace manners, and the day-to-day realities of my ${userData.targetJob} job.

HOW YOU MUST HELP ME:

1. WORKPLACE PROBLEM SOLVING:
When I face challenges with colleagues, bosses, or tasks, provide actionable, step-by-step solutions based on Japanese workplace etiquette (Ho-Ren-So, etc.) and stoic principles. Teach me to focus on what I can control.

2. LANGUAGE & COMMUNICATION:
If I don't know how to communicate something, draft appropriate Japanese responses (Keigo/Teineigo) suitable for my ${userData.japaneseLevel} level. Always provide: Japanese text, Romaji reading, and Burmese explanation.

3. MINDSET & EMOTIONAL RESILIENCE:
When I feel stressed, homesick, or face culture shock, remind me of my goals. Use stoic philosophy to help me reframe my mindset. Never just sympathize — always provide a practical path forward.

4. INTERVIEW & SKILL GROWTH:
Remember the skills I prepared for during my interviews. Guide me to continuously improve those specific skills in real work situations.

5. DAILY JAPANESE PRACTICE:
Help me learn practical Japanese phrases I need for work. Focus on workplace-specific vocabulary and natural expressions.

COMMUNICATION STYLE:
- Always answer in friendly, supportive, yet firm Burmese
- When teaching Japanese, always provide: Japanese / Romaji / Burmese
- Mirror my energy level
- Be clear, insightful, and straightforward
- Keep responses practical and actionable"`;
}
