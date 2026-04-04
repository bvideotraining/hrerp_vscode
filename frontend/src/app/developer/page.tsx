'use client';

import { useState } from 'react';
import { DeveloperGate } from '@/components/auth/developer-gate';
import { ResourcesTab } from '@/components/developer/resources-tab';
import { OwnersPanel } from '@/components/developer/owners-panel';
import { AiTab } from '@/components/developer/ai-tab';
import { Code2 } from 'lucide-react';

export default function DeveloperPage() {
  const [activeTab, setActiveTab] = useState<'resources' | 'ai'>('resources');

  return (
    <DeveloperGate>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="px-6 py-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Code2 className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Developer Module</h1>
              <p className="text-sm text-slate-500">System configuration and resource management</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto">
          {/* Sidebar: Owners Panel */}
          <div className="lg:w-80 flex-shrink-0">
            <OwnersPanel />
          </div>

          {/* Main Content: Tabs */}
          <div className="flex-1">
            {/* Tab Navigation */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex gap-0 border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('resources')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors border-b-2 ${ activeTab === 'resources'
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 bg-white'
                  }`}
                >
                  Resources
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors border-b-2 ${
                    activeTab === 'ai'
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-slate-600 hover:text-slate-900 bg-white'
                  }`}
                >
                  AI
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'resources' && <ResourcesTab />}
                {activeTab === 'ai' && <AiTab />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DeveloperGate>
  );
}
