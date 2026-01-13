'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import type { AppStoreScanResult } from '@/types';
import { APP_STORE_CATEGORIES, APP_STORE_FEED_TYPES } from '@/types';

export default function AppStorePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [scanResult, setScanResult] = useState<AppStoreScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [category, setCategory] = useState('health_fitness');
  const [feedType, setFeedType] = useState('free');
  const [limit, setLimit] = useState(50);
  const [country, setCountry] = useState('us');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const result = await api.scanAppStoreCategory(category, feedType, limit, country);
      setScanResult(result);
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

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">Localization Auditor</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
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
                    <span
                      key={lang}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Apps Table */}
            <Card>
              <CardContent className="py-6">
                <h3 className="text-lg font-semibold mb-4">
                  Top {scanResult.total_apps_scanned} Apps
                </h3>
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
                      {scanResult.apps.map((app, idx) => (
                        <tr key={app.app_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {app.app_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {app.artist}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-blue-600">
                                {app.language_count}
                              </span>
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
