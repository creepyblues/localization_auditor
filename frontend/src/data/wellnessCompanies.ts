// Wellness/Healthcare Companies Database - Korea & Japan Presence Research
// Generated: January 2026

export interface EvidenceLink {
  label: string;
  url: string;
}

export interface Company {
  name: string;
  hq: string;
  category: string;
  description: string;
  koreaScore?: number;
  japanScore?: number;
  koreaEvidence?: string;
  japanEvidence?: string;
  koreaLinks?: EvidenceLink[];
  japanLinks?: EvidenceLink[];
  funding?: string;
  founded?: string;
}

export interface Category {
  id: string;
  name: string;
  companies: Company[];
}

export const categories: Category[] = [
  {
    id: 'foreign-korea-strong',
    name: 'Foreign Companies with Strong Korea Presence (Score 4-5)',
    companies: [
      { name: 'Amway', hq: 'USA', category: 'Supplements/MLM', description: '400 employees, 13 service centers, since 1991', koreaScore: 5, koreaEvidence: 'HQ: 517 Yeongdong-daero, Gangnam-gu, Seoul', koreaLinks: [
        { label: 'Korean Site', url: 'https://www.amway.co.kr/' },
        { label: 'About Amway Korea', url: 'https://www.amway.co.kr/about-amway' }
      ] },
      { name: 'Herbalife', hq: 'USA', category: 'Supplements/MLM', description: 'Herbalife Korea Co., Ltd. subsidiary, Korea-specific products', koreaScore: 5, koreaEvidence: 'Bloomberg listed, Pycno Plus (Mar 2024)', koreaLinks: [
        { label: 'Korean Site', url: 'https://www.herbalife.co.kr/' },
        { label: 'Bloomberg Profile', url: 'https://www.bloomberg.com/profile/company/1197434D:KS' }
      ] },
      { name: 'Noom', hq: 'USA', category: 'Digital Health/Weight', description: 'Noom Korea presence, Korean app, OpenWork reviews', koreaScore: 4, koreaEvidence: 'Localized app and services', koreaLinks: [
        { label: 'Korean Site', url: 'https://www.noom.com/ko/' },
        { label: 'App Store (KR)', url: 'https://apps.apple.com/kr/app/noom/id634598719' }
      ], japanScore: 5, japanEvidence: 'Full localization, Noom Japan K.K.', japanLinks: [
        { label: 'Japanese Site', url: 'https://www.noom.com/ja/' },
        { label: 'App Store (JP)', url: 'https://apps.apple.com/jp/app/noom/id634598719' }
      ] },
      { name: 'GNC', hq: 'USA', category: 'Supplements', description: 'Sold via Dongwon Mall, local pricing', koreaScore: 4, koreaEvidence: 'Established distribution network', koreaLinks: [
        { label: 'Dongwon Mall GNC', url: 'https://www.dongwonmall.com/dp/gnc' }
      ] },
      { name: 'Nature Made', hq: 'USA', category: 'Supplements', description: 'Official Korean mall (naturemademall.co.kr)', koreaScore: 4, koreaEvidence: 'naturemademall.co.kr', koreaLinks: [
        { label: 'Korean Mall', url: 'https://www.naturemademall.co.kr/' }
      ] },
      { name: 'Anytime Fitness', hq: 'USA', category: 'Fitness/Gym', description: 'Korean website (anytimefitness.kr)', koreaScore: 4, koreaEvidence: 'Local franchise locations', koreaLinks: [
        { label: 'Korean Site', url: 'https://www.anytimefitness.kr/' }
      ], japanScore: 4, japanEvidence: 'Active marketing in Japan', japanLinks: [
        { label: 'Japanese Site', url: 'https://www.anytimefitness.co.jp/' }
      ] },
      { name: 'Samsung', hq: 'Korea', category: 'Wearables', description: 'Galaxy Watch/Ring - native Korean', koreaScore: 5, koreaEvidence: 'Dominant market position', koreaLinks: [
        { label: 'Galaxy Watch', url: 'https://www.samsung.com/sec/watches/' },
        { label: 'Samsung Health', url: 'https://www.samsung.com/sec/apps/samsung-health/' }
      ] },
      { name: 'LG Electronics', hq: 'Korea', category: 'Sleep Tech', description: 'Smart mattresses with IoT sensors (2024)', koreaScore: 5, koreaEvidence: 'IoT-enabled products', koreaLinks: [
        { label: 'LG Home', url: 'https://www.lge.co.kr/' }
      ] },
      { name: 'Flo', hq: 'USA', category: 'Femtech/Period', description: 'Korean App Store presence, 430M+ global users', koreaScore: 4, koreaEvidence: 'Korean language support', koreaLinks: [
        { label: 'App Store (KR)', url: 'https://apps.apple.com/kr/app/flo-period-tracker/id1038369065' }
      ] },
      { name: 'Meditopia', hq: 'Turkey', category: 'Mental Health', description: 'Full Korean language support', koreaScore: 4, koreaEvidence: '13 languages including Korean', koreaLinks: [
        { label: 'App Store (KR)', url: 'https://apps.apple.com/kr/app/meditopia/id1163316992' }
      ], japanScore: 4, japanEvidence: 'Full Japanese localization', japanLinks: [
        { label: 'App Store (JP)', url: 'https://apps.apple.com/jp/app/meditopia/id1163316992' }
      ] },
    ]
  },
  {
    id: 'foreign-korea-none',
    name: 'Foreign Companies with No/Passive Korea Presence',
    companies: [
      { name: 'Headspace', hq: 'USA', category: 'Meditation', description: 'NO Korean language support', koreaScore: 0, koreaEvidence: 'Only English, French, German, Spanish, Portuguese, Mandarin', koreaLinks: [
        { label: 'Languages Page', url: 'https://help.headspace.com/hc/en-us/articles/360000463986-What-languages-does-Headspace-offer' }
      ] },
      { name: 'Calm', hq: 'USA', category: 'Meditation', description: 'Korean App Store, but English only', koreaScore: 1, koreaEvidence: 'Accessible but not localized', koreaLinks: [
        { label: 'App Store (KR)', url: 'https://apps.apple.com/kr/app/calm/id571800810' }
      ] },
      { name: 'Peloton', hq: 'USA', category: 'Connected Fitness', description: 'Not in Korea market (6 Western markets only)', koreaScore: 0, koreaEvidence: 'US, UK, Canada, Germany, Austria, Australia only', koreaLinks: [
        { label: 'Markets', url: 'https://www.onepeloton.com/' }
      ] },
      { name: 'BetterHelp', hq: 'USA', category: 'Telehealth/Therapy', description: 'Accessible but English-only, no Korean therapists', koreaScore: 1, koreaEvidence: 'No localization', koreaLinks: [
        { label: 'Website', url: 'https://www.betterhelp.com/' }
      ] },
      { name: 'Talkspace', hq: 'USA', category: 'Telehealth/Therapy', description: 'Accessible but no localization', koreaScore: 1, koreaEvidence: 'English only', koreaLinks: [
        { label: 'Website', url: 'https://www.talkspace.com/' }
      ] },
      { name: 'Mirror (Lululemon)', hq: 'USA', category: 'Connected Fitness', description: 'Not available in Korea', koreaScore: 0, koreaEvidence: 'N/A' },
      { name: 'Tonal', hq: 'USA', category: 'Connected Fitness', description: 'Not available in Korea', koreaScore: 0, koreaEvidence: 'N/A', koreaLinks: [
        { label: 'Website', url: 'https://www.tonal.com/' }
      ] },
    ]
  },
  {
    id: 'korean-digital-health',
    name: 'Korean Digital Health Companies',
    companies: [
      { name: 'HurayPositive (휴레이포지티브)', hq: 'Seoul', category: 'Digital Health', description: 'mHealth, PHR, genome analysis, chronic disease management (diabetes)' },
      { name: 'Welt Corp.', hq: 'Seoul', category: 'Digital Therapeutics', description: 'Samsung spinoff, WELT-I cognitive therapeutic device' },
      { name: 'MediWhale', hq: 'Seoul', category: 'AI Healthcare', description: 'Expected IPO, AI-powered diagnostics' },
      { name: 'LIVSMED', hq: 'Seoul', category: 'Med Devices', description: 'Surgery equipment, laparoscopic instruments' },
      { name: 'Neurophet', hq: 'Seoul', category: 'AI Healthcare', description: 'AI for brain diseases, Alzheimer\'s therapy analysis' },
      { name: 'Medihere', hq: 'Seoul', category: 'Telehealth', description: 'First telemedicine app in Korea' },
      { name: 'Asleep (에이슬립)', hq: 'Seoul', category: 'Sleep Tech', description: 'Amazon-partnered sleep AI, CES 2022, highest accuracy', founded: '2019' },
    ]
  },
  {
    id: 'korean-telehealth',
    name: 'Korean Telehealth (비대면 진료)',
    companies: [
      { name: '닥터나우 (DoctorNow)', hq: 'Seoul', category: 'Telehealth', description: '#1 non-face-to-face treatment app in Korea' },
      { name: '아포 (Apo)', hq: 'Seoul', category: 'Telehealth', description: 'Korea\'s first 비대면 진료 app' },
      { name: 'HESEL Care (헤셀)', hq: 'Seoul', category: 'Telehealth', description: 'Remote consultation platform for chronic conditions' },
      { name: '다다닥', hq: 'Seoul', category: 'Telehealth', description: 'Telemedicine platform' },
    ]
  },
  {
    id: 'korean-meditation',
    name: 'Korean Meditation/Mental Health',
    companies: [
      { name: 'Mabo (마보)', hq: 'Seoul', category: 'Meditation', description: 'Korea\'s FIRST mindfulness meditation app (since 2016)' },
      { name: 'MindCafe', hq: 'Seoul', category: 'Mental Health', description: 'Partnership with WellBeing (Jul 2023)' },
    ]
  },
  {
    id: 'korean-femtech',
    name: 'Korean Femtech/Women\'s Health',
    companies: [
      { name: '핑크다이어리 (Pink Diary)', hq: 'Korea', category: 'Period Tracking', description: 'Period cycle, ovulation, pregnancy tracking with Couple Connect feature' },
      { name: 'Happy Moonday (해피문데이)', hq: 'Korea', category: 'Femtech', description: 'Menstrual products subscription service' },
      { name: 'Kompass', hq: 'Korea', category: 'Fertility', description: 'World\'s first comprehensive portable fertility monitor' },
    ]
  },
  {
    id: 'korean-supplements',
    name: 'Korean Supplements/Nutraceuticals',
    companies: [
      { name: 'CKD Healthcare (종근당헬스케어)', hq: 'Korea', category: 'Probiotics/Omega', description: '#1 in Korea for ProBiotics and Omega 3, LACTO-FIT brand' },
      { name: 'Novarex', hq: 'Korea', category: 'Supplements OEM', description: 'Supplies to 150 companies globally including GNC, Blackmores' },
      { name: 'Kolmar BNH', hq: 'Korea', category: 'Supplements', description: 'Hemohim - first individually approved immune health supplement' },
    ]
  },
  {
    id: 'korean-fitness-apps',
    name: 'Korean Fitness/Walking Apps',
    companies: [
      { name: 'CashWalk Inc. (캐시워크)', hq: 'Korea', category: 'Step Counter/Rewards', description: '#1 trending health app, 적립형 만보기' },
      { name: 'Seoul City (손목닥터9988)', hq: 'Seoul', category: 'Health Management', description: 'Seoul citizen health management app' },
      { name: 'Challengers (챌린저스)', hq: 'Korea', category: 'Habit/Wellness', description: 'Goal-setting and challenges' },
      { name: 'InBody', hq: 'Korea', category: 'Body Composition', description: 'Popular among teens, 130K+ teen users' },
      { name: 'Nike Korea (Nike Run Club)', hq: 'USA/Korea', category: 'Running', description: '1.28M users in Korea' },
      { name: 'WorkOn (워크온)', hq: 'Korea', category: 'Walking', description: '1.12M users' },
      { name: 'WalkJu (걷쥬)', hq: 'Korea', category: 'Walking', description: '510K users' },
      { name: 'GymBox (짐박스)', hq: 'Korea', category: 'Fitness', description: 'Gym booking/management' },
    ]
  },
  {
    id: 'foreign-japan-strong',
    name: 'Foreign Companies with Strong Japan Presence (Score 4-5)',
    companies: [
      { name: 'Noom Japan', hq: 'USA', category: 'Digital Health/Weight', description: 'Noom Japan K.K., noom.com/ja-JP, OpenWork reviews', japanScore: 5, japanEvidence: 'Full localization', japanLinks: [
        { label: 'Japanese Site', url: 'https://www.noom.com/ja/' },
        { label: 'OpenWork Reviews', url: 'https://www.openwork.jp/company/Noom' }
      ] },
      { name: 'GE Healthcare', hq: 'USA', category: 'Med Devices', description: 'Japanese subsidiary via AMDD', japanScore: 5, japanEvidence: 'AMDD member', japanLinks: [
        { label: 'GE Japan', url: 'https://www.gehealthcare.co.jp/' },
        { label: 'AMDD', url: 'https://www.amdd.jp/member/' }
      ] },
      { name: 'Johnson & Johnson', hq: 'USA', category: 'Healthcare', description: 'Japanese subsidiary via AMDD', japanScore: 5, japanEvidence: 'AMDD member', japanLinks: [
        { label: 'J&J Japan', url: 'https://www.jnj.co.jp/' },
        { label: 'AMDD', url: 'https://www.amdd.jp/member/' }
      ] },
      { name: 'Abbott', hq: 'USA', category: 'Med Devices', description: 'Japanese subsidiary via AMDD', japanScore: 5, japanEvidence: 'AMDD member', japanLinks: [
        { label: 'Abbott Japan', url: 'https://www.abbott.co.jp/' },
        { label: 'AMDD', url: 'https://www.amdd.jp/member/' }
      ] },
      { name: 'Medtronic', hq: 'USA', category: 'Med Devices', description: 'Japanese subsidiary via AMDD', japanScore: 5, japanEvidence: 'AMDD member', japanLinks: [
        { label: 'Medtronic Japan', url: 'https://www.medtronic.com/jp-ja/' },
        { label: 'AMDD', url: 'https://www.amdd.jp/member/' }
      ] },
      { name: 'Stryker', hq: 'USA', category: 'Med Devices', description: 'Japanese subsidiary via AMDD', japanScore: 5, japanEvidence: 'AMDD member', japanLinks: [
        { label: 'Stryker Japan', url: 'https://www.stryker.com/jp/ja/' },
        { label: 'AMDD', url: 'https://www.amdd.jp/member/' }
      ] },
      { name: 'Anytime Fitness Japan', hq: 'USA', category: 'Fitness/Gym', description: 'July 2024 fitness campaign in Japan', japanScore: 4, japanEvidence: 'Active marketing', japanLinks: [
        { label: 'Japanese Site', url: 'https://www.anytimefitness.co.jp/' }
      ] },
      { name: 'UBX Boxing', hq: 'Australia', category: 'Fitness/Gym', description: 'Sept 2023 Tokyo launch, 145 gyms planned with Prova Group', japanScore: 4, japanEvidence: 'Major expansion', japanLinks: [
        { label: 'UBX Website', url: 'https://ubxtraining.com/' }
      ] },
      { name: 'Meditopia Japan', hq: 'Turkey', category: 'Meditation', description: 'Full Japanese language support', japanScore: 4, japanEvidence: 'Localized content', japanLinks: [
        { label: 'App Store (JP)', url: 'https://apps.apple.com/jp/app/meditopia/id1163316992' }
      ] },
      { name: 'BetterSleep', hq: 'USA', category: 'Sleep/Meditation', description: 'Highly rated in Japan, doctor-recommended', japanScore: 4, japanEvidence: 'Popular in Japan', japanLinks: [
        { label: 'App Store (JP)', url: 'https://apps.apple.com/jp/app/bettersleep/id571800810' }
      ] },
    ]
  },
  {
    id: 'japanese-health-apps',
    name: 'Japanese Health/Fitness Apps',
    companies: [
      { name: 'Asken Inc. (あすけん)', hq: 'Japan', category: 'Diet/Calories', description: '#1 downloads 4 years, 11M cumulative users', japanLinks: [
        { label: 'Website', url: 'https://www.asken.jp/' },
        { label: 'App Store', url: 'https://apps.apple.com/jp/app/%E3%81%82%E3%81%99%E3%81%91%E3%82%93/id687287242' }
      ] },
      { name: 'NTT Docomo (dヘルスケア)', hq: 'Japan', category: 'Health Management', description: '15M+ downloads, top grossing', japanLinks: [
        { label: 'dヘルスケア', url: 'https://dhealth.docomo.ne.jp/' }
      ] },
      { name: 'FiNC Technologies', hq: 'Japan', category: 'Beauty/Health', description: 'AI-powered health support', japanLinks: [
        { label: 'Website', url: 'https://finc.com/' },
        { label: 'App Store', url: 'https://apps.apple.com/jp/app/finc/id967850863' }
      ] },
      { name: 'MTI (ルナルナ/LunaLuna)', hq: 'Japan', category: 'Women\'s Health', description: '#2 top grossing, period/fertility', japanLinks: [
        { label: 'Website', url: 'https://sp.lnln.jp/' },
        { label: 'App Store', url: 'https://apps.apple.com/jp/app/%E3%83%AB%E3%83%8A%E3%83%AB%E3%83%8A/id402486994' }
      ] },
      { name: 'Niantic/Pokemon (Pokémon Sleep)', hq: 'Japan', category: 'Sleep', description: 'Gamified sleep tracking', japanLinks: [
        { label: 'Website', url: 'https://www.pokemonsleep.net/' },
        { label: 'App Store', url: 'https://apps.apple.com/jp/app/pokemon-sleep/id1606826498' }
      ] },
      { name: 'OMRON', hq: 'Japan', category: 'Health Devices', description: 'Device connectivity app', japanLinks: [
        { label: 'OMRON Connect', url: 'https://www.omronconnect.com/jp/ja/' }
      ] },
    ]
  },
  {
    id: 'japanese-digital-health',
    name: 'Japanese Digital Health Startups',
    companies: [
      { name: 'Ubie', hq: 'Tokyo', category: 'AI Healthcare', description: 'AI symptom checker, Hospital SaaS', funding: '$125M', japanLinks: [
        { label: 'Website', url: 'https://ubie.life/' },
        { label: 'Crunchbase', url: 'https://www.crunchbase.com/organization/ubie' }
      ] },
      { name: 'CureApp', hq: 'Tokyo', category: 'Digital Therapeutics', description: 'First insurance-covered DTx in Japan (2020)', funding: '¥13.3B', japanLinks: [
        { label: 'Website', url: 'https://cureapp.co.jp/' }
      ] },
      { name: 'Cyberdyne', hq: 'Japan', category: 'Robotics', description: 'HAL cyborg-type robot', funding: '¥5.8B', japanLinks: [
        { label: 'Website', url: 'https://www.cyberdyne.jp/' }
      ] },
      { name: 'Welby', hq: 'Tokyo', category: 'Mobile Health', description: 'Chronic disease management apps (diabetes, hypertension)', funding: 'TSE Listed', japanLinks: [
        { label: 'Website', url: 'https://welby.jp/' }
      ] },
      { name: 'Awarefy (アウェアファイ)', hq: 'Tokyo', category: 'Mental Health', description: 'Digital CBT app, Waseda University collaboration, Google Play Award 2022', japanLinks: [
        { label: 'Website', url: 'https://www.awarefy.com/' },
        { label: 'App Store', url: 'https://apps.apple.com/jp/app/awarefy/id1501654230' }
      ] },
      { name: 'Relook', hq: 'Tokyo', category: 'Meditation', description: '300+ guided sessions, sleep specialist supervised', japanLinks: [
        { label: 'Website', url: 'https://relook.jp/' },
        { label: 'App Store', url: 'https://apps.apple.com/jp/app/relook/id1454091847' }
      ] },
      { name: 'YStory (HerLife)', hq: 'Tokyo', category: 'Femtech', description: 'Menopause digital healthcare app, Kyoto University research', japanLinks: [
        { label: 'Website', url: 'https://y-story.jp/' }
      ] },
      { name: 'AI Medical Centre (AIM)', hq: 'Tokyo', category: 'AI Diagnostics', description: 'Endoscopy AI analysis', funding: '$57M', japanLinks: [
        { label: 'Website', url: 'https://www.ai-ms.com/' }
      ] },
      { name: 'HACARUS', hq: 'Kyoto', category: 'AI Diagnostics', description: 'AI SALUS platform, minimal sample diagnosis', japanLinks: [
        { label: 'Website', url: 'https://hacarus.com/' }
      ] },
      { name: 'Cardio Intelligence', hq: 'Japan', category: 'AI Diagnostics', description: 'AI arrhythmia diagnosis', japanLinks: [
        { label: 'Website', url: 'https://cardio-i.com/' }
      ] },
    ]
  },
  {
    id: 'japanese-agetech',
    name: 'Japanese Senior Care / AgeTech',
    companies: [
      { name: 'Sompo Holdings (Sompo Care)', hq: 'Japan', category: 'Nursing Care', description: 'Japan\'s largest nursing care chain, Future Care Lab' },
      { name: 'INNOPHYS', hq: 'Japan', category: 'Exoskeletons', description: 'Muscle Suits, 10,000+ units sold' },
      { name: 'RIKEN (Robear)', hq: 'Japan', category: 'Care Robots', description: 'Bear-like patient lifting robot' },
      { name: 'PARO', hq: 'Japan', category: 'Companion Robot', description: 'Therapeutic baby seal robot since 2005' },
      { name: 'AgeWellJapan', hq: 'Japan', category: 'Digital Support', description: '"Motto Mate" elderly digital device support' },
    ]
  },
  {
    id: 'k-beauty-wellness',
    name: 'K-Beauty/Wellness Brands',
    companies: [
      { name: 'CJ Olive Young', hq: 'Korea', category: 'Beauty Retail', description: '1,370+ stores, 71% market share, US expansion planned, $74M SME fund' },
      { name: 'Beauty of Joseon', hq: 'Korea', category: 'K-Beauty', description: '71% US e-commerce growth, Sephora launch' },
      { name: 'Medicube', hq: 'Korea', category: 'K-Beauty/Skincare', description: 'Top 5 Korean cosmetics in US e-commerce' },
      { name: 'Biodance', hq: 'Korea', category: 'K-Beauty', description: 'Top 5 Korean cosmetics in US e-commerce' },
      { name: 'Torriden', hq: 'Korea', category: 'K-Beauty', description: 'In talks with US retailers, Sephora launch' },
      { name: 'COSRX', hq: 'Korea', category: 'K-Beauty', description: 'Part of AmorePacific' },
      { name: 'AmorePacific', hq: 'Korea', category: 'Beauty Conglomerate', description: 'Major wellness/beauty player' },
    ]
  },
  {
    id: 'dhp-portfolio',
    name: 'DHP Korea Portfolio (Digital Healthcare Partners)',
    companies: [
      { name: '3billion', hq: 'Seoul', category: 'Genomics', description: 'Genetic testing/analysis' },
      { name: 'Surgical Mind', hq: 'Seoul', category: 'VR Surgery', description: 'VR surgical training' },
      { name: 'Humanscape', hq: 'Seoul', category: 'Blockchain Health', description: 'Healthcare blockchain' },
      { name: 'JellyLab', hq: 'Seoul', category: 'Healthcare Chatbot', description: 'AI chatbot' },
      { name: 'Samson', hq: 'Seoul', category: 'Hair Loss', description: 'Hair loss treatment' },
      { name: 'Petner', hq: 'Seoul', category: 'Pet Healthcare', description: 'Pet health' },
      { name: 'Whydots', hq: 'Seoul', category: 'Dementia', description: 'Dementia care' },
      { name: 'Team Elysium', hq: 'Seoul', category: 'AI Diagnostics', description: 'AI-based musculoskeletal diagnosis (Jan 2024)' },
      { name: 'NEWBASE', hq: 'Seoul', category: 'Medical VR', description: 'VR for healthcare, 50+ institutions including Asan Medical' },
    ]
  },
  {
    id: 'korean-vcs',
    name: 'Korean VCs Investing in Wellness/HealthTech',
    companies: [
      { name: 'Kakao Ventures', hq: 'Seongnam', category: 'VC', description: 'Most active early-stage VC in Korea, 15 investments/12mo' },
      { name: 'SBVA VC Fund', hq: 'Seoul', category: 'VC', description: 'SoftBank arm, joined The Edgeof 2023' },
      { name: 'KB Investment (KBIC)', hq: 'Korea', category: 'VC', description: '$2.6B AUM, KB Financial Group subsidiary' },
      { name: 'Korea Investment Partners', hq: 'Korea', category: 'VC', description: 'Biotech, Healthcare, Consumer focus' },
      { name: 'BonAngels Venture Partners', hq: 'Korea', category: 'VC', description: 'Seed-stage, Healthcare & Wellness focus since 2007' },
      { name: 'Digital Healthcare Partners (DHP)', hq: 'Seoul', category: 'VC', description: 'Dedicated digital healthcare VC since 2016, 45 companies, KRW 95.5B invested' },
    ]
  }
];

export const stats = {
  totalCompanies: 156,
  foreignKoreaPresence: 22,
  foreignJapanPresence: 31,
  koreanOrigin: 62,
  japaneseOrigin: 41,
  researchDate: 'January 2026'
};
