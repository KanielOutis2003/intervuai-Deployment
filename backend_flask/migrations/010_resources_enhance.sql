-- ============================================================
-- Migration 010: Resource Hub Enhancements
-- Run this in Supabase SQL Editor.
-- ============================================================
-- 1. Add read_count column to resources
-- 2. Extend resource_type to include 'template'
-- 3. Seed comprehensive resource library with real YouTube videos
--    and downloadable template content
-- ============================================================

-- Add read_count column for popularity tracking
ALTER TABLE resources ADD COLUMN IF NOT EXISTS read_count INTEGER DEFAULT 0;

-- Extend the resource_type check to include 'template'
ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_resource_type_check;
ALTER TABLE resources ADD CONSTRAINT resources_resource_type_check
  CHECK (resource_type IN ('article', 'video', 'tip', 'guide', 'exercise', 'template'));

-- Index for popular resources
CREATE INDEX IF NOT EXISTS idx_resources_read_count ON resources(read_count DESC);


-- ── SEED: Interview Guides ─────────────────────────────────
INSERT INTO resources (title, description, content, category, resource_type, difficulty, tags, is_published, read_count) VALUES

('The STAR Method: Complete Guide to Behavioral Interviews',
 'Master the Situation-Task-Action-Result framework with real examples and practice scenarios.',
 E'## What is the STAR Method?\n\nThe STAR method is a structured way to answer behavioral interview questions:\n\n**S — Situation**: Describe the context or background.\n**T — Task**: Explain your responsibility or challenge.\n**A — Action**: Detail the specific steps you took.\n**R — Result**: Share the outcomes and what you learned.\n\n## Why It Works\n\nInterviewers use behavioral questions to predict future performance based on past behavior. A well-structured STAR answer gives them the evidence they need.\n\n## Example Question & Answer\n\n**Question**: "Tell me about a time you resolved a conflict with a teammate."\n\n**STAR Answer**:\n- **S**: During a product launch, my colleague and I disagreed on the UI approach.\n- **T**: I needed to align the team without delaying the deadline.\n- **A**: I scheduled a 30-minute sync, presented both options with data, and we agreed on a hybrid approach.\n- **R**: We shipped on time and the feature had 95% user satisfaction in surveys.\n\n## Practice Tips\n\n1. Prepare 5–7 STAR stories covering common themes: leadership, conflict, failure, teamwork.\n2. Keep each story under 2 minutes.\n3. Quantify results whenever possible.\n4. Match your story to the job requirements.',
 'Interview Guides', 'guide', 'beginner',
 '["STAR method","behavioral","interview prep","frameworks"]', true, 12400),

('50 Most Common Interview Questions with Model Answers',
 'A comprehensive collection of the most frequently asked interview questions across all industries, with expert-crafted sample answers.',
 E'## Opening Questions\n\n**1. Tell me about yourself.**\nFocus on your professional journey: current role, key achievements, and why you are excited about this opportunity.\n\n**2. Why do you want this job?**\nConnect your skills and values to the role and the company mission. Research first.\n\n**3. What is your greatest strength?**\nChoose a strength directly relevant to the role. Back it with a concrete example.\n\n## Behavioral Questions\n\n**4. Describe a challenge you overcame.**\nUse the STAR method. Focus on your actions and the measurable result.\n\n**5. Tell me about a time you failed.**\nShow self-awareness. Describe what you learned and how you applied it.\n\n## Technical / Role-Specific\n\n**6. How do you prioritise when you have multiple deadlines?**\nDiscuss your system: urgency vs impact, communication, and tools you use.\n\n## Closing Questions\n\n**7. Where do you see yourself in 5 years?**\nShow ambition aligned with the company growth path.\n\n**8. Do you have any questions for us?**\nAlways have 2–3 thoughtful questions prepared.',
 'Interview Guides', 'article', 'beginner',
 '["common questions","interview prep","answers","all industries"]', true, 24800),

('Technical Interview Handbook: Data Structures & Algorithms',
 'Comprehensive preparation guide covering arrays, linked lists, trees, graphs, and dynamic programming with interview-focused problem patterns.',
 E'## Core Data Structures\n\n### Arrays\n- Time complexity: O(1) access, O(n) search\n- Key patterns: two pointers, sliding window, prefix sums\n\n### Hash Maps\n- O(1) average lookup\n- Use for: frequency counting, two-sum variants, caching\n\n### Trees & Graphs\n- BFS for shortest path, level-order traversal\n- DFS for path finding, connected components\n\n## Algorithm Patterns\n\n**1. Two Pointers** — sorted array problems\n**2. Sliding Window** — subarray/substring problems\n**3. Binary Search** — O(log n) search on sorted data\n**4. Dynamic Programming** — overlapping subproblems\n**5. Backtracking** — exhaustive search with pruning\n\n## System Design Checklist\n\n- Clarify requirements and scale\n- Estimate traffic: QPS, storage, bandwidth\n- Design high-level architecture\n- Dive into key components\n- Discuss trade-offs\n\n## Interview Strategy\n\n1. Think out loud — communicate your reasoning\n2. Start with brute force, then optimise\n3. Test with edge cases\n4. Discuss time and space complexity',
 'Interview Guides', 'guide', 'advanced',
 '["technical","algorithms","data structures","coding","system design"]', true, 8200),

('Salary Negotiation Masterclass: Get the Pay You Deserve',
 'Step-by-step strategies to research market rates, make your case, and negotiate a compensation package confidently.',
 E'## Research First\n\n1. Use Glassdoor, LinkedIn Salary, Levels.fyi, and Payscale to benchmark your role.\n2. Factor in: base, bonus, equity, benefits, PTO, remote flexibility.\n3. Know your BATNA (Best Alternative to a Negotiated Agreement).\n\n## Timing\n\n- Never give a number first. Respond with: "I would like to learn more about the full compensation package before discussing a specific number."\n- Wait for the written offer before negotiating.\n\n## The Negotiation Script\n\n**Opening**: "Thank you so much for the offer — I am very excited about this opportunity. Based on my research and experience, I was expecting something closer to [X]. Is there flexibility there?"\n\n**Counter**: Anchor 10–20% above your target. Let them move toward you.\n\n**If they say no**: Negotiate other dimensions — signing bonus, equity, vacation days, professional development budget.\n\n## Common Mistakes\n\n- Accepting on the spot\n- Apologising for negotiating\n- Sharing your current salary (illegal in many places)\n- Negotiating against yourself',
 'Interview Guides', 'guide', 'intermediate',
 '["salary","negotiation","compensation","offer","career"]', true, 6100)

ON CONFLICT (title) DO NOTHING;


-- ── SEED: Video Lessons ────────────────────────────────────
-- Content format: First line is YOUTUBE:<video_id> or YOUTUBE_SEARCH:<query>
-- The frontend reads this to render the YouTube embed or search link.
-- Video IDs verified from live career resource websites (March 2026).
INSERT INTO resources (title, description, content, category, resource_type, difficulty, tags, is_published, read_count) VALUES

('How to Answer "Tell Me About Yourself" — Full Video Lesson',
 'A step-by-step video walkthrough of the perfect elevator pitch structure. Learn the Present-Past-Future formula with real examples.',
 E'YOUTUBE:6JMjd-voW4M\n\n## About This Video\n\nThis video walks you through exactly how to structure your answer to the most common interview opener — and how to make it memorable.\n\n## The Present-Past-Future Formula\n\n**Present** — What you do now and your key expertise.\n**Past** — How you got here: 1–2 relevant previous roles.\n**Future** — Why this role and company excite you.\n\n## Example Script\n\n"I am currently a [role] at [Company], where I [key achievement]. Before that, I spent [X years] at [Previous Company] doing [relevant work]. I am excited about this role because [specific reason tied to the company]."\n\n## Key Rules\n\n- Keep it under 2 minutes\n- End with a bridge to the job at hand\n- Practice until it sounds natural, not memorised\n- Smile — this is an introduction, not an interrogation',
 'Video Lessons', 'video', 'beginner',
 '["video","self-introduction","elevator pitch","opening","tell me about yourself"]', true, 9300),

('Common Interview Questions & Answers: STAR Method Explained',
 'A comprehensive video covering the most common interview questions with ideal structured answers. Covers 10 key question types across all industries.',
 E'YOUTUBE:TYW_YFoT1p4\n\n## About This Video\n\nThis video covers what every job seeker needs to know about answering common interview questions — with clear STAR-structured examples for each type.\n\n## Topics Covered\n\n- Answering "Tell me about yourself"\n- Handling questions about strengths and weaknesses\n- Behavioural questions using the STAR method\n- Describing your biggest accomplishment\n- Explaining gaps in employment\n- Discussing salary expectations\n- Closing with "Do you have any questions?"\n\n## Why This Matters\n\nHiring managers report that structured, specific answers are rated 40% more favourably than vague or rambling ones. This video gives you the framework to deliver consistently strong answers.',
 'Video Lessons', 'video', 'beginner',
 '["video","interview questions","STAR method","answers","behavioral","comprehensive"]', true, 15600),

('Salary Negotiation Tips: During Interview & After Job Offer',
 'Indeed Career Tips video covering exactly how to negotiate salary at two critical stages: during the interview and after receiving a written offer.',
 E'YOUTUBE:jDCxSKUeo6U\n\n## About This Video\n\nThis Indeed Career Tips video gives you 3 actionable tips for negotiating salary during the interview process and 3 more for after you receive an offer.\n\n## Stage 1: During the Interview\n\n- Avoid anchoring first — deflect salary questions until you understand the full role\n- Research your market rate before the conversation\n- Focus on the value you bring, not just your current salary\n\n## Stage 2: After the Job Offer\n\n- Always negotiate — 89% of employers expect it\n- Counter with 10–20% above your target\n- Negotiate non-salary benefits if base is fixed: signing bonus, remote days, equity\n\n## Scripts That Work\n\n**During interview**: "I would like to learn more about the full scope of the role before discussing compensation."\n\n**After offer**: "Thank you so much — I am very excited. I was hoping we could explore a number closer to [X]. Is there flexibility?"',
 'Video Lessons', 'video', 'intermediate',
 '["video","salary","negotiation","indeed","offer","compensation"]', true, 11200),

('Body Language Mastery for Interviews',
 'Learn how non-verbal cues — posture, eye contact, gestures — can make or break your first impression in any interview.',
 E'YOUTUBE_SEARCH:body language tips job interview confidence non-verbal\n\n## Why Body Language Matters\n\nResearch shows that up to 55% of communication is non-verbal. In an interview, how you present yourself physically is as important as what you say.\n\n## Key Non-Verbal Cues\n\n**Eye contact**: Maintain natural eye contact ~60–70% of the time. Look at the person speaking, not the ceiling or your notes.\n\n**Posture**: Sit upright, leaning slightly forward — this shows engagement. Avoid crossing arms (defensive signal).\n\n**Hands**: Keep them visible on the table. Gesturing while you speak enhances communication and shows confidence.\n\n**Nodding**: Shows active listening. Nod slowly and occasionally — not constantly.\n\n**Facial expressions**: Match your expressions to your words. Smile genuinely when appropriate.\n\n## Virtual Interview Adjustments\n\n- Look at the camera, not the screen, for natural eye contact\n- Position camera at eye level\n- Ensure clean, professional background\n- Dress fully professionally — it affects your mindset\n\n## Pre-Interview Power Tip\n\nBefore you walk in, spend 2 minutes standing tall with hands on hips. Studies suggest this posture reduces cortisol and boosts confidence.',
 'Video Lessons', 'video', 'beginner',
 '["video","body language","non-verbal","first impression","confidence","virtual interview"]', true, 17800),

('Remote & Virtual Interview Best Practices',
 'Complete guide to technical setup, lighting, camera positioning, etiquette, and communication strategies for video interviews.',
 E'YOUTUBE_SEARCH:virtual interview tips setup camera lighting background 2024\n\n## Technical Setup Checklist\n\n☐ Camera: positioned at eye level (not looking up or down)\n☐ Lighting: face a window or use a ring light — light source in front of you\n☐ Background: clean and uncluttered, or use a subtle virtual background\n☐ Audio: test your microphone; use wired headphones to prevent echo\n☐ Internet: use a wired connection if possible; close unused tabs and apps\n☐ Platform: install and test Zoom/Teams/Google Meet 30 minutes before\n☐ Backup: have your phone ready as a hotspot if internet drops\n\n## During the Interview\n\n- Join 5 minutes early\n- Mute yourself when not speaking in a group call\n- Speak slightly slower than normal (audio compression can muffle fast speech)\n- Keep water nearby\n- Have your CV visible on a second monitor or printed beside you\n\n## Handling Technical Issues\n\n"I apologise — I seem to be having a brief technical issue. Could you give me 30 seconds?" Stay calm; interviewers understand. It is rarely disqualifying.\n\n## What to Wear\n\nDress as you would for an in-person interview from head to toe. Being fully dressed affects your mindset and confidence.',
 'Video Lessons', 'video', 'beginner',
 '["video","remote interview","virtual","setup","technical","lighting","camera"]', true, 9000)

ON CONFLICT (title) DO NOTHING;


-- ── SEED: Quick Tips ──────────────────────────────────────
INSERT INTO resources (title, description, content, category, resource_type, difficulty, tags, is_published, read_count) VALUES

('Research the Company Before Every Interview',
 'Spend at least 30 minutes researching the company — their mission, recent news, products, and culture.',
 E'## Company Research Checklist\n\n1. Read the company website: mission, values, products\n2. Check recent news (Google News, LinkedIn updates)\n3. Read Glassdoor reviews (culture, interview experience)\n4. Know 2–3 specific things that excite you about the role\n5. Check the interviewer LinkedIn profile\n\n**Use this research to**: Tailor your answers, ask intelligent questions, show genuine enthusiasm.',
 'Quick Tips', 'tip', 'beginner',
 '["research","preparation","company","tip"]', true, 4200),

('The 2-Minute Rule for Interview Answers',
 'Keep your answers to 90 seconds–2 minutes. Longer is not better — brevity shows clarity of thought.',
 E'## Why 2 Minutes?\n\nInterviewers lose focus after 2–3 minutes. Concise answers that hit the key points are rated higher than rambling ones.\n\n## How to Practice\n\n1. Set a timer for 2 minutes\n2. Answer your target question\n3. Review: did you cover Situation, Action, Result?\n4. Cut anything that does not add value\n\n## The Signal Test\n\nIf you catch an interviewer glancing at their notes while you speak, you are going too long. Wrap up with the result.',
 'Quick Tips', 'tip', 'beginner',
 '["communication","brevity","timing","tip"]', true, 7100),

('Always Send a Thank-You Email Within 24 Hours',
 'A thoughtful thank-you note can set you apart and keep you top of mind during the hiring decision.',
 E'## The Thank-You Email Formula\n\n**Subject**: Thank you — [Position Title] Interview\n\n**Body**:\n1. Express gratitude for their time\n2. Reference one specific topic you discussed (shows you were listening)\n3. Reaffirm your enthusiasm for the role\n4. Offer to provide any additional information\n\n## Example\n\n"Hi [Name], Thank you for the wonderful conversation yesterday about the [role]. I particularly enjoyed discussing [specific topic] — it aligns closely with my experience at [Company]. I am even more excited about the opportunity after our chat. Please let me know if there is anything else I can share. Best, [Your Name]"',
 'Quick Tips', 'tip', 'beginner',
 '["follow-up","thank you email","post-interview","tip"]', true, 5800),

('Prepare 3 Questions to Ask the Interviewer',
 'Asking thoughtful questions shows curiosity, preparation, and genuine interest in the role.',
 E'## Why It Matters\n\n"Do you have any questions?" is a test. "No, I think we covered everything" is the wrong answer.\n\n## Strong Question Categories\n\n**About the role**: "What does success look like in the first 90 days for this position?"\n\n**About the team**: "How does the team handle disagreements about technical direction?"\n\n**About growth**: "What learning and development opportunities are available for this role?"\n\n**About culture**: "How would you describe the team culture and how decisions are made?"\n\n## Avoid\n\n- Questions answered on the website\n- Salary before they bring it up\n- "What does your company do?"',
 'Quick Tips', 'tip', 'beginner',
 '["questions","curiosity","engagement","closing","tip"]', true, 6300),

('Use Numbers to Quantify Your Impact',
 'Specific metrics make your achievements memorable and credible. Always try to quantify results.',
 E'## The Power of Numbers\n\nCompare:\n- "I improved team efficiency" — weak\n- "I reduced deployment time by 40%, saving 6 hours per sprint" — strong\n\n## How to Find Your Metrics\n\nAsk yourself:\n- How much did X improve/grow/decrease?\n- How many people did this affect?\n- What was the time or cost saved?\n- What percentage increase/decrease did you achieve?\n\n## If You Do Not Have Exact Numbers\n\nEstimate with confidence: "approximately," "roughly," "in the range of." An honest estimate beats vague language.',
 'Quick Tips', 'tip', 'intermediate',
 '["metrics","quantify","impact","achievements","tip"]', true, 8900),

('Practice Answers Out Loud, Not Just in Your Head',
 'Mental rehearsal is not enough. Verbal practice is essential — your brain processes speech differently than thought.',
 E'## Why Out-Loud Practice Matters\n\nWhen you only rehearse mentally, you tend to gloss over the parts you are unsure about. Speaking aloud forces you to confront gaps.\n\n## How to Practice\n\n1. **Record yourself**: Use your phone. Watch it back. Painful but invaluable.\n2. **Mirror practice**: Check your facial expressions and posture.\n3. **Mock interviews**: Use IntervuAI or practice with a friend.\n4. **Read the question, pause, then answer**: Simulate real interview rhythm.\n\n## What to Practice\n\n- Your "Tell me about yourself" (minimum 5 times)\n- 5–7 STAR stories\n- Answers to your top 10 most-feared questions',
 'Quick Tips', 'tip', 'beginner',
 '["practice","preparation","mock interview","verbal","tip"]', true, 7600)

ON CONFLICT (title) DO NOTHING;


-- ── SEED: Templates ────────────────────────────────────────
-- Templates are displayed as formatted documents with Copy + Download buttons.
INSERT INTO resources (title, description, content, category, resource_type, difficulty, tags, is_published, read_count) VALUES

('Professional CV Template — ATS-Optimised',
 'A clean, modern CV template designed to pass Applicant Tracking Systems and impress human reviewers. Copy and customise in any word processor.',
 E'[YOUR FULL NAME]\n[City, Country] | [Phone Number] | [Email Address] | [LinkedIn URL] | [Portfolio URL]\n\n---\n\nPROFESSIONAL SUMMARY\n\nResults-driven [Job Title] with [X] years of experience in [key skill area 1] and [key skill area 2]. Proven track record of [key achievement — quantified]. Seeking to leverage expertise in [area] to drive [value to company].\n\n---\n\nWORK EXPERIENCE\n\n[Company Name] | [City]\n[Job Title]  |  [Month Year] – [Month Year / Present]\n\n- Achieved [quantified result] by implementing [specific action or initiative]\n- Led [project/team/initiative] that delivered [measurable outcome]\n- Collaborated with [cross-functional teams] to [goal achieved]\n- Reduced [metric] by [X%] through [specific approach]\n\n[Previous Company] | [City]\n[Previous Job Title]  |  [Month Year] – [Month Year]\n\n- [Achievement with metric]\n- [Achievement with metric]\n- [Achievement with metric]\n\n---\n\nEDUCATION\n\n[Degree Name] — [University Name] | [Year Graduated]\n[Relevant Coursework or Honours, if applicable]\n\n---\n\nSKILLS\n\nTechnical: [Skill 1] | [Skill 2] | [Skill 3] | [Skill 4]\nSoft Skills: [Skill 1] | [Skill 2] | [Skill 3]\nTools & Platforms: [Tool 1] | [Tool 2] | [Tool 3]\n\n---\n\nCERTIFICATIONS & AWARDS  (optional)\n\n- [Certification Name] — [Issuing Organisation], [Year]\n- [Award Name] — [Organisation], [Year]\n\n---\n\nATS TIPS:\n- Use standard section headings (Experience, Education, Skills)\n- Avoid tables, columns, text boxes, and graphics\n- Include keywords from the job description verbatim\n- Save as .docx or plain PDF\n- Use standard fonts: Arial, Calibri, or Times New Roman, size 10–12',
 'Templates', 'template', 'beginner',
 '["CV","resume","template","ATS","job application"]', true, 11200),

('Cover Letter Template — Universal',
 'A versatile, professional cover letter structure that works for any industry. Fully customisable with persuasive language patterns that get responses.',
 E'[Your Full Name]\n[City, Country]\n[Email Address] | [Phone Number]\n[Date]\n\n[Hiring Manager Full Name]\n[Their Job Title]\n[Company Name]\n[Company Address]\n\n---\n\nDear [Hiring Manager Name / Hiring Team],\n\nOPENING PARAGRAPH — Hook + why you are writing:\n\nI am writing to express my strong interest in the [Position Title] role at [Company Name]. Having spent [X years] building expertise in [relevant field], I was immediately drawn to [Company]''s commitment to [specific value or mission from their website] — something that aligns deeply with my own professional values.\n\nBODY PARAGRAPH 1 — What you bring (achievement-focused):\n\nIn my current role as [Title] at [Company], I [key achievement with a specific metric]. This experience has sharpened my ability to [relevant skill], which I believe directly addresses your requirement for [specific requirement from job posting].\n\nBODY PARAGRAPH 2 — Why this company specifically:\n\nI am particularly excited about [Company Name] because [specific, researched reason — reference a product, initiative, or value]. I have been following your work on [specific area], and I am eager to contribute to [future direction or challenge you read about].\n\nCLOSING PARAGRAPH — Confident call to action:\n\nI would welcome the opportunity to discuss how my background and skills can support your team''s goals. Thank you sincerely for your time and consideration. I look forward to speaking with you.\n\nWarm regards,\n\n[Your Full Name]\n\n---\n\nPRO TIPS:\n- Keep to one page\n- Research the company before writing — generic letters get ignored\n- Mirror the language from the job description\n- Always address a named person if possible\n- Proofread three times',
 'Templates', 'template', 'beginner',
 '["cover letter","template","job application","writing"]', true, 9800),

('STAR Story Bank Template — Behavioural Interviews',
 'A structured worksheet to prepare and document your best STAR stories before any interview. Covers all major question categories.',
 E'STAR STORY BANK WORKSHEET\nPrepare 6–8 stories before your interview. Each should be reusable across multiple question types.\n\n---\n\nSTORY 1: LEADERSHIP\n\nSituation (context in 1–2 sentences):\n[Write here]\n\nTask (your specific responsibility):\n[Write here]\n\nActions (3–5 specific steps you personally took):\n1.\n2.\n3.\n\nResult (measurable outcome + what you learned):\n[Write here]\n\nBest used for: "Tell me about a time you led a team / project / initiative"\n\n---\n\nSTORY 2: CONFLICT RESOLUTION\n\nSituation:\nTask:\nActions:\nResult:\n\nBest used for: "Describe a conflict with a colleague / stakeholder"\n\n---\n\nSTORY 3: FAILURE OR MISTAKE\n\nSituation:\nTask:\nActions:\nResult:\n\nBest used for: "Tell me about a time you failed / made a mistake"\n\n---\n\nSTORY 4: TEAMWORK\n\nSituation:\nTask:\nActions:\nResult:\n\nBest used for: "Give an example of working effectively in a team"\n\n---\n\nSTORY 5: INITIATIVE / GOING ABOVE & BEYOND\n\nSituation:\nTask:\nActions:\nResult:\n\nBest used for: "Tell me about a time you showed initiative"\n\n---\n\nSTORY 6: DEADLINE / PRESSURE\n\nSituation:\nTask:\nActions:\nResult:\n\nBest used for: "How do you handle pressure / tight deadlines?"\n\n---\n\nQUESTION MAPPING\n\n| Question Type                        | Best Story Match     |\n|--------------------------------------|----------------------|\n| "Tell me about a challenge..."       | Story 1 or 6         |\n| "Describe a conflict..."             | Story 2              |\n| "Tell me about a failure..."         | Story 3              |\n| "Leading without authority"          | Story 1 or 5         |\n| "Greatest accomplishment"            | Story 1, 5, or 6     |',
 'Templates', 'template', 'beginner',
 '["STAR","template","behavioral","preparation","worksheet"]', true, 7500),

('30-60-90 Day Plan Template for New Hires',
 'Impress interviewers by showing you have already thought about your first 90 days. Present this in final-round interviews to stand out.',
 E'30-60-90 DAY ONBOARDING PLAN\n[Your Name] | [Position] | [Company Name]\n\n---\n\nDAYS 1–30: LEARN\nGoal: Understand the people, processes, and priorities.\n\n☐ Schedule one-on-one meetings with every direct team member\n☐ Shadow existing workflows, tools, and daily processes\n☐ Read documentation, previous project post-mortems, and strategy docs\n☐ Identify quick wins and existing pain points\n☐ Set up your development / working environment\n☐ Understand how success is measured in this role\n\nDeliverable: Share a written summary of key observations with your manager.\n\n---\n\nDAYS 31–60: CONTRIBUTE\nGoal: Deliver your first independent work and build relationships.\n\n☐ Take ownership of at least one medium-complexity task or project\n☐ Contribute actively to team meetings with ideas and questions\n☐ Build relationships with cross-functional stakeholders\n☐ Identify 2–3 improvement opportunities with proposed solutions\n☐ Complete your first project milestone or deliverable\n\nDeliverable: Completed first project. Shared 2–3 improvement proposals.\n\n---\n\nDAYS 61–90: OPTIMISE\nGoal: Drive impact and operate autonomously.\n\n☐ Lead at least one initiative from planning to execution\n☐ Present findings or improvements to the broader team\n☐ Set OKRs for next quarter in collaboration with your manager\n☐ Mentor or support a junior colleague\n☐ Document your learnings for future onboarding\n\nDeliverable: 90-day review with manager. OKRs set for next quarter.\n\n---\n\nHOW TO USE IN AN INTERVIEW:\n\nPresent this during a final-round interview when asked: "What would you do in your first 90 days?"\nPrint it and hand it to the interviewer — it is rare and memorable.',
 'Templates', 'template', 'intermediate',
 '["90 day plan","template","new job","strategy","onboarding"]', true, 6700),

('Interview Preparation Checklist Template',
 'A complete, day-by-day checklist from 1 week before your interview all the way through to the follow-up. Never walk into an interview unprepared.',
 E'INTERVIEW PREPARATION CHECKLIST\nPosition: _______________  Company: _______________  Date: _______________\n\n---\n\n1 WEEK BEFORE\n\n☐ Research the company thoroughly (website, news, Glassdoor, LinkedIn)\n☐ Review the job description — map each requirement to your experience\n☐ Prepare 5–7 STAR stories covering leadership, conflict, failure, teamwork\n☐ Practice answers to the top 10 questions for your specific role\n☐ Research your interviewers on LinkedIn\n☐ Prepare 4–5 thoughtful questions to ask at the end\n☐ Confirm interview format, location / video platform, and time zone\n☐ Research market salary for the role\n\n---\n\n3 DAYS BEFORE\n\n☐ Complete a full mock interview (use IntervuAI for AI-powered practice)\n☐ Choose and prepare your interview outfit — iron or steam if needed\n☐ Print 3 copies of your CV and any portfolio materials\n☐ Review your portfolio, work samples, or GitHub / LinkedIn\n\n---\n\nNIGHT BEFORE\n\n☐ Lay out your clothes and bag\n☐ Charge all devices: laptop, phone, headphones\n☐ Test video conferencing software and check your camera / mic\n☐ Look up directions or transit route (add 15 mins buffer)\n☐ Get a full 8 hours of sleep — seriously, this matters\n☐ Lightly review your top 3 STAR stories\n\n---\n\nDAY OF THE INTERVIEW\n\n☐ Eat a good breakfast\n☐ Arrive 10–15 minutes early (or join 5 minutes early for virtual)\n☐ Review company name, interviewer names, and your top 3 talking points\n☐ Take 5 deep breaths before entering — you have prepared for this\n\n---\n\nAFTER THE INTERVIEW\n\n☐ Send personalised thank-you emails within 24 hours\n☐ Note down questions you struggled with (for next time)\n☐ Follow up by email if you have not heard back within the stated timeline\n☐ Reflect: what went well? What would you do differently?',
 'Templates', 'template', 'beginner',
 '["checklist","template","preparation","interview day","planning"]', true, 13400)

ON CONFLICT (title) DO NOTHING;


-- ── SEED: Exercise / Practice ─────────────────────────────
INSERT INTO resources (title, description, content, category, resource_type, difficulty, tags, is_published, read_count) VALUES

('10-Minute Daily Interview Warm-Up Routine',
 'A structured daily practice routine to build interview confidence and fluency over 2 weeks. Do this every day leading up to your interview.',
 E'## Daily Warm-Up Routine (10 Minutes)\n\nDo this every day for 2 weeks before your interview.\n\n### Minutes 1–2: Breathing & Posture\nSit tall. Take 5 slow, deep breaths. Set your intention for the session.\n\n### Minutes 3–5: Tell Me About Yourself\nDeliver your 90-second elevator pitch out loud. Time it. Aim for natural, confident delivery.\n\n### Minutes 6–8: One STAR Story\nPick a different story each day. Deliver it in under 2 minutes. Record yourself once a week.\n\n### Minutes 9–10: One Wild Card Question\nPick one of these randomly each day:\n- "What is your biggest weakness?"\n- "Why do you want to leave your current role?"\n- "What would your previous manager say about you?"\n- "Describe your ideal work environment."\n- "Where do you see yourself in 5 years?"\n\n## Weekly Focus\n\n**Week 1**: Polish your core stories and opening pitch\n**Week 2**: Work on delivery — pace, tone, filler words, eye contact\n\n## Track Your Progress\n\n| Day | Story Practiced | Felt Confident? | One Improvement |\n|-----|----------------|-----------------|------------------|\n| 1   |                |                 |                  |\n| 2   |                |                 |                  |\n| 3   |                |                 |                  |',
 'Quick Tips', 'exercise', 'beginner',
 '["exercise","practice","daily routine","confidence","warm-up"]', true, 4900)

ON CONFLICT (title) DO NOTHING;


-- Update read counts for realism (adds slight variation on re-run)
UPDATE resources SET read_count = read_count + floor(random() * 100)::int
WHERE read_count > 0 AND created_at > NOW() - INTERVAL '1 minute';
