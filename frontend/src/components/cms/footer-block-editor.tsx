'use client';

import { FooterData } from '@/lib/services/cms.service';
import { Plus, Trash2 } from 'lucide-react';

const FOOTER_TEMPLATES = [
  { id: 'simple', label: 'Simple', preview: 'Single row with links' },
  { id: 'columns', label: 'Columns', preview: 'Multi-column layout' },
  { id: 'centered', label: 'Centered', preview: 'Centered with social icons' },
];

interface Props {
  data: FooterData;
  onChange: (data: FooterData) => void;
}

export default function FooterBlockEditor({ data, onChange }: Props) {
  const update = (partial: Partial<FooterData>) => {
    onChange({ ...data, ...partial });
  };

  const addLink = () => {
    update({ links: [...(data.links || []), { label: 'New Link', url: '#' }] });
  };

  const updateLink = (idx: number, field: 'label' | 'url', value: string) => {
    const links = [...(data.links || [])];
    links[idx] = { ...links[idx], [field]: value };
    update({ links });
  };

  const removeLink = (idx: number) => {
    update({ links: (data.links || []).filter((_, i) => i !== idx) });
  };

  const addColumn = () => {
    update({
      columns: [
        ...(data.columns || []),
        { title: 'Column', links: [{ label: 'Link', url: '#' }] },
      ],
    });
  };

  const updateColumnTitle = (colIdx: number, title: string) => {
    const columns = [...(data.columns || [])];
    columns[colIdx] = { ...columns[colIdx], title };
    update({ columns });
  };

  const addColumnLink = (colIdx: number) => {
    const columns = [...(data.columns || [])];
    columns[colIdx] = {
      ...columns[colIdx],
      links: [...columns[colIdx].links, { label: 'New Link', url: '#' }],
    };
    update({ columns });
  };

  const updateColumnLink = (colIdx: number, linkIdx: number, field: 'label' | 'url', value: string) => {
    const columns = [...(data.columns || [])];
    const links = [...columns[colIdx].links];
    links[linkIdx] = { ...links[linkIdx], [field]: value };
    columns[colIdx] = { ...columns[colIdx], links };
    update({ columns });
  };

  const removeColumnLink = (colIdx: number, linkIdx: number) => {
    const columns = [...(data.columns || [])];
    columns[colIdx] = {
      ...columns[colIdx],
      links: columns[colIdx].links.filter((_, i) => i !== linkIdx),
    };
    update({ columns });
  };

  const removeColumn = (colIdx: number) => {
    update({ columns: (data.columns || []).filter((_, i) => i !== colIdx) });
  };

  const addSocialLink = () => {
    update({
      socialLinks: [...(data.socialLinks || []), { platform: 'twitter', url: '#' }],
    });
  };

  const updateSocialLink = (idx: number, field: 'platform' | 'url', value: string) => {
    const socialLinks = [...(data.socialLinks || [])];
    socialLinks[idx] = { ...socialLinks[idx], [field]: value };
    update({ socialLinks });
  };

  const removeSocialLink = (idx: number) => {
    update({ socialLinks: (data.socialLinks || []).filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-4">
      {/* Template */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-2">Template</label>
        <div className="grid grid-cols-3 gap-2">
          {FOOTER_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => update({ template: t.id as FooterData['template'] })}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                data.template === t.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-xs font-semibold text-slate-800 block">{t.label}</span>
              <span className="text-[10px] text-slate-500">{t.preview}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Company Info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Company Name</label>
          <input
            type="text"
            value={data.companyName || ''}
            onChange={(e) => update({ companyName: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Copyright</label>
          <input
            type="text"
            value={data.copyright || ''}
            onChange={(e) => update({ copyright: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
        <textarea
          value={data.description || ''}
          onChange={(e) => update({ description: e.target.value })}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
          rows={2}
        />
      </div>

      {/* Links (Simple template) */}
      {(data.template === 'simple' || data.template === 'centered') && (
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Footer Links</label>
          <div className="space-y-2">
            {(data.links || []).map((link, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={link.label}
                  onChange={(e) => updateLink(idx, 'label', e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                  placeholder="Label"
                />
                <input
                  type="text"
                  value={link.url}
                  onChange={(e) => updateLink(idx, 'url', e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                  placeholder="URL"
                />
                <button onClick={() => removeLink(idx)} className="p-1.5 rounded hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addLink}
            className="mt-2 flex items-center gap-1 px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Link
          </button>
        </div>
      )}

      {/* Columns (Columns template) */}
      {data.template === 'columns' && (
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Footer Columns</label>
          <div className="space-y-3">
            {(data.columns || []).map((col, colIdx) => (
              <div key={colIdx} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="text"
                    value={col.title}
                    onChange={(e) => updateColumnTitle(colIdx, e.target.value)}
                    className="px-2 py-1 border border-slate-200 rounded text-sm font-medium"
                    placeholder="Column Title"
                  />
                  <button onClick={() => removeColumn(colIdx)} className="p-1 rounded hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {col.links.map((link, linkIdx) => (
                    <div key={linkIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => updateColumnLink(colIdx, linkIdx, 'label', e.target.value)}
                        className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs"
                        placeholder="Label"
                      />
                      <input
                        type="text"
                        value={link.url}
                        onChange={(e) => updateColumnLink(colIdx, linkIdx, 'url', e.target.value)}
                        className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs"
                        placeholder="URL"
                      />
                      <button onClick={() => removeColumnLink(colIdx, linkIdx)} className="p-0.5">
                        <Trash2 className="h-3 w-3 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => addColumnLink(colIdx)}
                  className="mt-1.5 text-[10px] text-blue-600 hover:underline"
                >
                  + Add Link
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addColumn}
            className="mt-2 flex items-center gap-1 px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Column
          </button>
        </div>
      )}

      {/* Social Links */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-2">Social Links</label>
        <div className="space-y-2">
          {(data.socialLinks || []).map((sl, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select
                value={sl.platform}
                onChange={(e) => updateSocialLink(idx, 'platform', e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm"
              >
                {['facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'github', 'tiktok'].map(
                  (p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  )
                )}
              </select>
              <input
                type="text"
                value={sl.url}
                onChange={(e) => updateSocialLink(idx, 'url', e.target.value)}
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                placeholder="https://..."
              />
              <button onClick={() => removeSocialLink(idx)} className="p-1.5 rounded hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addSocialLink}
          className="mt-2 flex items-center gap-1 px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Social Link
        </button>
      </div>
    </div>
  );
}
