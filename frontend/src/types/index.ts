export interface User {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export type AuditStatus = 'pending' | 'scraping' | 'analyzing' | 'completed' | 'failed';

export type AuditDimension =
  | 'CORRECTNESS'
  | 'CULTURAL_RELEVANCE'
  | 'INDUSTRY_EXPERTISE'
  | 'FLUENCY'
  | 'CONSISTENCY'
  | 'COMPLETENESS'
  | 'UI_UX'
  | 'SEO';

export interface AuditFinding {
  issue: string;
  original?: string;
  localized?: string;
  suggestion?: string;
  severity: 'high' | 'medium' | 'low';
}

export interface GoodExample {
  description: string;
  original?: string;
  localized?: string;
}

export interface AuditResult {
  id: number;
  dimension: AuditDimension;
  score: number;
  findings: AuditFinding[];
  good_examples?: GoodExample[];
  recommendations: string[];
}

export interface ContentPairItem {
  original?: string;
  localized?: string;
  level?: number;
  index?: number;
}

export interface ContentPairImage {
  original_alt?: string;
  localized_alt?: string;
  src?: string;
  index?: number;
}

export interface ContentPairs {
  title?: ContentPairItem;
  meta_description?: ContentPairItem;
  meta_keywords?: ContentPairItem;
  headings?: ContentPairItem[];
  paragraphs?: ContentPairItem[];
  buttons?: ContentPairItem[];
  links?: ContentPairItem[];
  images?: ContentPairImage[];
}

export interface Audit {
  id: number;
  original_url: string;
  audit_url: string;
  source_language: string | null;
  target_language: string | null;
  industry: string | null;
  status: AuditStatus;
  error_message: string | null;
  overall_score: number | null;
  created_at: string;
  completed_at: string | null;
  results?: AuditResult[];
  content_pairs?: ContentPairs;
}

export interface AuditCreate {
  original_url: string;
  audit_url: string;
  source_language?: string;
  target_language?: string;
  industry?: string;
  glossary_id?: number;
}

export interface GlossaryTerm {
  id: number;
  source_term: string;
  target_term: string;
  context: string | null;
  notes: string | null;
  created_at: string;
}

export interface Glossary {
  id: number;
  name: string;
  description: string | null;
  industry: string;
  source_language: string;
  target_language: string;
  is_system: boolean;
  created_at: string;
  terms?: GlossaryTerm[];
}

export interface GlossaryCreate {
  name: string;
  description?: string;
  industry: string;
  source_language: string;
  target_language: string;
}

export interface GlossaryTermCreate {
  source_term: string;
  target_term: string;
  context?: string;
  notes?: string;
}

export const DIMENSION_LABELS: Record<AuditDimension, string> = {
  CORRECTNESS: 'Correctness',
  CULTURAL_RELEVANCE: 'Cultural Relevance',
  INDUSTRY_EXPERTISE: 'Industry Expertise',
  FLUENCY: 'Fluency',
  CONSISTENCY: 'Consistency',
  COMPLETENESS: 'Completeness',
  UI_UX: 'UI/UX Localization',
  SEO: 'SEO',
};

export const DIMENSION_DESCRIPTIONS: Record<AuditDimension, string> = {
  CORRECTNESS: 'Translation accuracy, grammar, spelling',
  CULTURAL_RELEVANCE: 'Cultural adaptation, idioms, tone',
  INDUSTRY_EXPERTISE: 'Domain terminology, compliance',
  FLUENCY: 'Natural reading flow',
  CONSISTENCY: 'Uniform terminology usage',
  COMPLETENESS: 'Missing/untranslated content',
  UI_UX: 'Date, currency, measurement formats',
  SEO: 'Meta tags, keywords localization',
};

export const INDUSTRIES = [
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'adtech', label: 'Ad Tech' },
  { value: 'wellness', label: 'Wellness & Health' },
  { value: 'general', label: 'General' },
];
