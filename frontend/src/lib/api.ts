import type {
  User,
  Token,
  Audit,
  AuditCreate,
  AuditType,
  ImageLabel,
  Glossary,
  GlossaryCreate,
  GlossaryTerm,
  GlossaryTermCreate,
  CSVImportResult,
  AppStoreCategories,
  AppStoreScanResult,
  AppStoreApp,
  ProficiencyTestResult,
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

  async createAuditWithImages(
    images: { file: File; label: ImageLabel }[],
    data: {
      audit_type?: AuditType;
      source_language: string;
      target_language?: string;
      industry?: string;
      glossary_id?: number;
    }
  ): Promise<Audit> {
    const token = this.getToken();
    const formData = new FormData();

    // Add images
    images.forEach((img) => {
      formData.append('images', img.file);
    });

    // Add labels as JSON array
    formData.append('image_labels', JSON.stringify(images.map(img => img.label)));

    // Add other form fields
    formData.append('audit_type', data.audit_type || 'comparison');
    formData.append('source_language', data.source_language);
    if (data.target_language) formData.append('target_language', data.target_language);
    if (data.industry) formData.append('industry', data.industry);
    if (data.glossary_id) formData.append('glossary_id', data.glossary_id.toString());

    const response = await fetch(`${API_BASE}/audits/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Note: Do NOT set Content-Type header for FormData - browser sets it with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
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

  async retryBlockedAudit(id: number): Promise<Audit> {
    return this.request<Audit>(`/audits/${id}/retry`, { method: 'POST' });
  }

  async proceedBlockedAudit(id: number): Promise<Audit> {
    return this.request<Audit>(`/audits/${id}/proceed`, { method: 'POST' });
  }

  // Proficiency Test
  async runProficiencyTest(data: {
    url?: string;
    image?: File;
    target_language: string;
  }): Promise<ProficiencyTestResult> {
    const token = this.getToken();
    const formData = new FormData();

    if (data.url) {
      formData.append('url', data.url);
    }
    if (data.image) {
      formData.append('image', data.image);
    }
    formData.append('target_language', data.target_language);

    const response = await fetch(`${API_BASE}/audits/proficiency-test`, {
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

  // App Store Scanner
  async getAppStoreCategories(): Promise<AppStoreCategories> {
    return this.request<AppStoreCategories>('/app-store/categories');
  }

  async scanAppStoreCategory(
    category: string,
    feedType: string = 'free',
    limit: number = 50,
    country: string = 'us'
  ): Promise<AppStoreScanResult> {
    const params = new URLSearchParams({
      feed_type: feedType,
      limit: limit.toString(),
      country,
    });
    return this.request<AppStoreScanResult>(`/app-store/scan/${category}?${params.toString()}`);
  }

  async getAppStoreApp(appId: string, country: string = 'us'): Promise<AppStoreApp> {
    const params = new URLSearchParams({ country });
    return this.request<AppStoreApp>(`/app-store/app/${appId}?${params.toString()}`);
  }
}

export const api = new ApiClient();
