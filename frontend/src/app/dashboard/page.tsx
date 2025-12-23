'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { AuditCard } from '@/components/audit/AuditCard';
import { CreateAuditForm } from '@/components/audit/CreateAuditForm';
import type { Audit } from '@/types';

function DashboardContent() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);

  // Check for rerun params
  const isRerun = searchParams.get('rerun') === 'true';
  const initialValues = isRerun ? {
    audit_type: searchParams.get('audit_type') || undefined,
    original_url: searchParams.get('original_url') || undefined,
    audit_url: searchParams.get('audit_url') || undefined,
    source_language: searchParams.get('source_language') || undefined,
    industry: searchParams.get('industry') || undefined,
    glossary_id: searchParams.get('glossary_id') || undefined,
    audit_mode: searchParams.get('audit_mode') || undefined,
  } : undefined;

  const [showCreateForm, setShowCreateForm] = useState(isRerun);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadAudits();
    }
  }, [user]);

  const loadAudits = async () => {
    try {
      const { audits } = await api.listAudits();
      setAudits(audits);
    } catch (err) {
      console.error('Failed to load audits:', err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh audits periodically for pending ones
  useEffect(() => {
    const hasPending = audits.some((a) =>
      ['pending', 'scraping', 'analyzing'].includes(a.status)
    );

    if (hasPending) {
      const interval = setInterval(loadAudits, 5000);
      return () => clearInterval(interval);
    }
  }, [audits]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">Localization Auditor</h1>
              <span className="text-xs text-gray-400 font-normal">v{process.env.APP_VERSION}</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/glossaries">
                <Button variant="ghost">Glossaries</Button>
              </Link>
              <span className="text-sm text-gray-500">{user.email}</span>
              <Button variant="ghost" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showCreateForm ? (
          <div className="max-w-2xl mx-auto">
            <div className="mb-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateForm(false);
                  // Clear rerun params from URL
                  if (isRerun) {
                    router.replace('/dashboard');
                  }
                }}
              >
                &larr; Back to Dashboard
              </Button>
            </div>
            <CreateAuditForm initialValues={initialValues} isRerun={isRerun} />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                <p className="text-gray-500">Manage your localization audits</p>
              </div>
              <Button onClick={() => setShowCreateForm(true)}>
                + New Audit
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : audits.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No audits yet</h3>
                  <p className="text-gray-500 mb-4">
                    Create your first audit to analyze localization quality
                  </p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    Create Your First Audit
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {audits.map((audit) => (
                  <AuditCard key={audit.id} audit={audit} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
