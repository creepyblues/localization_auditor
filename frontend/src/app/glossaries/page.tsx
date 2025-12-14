'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { INDUSTRIES } from '@/types';
import type { Glossary, GlossaryTermCreate } from '@/types';

export default function GlossariesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [glossaries, setGlossaries] = useState<Glossary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGlossary, setSelectedGlossary] = useState<Glossary | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    industry: 'general',
    source_language: 'en',
    target_language: 'ko',
  });

  const [newTerm, setNewTerm] = useState<GlossaryTermCreate>({
    source_term: '',
    target_term: '',
    context: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadGlossaries();
    }
  }, [user]);

  const loadGlossaries = async () => {
    try {
      const { glossaries } = await api.listGlossaries();
      setGlossaries(glossaries);
    } catch (err) {
      console.error('Failed to load glossaries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGlossary = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createGlossary(formData);
      setShowCreateForm(false);
      setFormData({
        name: '',
        description: '',
        industry: 'general',
        source_language: 'en',
        target_language: 'ko',
      });
      loadGlossaries();
    } catch (err) {
      console.error('Failed to create glossary:', err);
    }
  };

  const handleAddTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGlossary) return;

    try {
      await api.addGlossaryTerm(selectedGlossary.id, newTerm);
      const updated = await api.getGlossary(selectedGlossary.id);
      setSelectedGlossary(updated);
      setNewTerm({ source_term: '', target_term: '', context: '' });
    } catch (err) {
      console.error('Failed to add term:', err);
    }
  };

  const handleDeleteTerm = async (termId: number) => {
    if (!selectedGlossary) return;

    try {
      await api.deleteGlossaryTerm(selectedGlossary.id, termId);
      const updated = await api.getGlossary(selectedGlossary.id);
      setSelectedGlossary(updated);
    } catch (err) {
      console.error('Failed to delete term:', err);
    }
  };

  const handleSelectGlossary = async (glossary: Glossary) => {
    try {
      const full = await api.getGlossary(glossary.id);
      setSelectedGlossary(full);
    } catch (err) {
      console.error('Failed to load glossary:', err);
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Glossaries</h2>
            <p className="text-gray-500">Manage industry-specific terminology</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>+ New Glossary</Button>
        </div>

        {showCreateForm && (
          <Card className="mb-8">
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Create New Glossary</h3>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateGlossary} className="space-y-4">
                <Input
                  id="name"
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Input
                  id="description"
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <div className="grid md:grid-cols-3 gap-4">
                  <Select
                    id="industry"
                    label="Industry"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    options={INDUSTRIES}
                  />
                  <Input
                    id="source_language"
                    label="Source Language"
                    value={formData.source_language}
                    onChange={(e) => setFormData({ ...formData, source_language: e.target.value })}
                    placeholder="e.g., en"
                  />
                  <Input
                    id="target_language"
                    label="Target Language"
                    value={formData.target_language}
                    onChange={(e) => setFormData({ ...formData, target_language: e.target.value })}
                    placeholder="e.g., ko"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Create</Button>
                  <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Glossary List */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Your Glossaries</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : glossaries.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No glossaries yet. Create one to get started.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {glossaries.map((glossary) => (
                  <Card
                    key={glossary.id}
                    className={`cursor-pointer transition-colors ${
                      selectedGlossary?.id === glossary.id
                        ? 'ring-2 ring-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectGlossary(glossary)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{glossary.name}</h4>
                          <p className="text-sm text-gray-500">
                            {glossary.industry} • {glossary.source_language} → {glossary.target_language}
                          </p>
                        </div>
                        {glossary.is_system && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            System
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Selected Glossary Detail */}
          <div>
            {selectedGlossary ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{selectedGlossary.name}</h3>
                    <span className="text-sm text-gray-500">
                      {selectedGlossary.terms?.length || 0} terms
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {!selectedGlossary.is_system && (
                    <form onSubmit={handleAddTerm} className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Add New Term</h4>
                      <div className="grid gap-2">
                        <Input
                          placeholder="Source term"
                          value={newTerm.source_term}
                          onChange={(e) => setNewTerm({ ...newTerm, source_term: e.target.value })}
                          required
                        />
                        <Input
                          placeholder="Target term"
                          value={newTerm.target_term}
                          onChange={(e) => setNewTerm({ ...newTerm, target_term: e.target.value })}
                          required
                        />
                        <Input
                          placeholder="Context (optional)"
                          value={newTerm.context || ''}
                          onChange={(e) => setNewTerm({ ...newTerm, context: e.target.value })}
                        />
                        <Button type="submit" size="sm">
                          Add Term
                        </Button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedGlossary.terms?.map((term) => (
                      <div
                        key={term.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {term.source_term} → {term.target_term}
                          </div>
                          {term.context && (
                            <p className="text-xs text-gray-500">{term.context}</p>
                          )}
                        </div>
                        {!selectedGlossary.is_system && (
                          <button
                            onClick={() => handleDeleteTerm(term.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg className="w-4 h-4\" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Select a glossary to view its terms
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
