'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ImageZoomModal } from '@/components/ui/ImageZoomModal';
import { AuditResults } from '@/components/audit/AuditResults';
import type { Audit } from '@/types';

export default function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zoomModalOpen, setZoomModalOpen] = useState(false);
  const [zoomImageSrc, setZoomImageSrc] = useState('');

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

  // Refresh while processing - faster polling (2s) for better progress visibility
  useEffect(() => {
    if (audit && ['pending', 'scraping', 'analyzing'].includes(audit.status)) {
      const interval = setInterval(loadAudit, 2000);
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
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Audit #{audit.id}
                  </h2>
                  <p className="text-gray-500 mt-1">
                    Created {new Date(audit.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard?${new URLSearchParams({
                      rerun: 'true',
                      audit_type: audit.audit_type || 'comparison',
                      ...(audit.original_url && { original_url: audit.original_url }),
                      ...(audit.audit_url && { audit_url: audit.audit_url }),
                      ...(audit.source_language && { source_language: audit.source_language }),
                      ...(audit.industry && { industry: audit.industry }),
                      ...(audit.glossary_id && { glossary_id: audit.glossary_id.toString() }),
                      ...(audit.audit_mode && { audit_mode: audit.audit_mode }),
                    }).toString()}`}
                  >
                    <Button variant="secondary">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Rerun Audit
                    </Button>
                  </Link>
                  <Button variant="danger" onClick={handleDelete}>
                    Delete Audit
                  </Button>
                </div>
              </div>

              {/* Info Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Audit Type Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      audit.audit_type === 'standalone' ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      <svg className={`w-4 h-4 ${audit.audit_type === 'standalone' ? 'text-purple-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Audit Type</p>
                  <p className={`text-sm font-semibold mt-1 ${audit.audit_type === 'standalone' ? 'text-purple-700' : 'text-blue-700'}`}>
                    {audit.audit_type === 'standalone' ? 'Standalone' : 'Comparison'}
                  </p>
                </div>

                {/* Analysis Mode Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      (audit.actual_audit_mode || audit.audit_mode) === 'screenshot' ? 'bg-indigo-100' :
                      (audit.actual_audit_mode || audit.audit_mode) === 'combined' ? 'bg-pink-100' : 'bg-cyan-100'
                    }`}>
                      {(audit.actual_audit_mode || audit.audit_mode) === 'screenshot' ? (
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      ) : (audit.actual_audit_mode || audit.audit_mode) === 'combined' ? (
                        <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Analysis</p>
                  <p className={`text-sm font-semibold mt-1 capitalize ${
                    (audit.actual_audit_mode || audit.audit_mode) === 'screenshot' ? 'text-indigo-700' :
                    (audit.actual_audit_mode || audit.audit_mode) === 'combined' ? 'text-pink-700' : 'text-cyan-700'
                  }`}>
                    {audit.actual_audit_mode
                      ? (audit.actual_audit_mode === 'screenshot' ? 'Screenshot' :
                         audit.actual_audit_mode === 'combined' ? 'Combined' : 'Text')
                      : (audit.status === 'completed' ? 'Text' :
                         audit.audit_mode === 'screenshot' ? 'Screenshot' :
                         audit.audit_mode === 'combined' ? 'Combined' :
                         audit.audit_mode === 'text' ? 'Text' : 'Pending...')}
                  </p>
                </div>

                {/* Language Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Language</p>
                  <p className="text-sm font-semibold mt-1 text-gray-900">
                    {audit.audit_type === 'standalone'
                      ? `From ${audit.source_language?.toUpperCase() || 'N/A'}`
                      : audit.target_language
                        ? `${audit.source_language?.toUpperCase()} → ${audit.target_language?.toUpperCase()}`
                        : audit.source_language?.toUpperCase() || 'N/A'
                    }
                  </p>
                </div>

                {/* Industry Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Industry</p>
                  <p className="text-sm font-semibold mt-1 text-gray-900 capitalize">
                    {audit.industry || 'General'}
                  </p>
                </div>

                {/* Status Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      audit.status === 'completed' ? 'bg-green-100' :
                      audit.status === 'failed' ? 'bg-red-100' :
                      audit.status === 'blocked' ? 'bg-orange-100' : 'bg-yellow-100'
                    }`}>
                      {audit.status === 'completed' ? (
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : audit.status === 'failed' ? (
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : audit.status === 'blocked' ? (
                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-yellow-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                  <p className={`text-sm font-semibold mt-1 capitalize ${
                    audit.status === 'completed' ? 'text-green-700' :
                    audit.status === 'failed' ? 'text-red-700' :
                    audit.status === 'blocked' ? 'text-orange-700' : 'text-yellow-700'
                  }`}>
                    {audit.status}
                  </p>
                </div>
              </div>

              {/* URL or Images Card - Full Width */}
              <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    {audit.audit_mode === 'image_upload' ? (
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    {audit.audit_mode === 'image_upload' ? 'Uploaded Images' : 'URL'}
                  </p>
                </div>

                {audit.audit_mode === 'image_upload' && audit.uploaded_images ? (
                  <div className="flex flex-wrap gap-2">
                    {audit.uploaded_images.map((img, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200"
                      >
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${
                            img.label === 'original'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {img.label}
                        </span>
                        <span className="text-sm text-gray-700">{img.filename}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`grid ${audit.original_url ? 'md:grid-cols-2' : ''} gap-4`}>
                    {audit.original_url && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Original</p>
                        <a
                          href={audit.original_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline truncate block"
                        >
                          {audit.original_url}
                        </a>
                      </div>
                    )}
                    {audit.audit_url && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          {audit.audit_type === 'standalone' ? 'Audited' : 'Localized'}
                        </p>
                        <a
                          href={audit.audit_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline truncate block"
                        >
                          {audit.audit_url}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Status-based content */}
            {['pending', 'scraping', 'analyzing'].includes(audit.status) && (
              <Card>
                <CardContent className="py-8">
                  <div className="max-w-lg mx-auto">
                    {/* Header with spinner */}
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200" />
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent absolute top-0 left-0" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Audit in Progress
                      </h3>
                    </div>

                    {/* Progress Steps Checklist */}
                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mb-4">
                      {(() => {
                        const steps = [
                          { step: 1, label: 'Initializing audit' },
                          { step: 2, label: 'Loading glossary terms' },
                          { step: 3, label: audit.audit_type === 'standalone'
                            ? 'Running AI agent for back-translation assessment'
                            : 'Running AI agent for content comparison'
                          },
                          { step: 4, label: 'Saving audit results' },
                        ];
                        const currentStep = audit.progress_step || 0;

                        return (
                          <div className="space-y-3">
                            {steps.map(({ step, label }) => {
                              const isCompleted = currentStep > step;
                              const isCurrent = currentStep === step;
                              const isPending = currentStep < step;

                              return (
                                <div
                                  key={step}
                                  className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                                    isCurrent ? 'bg-blue-50 border border-blue-200' :
                                    isCompleted ? 'bg-green-50' : ''
                                  }`}
                                >
                                  {/* Checkbox */}
                                  <div className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                                    isCompleted
                                      ? 'bg-green-500 border-green-500'
                                      : isCurrent
                                        ? 'border-blue-500 bg-white'
                                        : 'border-gray-300 bg-white'
                                  }`}>
                                    {isCompleted ? (
                                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : isCurrent ? (
                                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                    ) : null}
                                  </div>

                                  {/* Step label */}
                                  <span className={`text-sm font-medium ${
                                    isCompleted
                                      ? 'text-green-700'
                                      : isCurrent
                                        ? 'text-blue-700'
                                        : 'text-gray-400'
                                  }`}>
                                    {label}
                                  </span>

                                  {/* Current step indicator */}
                                  {isCurrent && (
                                    <span className="ml-auto text-xs text-blue-600 font-medium">
                                      In Progress...
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Progress bar */}
                    {audit.progress_step && audit.progress_total && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-500 mb-1">
                          <span>Step {audit.progress_step} of {audit.progress_total}</span>
                          <span>{Math.round((audit.progress_step / audit.progress_total) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(audit.progress_step / audit.progress_total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-gray-500 text-xs text-center">
                      This may take a few minutes. The page will update automatically.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {audit.status === 'failed' && (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Audit Failed</h3>
                  <p className="text-red-600">{audit.error_message || 'An unknown error occurred'}</p>
                </CardContent>
              </Card>
            )}

            {audit.status === 'blocked' && (
              <Card>
                <CardContent className="py-8">
                  <div className="max-w-2xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">Page Access Blocked</h3>
                        <p className="text-sm text-gray-500">The website appears to be showing a security challenge</p>
                      </div>
                    </div>

                    {/* Reason */}
                    {audit.blocked_reason && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                        <p className="text-sm font-medium text-orange-800 mb-1">Detection Result:</p>
                        <p className="text-sm text-orange-700">{audit.blocked_reason}</p>
                      </div>
                    )}

                    {/* Screenshot preview */}
                    {audit.audit_screenshot && (
                      <div className="mb-6">
                        <p className="text-sm font-medium text-gray-700 mb-2">Captured Screenshot:</p>
                        <div
                          className="border border-gray-200 rounded-lg overflow-hidden cursor-pointer relative group"
                          onClick={() => {
                            setZoomImageSrc(`data:image/png;base64,${audit.audit_screenshot}`);
                            setZoomModalOpen(true);
                          }}
                        >
                          <img
                            src={`data:image/png;base64,${audit.audit_screenshot}`}
                            alt="Blocked page screenshot"
                            className="w-full max-h-64 object-contain bg-gray-50 transition-opacity group-hover:opacity-90"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="bg-black/60 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                              </svg>
                              Click to zoom
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        onClick={async () => {
                          try {
                            await api.retryBlockedAudit(audit.id);
                            loadAudit();
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Failed to retry audit');
                          }
                        }}
                        className="flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Retry Audit
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          if (!confirm('This will analyze the blocked page screenshot. The results may not be meaningful. Continue?')) return;
                          try {
                            await api.proceedBlockedAudit(audit.id);
                            loadAudit();
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Failed to proceed with audit');
                          }
                        }}
                        className="flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                        Proceed Anyway
                      </Button>
                      <Button
                        variant="danger"
                        onClick={handleDelete}
                      >
                        Cancel Audit
                      </Button>
                    </div>

                    <p className="text-xs text-gray-500 text-center mt-4">
                      &quot;Retry&quot; will attempt to access the page again. &quot;Proceed Anyway&quot; will analyze the blocked page screenshot.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {audit.status === 'completed' && <AuditResults audit={audit} />}
          </>
        ) : null}
      </main>

      {/* Image Zoom Modal */}
      <ImageZoomModal
        imageSrc={zoomImageSrc}
        isOpen={zoomModalOpen}
        onClose={() => setZoomModalOpen(false)}
      />
    </div>
  );
}
