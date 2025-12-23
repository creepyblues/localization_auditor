'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { ScoreRing } from '@/components/ui/ScoreRing';
import type { Audit } from '@/types';

interface AuditCardProps {
  audit: Audit;
}

export function AuditCard({ audit }: AuditCardProps) {
  const statusColors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    scraping: 'bg-blue-100 text-blue-700',
    analyzing: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    scraping: 'Scraping...',
    analyzing: 'Analyzing...',
    completed: 'Completed',
    failed: 'Failed',
  };

  return (
    <Link href={`/audits/${audit.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[audit.status]}`}>
                  {statusLabels[audit.status]}
                </span>
                {audit.industry && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                    {audit.industry}
                  </span>
                )}
              </div>

              <h3 className="font-medium text-gray-900 truncate mb-1">
                {(() => {
                  try {
                    return new URL(audit.original_url || audit.audit_url).hostname;
                  } catch {
                    return audit.audit_url;
                  }
                })()}
              </h3>

              <div className="text-sm text-gray-500 space-y-1">
                {audit.original_url && (
                  <p className="truncate">
                    <span className="text-gray-400">Original:</span> {audit.original_url}
                  </p>
                )}
                <p className="truncate">
                  <span className="text-gray-400">
                    {audit.audit_type === 'standalone' ? 'URL:' : 'Localized:'}
                  </span> {audit.audit_url}
                </p>
              </div>

              {audit.audit_type === 'standalone' ? (
                audit.source_language && (
                  <p className="text-sm text-gray-500 mt-2">
                    <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs mr-1">Standalone</span>
                    From {audit.source_language.toUpperCase()}
                  </p>
                )
              ) : (
                audit.source_language && audit.target_language && (
                  <p className="text-sm text-gray-500 mt-2">
                    {audit.source_language.toUpperCase()} → {audit.target_language.toUpperCase()}
                  </p>
                )
              )}

              <p className="text-xs text-gray-400 mt-2">
                {new Date(audit.created_at).toLocaleDateString()}
              </p>
            </div>

            {audit.status === 'completed' && audit.overall_score !== null && (
              <div className="ml-4">
                <ScoreRing score={audit.overall_score} size="sm" />
              </div>
            )}

            {audit.status === 'failed' && (
              <div className="ml-4 text-red-500">
                <svg className="w-8 h-8\" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}

            {['pending', 'scraping', 'analyzing'].includes(audit.status) && (
              <div className="ml-4">
                <svg className="animate-spin h-8 w-8 text-blue-500\" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
