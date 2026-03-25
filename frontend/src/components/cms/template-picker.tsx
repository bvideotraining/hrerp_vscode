'use client';

import { PAGE_TEMPLATES, PageTemplate } from './page-templates';
import { ArrowLeft, FileText, X } from 'lucide-react';

interface TemplatPickerProps {
  onSelect: (template: PageTemplate) => void;
  onBlank: () => void;
  onClose: () => void;
}

export default function TemplatePicker({ onSelect, onBlank, onClose }: TemplatPickerProps) {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Choose a Template</h2>
          <p className="text-slate-600">Start with a pre-built template or begin from scratch</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Blank Page Option */}
      <div className="mb-8">
        <button
          onClick={onBlank}
          className="w-full flex items-center gap-4 p-5 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
        >
          <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
            <FileText className="h-7 w-7" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-slate-900 text-lg">Blank Page</div>
            <div className="text-slate-500 text-sm">Start with an empty page and add blocks manually</div>
          </div>
        </button>
      </div>

      {/* Templates Grid */}
      <h3 className="text-lg font-semibold text-slate-700 mb-4">HR Website Templates</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {PAGE_TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className="text-left border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-300 transition-all bg-white group"
          >
            {/* Thumbnail */}
            <div className="w-full h-32 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg flex items-center justify-center mb-4 group-hover:from-blue-50 group-hover:to-indigo-50 transition-colors">
              <span className="text-5xl">{template.thumbnail}</span>
            </div>
            {/* Info */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-900 mb-1">{template.name}</div>
                <div className="text-slate-500 text-sm leading-relaxed">{template.description}</div>
              </div>
            </div>
            {/* Block count badge */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                {template.pageData.blocks.length} blocks
              </span>
              <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
                {template.category}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
