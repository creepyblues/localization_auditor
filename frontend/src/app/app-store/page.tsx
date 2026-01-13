'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Header } from '@/components/layout/Header';
import type { AppStoreScanResult } from '@/types';
import { APP_STORE_CATEGORIES, APP_STORE_FEED_TYPES } from '@/types';

interface ScanHistoryItem {
  id: string;
  timestamp: number;
  category: string;
  feedType: string;
  country: string;
  totalApps: number;
  uniqueLanguages: number;
  result: AppStoreScanResult;
}

export default function AppStorePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [scanResult, setScanResult] = useState<AppStoreScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [category, setCategory] = useState('health_fitness');
  const [feedType, setFeedType] = useState('free');
  const [limit, setLimit] = useState(50);
  const [country, setCountry] = useState('us');

  // Filter state
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  // History state
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Expandable rows state for Korean metadata
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('appStoreScanHistory');
    if (saved) {
      setScanHistory(JSON.parse(saved));
    }
  }, []);

  const toggleLanguageFilter = (lang: string) => {
    setSelectedLanguages(prev =>
      prev.includes(lang)
        ? prev.filter(l => l !== lang)
        : [...prev, lang]
    );
  };

  const toggleRow = (appId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  };

  const toggleAllRows = (apps: typeof scanResult extends null ? never : NonNullable<typeof scanResult>['apps']) => {
    if (allExpanded) {
      setExpandedRows(new Set());
    } else {
      const koApps = apps.filter(app => app.screenshots_ko?.length > 0);
      setExpandedRows(new Set(koApps.map(app => app.app_id)));
    }
    setAllExpanded(!allExpanded);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    setScanResult(null);
    setSelectedLanguages([]);

    try {
      const result = await api.scanAppStoreCategory(category, feedType, limit, country);
      setScanResult(result);

      // Save to history
      const historyItem: ScanHistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        category,
        feedType,
        country,
        totalApps: result.total_apps_scanned,
        uniqueLanguages: result.statistics.total_unique_languages,
        result,
      };
      const newHistory = [historyItem, ...scanHistory];
      setScanHistory(newHistory);
      localStorage.setItem('appStoreScanHistory', JSON.stringify(newHistory));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan App Store');
      console.error('Scan error:', err);
    } finally {
      setScanning(false);
    }
  };

  const exportToJSON = () => {
    if (!scanResult) return;

    const dataStr = JSON.stringify(scanResult, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `app-store-scan-${category}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadHistoryItem = (item: ScanHistoryItem) => {
    setScanResult(item.result);
    setSelectedLanguages([]);
    setCategory(item.category);
    setFeedType(item.feedType);
    setCountry(item.country);
  };

  const clearHistory = () => {
    setScanHistory([]);
    localStorage.removeItem('appStoreScanHistory');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">App Store Language Scanner</h2>
          <p className="text-gray-500">
            Scan top apps in any App Store category to identify language support
          </p>
        </div>

        {/* Scanner Form */}
        <Card className="mb-8">
          <CardContent className="py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={scanning}
                >
                  {APP_STORE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Feed Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feed Type
                </label>
                <select
                  value={feedType}
                  onChange={(e) => setFeedType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={scanning}
                >
                  {APP_STORE_FEED_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Apps
                </label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={scanning}
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country Code
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="us"
                  maxLength={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={scanning}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleScan} disabled={scanning}>
                {scanning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Scanning...
                  </>
                ) : (
                  'Scan App Store'
                )}
              </Button>
              {scanResult && (
                <Button variant="secondary" onClick={exportToJSON}>
                  Export to JSON
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <Card className="mb-8">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Recent Scans</h3>
                <button
                  onClick={clearHistory}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2">
                {(showAllHistory ? scanHistory : scanHistory.slice(0, 5)).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md text-sm flex justify-between items-center"
                  >
                    <div className="flex flex-col">
                      <span>
                        {item.category.replace('_', ' ')} • {item.feedType} • {item.country.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-gray-500 text-xs">
                      {item.totalApps} apps • {item.uniqueLanguages} langs
                    </span>
                  </button>
                ))}
              </div>
              {scanHistory.length > 5 && (
                <button
                  onClick={() => setShowAllHistory(!showAllHistory)}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                >
                  {showAllHistory ? 'Show less' : `Show all (${scanHistory.length})`}
                </button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="py-4">
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {scanResult && (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="py-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">
                      {scanResult.total_apps_scanned}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Apps Scanned</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {scanResult.statistics.total_unique_languages}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Unique Languages</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-purple-600">
                      {scanResult.statistics.average_languages_per_app.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Avg Languages/App</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">
                      {scanResult.category.replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Category</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Languages Found */}
            <Card className="mb-8">
              <CardContent className="py-6">
                <h3 className="text-lg font-semibold mb-4">Languages Found</h3>
                <div className="flex flex-wrap gap-2">
                  {scanResult.statistics.all_languages_found.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => toggleLanguageFilter(lang)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedLanguages.includes(lang)
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                  {selectedLanguages.length > 0 && (
                    <button
                      onClick={() => setSelectedLanguages([])}
                      className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                      Clear ({selectedLanguages.length})
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Apps Table */}
            {(() => {
              const filteredApps = selectedLanguages.length > 0
                ? scanResult.apps.filter(app =>
                    selectedLanguages.some(lang => app.languages.includes(lang))
                  )
                : scanResult.apps;

              return (
                <Card>
                  <CardContent className="py-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">
                        {selectedLanguages.length > 0
                          ? `${filteredApps.length} of ${scanResult.total_apps_scanned} Apps`
                          : `Top ${scanResult.total_apps_scanned} Apps`}
                      </h3>
                      {filteredApps.some(app => app.screenshots_ko?.length > 0) && (
                        <button
                          onClick={() => toggleAllRows(filteredApps)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {allExpanded ? 'Collapse All KO' : 'Expand All KO'}
                        </button>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              #
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              App Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Developer
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Languages
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Rating
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Reviews
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredApps.map((app, idx) => (
                          <React.Fragment key={app.app_id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            <a
                              href={app.track_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {app.app_name}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {app.artist}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-blue-600">
                                {app.language_count}
                              </span>
                              {app.languages.includes('KO') && (
                                <button
                                  onClick={() => toggleRow(app.app_id)}
                                  className={`px-1.5 py-0.5 text-xs font-medium rounded transition-colors ${
                                    expandedRows.has(app.app_id)
                                      ? 'bg-green-600 text-white'
                                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                                  }`}
                                >
                                  KR {expandedRows.has(app.app_id) ? '▼' : '▶'}
                                </button>
                              )}
                              {app.languages.includes('JA') && (
                                <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                                  JA
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                {app.languages.slice(0, 3).join(', ')}
                                {app.languages.length > 3 && ',...'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {app.average_user_rating ? (
                              <span className="flex items-center gap-1">
                                <span className="text-yellow-500">★</span>
                                {app.average_user_rating.toFixed(1)}
                              </span>
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {app.user_rating_count?.toLocaleString() || 'N/A'}
                          </td>
                        </tr>
                        {expandedRows.has(app.app_id) && (
                          <tr key={`${app.app_id}-expanded`}>
                            <td colSpan={6} className="px-4 py-4 bg-green-50 border-b">
                              {app.screenshots_ko?.length > 0 ? (
                                <>
                                  <div className="flex gap-3 mb-3 overflow-x-auto">
                                    {app.screenshots_ko.map((url, i) => (
                                      <img
                                        key={i}
                                        src={url}
                                        alt={`Screenshot ${i + 1}`}
                                        className="h-48 rounded shadow flex-shrink-0"
                                      />
                                    ))}
                                  </div>
                                  {app.description_ko && (
                                    <p className="text-sm text-gray-700 whitespace-pre-line">
                                      {app.description_ko}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="text-sm text-gray-500 italic">
                                  Korean App Store listing not available for this app.
                                  The app supports Korean language but doesn&apos;t have localized marketing materials.
                                </p>
                              )}
                            </td>
                          </tr>
                        )}
                          </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </>
        )}
      </main>
    </div>
  );
}
