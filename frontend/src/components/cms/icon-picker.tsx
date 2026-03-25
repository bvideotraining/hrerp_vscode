'use client';

import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Search, X } from 'lucide-react';

// Curated list of useful icons for business/website cards
const ICON_LIST = [
  'Star', 'Zap', 'Shield', 'Heart', 'Award', 'Target', 'TrendingUp', 'Users',
  'Globe', 'Lock', 'Rocket', 'Lightbulb', 'CheckCircle', 'Clock', 'Calendar',
  'BarChart3', 'PieChart', 'Activity', 'Cpu', 'Database', 'Cloud', 'Wifi',
  'Smartphone', 'Monitor', 'Laptop', 'Headphones', 'Camera', 'Video', 'Music',
  'Mail', 'MessageSquare', 'Phone', 'MapPin', 'Navigation', 'Compass',
  'Home', 'Building2', 'Warehouse', 'Store', 'Briefcase', 'GraduationCap',
  'BookOpen', 'FileText', 'Folder', 'Archive', 'Package', 'Gift', 'ShoppingCart',
  'CreditCard', 'DollarSign', 'Coins', 'Banknote', 'Receipt', 'Wallet',
  'Wrench', 'Settings', 'Cog', 'Tool', 'Hammer', 'Paintbrush', 'Palette',
  'Layers', 'Layout', 'Grid3X3', 'AlignCenter', 'Type', 'Pen', 'Edit3',
  'ThumbsUp', 'Smile', 'Sun', 'Moon', 'Leaf', 'Flower2', 'TreePine',
  'Car', 'Plane', 'Ship', 'Train', 'Bike', 'Truck',
  'Eye', 'Search', 'Filter', 'SlidersHorizontal', 'RefreshCw', 'Download',
  'Upload', 'Share2', 'Link', 'ExternalLink', 'QrCode', 'Fingerprint',
  'Bell', 'Flag', 'Bookmark', 'Tag', 'Hash', 'AtSign',
  'Sparkles', 'Crown', 'Diamond', 'Gem', 'Medal',
  'CircleDot', 'Hexagon', 'Triangle', 'Square', 'Circle',
];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export default function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = ICON_LIST.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  const SelectedIcon = (LucideIcons as any)[value] || LucideIcons.Star;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <SelectedIcon className="h-5 w-5 text-slate-700" />
        <span className="text-sm text-slate-600">{value || 'Pick icon'}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-30 w-80">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 border border-slate-200 rounded-lg text-sm"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-8 gap-1 max-h-48 overflow-auto">
            {filtered.map((name) => {
              const Icon = (LucideIcons as any)[name];
              if (!Icon) return null;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => { onChange(name); setOpen(false); }}
                  title={name}
                  className={`p-2 rounded-lg transition-colors ${
                    value === name
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
