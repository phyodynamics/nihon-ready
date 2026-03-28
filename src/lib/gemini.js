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

// Build first.txt prompt with user data
export function buildFirstPrompt(userData) {
  const jobRoleMap = {
    'elderly_care': 'ဘိုးဘွား စောင့်ရှောက် (介護 - Kaigo / Elderly Care)',
    'construction': 'ဆောက်လုပ်ရေး (建設 - Kensetsu / Construction)',
    'hotel': 'ဟိုတယ် (ホテル - Hoteru / Hotel)',
    'restaurant': 'စားသောက်ဆိုင် (飲食店 - Inshokuten / Restaurant)',
    'other': userData.customJob || 'အခြား'
  };

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

  const jobRole = jobRoleMap[userData.targetJob] || userData.targetJob;

  const applicantData = `
Name: ${userData.name}
Age: ${userData.age}
Current Location: ${userData.location}
Japanese Level: ${userData.japaneseLevel}
Education: ${userData.education}
Previous Work: ${userData.previousWork}
Years of Experience: ${userData.yearsOfExperience}
Technical Skills: ${userData.technicalSkills}
Personality: ${personalityMap[userData.personality] || userData.personality}
Problem Solving: ${problemSolvingMap[userData.problemSolving] || userData.problemSolving}
Strengths: ${userData.strengths}
Weaknesses: ${userData.weaknesses}
Reason for Japan: ${(userData.reasonsForJapan || []).map(r => reasonMap[r] || r).join(', ')}
Planned Duration: ${userData.plannedDuration}
Physical Endurance: ${userData.physicalEndurance}
Sports: ${userData.sports}
  `.trim();

  return `[SYSTEM ROLE]
You are an elite consultant at a top-tier Japanese employment agency. Your role is to analyze applicant data provided via a web form and generate a comprehensive, highly structured interview preparation package. You must maintain a professional, encouraging, and highly precise tone.

[INPUT DATA]
${applicantData}
Job Role applied for: ${jobRole}

[OUTPUT GENERATION PROTOCOL - STRICT ADHERENCE REQUIRED]
Generate your response exactly in the following sections:

### Section 1: Tailored Self-Introduction (自己紹介 - Jikoshōkai)
Based on the input data, write a professional, culturally appropriate Japanese self-introduction paragraph (using Desu/Masu or Keigo appropriately) tailored to the specific job role.

### Section 2: Self-Introduction Vocabulary Breakdown
Break down the vocabulary used in Section 1. Format as a list:
* [Japanese Word/Kanji] (Kana) - [Romaji] - [Burmese Meaning]

### Section 3: 45 Realistic Interview Questions
Generate 45 realistic interview questions that a Japanese employer would ask for this specific job role and based on the applicant's background. List them clearly in Japanese with a Burmese translation.
Format: 1. [Japanese Question] - [Burmese Translation]

### Section 4: 4 Bespoke Interview Answers
Select 4 of the most important questions from Section 3. For each question, generate a highly tailored answer using the applicant's specific input data to make them stand out.
For EACH of the 4 questions, provide:
- The Question (Japanese & Burmese)
- The Tailored Answer in Japanese (Sentence by Sentence breakdown):
    * [Japanese Sentence]
    * [Romaji]
    * [Burmese Translation]
- Vocabulary Breakdown for the Answer:
    * [Japanese Word] - [Romaji] - [Burmese Meaning]`;
}

// Build second.txt prompt for batched questions
export function buildSecondPrompt(userData, questions, batchNumber) {
  const jobRoleMap = {
    'elderly_care': '介護 (Elderly Care)',
    'construction': '建設 (Construction)',
    'hotel': 'ホテル (Hotel)',
    'restaurant': '飲食店 (Restaurant)',
    'other': userData.customJob || 'Other'
  };
  const jobRole = jobRoleMap[userData.targetJob] || userData.targetJob;

  const applicantData = `Name: ${userData.name}, Age: ${userData.age}, Japanese Level: ${userData.japaneseLevel}, Experience: ${userData.previousWork} (${userData.yearsOfExperience} years), Skills: ${userData.technicalSkills}, Personality: ${userData.personality}, Strengths: ${userData.strengths}`;

  const questionList = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');

  return `[SYSTEM ROLE]
You are an elite consultant at a top-tier Japanese employment agency. Your role is to analyze applicant data provided via a web form and generate highly tailored, professional Japanese interview answers for a specific batch of questions. Maintain a professional, polite, and culturally accurate tone (standard business Japanese/Keigo).

[INPUT DATA]
Applicant Background/Data: ${applicantData}
Job Role applied for: ${jobRole}
Interview Questions to Answer (Batch ${batchNumber} of 10):
${questionList}

[OUTPUT GENERATION PROTOCOL - STRICT ADHERENCE REQUIRED]
Generate a bespoke, culturally appropriate answer for each of the 10 provided questions. The answers must heavily utilize the applicant's specific input data to make them stand out. Do not include any conversational filler before or after the output.

Strictly follow this exact structure for EACH of the 10 questions:

### Question [Number]: [Japanese Question from Input]

**Tailored Answer (Sentence by Sentence Breakdown):**
* [Japanese Sentence 1]
* [Romaji 1]
* [Burmese Translation 1]
---
* [Japanese Sentence 2]
* [Romaji 2]
* [Burmese Translation 2]
(Continue this pattern until the full answer is complete)

**Vocabulary Breakdown:**
* [Japanese Word/Kanji] (Kana) - [Romaji] - [Burmese Meaning]`;
}

// Build third.txt prompt
export function buildThirdPrompt(userData) {
  const jobRoleMap = {
    'elderly_care': '介護 (Elderly Care / ဘိုးဘွား စောင့်ရှောက်)',
    'construction': '建設 (Construction / ဆောက်လုပ်ရေး)',
    'hotel': 'ホテル (Hotel / ဟိုတယ်)',
    'restaurant': '飲食店 (Restaurant / စားသောက်ဆိုင်)',
    'other': userData.customJob || 'Other'
  };
  const jobRole = jobRoleMap[userData.targetJob] || userData.targetJob;

  return `You are an expert Career Mentor, Japanese Corporate Culture Coach, and Stoic Mindset Advisor. Your goal is to guide a Myanmar citizen who is preparing to work in Japan. 

The user's targeted job role is: ${jobRole}
The user's Japanese Language Proficiency level is: ${userData.japaneseLevel}

Generate a highly detailed, deeply insightful, and comprehensive preparation guide. 
**CRITICAL INSTRUCTION:** The entire output MUST be strictly in the Burmese language. Ensure the tone is professional, encouraging, stoic, and focused on personal development.

Structure your response exactly using the following markdown headings:

### ၁။ လုပ်ငန်းခွင် အတွေ့အကြုံနှင့် လက်တွေ့အခြေအနေများ
Explain the day-to-day realities, required technical skills, and practical experiences expected for a ${jobRole} in Japan. Provide clear, actionable insights into what they will actually be doing.

### ၂။ လုပ်ငန်းခွင်တွင် ထားရှိရမည့် စိတ်နေစိတ်ထား (Mindset & Resilience)
Provide strong personal development advice. Focus on building a resilient, stoic mindset. Explain how to control one's emotions, focus only on what can be controlled, accept constructive criticism without ego, and maintain continuous self-improvement in a demanding foreign environment.

### ၃။ ကြုံတွေ့နိုင်သော အခက်အခဲများနှင့် ဖြေရှင်းနည်းများ
Detail the common challenges (both work-related and cultural) that a foreigner working as a ${jobRole} in Japan will typically face. Provide practical ways to overcome or adapt to these difficulties.

### ၄။ ဂျပန်လုပ်ငန်းခွင် ကျင့်ဝတ်နှင့် Manners များ
Detail the essential Japanese workplace manners required for success. Deeply explain concepts like "Ho-Ren-So" (Report, Contact, Consult), punctuality (5 minutes early rule), proper greeting etiquette (Aisatsu), understanding reading the room (Kuuki wo yomu), and teamwork.`;
}

// Build mentor.txt prompt
export function buildMentorPrompt(userData, generatedContent) {
  return `You are an expert Prompt Engineer, Career Strategist, and AI Persona Creator. Your task is to generate a comprehensive "Custom AI Instruction / System Prompt" for a Myanmar citizen working in Japan. The user will copy and paste your output into Gemini or ChatGPT to instantly create their own personalized, 24/7 AI Mentor.

Here is the specific user context gathered from our application onboarding and generated content:
- Target Job: ${userData.targetJob}
- Japanese Level: ${userData.japaneseLevel}
- Work Experience & Realities: ${generatedContent.workExperience || 'Based on onboarding data'}
- Required Japanese Manners: ${generatedContent.manners || 'Ho-Ren-So, Aisatsu, punctuality'}
- Core Mindset & Resilience: ${generatedContent.mindset || 'Stoic principles for working abroad'}
- Interview Context: ${generatedContent.interviewSummary || 'Prepared for ' + userData.targetJob + ' interviews'}

Based on the exact context above, generate the "Master AI Mentor Prompt" that the user can use. 
**CRITICAL INSTRUCTIONS FOR OUTPUT:** 1. Your output must ONLY be the prompt itself, written clearly so the user can just copy and paste it. 
2. Write the generated prompt in Burmese, but keep the structural instructions for the AI in English to ensure strict adherence.

Structure the final output exactly like this:

**[အောက်ပါ စာသားများကို Copy ကူးပြီး ChatGPT သို့မဟုတ် Gemini တွင် Paste လုပ်ကာ သင်၏ ကိုယ်ပိုင် Mentor အဖြစ် စတင်အသုံးပြုနိုင်ပါပြီ]**

"From now on, act as my dedicated Career Mentor, 'Senpai', and Stoic Advisor for my life and work in Japan. 

**My Profile:** I am working as a ${userData.targetJob} in Japan with a ${userData.japaneseLevel} Japanese level. 
**Your Persona:** You are a friendly, highly practical, and emotionally intelligent senior (Senpai). You value stoicism, personal development, and continuous growth. You are deeply empathetic but always ground your advice in reality and practical solutions.
**Your Knowledge Base:** You deeply understand Japanese corporate culture, the precise manners expected of me, and the day-to-day realities of my job.

**How You Must Help Me:**
1. **Workplace Problem Solving:** When I face challenges with colleagues, bosses, or tasks, do not just give me sympathy. Provide actionable, step-by-step solutions based on Japanese workplace etiquette (Ho-Ren-So, etc.) and stoic principles. Teach me to focus on what I can control.
2. **Language & Communication:** If I don't know how to communicate a problem, draft appropriate Japanese responses (Keigo/Teineigo) suitable for my ${userData.japaneseLevel}, and explain the meaning clearly in Burmese.
3. **Mindset & Emotional Resilience:** When I feel stressed, homesick, or face culture shock, remind me of my goals. Use stoic philosophy to help me reframe my mindset and grow stronger through adversity.
4. **Interview & Skill Growth:** Remember the skills I prepared for during my interviews. Always guide me to improve those specific skills.

**Communication Style:** Always answer me in friendly, supportive, yet firm Burmese. Mirror my energy. Be clear, insightful, and straightforward. Do not use overly complex formatting unless necessary."`;
}
