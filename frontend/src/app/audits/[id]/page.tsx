'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { AuditResults } from '@/components/audit/AuditResults';
import type { Audit } from '@/types';

export default function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && resolvedParams.id) {
      loadAudit();
    }
  }, [user, resolvedParams.id]);

  const loadAudit = async () => {
    try {
      const data = await api.getAudit(parseInt(resolvedParams.id));
      setAudit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit');
    } finally {
      setLoading(false);
    }
  };

  // Refresh while processing
  useEffect(() => {
    if (audit && ['pending', 'scraping', 'analyzing'].includes(audit.status)) {
      const interval = setInterval(loadAudit, 3000);
      return () => clearInterval(interval);
    }
  }, [audit?.status]);

  const handleDelete = async () => {
    if (!audit || !confirm('Are you sure you want to delete this audit?')) return;

    try {
      await api.deleteAudit(audit.id);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete audit');
    }
  };

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
            <h1 className="text-xl font-bold text-gray-900">Localization Auditor</h1>
            <Link href="/dashboard">
              <Button variant="ghost">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-red-600">{error}</p>
              <Link href="/dashboard" className="mt-4 inline-block">
                <Button>Back to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        ) : audit ? (
          <>
            {/* Audit Header */}
            <div className="mb-8">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Audit #{audit.id}
                  </h2>
                  <p className="text-gray-500 mt-1">
                    Created {new Date(audit.created_at).toLocaleString()}
                  </p>
                </div>
                <Button variant="danger" onClick={handleDelete}>
                  Delete Audit
                </Button>
              </div>

              {/* URL Info */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Original URL:</span>
                    <a
                      href={audit.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-600 hover:underline truncate"
                    >
                      {audit.original_url}
                    </a>
                  </div>
                  <div>
                    <span className="text-gray-500">Localized URL:</span>
                    <a
                      href={audit.audit_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-600 hover:underline truncate"
                    >
                      {audit.audit_url}
                    </a>
                  </div>
                </div>
                {(audit.source_language || audit.target_language || audit.industry) && (
                  <div className="flex gap-4 mt-3 text-sm">
                    {audit.source_language && audit.target_language && (
                      <span className="text-gray-600">
                        Languages: {audit.source_language.toUpperCase()} → {audit.target_language.toUpperCase()}
                      </span>
                    )}
                    {audit.industry && (
                      <span className="text-gray-600">Industry: {audit.industry}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Status-based content */}
            {['pending', 'scraping', 'analyzing'].includes(audit.status) && (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {audit.status === 'pending' && 'Audit Queued'}
                    {audit.status === 'scraping' && 'Scraping Websites...'}
                    {audit.status === 'analyzing' && 'Analyzing Content...'}
                  </h3>
                  <p className="text-gray-500">
                    This may take a few minutes. The page will update automatically.
                  </p>
                </CardContent>
              </Card>
            )}

            {audit.status === 'failed' && (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-600\" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Audit Failed</h3>
                  <p className="text-red-600">{audit.error_message || 'An unknown error occurred'}</p>
                </CardContent>
              </Card>
            )}

            {audit.status === 'completed' && <AuditResults audit={audit} />}
          </>
        ) : null}
      </main>
    </div>
  );
}
