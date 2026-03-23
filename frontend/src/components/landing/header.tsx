import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
        {/* Logo & Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
            <span className="text-lg font-bold text-white">HR</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-slate-900">HR ERP</span>
            <span className="text-xs text-slate-500">Enterprise System</span>
          </div>
        </Link>

        {/* Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-8">
          <Link 
            href="#features" 
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            Features
          </Link>
          <Link 
            href="#modules" 
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            Modules
          </Link>
          <Link 
            href="#about" 
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            About
          </Link>
          <Link 
            href="#contact" 
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            Contact
          </Link>
        </nav>

        {/* Sign In Button */}
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2 transition-colors">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
