'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <h1 className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
                Localization Auditor
              </h1>
            </Link>
            <span className="text-xs text-gray-400 font-normal">v{process.env.APP_VERSION}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <Link href="/app-store">
              <Button variant="ghost">App Store Scanner</Button>
            </Link>
            <Link href="/research">
              <Button variant="ghost">Research</Button>
            </Link>
            <Link href="/glossaries">
              <Button variant="ghost">Glossaries</Button>
            </Link>
            {user && (
              <>
                <span className="text-sm text-gray-500">{user.email}</span>
                <Button variant="ghost" onClick={logout}>
                  Logout
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
