import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Zap,
  Lock,
  BarChart3,
  Globe,
  Smartphone,
  Cpu,
  Database,
  Users
} from 'lucide-react';

const features = [
  {
    title: 'Automated Payroll',
    description: 'Red-defined salary calculations with deductions, bonuses, and insurance integration. One-click payroll processing.',
    icon: Zap
  },
  {
    title: 'Enterprise Security',
    description: '7-layer security framework with role-based access control, encryption, and comprehensive audit logs.',
    icon: Lock
  },
  {
    title: 'Real-time Analytics',
    description: 'Dashboard with KPIs, attendance metrics, salary insights, and custom reports for data-driven decisions.',
    icon: BarChart3
  },
  {
    title: 'Multi-branch Support',
    description: 'Manage multiple branches globally with branch-specific configurations and unified reporting.',
    icon: Globe
  },
  {
    title: 'Mobile Ready',
    description: 'Responsive design works perfectly on desktop, tablet, and mobile devices. Access anywhere, anytime.',
    icon: Smartphone
  },
  {
    title: 'AI-Powered (Future)',
    description: 'Built with scalability for AI integration to predict attrition, suggest benefits, and optimize scheduling.',
    icon: Cpu
  },
  {
    title: 'Cloud Based',
    description: 'Hosted on Firebase and Vercel for 99.9% uptime, automatic backups, and zero infrastructure management.',
    icon: Database
  },
  {
    title: 'Team Collaboration',
    description: 'Built-in approval workflows, notifications, and team features for seamless HR operations.',
    icon: Users
  }
];

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-32 px-4 bg-slate-50">
      <div className="container mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-slate-900">
            Why Choose HR ERP?
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Built with enterprise standards, designed for simplicity, and powered by modern technology.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;

            return (
              <Card 
                key={idx} 
                className="border-slate-200 hover:shadow-lg transition-shadow duration-300"
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                      <Icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg text-slate-900">{feature.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-600 text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Stats Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-8 bg-white rounded-lg border border-slate-200">
            <div className="text-4xl font-bold text-blue-600 mb-2">11</div>
            <p className="text-slate-600">Powerful Modules</p>
          </div>
          <div className="p-8 bg-white rounded-lg border border-slate-200">
            <div className="text-4xl font-bold text-blue-600 mb-2">100+</div>
            <p className="text-slate-600">API Endpoints</p>
          </div>
          <div className="p-8 bg-white rounded-lg border border-slate-200">
            <div className="text-4xl font-bold text-blue-600 mb-2">99.9%</div>
            <p className="text-slate-600">Uptime SLA</p>
          </div>
        </div>
      </div>
    </section>
  );
}
