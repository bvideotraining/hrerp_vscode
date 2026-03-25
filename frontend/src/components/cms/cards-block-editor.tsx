'use client';

import { CardsData, CardItem } from '@/lib/services/cms.service';
import IconPicker from './icon-picker';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  data: CardsData;
  onChange: (data: CardsData) => void;
}

export default function CardsBlockEditor({ data, onChange }: Props) {
  const update = (partial: Partial<CardsData>) => {
    onChange({ ...data, ...partial });
  };

  const updateCard = (index: number, partial: Partial<CardItem>) => {
    const cards = [...(data.cards || [])];
    cards[index] = { ...cards[index], ...partial };
    update({ cards });
  };

  const addCard = () => {
    update({
      cards: [
        ...(data.cards || []),
        { icon: 'Star', title: 'New Card', text: 'Card description' },
      ],
    });
  };

  const removeCard = (index: number) => {
    update({ cards: (data.cards || []).filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      {/* Section Heading */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Section Heading</label>
        <input
          type="text"
          value={data.heading || ''}
          onChange={(e) => update({ heading: e.target.value })}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          placeholder="Section heading"
        />
      </div>

      {/* Columns */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Columns</label>
        <div className="flex gap-2">
          {([2, 3, 4] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => update({ columns: n })}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium border-2 transition-colors ${
                data.columns === n
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 hover:border-slate-300 text-slate-600'
              }`}
            >
              {n} cols
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-2">Cards</label>
        <div className="space-y-3">
          {(data.cards || []).map((card, idx) => (
            <div key={idx} className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Card {idx + 1}</span>
                <button onClick={() => removeCard(idx)} className="p-1 rounded hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <IconPicker
                  value={card.icon}
                  onChange={(icon) => updateCard(idx, { icon })}
                />
                <input
                  type="text"
                  value={card.title}
                  onChange={(e) => updateCard(idx, { title: e.target.value })}
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                  placeholder="Card title"
                />
              </div>
              <textarea
                value={card.text}
                onChange={(e) => updateCard(idx, { text: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm resize-none"
                rows={2}
                placeholder="Card description"
              />
            </div>
          ))}
        </div>
        <button
          onClick={addCard}
          className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
        >
          <Plus className="h-4 w-4" />
          Add Card
        </button>
      </div>
    </div>
  );
}
