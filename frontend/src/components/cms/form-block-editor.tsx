'use client';

import { useState, useCallback } from 'react';
import { FormBlockData, FormField } from '@/lib/services/cms.service';
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';

type Tab = 'fields' | 'style' | 'behavior' | 'destination';
type FieldType = FormField['type'];

interface Props {
  data: Partial<FormBlockData>;
  onChange: (data: FormBlockData) => void;
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio' },
];

function generateFieldId() {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeData(raw: Partial<FormBlockData>): FormBlockData {
  return {
    formTitle: raw.formTitle ?? '',
    formSubtitle: raw.formSubtitle ?? '',
    fields: raw.fields ?? [],
    submitButtonText: raw.submitButtonText ?? 'Submit',
    submitButtonColor: raw.submitButtonColor ?? '#2563eb',
    submitButtonTextColor: raw.submitButtonTextColor ?? '#ffffff',
    successMessage: raw.successMessage ?? 'Thank you! Your message has been sent.',
    redirectUrl: raw.redirectUrl ?? '',
    destination: raw.destination ?? 'firestore',
    firestoreCollection: raw.firestoreCollection ?? 'form_submissions',
    webhookUrl: raw.webhookUrl ?? '',
    enableHoneypot: raw.enableHoneypot ?? true,
    formWidth: raw.formWidth ?? 'medium',
    backgroundColor: raw.backgroundColor ?? '#ffffff',
    padding: raw.padding ?? 'medium',
  };
}

export default function FormBlockEditor({ data, onChange }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('fields');
  const [expandedField, setExpandedField] = useState<string | null>(null);

  const normalized = normalizeData(data);

  const update = useCallback(
    (patch: Partial<FormBlockData>) => {
      onChange({ ...normalized, ...patch });
    },
    [normalized, onChange],
  );

  const addField = () => {
    const newField: FormField = {
      id: generateFieldId(),
      type: 'text',
      label: 'New Field',
      placeholder: '',
      required: false,
      options: [],
      width: 'full',
    };
    const fields = [...normalized.fields, newField];
    update({ fields });
    setExpandedField(newField.id);
  };

  const removeField = (id: string) => {
    update({ fields: normalized.fields.filter((f) => f.id !== id) });
    if (expandedField === id) setExpandedField(null);
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    update({
      fields: normalized.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  };

  const moveField = (id: string, dir: 'up' | 'down') => {
    const fields = [...normalized.fields];
    const idx = fields.findIndex((f) => f.id === id);
    if (idx < 0) return;
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= fields.length) return;
    [fields[idx], fields[newIdx]] = [fields[newIdx], fields[idx]];
    update({ fields });
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'fields', label: 'Fields' },
    { id: 'style', label: 'Style' },
    { id: 'behavior', label: 'Behavior' },
    { id: 'destination', label: 'Destination' },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-white border border-b-white border-slate-200 text-blue-600 -mb-px'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── FIELDS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'fields' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Form Title</label>
              <input
                value={normalized.formTitle}
                onChange={(e) => update({ formTitle: e.target.value })}
                placeholder="e.g. Contact Us"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Form Subtitle</label>
              <input
                value={normalized.formSubtitle}
                onChange={(e) => update({ formSubtitle: e.target.value })}
                placeholder="Optional subtitle"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          {normalized.fields.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
              No fields yet. Click &quot;Add Field&quot; to get started.
            </div>
          )}

          {normalized.fields.map((field, idx) => (
            <div key={field.id} className="border border-slate-200 rounded-lg bg-white">
              {/* Field header */}
              <div
                onClick={() => setExpandedField(expandedField === field.id ? null : field.id)}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer"
              >
                <GripVertical className="h-4 w-4 text-slate-300 flex-shrink-0" />
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono uppercase tracking-wide">
                  {field.type}
                </span>
                <span className="text-sm font-medium text-slate-700 flex-1 truncate">{field.label}</span>
                {field.required && (
                  <span className="text-xs text-red-500 font-medium">Required</span>
                )}
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => moveField(field.id, 'up')}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                  <button
                    onClick={() => moveField(field.id, 'down')}
                    disabled={idx === normalized.fields.length - 1}
                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                  <button
                    onClick={() => removeField(field.id)}
                    className="p-1 rounded hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </div>
              </div>

              {/* Field editor (expanded) */}
              {expandedField === field.id && (
                <div className="border-t border-slate-100 p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Field Type</label>
                      <select
                        value={field.type}
                        onChange={(e) => updateField(field.id, { type: e.target.value as FieldType, options: [] })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                      >
                        {FIELD_TYPES.map((ft) => (
                          <option key={ft.value} value={ft.value}>{ft.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Width</label>
                      <select
                        value={field.width ?? 'full'}
                        onChange={(e) => updateField(field.id, { width: e.target.value as 'full' | 'half' })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                      >
                        <option value="full">Full Width</option>
                        <option value="half">Half Width</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
                      <input
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        placeholder="Field label"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    {['text', 'email', 'phone', 'textarea', 'select'].includes(field.type) && (
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Placeholder</label>
                        <input
                          value={field.placeholder ?? ''}
                          onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                          placeholder="e.g. Enter your name"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        />
                      </div>
                    )}
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(field.id, { required: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">Required field</span>
                  </label>

                  {/* Options for select / radio / checkbox types */}
                  {['select', 'radio', 'checkbox'].includes(field.type) && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Options (one per line)
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                        rows={4}
                        value={(field.options ?? []).join('\n')}
                        onChange={(e) =>
                          updateField(field.id, {
                            options: e.target.value.split('\n').map((o) => o.trim()).filter(Boolean),
                          })
                        }
                        placeholder={'Option 1\nOption 2\nOption 3'}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addField}
            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Field
          </button>
        </div>
      )}

      {/* ── STYLE TAB ──────────────────────────────────────────────── */}
      {activeTab === 'style' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Form Width</label>
              <select
                value={normalized.formWidth}
                onChange={(e) => update({ formWidth: e.target.value as FormBlockData['formWidth'] })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="narrow">Narrow (480px)</option>
                <option value="medium">Medium (640px)</option>
                <option value="wide">Wide (800px)</option>
                <option value="full">Full Width</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Section Padding</label>
              <select
                value={normalized.padding}
                onChange={(e) => update({ padding: e.target.value as FormBlockData['padding'] })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Background Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={normalized.backgroundColor}
                onChange={(e) => update({ backgroundColor: e.target.value })}
                className="h-9 w-14 cursor-pointer rounded border border-slate-200"
              />
              <input
                type="text"
                value={normalized.backgroundColor}
                onChange={(e) => update({ backgroundColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                placeholder="#ffffff"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Submit Button</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Button Text</label>
                <input
                  value={normalized.submitButtonText}
                  onChange={(e) => update({ submitButtonText: e.target.value })}
                  placeholder="Submit"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Button Background</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={normalized.submitButtonColor}
                    onChange={(e) => update({ submitButtonColor: e.target.value })}
                    className="h-9 w-10 cursor-pointer rounded border border-slate-200 flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={normalized.submitButtonColor}
                    onChange={(e) => update({ submitButtonColor: e.target.value })}
                    className="flex-1 px-2 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Button Text Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={normalized.submitButtonTextColor}
                    onChange={(e) => update({ submitButtonTextColor: e.target.value })}
                    className="h-9 w-10 cursor-pointer rounded border border-slate-200 flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={normalized.submitButtonTextColor}
                    onChange={(e) => update({ submitButtonTextColor: e.target.value })}
                    className="flex-1 px-2 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>
            {/* Live preview */}
            <div className="mt-3 flex">
              <button
                className="px-6 py-2 rounded-lg text-sm font-semibold"
                style={{
                  backgroundColor: normalized.submitButtonColor,
                  color: normalized.submitButtonTextColor,
                }}
              >
                {normalized.submitButtonText || 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BEHAVIOR TAB ───────────────────────────────────────────── */}
      {activeTab === 'behavior' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Success Message</label>
            <textarea
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              rows={3}
              value={normalized.successMessage}
              onChange={(e) => update({ successMessage: e.target.value })}
              placeholder="Thank you! Your message has been sent."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Redirect URL after submit{' '}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              value={normalized.redirectUrl ?? ''}
              onChange={(e) => update({ redirectUrl: e.target.value })}
              placeholder="e.g. /pages/thank-you"
            />
            <p className="text-xs text-slate-400 mt-1">Leave empty to show success message in place.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={normalized.enableHoneypot ?? true}
              onChange={(e) => update({ enableHoneypot: e.target.checked })}
              className="rounded border-slate-300"
            />
            <div>
              <span className="text-sm text-slate-700">Enable honeypot spam protection</span>
              <p className="text-xs text-slate-400">
                Adds a hidden field that bots fill in, blocking automated submissions.
              </p>
            </div>
          </label>
        </div>
      )}

      {/* ── DESTINATION TAB ────────────────────────────────────────── */}
      {activeTab === 'destination' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Where to send submissions</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="destination"
                  checked={normalized.destination === 'firestore'}
                  onChange={() => update({ destination: 'firestore' })}
                  className="border-slate-300"
                />
                <span className="text-sm text-slate-700">Save to Firestore</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="destination"
                  checked={normalized.destination === 'webhook'}
                  onChange={() => update({ destination: 'webhook' })}
                  className="border-slate-300"
                />
                <span className="text-sm text-slate-700">Send to Webhook</span>
              </label>
            </div>
          </div>

          {normalized.destination === 'firestore' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Firestore Collection Name</label>
              <input
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                value={normalized.firestoreCollection ?? ''}
                onChange={(e) => update({ firestoreCollection: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
                placeholder="e.g. contact_submissions"
              />
              <p className="text-xs text-slate-400 mt-1">
                Submissions saved to this Firestore collection. Only alphanumeric characters, underscores, and hyphens allowed.
              </p>
            </div>
          )}

          {normalized.destination === 'webhook' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Webhook URL</label>
              <input
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                value={normalized.webhookUrl ?? ''}
                onChange={(e) => update({ webhookUrl: e.target.value })}
                placeholder="https://hooks.example.com/forms/..."
              />
              <p className="text-xs text-slate-400 mt-1">
                Submissions will be POSTed as JSON to this URL.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
