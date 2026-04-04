import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface HeroProps {
  onGetStarted?: () => void;
}

export default function Hero({ onGetStarted }: HeroProps) {
  const highlights = [
    'Multi-branch Employee Management',
    'Automated Payroll Processing',
    'Real-time Attendance Tracking',
    'Leave & Insurance Management'
  ];

  return (
    <section className="relative overflow-hidden py-20 md:py-32 lg:py-40 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 h-96 w-96 rounded-full bg-blue-100 opacity-30 blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 h-96 w-96 rounded-full bg-indigo-100 opacity-30 blur-3xl" />
      </div>

      <div className="container relative mx-auto max-w-4xl z-10">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
            <span className="flex h-2 w-2 rounded-full bg-blue-600" />
            Enterprise-Grade HR Solution
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-6 text-slate-900 leading-tight">
          Complete{' '}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            HR Management System
          </span>
          {' '}for Modern Organizations
        </h1>

        {/* Subheading */}
        <p className="text-lg md:text-xl text-slate-600 text-center mb-12 max-w-2xl mx-auto">
          Manage employees, attendance, payroll, leaves, bonuses, insurance, and organizational setup all in one unified platform. Designed for multi-branch nurseries and international organizations.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-16">
          <Button
            onClick={onGetStarted}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-8 py-3 flex items-center gap-2 transition-all transform hover:scale-105"
          >
            Get Started
            <ArrowRight className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg px-8 py-3"
          >
            View Demo
          </Button>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
          {highlights.map((highlight) => (
            <div key={highlight} className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <span className="text-slate-700">{highlight}</span>
            </div>
          ))}
        </div>

        {/* Hero Image Placeholder */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-8 md:p-12 shadow-lg">
          <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-slate-200 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl md:text-7xl font-bold text-blue-100 mb-4">HR ERP</div>
              <p className="text-slate-400 text-lg">Dashboard Preview Coming Soon</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
