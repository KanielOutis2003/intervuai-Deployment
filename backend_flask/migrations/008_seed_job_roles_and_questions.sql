-- ============================================================
-- Migration 008: Seed Job Roles and Question Bank
-- Run this in Supabase SQL Editor.
-- Uses ON CONFLICT DO NOTHING so it is safe to re-run.
-- ============================================================


-- ── JOB ROLES ──────────────────────────────────────────────
-- Technology
INSERT INTO job_roles (title, category, description, required_skills, is_active) VALUES
('Software Engineer',         'Technology', 'Designs, builds, and maintains software systems and applications.',         '["Programming","Data Structures","Algorithms","System Design","Testing"]',         true),
('Frontend Developer',        'Technology', 'Builds user interfaces and client-side web applications.',                 '["HTML","CSS","JavaScript","React","Responsive Design","UX Principles"]',        true),
('Backend Developer',         'Technology', 'Develops server-side logic, APIs, and database integrations.',             '["Node.js","Python","REST APIs","SQL","Authentication","Server Architecture"]',   true),
('Full Stack Developer',      'Technology', 'Works across the full technology stack from UI to database.',              '["Frontend","Backend","Databases","APIs","DevOps basics","Git"]',                 true),
('Mobile Developer',          'Technology', 'Builds mobile applications for iOS and/or Android platforms.',             '["React Native","Swift","Kotlin","Mobile UX","App Store Deployment"]',            true),
('iOS Developer',             'Technology', 'Develops native applications for Apple iOS and macOS platforms.',           '["Swift","Objective-C","Xcode","UIKit","SwiftUI","App Store Guidelines"]',         true),
('Android Developer',         'Technology', 'Develops native applications for the Android platform.',                   '["Kotlin","Java","Android Studio","Jetpack Compose","Google Play"]',             true),
('Data Scientist',            'Technology', 'Extracts insights from data using statistical and ML techniques.',          '["Python","Machine Learning","Statistics","SQL","Data Visualization","NLP"]',     true),
('Data Analyst',              'Technology', 'Analyzes datasets to generate actionable business insights.',               '["SQL","Excel","Tableau","Python","Statistical Analysis","Reporting"]',           true),
('Machine Learning Engineer', 'Technology', 'Builds, trains, and deploys machine learning models at scale.',             '["Python","TensorFlow","PyTorch","MLOps","Statistics","Cloud Platforms"]',        true),
('AI Engineer',               'Technology', 'Develops AI-powered systems and integrates LLMs into products.',           '["LLMs","Prompt Engineering","Python","APIs","Vector Databases","RAG"]',          true),
('DevOps Engineer',           'Technology', 'Manages CI/CD pipelines, infrastructure, and deployment automation.',      '["Docker","Kubernetes","CI/CD","Terraform","Linux","Cloud Platforms","Monitoring"]', true),
('Cloud Architect',           'Technology', 'Designs and oversees cloud infrastructure strategy and implementation.',   '["AWS","Azure","GCP","IaC","Security","Networking","Cost Optimization"]',         true),
('Cloud Engineer',            'Technology', 'Implements and maintains cloud infrastructure and services.',              '["AWS","Azure","GCP","Terraform","Ansible","Networking","Linux"]',               true),
('Site Reliability Engineer', 'Technology', 'Ensures system reliability, scalability, and performance in production.',  '["SRE","Monitoring","Incident Response","SLOs","Linux","Automation","Kubernetes"]', true),
('Cybersecurity Analyst',     'Technology', 'Protects systems and data from cyber threats and vulnerabilities.',         '["Network Security","Penetration Testing","SIEM","Incident Response","CompTIA"]',  true),
('QA Engineer',               'Technology', 'Ensures software quality through manual and automated testing.',           '["Test Planning","Selenium","JIRA","Bug Reporting","Regression Testing"]',        true),
('Test Automation Engineer',  'Technology', 'Builds automated test frameworks to accelerate the QA pipeline.',          '["Selenium","Cypress","Python","Java","CI/CD","API Testing","Frameworks"]',       true),
('Systems Architect',         'Technology', 'Designs enterprise-level system architectures and technical roadmaps.',    '["System Design","Architecture Patterns","Cloud","Security","Leadership"]',       true),
('Network Engineer',          'Technology', 'Designs, implements, and manages computer networks.',                      '["TCP/IP","Cisco","Routing","Switching","Firewalls","VPN","Troubleshooting"]',    true),
('Database Administrator',    'Technology', 'Manages, optimises, and secures database systems.',                        '["SQL","PostgreSQL","MySQL","MongoDB","Backup","Performance Tuning"]',           true),
('IT Support Specialist',     'Technology', 'Provides technical support and troubleshooting for end users.',             '["Help Desk","Windows","Active Directory","Networking","Customer Service"]',      true),
('IT Manager',                'Technology', 'Oversees IT infrastructure, teams, and technology strategy.',              '["IT Strategy","Team Management","Budgeting","Vendor Management","Security"]',   true),
('Product Manager',           'Technology', 'Defines product vision, roadmap, and collaborates across teams.',          '["Product Strategy","Roadmapping","Agile","Stakeholder Management","Analytics"]',  true),
('Product Designer',          'Technology', 'Creates user-centred product designs from research to high-fidelity UI.',  '["Figma","UX Research","Prototyping","Design Systems","User Testing"]',          true),
('UX/UI Designer',            'Technology', 'Designs user interfaces and ensures a positive user experience.',          '["Figma","Sketch","Wireframing","Usability Testing","CSS basics","Accessibility"]', true),
('UX Researcher',             'Technology', 'Conducts user research to inform product and design decisions.',           '["User Interviews","Usability Testing","Survey Design","Data Analysis"]',        true),
('Scrum Master',              'Technology', 'Facilitates agile ceremonies and removes impediments for the team.',        '["Scrum","Kanban","Jira","Facilitation","Coaching","Conflict Resolution"]',       true),
('Technical Program Manager', 'Technology', 'Leads complex technical programmes across multiple engineering teams.',    '["Programme Management","Risk Management","Stakeholder Communication","Agile"]',  true)
ON CONFLICT DO NOTHING;

-- Healthcare
INSERT INTO job_roles (title, category, description, required_skills, is_active) VALUES
('Registered Nurse',          'Healthcare', 'Provides direct patient care and medical support in clinical settings.',   '["Patient Assessment","Clinical Protocols","IV Therapy","EMR Systems","Empathy"]', true),
('Doctor / Physician',        'Healthcare', 'Diagnoses and treats medical conditions; provides patient care.',          '["Clinical Diagnosis","Medical Knowledge","Patient Communication","Ethics"]',     true),
('Medical Assistant',         'Healthcare', 'Supports physicians with administrative and basic clinical tasks.',         '["Vital Signs","EHR","Phlebotomy","Medical Terminology","Scheduling"]',          true),
('Pharmacist',                'Healthcare', 'Dispenses medications and advises patients on drug therapies.',             '["Pharmacology","Drug Interactions","Patient Counselling","Dispensing Systems"]', true),
('Physical Therapist',        'Healthcare', 'Helps patients recover movement and manage pain through rehabilitation.',   '["Exercise Therapy","Anatomy","Patient Assessment","Rehabilitation Protocols"]',  true),
('Occupational Therapist',    'Healthcare', 'Helps patients develop or recover daily living and work skills.',           '["Activity Analysis","Adaptive Equipment","Goal Setting","Documentation"]',      true),
('Radiologic Technologist',   'Healthcare', 'Performs diagnostic imaging procedures such as X-rays and MRIs.',          '["Imaging Equipment","Radiation Safety","Patient Positioning","PACS Systems"]',  true),
('Healthcare Administrator',  'Healthcare', 'Manages healthcare facility operations, staff, and compliance.',           '["Healthcare Policy","Budgeting","HR Management","Regulatory Compliance"]',      true),
('Clinical Data Analyst',     'Healthcare', 'Analyses clinical data to support research and healthcare decisions.',     '["SQL","Excel","SAS","Clinical Trials","Data Governance","HIPAA"]',             true),
('Medical Coder',             'Healthcare', 'Translates medical procedures and diagnoses into standardised codes.',     '["ICD-10","CPT Coding","Medical Terminology","Compliance","EHR Systems"]',       true)
ON CONFLICT DO NOTHING;

-- BPO / Customer Service
INSERT INTO job_roles (title, category, description, required_skills, is_active) VALUES
('Customer Service Representative', 'BPO / Customer Service', 'Handles customer inquiries, complaints, and provides support.',               '["Communication","Problem Solving","CRM Systems","Active Listening","Patience"]',  true),
('Call Center Agent',               'BPO / Customer Service', 'Handles inbound/outbound calls to assist or sell to customers.',               '["Verbal Communication","Call Handling","Product Knowledge","Typing Speed"]',       true),
('Technical Support Specialist',    'BPO / Customer Service', 'Provides technical troubleshooting and support to customers.',                 '["Technical Knowledge","Communication","Troubleshooting","Ticketing Systems"]',    true),
('Team Leader (BPO)',               'BPO / Customer Service', 'Leads a team of agents, monitors KPIs, and drives performance.',               '["Leadership","Coaching","KPI Management","Escalation Handling","Scheduling"]',    true),
('Quality Analyst (BPO)',           'BPO / Customer Service', 'Evaluates call quality and agent performance to ensure service standards.',     '["Quality Frameworks","Call Monitoring","Reporting","Coaching","Attention to Detail"]', true),
('Account Manager',                 'BPO / Customer Service', 'Manages client relationships and ensures satisfaction and retention.',          '["Relationship Management","Communication","Problem Solving","Sales"]',            true),
('Customer Success Manager',        'BPO / Customer Service', 'Ensures customers achieve their goals using the product or service.',           '["Onboarding","Relationship Building","Data Analysis","Upselling","CRM"]',         true)
ON CONFLICT DO NOTHING;

-- Finance
INSERT INTO job_roles (title, category, description, required_skills, is_active) VALUES
('Financial Analyst',    'Finance', 'Analyses financial data to support business decisions and forecasting.',     '["Financial Modelling","Excel","Valuation","Forecasting","SQL","PowerPoint"]',       true),
('Accountant',           'Finance', 'Maintains financial records, prepares reports, and ensures compliance.',     '["GAAP","QuickBooks","Excel","Tax Preparation","Reconciliation","Auditing"]',       true),
('Auditor',              'Finance', 'Examines financial statements and internal controls for accuracy.',           '["Audit Procedures","Risk Assessment","GAAP","Compliance","Analytical Skills"]',    true),
('Investment Banker',    'Finance', 'Advises clients on capital raising, M&A, and financial structuring.',        '["Financial Modelling","Valuation","M&A","Capital Markets","Excel","Pitch Decks"]', true),
('Risk Analyst',         'Finance', 'Identifies and assesses financial, operational, and compliance risks.',      '["Risk Frameworks","Quantitative Analysis","Excel","Financial Products","Reporting"]', true),
('Compliance Officer',   'Finance', 'Ensures the organisation adheres to regulatory requirements and policies.',  '["Regulatory Knowledge","Audit","Risk Management","Legal Frameworks","Reporting"]',   true),
('Financial Advisor',    'Finance', 'Provides personalised financial planning and investment advice to clients.',  '["Financial Planning","Investment Products","Client Relations","CFP","Ethics"]',     true),
('Credit Analyst',       'Finance', 'Evaluates borrower creditworthiness and assesses lending risk.',              '["Credit Analysis","Financial Statements","Risk Assessment","Excel","Banking"]',   true),
('Tax Specialist',       'Finance', 'Prepares tax returns and advises on tax strategy and compliance.',            '["Tax Law","CPA","Excel","Compliance","Tax Filing","Research"]',                   true),
('Treasury Analyst',     'Finance', 'Manages cash flow, liquidity, and financial risk for the organisation.',     '["Cash Management","Forecasting","Financial Risk","Banking","Excel","ERP"]',       true)
ON CONFLICT DO NOTHING;

-- Business & Management
INSERT INTO job_roles (title, category, description, required_skills, is_active) VALUES
('Business Analyst',       'Business & Management', 'Bridges business needs and technology solutions through analysis.',       '["Requirements Gathering","Process Mapping","SQL","Excel","Stakeholder Mgmt"]',  true),
('Project Manager',        'Business & Management', 'Plans, executes, and closes projects on time and within budget.',         '["Project Planning","Risk Management","Agile","PMP","Stakeholder Communication"]', true),
('Operations Manager',     'Business & Management', 'Oversees day-to-day operations and drives process efficiency.',           '["Operations Strategy","Process Improvement","KPIs","Team Management","Lean"]',  true),
('General Manager',        'Business & Management', 'Manages overall business operations, teams, and strategic direction.',    '["P&L Management","Leadership","Strategy","Business Development","Budgeting"]',   true),
('Chief of Staff',         'Business & Management', 'Supports executive leadership, coordinates cross-functional initiatives.','["Executive Support","Strategic Planning","Communication","Project Management"]',  true),
('Strategy Consultant',    'Business & Management', 'Advises organisations on strategy, growth, and operational improvements.', '["Strategic Analysis","Financial Modelling","Presentation","Research","MBA"]',     true),
('Management Consultant',  'Business & Management', 'Solves complex business problems and improves organisational performance.','["Problem Solving","Data Analysis","Client Management","Frameworks","Presentations"]', true)
ON CONFLICT DO NOTHING;

-- Sales & Marketing
INSERT INTO job_roles (title, category, description, required_skills, is_active) VALUES
('Sales Executive',               'Sales & Marketing', 'Drives revenue by prospecting, pitching, and closing deals.',                '["Sales Techniques","Negotiation","CRM","Lead Generation","Communication"]',        true),
('Sales Manager',                 'Sales & Marketing', 'Leads a sales team, sets targets, and develops sales strategies.',           '["Team Leadership","Sales Strategy","Forecasting","Coaching","CRM"]',              true),
('Account Executive',             'Sales & Marketing', 'Manages client accounts and drives upsells and renewals.',                   '["Account Management","Relationship Building","Negotiation","CRM","Sales"]',       true),
('Business Development Manager',  'Sales & Marketing', 'Identifies new business opportunities and builds strategic partnerships.',    '["Partnership Development","Negotiation","Market Research","CRM","Strategy"]',    true),
('Marketing Manager',             'Sales & Marketing', 'Develops and executes marketing strategies across multiple channels.',       '["Marketing Strategy","Campaign Management","Analytics","Branding","Budget"]',    true),
('Digital Marketing Specialist',  'Sales & Marketing', 'Manages digital campaigns across SEO, SEM, email, and social media.',       '["Google Ads","SEO","Email Marketing","Analytics","Social Media","A/B Testing"]', true),
('SEO Specialist',                'Sales & Marketing', 'Optimises website content and structure for search engine rankings.',        '["On-Page SEO","Technical SEO","Keyword Research","Google Analytics","Link Building"]', true),
('Content Strategist',            'Sales & Marketing', 'Develops content plans that align with brand and audience goals.',           '["Content Planning","SEO","Copywriting","Analytics","Audience Research"]',         true),
('Brand Manager',                 'Sales & Marketing', 'Manages brand identity, messaging, and market positioning.',                 '["Brand Strategy","Market Research","Campaign Management","Analytics","Creative"]', true),
('Social Media Manager',          'Sales & Marketing', 'Creates and manages social media presence and engagement strategies.',       '["Social Platforms","Content Creation","Analytics","Community Management","Ads"]',  true)
ON CONFLICT DO NOTHING;

-- HR & Administration
INSERT INTO job_roles (title, category, description, required_skills, is_active) VALUES
('HR Manager',                  'HR & Administration', 'Leads HR functions including recruitment, policy, and employee relations.', '["HR Policy","Employment Law","Recruitment","HRIS","Performance Management"]',     true),
('HR Generalist',               'HR & Administration', 'Manages day-to-day HR operations and employee support.',                    '["Onboarding","Benefits Administration","Conflict Resolution","HRIS","Compliance"]', true),
('Recruitment Specialist',      'HR & Administration', 'Sources, screens, and interviews candidates for open positions.',           '["Sourcing","ATS","Interviewing","Employer Branding","Job Boards"]',               true),
('Talent Acquisition Specialist','HR & Administration','Develops talent pipelines and manages full-cycle recruitment.',              '["Talent Sourcing","LinkedIn Recruiter","Interviewing","EVP","Analytics"]',         true),
('Administrative Assistant',    'HR & Administration', 'Provides administrative support including scheduling and correspondence.',  '["MS Office","Calendar Management","Communication","Filing","Multi-tasking"]',     true),
('Executive Assistant',         'HR & Administration', 'Supports senior executives with complex scheduling and communications.',    '["Executive Support","Discretion","Calendar Management","Travel Planning","MS Office"]', true),
('Office Manager',              'HR & Administration', 'Manages office operations, vendors, and administrative staff.',             '["Facilities Management","Vendor Management","Budget","Team Coordination"]',       true)
ON CONFLICT DO NOTHING;

-- Education
INSERT INTO job_roles (title, category, description, required_skills, is_active) VALUES
('Teacher',               'Education', 'Educates students in a classroom setting using structured curriculum.',    '["Curriculum Development","Classroom Management","Communication","Differentiation"]', true),
('Academic Advisor',      'Education', 'Guides students on academic planning, course selection, and career paths.','["Academic Planning","Counselling","Communication","Student Support","Advising"]',   true),
('Instructional Designer','Education', 'Designs effective learning experiences and educational content.',           '["Instructional Design","eLearning","ADDIE","Articulate","Learning Management Systems"]', true),
('Corporate Trainer',     'Education', 'Designs and delivers training programmes to develop employee skills.',      '["Training Delivery","Needs Assessment","Facilitation","LMS","Curriculum Design"]',  true)
ON CONFLICT DO NOTHING;

-- Creative & Media
INSERT INTO job_roles (title, category, description, required_skills, is_active) VALUES
('Graphic Designer', 'Creative & Media', 'Creates visual content for print, digital, and marketing materials.', '["Adobe Creative Suite","Typography","Branding","Layout Design","Colour Theory"]', true),
('Content Writer',   'Creative & Media', 'Produces written content for blogs, websites, and marketing campaigns.','["SEO Writing","Research","Editing","Storytelling","Content Strategy"]',          true),
('Copywriter',       'Creative & Media', 'Creates persuasive copy for advertising, campaigns, and brand voice.',   '["Persuasive Writing","Brand Voice","Campaign Copywriting","Research","Editing"]',  true),
('Video Editor',     'Creative & Media', 'Edits and produces video content for various platforms and audiences.',  '["Premiere Pro","After Effects","DaVinci Resolve","Colour Grading","Storytelling"]', true),
('Photographer',     'Creative & Media', 'Captures professional images for commercial, editorial, or artistic use.','["Camera Operation","Lighting","Photo Editing","Lightroom","Composition"]',        true)
ON CONFLICT DO NOTHING;

-- Legal
INSERT INTO job_roles (title, category, description, required_skills, is_active) VALUES
('Paralegal',          'Legal', 'Supports attorneys with legal research, documentation, and case preparation.', '["Legal Research","Document Drafting","Case Management","PACER","Attention to Detail"]', true),
('Legal Assistant',    'Legal', 'Provides administrative and clerical support in a legal environment.',          '["Legal Terminology","Document Management","Scheduling","MS Office","Confidentiality"]', true),
('Compliance Manager', 'Legal', 'Ensures the organisation meets all legal and regulatory requirements.',          '["Regulatory Frameworks","Risk Management","Policy Development","Auditing","Training"]', true)
ON CONFLICT DO NOTHING;

-- Engineering (non-software)
INSERT INTO job_roles (title, category, description, required_skills, is_active) VALUES
('Mechanical Engineer',  'Engineering', 'Designs and develops mechanical systems, components, and machinery.',   '["CAD","Thermodynamics","Materials Science","AutoCAD","FEA","Project Management"]', true),
('Civil Engineer',       'Engineering', 'Plans and oversees the construction of infrastructure projects.',       '["Structural Analysis","AutoCAD","Project Management","Site Supervision","Safety"]',  true),
('Electrical Engineer',  'Engineering', 'Designs electrical systems and equipment for buildings and products.',  '["Circuit Design","Power Systems","AutoCAD","PCB Design","Safety Standards"]',       true),
('Chemical Engineer',    'Engineering', 'Develops chemical processes for manufacturing, energy, and materials.', '["Process Engineering","Thermodynamics","HAZOP","Simulation","Safety Protocols"]',   true),
('Industrial Engineer',  'Engineering', 'Optimises systems, processes, and workflows to improve efficiency.',    '["Lean Manufacturing","Six Sigma","AutoCAD","Process Improvement","Statistics"]',   true)
ON CONFLICT DO NOTHING;

-- Supply Chain & Logistics
INSERT INTO job_roles (title, category, description, required_skills, is_active) VALUES
('Supply Chain Analyst',     'Supply Chain', 'Analyses supply chain data to improve efficiency and reduce costs.', '["Excel","ERP Systems","Data Analysis","Demand Planning","Logistics"]',             true),
('Logistics Coordinator',    'Supply Chain', 'Coordinates transportation, warehousing, and delivery operations.',  '["Logistics Software","Carrier Management","Documentation","Communication"]',        true),
('Procurement Specialist',   'Supply Chain', 'Sources suppliers, negotiates contracts, and manages purchasing.',   '["Negotiation","Vendor Management","Contract Management","ERP","Cost Analysis"]',   true),
('Warehouse Manager',        'Supply Chain', 'Manages warehouse operations, inventory, and distribution teams.',   '["Inventory Management","WMS","Team Leadership","Safety","Process Improvement"]',   true)
ON CONFLICT DO NOTHING;


-- ── QUESTION BANK ──────────────────────────────────────────
-- ── GENERAL questions (any role) ──────────────────────────

INSERT INTO question_bank (question_text, category, difficulty, job_role, expected_keywords, is_active) VALUES
-- Opening / Introduction
('Tell me about yourself and what brought you to this role.',                                                            'general', 'easy',   NULL, '["background","experience","motivation","passion","career path"]',                    true),
('Why are you interested in this position and our organisation?',                                                        'general', 'easy',   NULL, '["company research","role alignment","value fit","motivation","career goals"]',       true),
('What do you consider your greatest professional strength, and how does it apply to this role?',                        'general', 'easy',   NULL, '["strength","relevant skill","example","impact","role alignment"]',                   true),
('Where do you see yourself professionally in the next three to five years?',                                            'general', 'medium', NULL, '["career growth","goals","ambition","relevant path","learning"]',                     true),
('What do you know about our company and what excites you most about working here?',                                     'general', 'easy',   NULL, '["company research","mission","products","culture","alignment"]',                     true),
('Why are you looking to leave your current or most recent position?',                                                   'general', 'easy',   NULL, '["professional growth","new challenges","positive framing","career goals"]',          true),
('How do you stay current with industry trends and continuous learning?',                                                'general', 'medium', NULL, '["learning","courses","communities","reading","networking","upskilling"]',            true),
('Describe your ideal work environment and management style.',                                                            'general', 'easy',   NULL, '["collaboration","communication","autonomy","feedback","culture fit"]',               true),
('What does success look like to you in this role after 90 days?',                                                       'general', 'medium', NULL, '["goals","milestones","impact","onboarding","measurement"]',                          true),
('Do you have any questions for me about the role or the organisation?',                                                 'general', 'easy',   NULL, '["thoughtful questions","engagement","curiosity","preparation"]',                     true)
ON CONFLICT DO NOTHING;


-- ── BEHAVIORAL questions (STAR method) ────────────────────
INSERT INTO question_bank (question_text, category, difficulty, job_role, expected_keywords, is_active) VALUES

-- Core behavioral
('Describe a time when you faced a significant challenge at work and how you overcame it.',                               'behavioral', 'medium', NULL, '["STAR","situation","challenge","actions taken","result","learning"]',                 true),
('Tell me about a time when you had to work with a difficult colleague or stakeholder. What did you do?',                 'behavioral', 'medium', NULL, '["conflict","communication","resolution","empathy","outcome","collaboration"]',       true),
('Give an example of a time when you demonstrated leadership, even without a formal leadership title.',                   'behavioral', 'medium', NULL, '["initiative","influence","team","outcome","ownership","leadership"]',                 true),
('Describe a situation where you failed to meet a goal or made a significant mistake. What did you learn?',               'behavioral', 'hard',   NULL, '["accountability","learning","improvement","corrective action","growth mindset"]',    true),
('Tell me about a time when you had to meet an extremely tight deadline. How did you manage your time and priorities?',   'behavioral', 'medium', NULL, '["prioritisation","time management","pressure","result","planning","communication"]',  true),
('Give an example of a time when you went above and beyond what was expected in your role.',                              'behavioral', 'medium', NULL, '["extra effort","impact","initiative","motivation","result","ownership"]',            true),
('Tell me about a time when you had to adapt quickly to a major change. How did you handle it?',                          'behavioral', 'medium', NULL, '["adaptability","flexibility","change management","attitude","outcome"]',             true),
('Describe a situation where you had to persuade someone who was initially resistant to your idea or plan.',              'behavioral', 'hard',   NULL, '["persuasion","communication","evidence","listening","outcome","stakeholder"]',       true),
('Tell me about a time when you used data or analysis to make an important decision.',                                     'behavioral', 'medium', NULL, '["data-driven","analysis","decision","outcome","tools used","insight"]',              true),
('Describe a time when you received critical feedback. How did you respond and what changed?',                            'behavioral', 'medium', NULL, '["feedback","growth","receptiveness","action","improvement","reflection"]',           true),
('Tell me about a project you led from start to finish. What were the outcomes?',                                         'behavioral', 'hard',   NULL, '["planning","execution","leadership","challenges","results","team coordination"]',    true),
('Describe a time when you identified a problem before it became critical. What did you do?',                             'behavioral', 'medium', NULL, '["proactivity","problem identification","risk mitigation","communication","outcome"]', true),
('Give an example of a time when you had to manage multiple competing priorities simultaneously.',                         'behavioral', 'medium', NULL, '["prioritisation","organisation","time management","communication","outcomes"]',      true),
('Tell me about a time when you had a disagreement with your manager. How did you handle it?',                            'behavioral', 'hard',   NULL, '["respect","communication","escalation","resolution","professionalism","outcome"]',   true),
('Describe a time when you had to learn a completely new skill or technology quickly. How did you approach it?',          'behavioral', 'medium', NULL, '["learning agility","resources","practice","timeline","application","result"]',       true),

-- Role-specific behavioral
('Describe a time when you improved a process or system in your previous role. What was the impact?',                     'behavioral', 'medium', NULL, '["process improvement","impact","metrics","initiative","efficiency","outcome"]',      true),
('Tell me about a time when you had to deliver bad news to a client, customer, or team. How did you approach it?',       'behavioral', 'hard',   NULL, '["communication","empathy","honesty","solution-oriented","outcome","trust"]',         true),
('Give an example of a time when you successfully managed a stakeholder with competing interests.',                        'behavioral', 'hard',   NULL, '["stakeholder management","negotiation","alignment","communication","outcome"]',      true),
('Describe a time when you helped a team member who was struggling. What did you do and what was the outcome?',           'behavioral', 'easy',   NULL, '["empathy","mentoring","support","teamwork","communication","outcome"]',              true),
('Tell me about your most significant career achievement. What made it significant?',                                      'behavioral', 'medium', NULL, '["achievement","impact","skills used","challenge","result","pride"]',                 true)
ON CONFLICT DO NOTHING;


-- ── SITUATIONAL questions ──────────────────────────────────
INSERT INTO question_bank (question_text, category, difficulty, job_role, expected_keywords, is_active) VALUES
('Your team is about to miss a critical project deadline. What would you do?',                                            'situational', 'medium', NULL, '["prioritisation","communication","escalation","mitigation","problem solving"]',      true),
('You discover a major bug or error in a product or service after it has already gone live. What are your first steps?',  'situational', 'hard',   NULL, '["immediate action","communication","stakeholders","fix plan","post-mortem"]',        true),
('A key client is dissatisfied and threatening to leave. How do you handle the situation?',                               'situational', 'hard',   NULL, '["empathy","active listening","problem solving","retention","escalation","solution"]', true),
('Your manager asks you to do something that you believe is ethically questionable. What do you do?',                     'situational', 'hard',   NULL, '["integrity","communication","escalation","policy","professionalism","outcome"]',     true),
('You have two equally urgent tasks and can only complete one today. How do you decide?',                                 'situational', 'medium', NULL, '["prioritisation","impact","communication","trade-offs","decision-making"]',          true),
('You are new to a team and notice an inefficient process that everyone accepts as normal. How do you approach this?',    'situational', 'medium', NULL, '["observation","relationship building","proposal","change management","diplomacy"]',   true),
('You are assigned to lead a project, but the team is resistant to your leadership. What do you do?',                     'situational', 'hard',   NULL, '["trust building","communication","listening","alignment","leadership style"]',       true),
('A colleague takes credit for your work in a meeting with senior leadership. How do you respond?',                       'situational', 'hard',   NULL, '["professionalism","direct communication","assertiveness","documentation","outcome"]', true),
('Your team disagrees on the best technical or strategic approach. How do you facilitate a decision?',                    'situational', 'medium', NULL, '["facilitation","data-driven","consensus","listening","decision framework"]',         true),
('A client requests a scope change that would significantly impact timelines and costs. How do you handle it?',            'situational', 'hard',   NULL, '["scope management","negotiation","documentation","communication","trade-offs"]',     true),
('You are given a project with an unrealistic deadline and insufficient resources. What do you do?',                       'situational', 'hard',   NULL, '["negotiation","risk communication","prioritisation","escalation","planning"]',       true),
('A high-performing team member starts showing signs of burnout. How would you handle this as their manager?',            'situational', 'hard',   NULL, '["empathy","wellbeing","workload management","communication","support","retention"]',  true),
('You notice that a company policy is being consistently ignored by your team. What would you do?',                       'situational', 'medium', NULL, '["compliance","communication","root cause","update policy","leadership"]',            true),
('How would you handle a situation where you had to make an important decision with incomplete information?',              'situational', 'hard',   NULL, '["risk assessment","assumptions","best available data","communication","decision"]',  true),
('If you were starting a new job tomorrow, what would be your priorities in the first 30 days?',                          'situational', 'easy',   NULL, '["onboarding","learning","relationships","observation","quick wins","goals"]',        true)
ON CONFLICT DO NOTHING;


-- ── TECHNICAL — Software Engineer ─────────────────────────
INSERT INTO question_bank (question_text, category, difficulty, job_role, expected_keywords, is_active) VALUES
('What is the difference between REST and GraphQL APIs? When would you choose one over the other?',                       'technical', 'medium', 'Software Engineer',    '["REST","GraphQL","over-fetching","schema","use cases","trade-offs"]',                true),
('Explain the SOLID principles. Give a concrete example of applying one in your work.',                                   'technical', 'medium', 'Software Engineer',    '["Single Responsibility","Open/Closed","Liskov","Interface Segregation","DI"]',       true),
('Walk me through how you would design a scalable URL shortener like bit.ly.',                                             'technical', 'hard',   'Software Engineer',    '["system design","hashing","database","load balancing","cache","scale"]',           true),
('What is a race condition? How do you detect and prevent it?',                                                            'technical', 'hard',   'Software Engineer',    '["concurrency","mutex","locking","thread safety","synchronisation"]',               true),
('How would you optimise a slow database query? Walk through your approach.',                                              'technical', 'hard',   'Software Engineer',    '["EXPLAIN","indexes","query plan","N+1","caching","denormalisation"]',              true),
('Explain microservices vs. monolithic architecture. When would you choose each?',                                         'technical', 'medium', 'Software Engineer',    '["microservices","monolith","scalability","deployment","trade-offs","coupling"]',    true),
('What is Docker and how does it differ from a virtual machine?',                                                          'technical', 'medium', 'Software Engineer',    '["containers","isolation","image","hypervisor","lightweight","portability"]',       true),
('Describe your approach to writing unit tests. What makes a good test?',                                                  'technical', 'medium', 'Software Engineer',    '["unit tests","mocking","assertions","coverage","fast","isolated","readable"]',     true),
('Explain the concept of CI/CD and the stages you would include in a pipeline.',                                           'technical', 'medium', 'Software Engineer',    '["continuous integration","deployment","build","test","lint","staging","rollback"]', true),
('What is Big O notation? How do you analyse the time complexity of an algorithm?',                                        'technical', 'medium', 'Software Engineer',    '["Big O","O(n)","O(log n)","worst case","space complexity","trade-offs"]',          true)
ON CONFLICT DO NOTHING;

-- ── TECHNICAL — Frontend Developer ────────────────────────
INSERT INTO question_bank (question_text, category, difficulty, job_role, expected_keywords, is_active) VALUES
('Explain the Virtual DOM in React and why it improves performance.',                                                      'technical', 'medium', 'Frontend Developer',   '["Virtual DOM","reconciliation","diffing","batch updates","React","performance"]',  true),
('What are React hooks? Explain useState and useEffect with a practical example.',                                         'technical', 'medium', 'Frontend Developer',   '["useState","useEffect","hooks","functional component","lifecycle","side effects"]', true),
('How do you optimise the performance of a React application?',                                                            'technical', 'hard',   'Frontend Developer',   '["memoisation","code splitting","lazy loading","bundle size","profiler","keys"]',   true),
('Explain async/await in JavaScript. How does it differ from Promises?',                                                   'technical', 'medium', 'Frontend Developer',   '["async","await","Promise","event loop","error handling","readability"]',           true),
('What is the CSS box model? Explain each component.',                                                                     'technical', 'easy',   'Frontend Developer',   '["content","padding","border","margin","box-sizing","layout"]',                    true),
('Explain event bubbling and how you would stop it.',                                                                      'technical', 'medium', 'Frontend Developer',   '["event bubbling","event.stopPropagation","capture phase","delegation"]',           true),
('What is CORS and how do you handle it in a frontend application?',                                                       'technical', 'medium', 'Frontend Developer',   '["CORS","origin","preflight","headers","proxy","same-origin policy"]',             true),
('Describe how you would implement an accessible, responsive navigation menu.',                                             'technical', 'hard',   'Frontend Developer',   '["accessibility","aria","keyboard navigation","responsive","breakpoints","semantic HTML"]', true)
ON CONFLICT DO NOTHING;

-- ── TECHNICAL — Backend Developer ─────────────────────────
INSERT INTO question_bank (question_text, category, difficulty, job_role, expected_keywords, is_active) VALUES
('Explain the difference between authentication and authorisation. How would you implement JWT-based auth?',               'technical', 'medium', 'Backend Developer',    '["authentication","authorisation","JWT","tokens","middleware","refresh token"]',    true),
('How do you design a RESTful API? What are the key principles?',                                                          'technical', 'medium', 'Backend Developer',    '["REST","HTTP methods","status codes","versioning","idempotency","resources"]',    true),
('What is database indexing and what are the trade-offs?',                                                                 'technical', 'medium', 'Backend Developer',    '["index","B-tree","query speed","write overhead","composite index","cardinality"]', true),
('How would you handle rate limiting in an API?',                                                                          'technical', 'medium', 'Backend Developer',    '["rate limiting","throttling","Redis","token bucket","429","headers"]',            true),
('Explain the N+1 query problem and how to solve it.',                                                                     'technical', 'hard',   'Backend Developer',    '["N+1","eager loading","JOIN","ORM","query optimisation","prefetch"]',             true),
('What is the difference between SQL and NoSQL databases? When would you choose each?',                                    'technical', 'medium', 'Backend Developer',    '["relational","NoSQL","ACID","schema","scalability","use cases","trade-offs"]',    true),
('How would you design a caching strategy for a high-traffic API?',                                                        'technical', 'hard',   'Backend Developer',    '["cache","Redis","TTL","invalidation","CDN","cache-aside","write-through"]',       true)
ON CONFLICT DO NOTHING;

-- ── TECHNICAL — Data Scientist ────────────────────────────
INSERT INTO question_bank (question_text, category, difficulty, job_role, expected_keywords, is_active) VALUES
('Explain the bias-variance trade-off in machine learning.',                                                               'technical', 'hard',   'Data Scientist',       '["bias","variance","overfitting","underfitting","complexity","regularisation"]',    true),
('How would you handle a severely imbalanced dataset for a classification task?',                                           'technical', 'hard',   'Data Scientist',       '["oversampling","undersampling","SMOTE","class weights","precision-recall","ROC"]', true),
('Walk me through a complete data science project lifecycle from problem framing to deployment.',                           'technical', 'hard',   'Data Scientist',       '["problem definition","data collection","EDA","modelling","evaluation","deployment","monitoring"]', true),
('What is the difference between L1 and L2 regularisation? When do you use each?',                                        'technical', 'hard',   'Data Scientist',       '["L1","Lasso","L2","Ridge","sparsity","feature selection","regularisation"]',      true),
('What evaluation metrics would you use for a classification model? What about regression?',                                'technical', 'medium', 'Data Scientist',       '["accuracy","precision","recall","F1","AUC-ROC","MAE","RMSE","R-squared"]',        true),
('Explain what Principal Component Analysis (PCA) does and when you would use it.',                                        'technical', 'hard',   'Data Scientist',       '["PCA","dimensionality reduction","variance","eigenvectors","feature engineering"]', true),
('What is the difference between supervised, unsupervised, and reinforcement learning?',                                    'technical', 'easy',   'Data Scientist',       '["supervised","unsupervised","reinforcement","labels","clustering","reward"]',      true)
ON CONFLICT DO NOTHING;

-- ── TECHNICAL — DevOps Engineer ───────────────────────────
INSERT INTO question_bank (question_text, category, difficulty, job_role, expected_keywords, is_active) VALUES
('What is the difference between Docker and Kubernetes? How do they complement each other?',                               'technical', 'medium', 'DevOps Engineer',      '["containers","orchestration","pods","Docker","K8s","scaling","deployment"]',      true),
('Explain Infrastructure as Code (IaC). What tools have you used and why?',                                                'technical', 'medium', 'DevOps Engineer',      '["IaC","Terraform","Ansible","CloudFormation","idempotency","version control"]',   true),
('Walk me through setting up a CI/CD pipeline from scratch for a new application.',                                        'technical', 'hard',   'DevOps Engineer',      '["pipeline","build","test","deploy","environments","rollback","GitHub Actions"]',  true),
('What is blue-green deployment and what problems does it solve?',                                                          'technical', 'medium', 'DevOps Engineer',      '["blue-green","zero downtime","rollback","traffic switching","environments"]',      true),
('How would you monitor a production system? What metrics are most important?',                                             'technical', 'hard',   'DevOps Engineer',      '["metrics","alerts","logs","SLOs","latency","error rate","throughput","observability"]', true),
('Explain the concept of immutable infrastructure.',                                                                        'technical', 'hard',   'DevOps Engineer',      '["immutable","server replacement","golden image","configuration drift","IaC"]',    true)
ON CONFLICT DO NOTHING;

-- ── TECHNICAL — Cybersecurity Analyst ─────────────────────
INSERT INTO question_bank (question_text, category, difficulty, job_role, expected_keywords, is_active) VALUES
('Explain the CIA triad in cybersecurity.',                                                                                 'technical', 'easy',   'Cybersecurity Analyst','["Confidentiality","Integrity","Availability","security model","controls"]',        true),
('What is the difference between symmetric and asymmetric encryption? Give examples of each.',                             'technical', 'medium', 'Cybersecurity Analyst','["symmetric","AES","asymmetric","RSA","public key","private key","certificates"]',  true),
('What is SQL injection? How do you prevent it?',                                                                           'technical', 'medium', 'Cybersecurity Analyst','["SQL injection","parameterised queries","input validation","ORM","OWASP"]',        true),
('What is a man-in-the-middle attack and how can it be prevented?',                                                         'technical', 'medium', 'Cybersecurity Analyst','["MITM","TLS","certificate pinning","HSTS","encryption","authentication"]',        true),
('Describe your approach to conducting a security audit or penetration test.',                                              'technical', 'hard',   'Cybersecurity Analyst','["scoping","reconnaissance","vulnerability assessment","exploitation","reporting"]', true),
('What is zero-trust architecture and why is it important today?',                                                          'technical', 'hard',   'Cybersecurity Analyst','["zero trust","least privilege","identity verification","network segmentation","MFA"]', true)
ON CONFLICT DO NOTHING;

-- ── TECHNICAL — Product Manager ───────────────────────────
INSERT INTO question_bank (question_text, category, difficulty, job_role, expected_keywords, is_active) VALUES
('How do you prioritise features in a product backlog?',                                                                    'technical', 'medium', 'Product Manager',      '["RICE","MoSCoW","impact","effort","stakeholder alignment","user value"]',          true),
('Explain how you write a great user story.',                                                                               'technical', 'easy',   'Product Manager',      '["As a user","acceptance criteria","INVEST","definition of done","persona"]',       true),
('How do you define and measure product success?',                                                                           'technical', 'medium', 'Product Manager',      '["KPIs","OKRs","DAU","retention","NPS","business outcomes","metrics"]',             true),
('Describe your process for conducting user research and how it informs product decisions.',                                 'technical', 'hard',   'Product Manager',      '["user interviews","surveys","usability tests","synthesis","insights","data-driven"]', true),
('How do you manage the tension between short-term business goals and long-term product strategy?',                          'technical', 'hard',   'Product Manager',      '["roadmap","trade-offs","stakeholders","technical debt","vision","alignment"]',     true)
ON CONFLICT DO NOTHING;

-- ── TECHNICAL — Financial Analyst ─────────────────────────
INSERT INTO question_bank (question_text, category, difficulty, job_role, expected_keywords, is_active) VALUES
('Walk me through how you would build a 3-statement financial model.',                                                      'technical', 'hard',   'Financial Analyst',    '["income statement","balance sheet","cash flow","assumptions","linking","Excel"]',  true),
('What is DCF valuation and what are its limitations?',                                                                     'technical', 'hard',   'Financial Analyst',    '["DCF","discounted cash flow","WACC","terminal value","assumptions","sensitivity"]', true),
('Explain the difference between EBITDA and free cash flow.',                                                               'technical', 'medium', 'Financial Analyst',    '["EBITDA","capex","working capital","free cash flow","non-cash","profitability"]',  true),
('How do you check if a financial model is correct?',                                                                        'technical', 'medium', 'Financial Analyst',    '["checks","balance sheet balances","cross-checks","error trapping","audit trail"]', true),
('What financial ratios do you consider most important when analysing a company?',                                           'technical', 'medium', 'Financial Analyst',    '["P/E","EV/EBITDA","ROE","debt-to-equity","current ratio","gross margin"]',         true)
ON CONFLICT DO NOTHING;

-- ── TECHNICAL — HR Manager ────────────────────────────────
INSERT INTO question_bank (question_text, category, difficulty, job_role, expected_keywords, is_active) VALUES
('How would you design an onboarding programme for new employees?',                                                         'technical', 'medium', 'HR Manager',           '["onboarding","preboarding","buddy system","milestones","culture","productivity"]',  true),
('Describe your approach to managing employee performance issues.',                                                          'technical', 'hard',   'HR Manager',           '["PIP","documentation","feedback","coaching","improvement","legal compliance"]',    true),
('How do you ensure your recruitment process is fair and free from bias?',                                                   'technical', 'medium', 'HR Manager',           '["structured interviews","job criteria","diverse panels","blind screening","training"]', true),
('Explain how you would conduct a compensation benchmarking analysis.',                                                      'technical', 'hard',   'HR Manager',           '["market data","salary bands","pay equity","benchmarking","Mercer","Willis Towers"]', true)
ON CONFLICT DO NOTHING;

-- ── TECHNICAL — Sales / Account Management ────────────────
INSERT INTO question_bank (question_text, category, difficulty, job_role, expected_keywords, is_active) VALUES
('Walk me through your end-to-end sales process from lead to close.',                                                       'technical', 'medium', 'Sales Executive',      '["prospecting","qualification","discovery","proposal","objection handling","close"]', true),
('How do you handle a prospect who says they''re happy with their current vendor?',                                           'technical', 'medium', 'Sales Executive',      '["objection handling","differentiation","value proposition","curiosity","ROI"]',    true),
('Describe how you would build a territory plan for a new sales region.',                                                    'technical', 'hard',   'Sales Manager',        '["territory mapping","ICP","pipeline","coverage","prioritisation","CRM"]',          true),
('What metrics do you track to measure your sales performance?',                                                             'technical', 'easy',   'Sales Executive',      '["quota","conversion rate","pipeline coverage","average deal size","cycle length"]', true)
ON CONFLICT DO NOTHING;

-- ── TECHNICAL — Marketing ─────────────────────────────────
INSERT INTO question_bank (question_text, category, difficulty, job_role, expected_keywords, is_active) VALUES
('How do you measure the ROI of a marketing campaign?',                                                                     'technical', 'medium', 'Marketing Manager',    '["ROI","attribution","CAC","LTV","conversion rate","revenue","analytics"]',         true),
('Explain the difference between SEO and SEM. When would you invest in each?',                                               'technical', 'medium', 'Digital Marketing Specialist', '["organic","paid","keywords","intent","long-term","PPC","Google Ads"]',       true),
('How would you build a content marketing strategy from scratch?',                                                           'technical', 'hard',   'Content Strategist',   '["audience","persona","keywords","content calendar","distribution","measurement"]',  true),
('Describe how you would grow a brand''s social media presence.',                                                            'technical', 'medium', 'Social Media Manager', '["strategy","content mix","engagement","analytics","community","paid amplification"]', true)
ON CONFLICT DO NOTHING;

-- ── TECHNICAL — Registered Nurse / Healthcare ─────────────
INSERT INTO question_bank (question_text, category, difficulty, job_role, expected_keywords, is_active) VALUES
('Walk me through how you prioritise care for multiple patients with competing needs.',                                      'technical', 'hard',   'Registered Nurse',     '["triage","clinical assessment","SBAR","prioritisation","delegation","safety"]',    true),
('How do you ensure medication safety when administering drugs to patients?',                                                'technical', 'medium', 'Registered Nurse',     '["5 rights","double check","allergies","documentation","protocols","barcode"]',    true),
('Describe your approach to patient education. How do you ensure understanding?',                                            'technical', 'medium', 'Registered Nurse',     '["teach-back","health literacy","documentation","empathy","communication","follow-up"]', true),
('How do you handle a patient who is in acute distress or becoming aggressive?',                                              'technical', 'hard',   'Registered Nurse',     '["de-escalation","safety","protocols","communication","team","documentation"]',    true)
ON CONFLICT DO NOTHING;

-- ── TECHNICAL — BPO / Customer Service ───────────────────
INSERT INTO question_bank (question_text, category, difficulty, job_role, expected_keywords, is_active) VALUES
('How do you handle an angry customer who is demanding a refund you are not authorised to give?',                           'technical', 'hard',   'Customer Service Representative', '["empathy","active listening","escalation","policy","alternative solutions"]', true),
('What is your process for handling a technical support ticket from receipt to resolution?',                                 'technical', 'medium', 'Technical Support Specialist', '["ticket intake","triage","troubleshooting","escalation","resolution","documentation"]', true),
('How would you coach an underperforming agent in your team?',                                                               'technical', 'hard',   'Team Leader (BPO)',    '["performance review","coaching","root cause","action plan","follow-up","support"]', true),
('How do you maintain quality scores when handling high call volumes?',                                                      'technical', 'medium', 'Call Center Agent',    '["process","efficiency","active listening","scripts","accuracy","compliance"]',    true)
ON CONFLICT DO NOTHING;

-- ── BEHAVIORAL — Healthcare specific ─────────────────────
INSERT INTO question_bank (question_text, category, difficulty, job_role, expected_keywords, is_active) VALUES
('Tell me about a time when you had to deliver difficult news to a patient or their family.',                                'behavioral', 'hard', 'Registered Nurse',     '["empathy","communication","support","sensitivity","outcome","documentation"]',     true),
('Describe a situation where a patient refused treatment. How did you handle it?',                                           'behavioral', 'hard', 'Registered Nurse',     '["patient autonomy","informed consent","education","escalation","documentation"]',  true),
('Tell me about a time when you caught a clinical error that could have harmed a patient.',                                  'behavioral', 'hard', 'Registered Nurse',     '["safety","reporting","accountability","communication","outcome","near miss"]',     true)
ON CONFLICT DO NOTHING;

-- ── BEHAVIORAL — Finance specific ─────────────────────────
INSERT INTO question_bank (question_text, category, difficulty, job_role, expected_keywords, is_active) VALUES
('Tell me about a time when you identified a financial discrepancy or error. What did you do?',                              'behavioral', 'medium', 'Financial Analyst',    '["attention to detail","investigation","communication","correction","documentation"]', true),
('Describe a situation where you had to explain complex financial data to a non-finance audience.',                           'behavioral', 'medium', 'Financial Analyst',    '["communication","simplification","visuals","storytelling","outcome","alignment"]', true),
('Tell me about a time when you had to meet a tight reporting deadline under pressure.',                                     'behavioral', 'medium', 'Accountant',           '["time management","accuracy","communication","prioritisation","outcome"]',         true)
ON CONFLICT DO NOTHING;

-- ── BEHAVIORAL — BPO specific ─────────────────────────────
INSERT INTO question_bank (question_text, category, difficulty, job_role, expected_keywords, is_active) VALUES
('Tell me about the most challenging customer interaction you have handled. How did you resolve it?',                        'behavioral', 'hard',   'Customer Service Representative', '["de-escalation","empathy","resolution","outcome","learning"]',              true),
('Describe a time when you exceeded a customer''s expectations. What did you do?',                                           'behavioral', 'medium', 'Customer Service Representative', '["initiative","effort","outcome","surprise","satisfaction"]',               true),
('Tell me about a time when you had to enforce a policy the customer disagreed with.',                                        'behavioral', 'medium', 'Call Center Agent',    '["policy adherence","empathy","communication","alternative","outcome"]',           true)
ON CONFLICT DO NOTHING;

-- ── SITUATIONAL — Role-specific ───────────────────────────
INSERT INTO question_bank (question_text, category, difficulty, job_role, expected_keywords, is_active) VALUES
('You are three days into a project and realise the initial requirements were significantly misunderstood. What do you do?', 'situational', 'hard',   'Project Manager',      '["communication","re-scoping","stakeholders","transparency","plan revision"]',      true),
('A senior engineer on your team insists on a technical approach you believe is wrong. How do you handle this?',            'situational', 'hard',   'Software Engineer',    '["data-driven","communication","compromise","escalation","outcome","respect"]',    true),
('A patient''s family is demanding information you are not permitted to share. How do you handle this?',                    'situational', 'hard',   'Registered Nurse',     '["HIPAA","confidentiality","empathy","communication","escalation","documentation"]', true),
('A potential client is comparing your product directly to a competitor. How do you respond?',                               'situational', 'medium', 'Sales Executive',      '["value proposition","differentiation","active listening","ROI","objection handling"]', true),
('You are asked to run a campaign with a budget that you believe is insufficient to achieve the stated goals. What do you do?', 'situational', 'hard', 'Marketing Manager',  '["negotiation","data-backed","alternatives","expectation setting","communication"]', true),
('An employee comes to you with a serious complaint about another employee. How do you handle it?',                           'situational', 'hard',   'HR Manager',           '["confidentiality","investigation","policy","documentation","fairness","outcome"]', true)
ON CONFLICT DO NOTHING;
