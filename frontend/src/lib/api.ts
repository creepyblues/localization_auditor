import type {
  User,
  Token,
  Audit,
  AuditCreate,
  Glossary,
  GlossaryCreate,
  GlossaryTerm,
  GlossaryTermCreate,
  CSVImportResult,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // Auth
  async register(email: string, password: string, name?: string): Promise<User> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async login(email: string, password: string): Promise<Token> {
    const token = await this.request<Token>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(token.access_token);
    return token;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Audits
  async createAudit(data: AuditCreate): Promise<Audit> {
    return this.request<Audit>('/audits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listAudits(skip = 0, limit = 20): Promise<{ audits: Audit[]; total: number }> {
    return this.request<{ audits: Audit[]; total: number }>(
      `/audits?skip=${skip}&limit=${limit}`
    );
  }

  async getAudit(id: number): Promise<Audit> {
    return this.request<Audit>(`/audits/${id}`);
  }

  async deleteAudit(id: number): Promise<void> {
    return this.request<void>(`/audits/${id}`, { method: 'DELETE' });
  }

  // Glossaries
  async createGlossary(data: GlossaryCreate): Promise<Glossary> {
    return this.request<Glossary>('/glossaries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listGlossaries(filters?: {
    industry?: string;
    source_language?: string;
    target_language?: string;
  }): Promise<{ glossaries: Glossary[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.industry) params.set('industry', filters.industry);
    if (filters?.source_language) params.set('source_language', filters.source_language);
    if (filters?.target_language) params.set('target_language', filters.target_language);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ glossaries: Glossary[]; total: number }>(`/glossaries${query}`);
  }

  async getGlossary(id: number): Promise<Glossary> {
    return this.request<Glossary>(`/glossaries/${id}`);
  }

  async deleteGlossary(id: number): Promise<void> {
    return this.request<void>(`/glossaries/${id}`, { method: 'DELETE' });
  }

  async addGlossaryTerm(glossaryId: number, data: GlossaryTermCreate): Promise<GlossaryTerm> {
    return this.request<GlossaryTerm>(`/glossaries/${glossaryId}/terms`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async importGlossaryTerms(
    glossaryId: number,
    terms: GlossaryTermCreate[]
  ): Promise<Glossary> {
    return this.request<Glossary>(`/glossaries/${glossaryId}/import`, {
      method: 'POST',
      body: JSON.stringify({ terms }),
    });
  }

  async deleteGlossaryTerm(glossaryId: number, termId: number): Promise<void> {
    return this.request<void>(`/glossaries/${glossaryId}/terms/${termId}`, {
      method: 'DELETE',
    });
  }

  async importSystemGlossaryCSV(file: File, industry: string): Promise<CSVImportResult> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('industry', industry);

    const response = await fetch(`${API_BASE}/glossaries/system/import-csv`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }
}

export const api = new ApiClient();
