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

// JLPT-level specific language guidelines
function getJLPTGuidelines(level) {
  const guidelines = {
    'N5': {
      grammar: 'Use only basic grammar: です/ます form, は/が/を/に/で particles, simple て-form, たい form. Avoid complex sentence structures.',
      vocabulary: 'Use only the most basic ~800 words. Stick to common everyday words. Avoid compound words and abstract concepts.',
      kanji: 'Use only ~100 basic kanji (N5 kanji list). Write all other kanji in hiragana. Add furigana-style kana readings in parentheses for ALL kanji used.',
      complexity: 'Keep sentences very short (5-10 words max). Use simple subject-verb-object patterns. One idea per sentence.',
      example: 'わたしは マウン マウン です。(Watashi wa Maung Maung desu.) ミャンマーから きました。(Myanmar kara kimashita.)',
      note: 'This applicant is a complete beginner. Use the simplest possible Japanese. Prioritize being understood over sounding professional.'
    },
    'N4': {
      grammar: 'Use basic-intermediate grammar: て-form connections, ～たことがある, ～ている, ～たい, conditional ～たら, ～ので/から for reasons. Avoid keigo beyond です/ます.',
      vocabulary: 'Use approximately ~1,500 common words. Include basic workplace vocabulary. Avoid specialized or literary terms.',
      kanji: 'Use ~300 kanji (N5+N4 kanji list). Add kana readings in parentheses for N4-level kanji that might be unfamiliar.',
      complexity: 'Keep sentences moderate length (8-15 words). Can connect two simple clauses. Use basic conjunctions.',
      example: 'わたしは ミャンマーで 3年間(ねんかん) 電気(でんき)の しごとを した ことが あります。',
      note: 'This applicant has elementary-level Japanese. Use clear, direct language. Compound sentences are OK but keep them simple.'
    },
    'N3': {
      grammar: 'Use intermediate grammar: ～ようにする, ～ことができる, ～と思います, ～ために, passive form, causative basics, ～ようと思っています. Light honorific language (丁寧語) is appropriate.',
      vocabulary: 'Use ~3,000 words including workplace-specific terms. Can use some abstract concepts like 責任, 協力, 努力.',
      kanji: 'Use ~650 kanji (N5-N3 kanji list). Only add readings for uncommon or compound kanji.',
      complexity: 'Sentences can be moderate-complex (10-20 words). Multiple clause connections are fine. Can express opinions and reasons naturally.',
      example: '介護の仕事は大変だと思いますが、お年寄りの方々のお役に立てるように一生懸命頑張りたいと思っています。',
      note: 'This applicant has intermediate Japanese. Content should sound natural and somewhat professional. Can handle moderate complexity.'
    },
    'N2': {
      grammar: 'Use upper-intermediate grammar freely: 尊敬語/謙譲語 (honorific/humble forms), ～にもかかわらず, ～に対して, ～一方で, ～をはじめ, formal expressions. Use appropriate keigo for interview settings.',
      vocabulary: 'Use ~6,000 words. Include business Japanese terms: ご対応, お打ち合わせ, ご確認, 取り組む, 心がける.',
      kanji: 'Use ~1,000 kanji freely. No need for readings except for rare kanji.',
      complexity: 'Full complex sentences are appropriate. Can use sophisticated expressions, compound-complex sentences, and nuanced language.',
      example: '前職では電気工事の分野で3年間従事しておりまして、チームワークを大切にしながら安全管理にも積極的に取り組んでまいりました。',
      note: 'This applicant has advanced Japanese. Content should sound professional and polished. Use proper keigo consistently in interview contexts.'
    },
    'N1': {
      grammar: 'Use all grammar patterns freely including literary and formal expressions: ～ものの, ～にほかならない, ～ざるを得ない, ～どころか, full keigo system. Write as a near-native speaker.',
      vocabulary: 'Use full vocabulary range (~10,000+ words). Include idiomatic expressions, four-character compounds (四字熟語), and industry-specific terminology.',
      kanji: 'Use all standard kanji (~2,000+) freely. No readings needed.',
      complexity: 'Native-level sentence structures. Elegant, nuanced expressions. Can use rhetorical devices, subtle implications, and sophisticated transitions.',
      example: '前職におきましては、電気工事の分野で3年間にわたり実務経験を積んでまいりました。困難な状況に直面した際も、持ち前の粘り強さと協調性を活かしながら、チーム全体の生産性向上に貢献できたものと自負しております。',
      note: 'This applicant has near-native Japanese. Content should be indistinguishable from a Japanese applicant. Use sophisticated, native-level language.'
    }
  };

  return guidelines[level] || guidelines['N4'];
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
  const jlpt = getJLPTGuidelines(userData.japaneseLevel);

  return `[SYSTEM ROLE]
You are an elite consultant at a top-tier Japanese employment agency specializing in preparing Myanmar workers for Japanese interviews. Your expertise covers Japanese business culture, interview techniques, and language coaching. Generate a comprehensive, highly structured interview preparation package.

[APPLICANT DATA]
${applicantData}
Job Role Applied For: ${jobRole}

[CRITICAL: JAPANESE LANGUAGE LEVEL ADAPTATION]
The applicant's Japanese level is ${userData.japaneseLevel}. You MUST strictly adapt ALL Japanese output to match this level:

- GRAMMAR: ${jlpt.grammar}
- VOCABULARY: ${jlpt.vocabulary}
- KANJI: ${jlpt.kanji}
- SENTENCE COMPLEXITY: ${jlpt.complexity}
- REFERENCE EXAMPLE: ${jlpt.example}
- NOTE: ${jlpt.note}

This is the MOST IMPORTANT rule. Every Japanese sentence you generate MUST be readable and understandable by a ${userData.japaneseLevel} level learner. Do NOT write Japanese beyond their level.

[CRITICAL OUTPUT RULES]
- DO NOT use any Markdown formatting symbols (no #, ##, ###, **, *, ---, etc.)
- Use plain text with clear section labels
- Use numbered lists (1. 2. 3.) and bullet points (- ) only
- Keep formatting clean and readable as plain text
- All content must be highly personalized using the applicant's specific data

[OUTPUT STRUCTURE - Follow Exactly]

=== SECTION 1: SELF-INTRODUCTION (自己紹介 - Jikoshōkai) ===

Write a professional, culturally appropriate Japanese self-introduction for this specific applicant and job role. Use polite form appropriate for ${userData.japaneseLevel} level. Make it personal and specific.

Format the self-introduction in THREE parts:

[Japanese]
(Write the full self-introduction in Japanese here - MUST match ${userData.japaneseLevel} level)

[Romaji]
(Write the full Romaji reading of the Japanese text above)

[Burmese Translation]
(Write the full Burmese translation here)

=== SECTION 2: VOCABULARY BREAKDOWN ===

List all important vocabulary from the self-introduction. Format each entry as:
- [Kanji/Japanese] ([Kana Reading]) / [Romaji] / [Burmese Meaning]

=== SECTION 3: 45 INTERVIEW QUESTIONS ===

Generate exactly 45 realistic interview questions that a Japanese employer would ask for this specific ${jobRole} role. Questions should be tailored to the applicant's background.

IMPORTANT: The Japanese in questions must match ${userData.japaneseLevel} level complexity.

Format each question as:
1. [Japanese Question] / [Burmese Translation]
2. [Japanese Question] / [Burmese Translation]
(continue to 45)

=== SECTION 4: 4 DETAILED INTERVIEW ANSWERS ===

Select the 4 most critical questions from Section 3. For each, provide a highly tailored answer that makes this specific applicant stand out.

IMPORTANT: All Japanese answers MUST use grammar and vocabulary appropriate for ${userData.japaneseLevel} level.

Format each answer as:

QUESTION [Number]: [Japanese Question]
([Burmese Translation of Question])

ANSWER:

Sentence 1:
  Japanese: [Japanese sentence - ${userData.japaneseLevel} level]
  Romaji: [Romaji reading]
  Burmese: [Burmese translation]

Sentence 2:
  Japanese: [Japanese sentence - ${userData.japaneseLevel} level]
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
  const jlpt = getJLPTGuidelines(userData.japaneseLevel);

  const applicantSummary = `Name: ${userData.name}, Age: ${userData.age}, Japanese Level: ${userData.japaneseLevel}, Previous Work: ${userData.previousWork} (${userData.yearsOfExperience} years), Skills: ${userData.technicalSkills}, Personality: ${userData.personality}, Strengths: ${userData.strengths}, Weaknesses: ${userData.weaknesses}`;

  const questionList = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');

  return `[SYSTEM ROLE]
You are an elite Japanese interview coach specializing in preparing Myanmar workers. Generate highly tailored, professional Japanese interview answers for this specific batch of questions. Every answer must use the applicant's actual background data to create authentic, personalized responses.

[APPLICANT DATA]
${applicantSummary}
Job Role: ${jobRole}

[CRITICAL: JAPANESE LANGUAGE LEVEL ADAPTATION]
The applicant's Japanese level is ${userData.japaneseLevel}. STRICTLY follow these rules for ALL Japanese output:

- GRAMMAR: ${jlpt.grammar}
- VOCABULARY: ${jlpt.vocabulary}
- KANJI: ${jlpt.kanji}
- SENTENCE COMPLEXITY: ${jlpt.complexity}
- NOTE: ${jlpt.note}

Every Japanese sentence MUST be appropriate for a ${userData.japaneseLevel} learner. Do NOT exceed their level.

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
  Japanese: [Japanese sentence - ${userData.japaneseLevel} level]
  Romaji: [Romaji reading]
  Burmese: [Burmese translation]

Sentence 2:
  Japanese: [Japanese sentence - ${userData.japaneseLevel} level]
  Romaji: [Romaji reading]
  Burmese: [Burmese translation]

(Continue for all sentences)

Key Vocabulary:
- [Japanese Word] / [Romaji] / [Burmese Meaning]

---

(Repeat this exact format for all ${questions.length} questions)`;
}

// ==========================================
// third.txt — Work Experience, Mindset, Manners (UPGRADED)
// ==========================================
export function buildThirdPrompt(userData) {
  const jobRole = getJobRole(userData);
  const jlpt = getJLPTGuidelines(userData.japaneseLevel);

  return `[SYSTEM ROLE]
You are an expert Career Mentor, Japanese Corporate Culture Coach, and Stoic Mindset Advisor with 20+ years of experience guiding Myanmar workers in Japan. You have trained thousands of workers and know exactly what challenges they face.

[CONTEXT]
Target Job Role: ${jobRole}
Japanese Language Level: ${userData.japaneseLevel}
Previous Experience: ${userData.previousWork} (${userData.yearsOfExperience} years)
Personality: ${userData.personality}
Strengths: ${userData.strengths}

[JAPANESE LEVEL NOTE]
When providing Japanese terms, ensure they match ${userData.japaneseLevel} level:
- ${jlpt.grammar}
- ${jlpt.vocabulary}
- ${jlpt.kanji}
For each Japanese phrase, include: Japanese / Romaji / Burmese.

[CRITICAL OUTPUT RULES]
- Output in Burmese (except Japanese phrases)
- NO Markdown formatting (no #, **, *, etc.)
- Plain text with section labels
- Each section: minimum 15-20 detailed bullet points
- Be EXTREMELY detailed — this is a premium product

[OUTPUT STRUCTURE]

=== ၁။ Interview တွင် လိုက်နာရမည့် Manners များ ===

Interview မတိုင်ခင်၊ အတွင်း၊ ပြီးနောက် manners:
- ဝတ်ဆင်ရမည့် အဝတ်အစား (suit, tie, shoes, bag)
- ဆံပင်ပုံစံ၊ လက်သည်း၊ သန့်ရှင်းရေး
- Interview room ထဲဝင်နည်း (shitsurei shimasu / 失礼します)
- ဦးညွတ်ခြင်း (Ojigi / お辞儀) - 15°, 30°, 45° ဘယ်အခါသုံးရမလဲ
- ထိုင်ခုံပေါ် ထိုင်ပုံ (posture, hand placement)
- မျက်လုံးချင်းဆုံခြင်း - ဘယ်လောက်ကြာကြည့်ရမလဲ
- စကားပြောပုံ (voice tone, speed, clarity)
- Resume/CV တင်ပြနည်း (ryoureki-sho / 履歴書)
- Interview ပြီးဆုံးပုံ (standing, bowing, closing door)
- Thank you email / follow-up manners

=== ၂။ ${jobRole} အလုပ်၏ နေ့စဉ်လုပ်ငန်းတာဝန်များ ===

Morning preparation ကနေ evening အထိ:
- Arrival time, changing clothes, chorei/朝礼 morning meeting
- Main work tasks (hour by hour)
- Break time manners
- Lunch time etiquette
- Afternoon duties
- End of day routine (reporting, souji/掃除)
- Overtime culture and expectations

=== ၃။ ဂျပန် လုပ်ငန်းခွင် ကျင့်ဝတ်နှင့် Manners များ ===

- Ho-Ren-So (報連相) - Houkoku, Renraku, Soudan - ဥပမာနှင့်
- Punctuality (5 minutes early rule)
- Aisatsu (挨拶) - morning, afternoon, leaving, returning greetings
- Kuuki wo Yomu (空気を読む) - practical examples
- Senpai-Kouhai (先輩後輩) system
- 5S system (整理, 整頓, 清掃, 清潔, 躾) - each explained
- Apology culture - すみません vs ごめんなさい vs 申し訳ございません
- Phone etiquette
- Email writing basics
- Meeting manners

=== ၄။ ဂျပန်နေထိုင်ရေး လက်တွေ့ အတွေ့အကြုံများ ===

- အိမ်ငှားရမ်းခြင်း (apartment rules, key money, guarantor)
- အိမ်နီးချင်းဆက်ဆံရေး (greetings, noise, garbage rules)
- အမှိုက်စွန့်ပစ်ခြင်း (burnable, non-burnable, recyclable)
- သယ်ယူပို့ဆောင်ရေး (trains, IC cards, manners)
- Healthcare system
- Banking and money management
- Seasonal preparation (earthquakes, typhoons)

=== ၅။ ခံစားချက်ထိန်းချုပ်မှုနှင့် စိတ်ဓာတ်ခွန်အား ===

Stoic philosophy advice:
- Dichotomy of Control
- Criticism ကို ego မပါဘဲ လက်ခံခြင်း
- Homesickness ကိုင်တွယ်နည်း
- Culture shock stages and coping
- Kaizen (改善) mindset
- Mental health resources in Japan

=== ၆။ ကြုံတွေ့နိုင်သော အခက်အခဲများနှင့် ဖြေရှင်းနည်းများ ===

- ဘာသာစကား အတားအဆီးများ
- ယဉ်ကျေးမှု ကွဲပြားမှု
- Power harassment (パワハラ) ကိုင်တွယ်နည်း
- Work-life balance
- Money management and remittance
- Emergency contacts

=== ၇။ ဆက်ဆံရေး နှင့် Communication ===

- Boss/Manager ဆက်ဆံပုံ
- Colleague/Team member ဆက်ဆံပုံ
- Customer service manners
- Request/Decline etiquette
- Nomikai (飲み会) party manners
- Gift giving culture

=== ၈။ Career Growth Path ===

- Long-term career planning in Japan
- Skill certifications
- Japanese improvement roadmap (${userData.japaneseLevel} to next level)
- Career advancement paths for ${jobRole}

For all Japanese terms, provide reading and meaning for ${userData.japaneseLevel} level.`;
}

// ==========================================
// mentor.txt — AI Master Prompt
// ==========================================
export function buildMentorPrompt(userData, generatedContent) {
  const jlpt = getJLPTGuidelines(userData.japaneseLevel);

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

MY JAPANESE ABILITY:
My current JLPT level is ${userData.japaneseLevel}. When teaching me Japanese or drafting responses for me, you MUST follow these constraints:
- Grammar scope: ${jlpt.grammar}
- Vocabulary scope: ${jlpt.vocabulary}
- Kanji usage: ${jlpt.kanji}
- Sentence complexity: ${jlpt.complexity}
Never use Japanese beyond my current level. If a concept requires higher-level Japanese, explain it in simpler terms first, then optionally show the advanced version as a learning opportunity.

YOUR PERSONA:
You are a friendly, highly practical, and emotionally intelligent senior (Senpai). You value stoicism, personal development, and continuous growth. You are deeply empathetic but always ground your advice in reality and practical solutions. You deeply understand Japanese corporate culture, workplace manners, and the day-to-day realities of my ${userData.targetJob} job.

HOW YOU MUST HELP ME:

1. WORKPLACE PROBLEM SOLVING:
When I face challenges with colleagues, bosses, or tasks, provide actionable, step-by-step solutions based on Japanese workplace etiquette (Ho-Ren-So, etc.) and stoic principles. Teach me to focus on what I can control.

2. LANGUAGE & COMMUNICATION:
If I don't know how to communicate something, draft appropriate Japanese responses suitable for my ${userData.japaneseLevel} level. Always provide: Japanese text, Romaji reading, and Burmese explanation. Gradually introduce slightly higher-level expressions to help me grow.

3. MINDSET & EMOTIONAL RESILIENCE:
When I feel stressed, homesick, or face culture shock, remind me of my goals. Use stoic philosophy to help me reframe my mindset. Never just sympathize — always provide a practical path forward.

4. INTERVIEW & SKILL GROWTH:
Remember the skills I prepared for during my interviews. Guide me to continuously improve those specific skills in real work situations.

5. DAILY JAPANESE PRACTICE:
Help me learn practical Japanese phrases I need for work. Focus on workplace-specific vocabulary and natural expressions at my ${userData.japaneseLevel} level. When I master a phrase, suggest the next-level version.

COMMUNICATION STYLE:
- Always answer in friendly, supportive, yet firm Burmese
- When teaching Japanese, always provide: Japanese / Romaji / Burmese
- All Japanese must match my ${userData.japaneseLevel} level unless explicitly teaching new content
- Mirror my energy level
- Be clear, insightful, and straightforward
- Keep responses practical and actionable"`;
}

// ==========================================
// Interview Test Mode — Select 10 Random Questions
// ==========================================
export function buildTestQuestionsPrompt(questions) {
  const qaList = questions.map((q, i) => `Q${i+1}: ${q.japanese || q}`).join('\n');

  return `[SYSTEM ROLE]
You are an interview test coordinator. Select exactly 10 questions randomly from the list below. Mix easy, medium, and hard questions.

[FULL QUESTION LIST]
${qaList}

[OUTPUT RULES]
- DO NOT use Markdown formatting
- Output ONLY the 10 selected questions, numbered 1-10
- Format each as: [Number]. [Japanese Question] / [Burmese Translation]
- Mix different types of questions
- Do NOT select questions that are too similar

[OUTPUT FORMAT]
1. [Japanese Question] / [Burmese Translation]
2. [Japanese Question] / [Burmese Translation]
(continue to 10)`;
}

// ==========================================
// Interview Test Mode — Evaluate User Answers
// ==========================================
export function buildTestEvaluatePrompt(userData, testResults) {
  const jlpt = getJLPTGuidelines(userData.japaneseLevel);

  const resultsText = testResults.map((r, i) => `
Question ${i+1}: ${r.question}
User's Japanese Answer: ${r.japaneseAnswer || '(မဖြေပါ)'}
User's Burmese Answer: ${r.burmeseAnswer || '(မဖြေပါ)'}
`).join('\n---\n');

  return `[SYSTEM ROLE]
You are a strict but encouraging Japanese interview evaluator. Evaluate the user's practice interview answers and provide detailed feedback.

[APPLICANT INFO]
Name: ${userData.name}
Japanese Level: ${userData.japaneseLevel}
Target Job: ${userData.targetJob}

[JAPANESE LEVEL CONTEXT]
Expected level: ${userData.japaneseLevel}
- ${jlpt.grammar}
- ${jlpt.vocabulary}

[TEST RESULTS]
${resultsText}

[CRITICAL OUTPUT RULES]
- Write feedback in Burmese language
- DO NOT use Markdown formatting (no #, ##, ###, **, *, etc.)
- Use plain text with clear labels
- Be honest but encouraging
- For each question, provide: score, feedback, and a model answer

[OUTPUT FORMAT]

=== Interview Test ရလဒ် ===

Overall Score: [X/100]
Overall Comment: [Burmese feedback on overall performance]

---

Question 1: [Restate the question]

Score: [X/10]
Feedback: [Burmese feedback]

Model Answer:
  Japanese: [Correct answer at ${userData.japaneseLevel} level]
  Romaji: [Romaji reading]
  Burmese: [Burmese translation]

---

(Repeat for all 10 questions)

=== အကြံပြုချက်များ ===

[3-5 specific improvement tips in Burmese]`;
}
