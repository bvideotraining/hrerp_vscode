'use client';

import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { ContentBlock, HeroData, CardsData, RichtextData, FooterData, FormBlockData, FormField, cmsService } from '@/lib/services/cms.service';

interface Props {
  blocks: ContentBlock[];
  pageSlug?: string;
}

export default function PagePreview({ blocks, pageSlug = '' }: Props) {
  return (
    <div>
      {blocks
        .sort((a, b) => a.order - b.order)
        .map((block) => (
          <div key={block.id}>
            {block.type === 'hero' && <HeroPreview data={block.data} />}
            {block.type === 'cards' && <CardsPreview data={block.data} />}
            {block.type === 'richtext' && <RichtextPreview data={block.data} />}
            {block.type === 'footer' && <FooterPreview data={block.data} />}
            {block.type === 'form' && <FormBlockPreview data={block.data} blockId={block.id} pageSlug={pageSlug} />}
          </div>
        ))}
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function HeroPreview({ data }: { data: HeroData }) {
  const {
    template, title, subtitle, buttonText, buttonLink, backgroundImage, overlayColor,
    titleFontFamily, titleFontSize, titleColor,
    subtitleFontFamily, subtitleFontSize, subtitleColor,
    buttonBgColor, buttonTextColor,
  } = data;

  const titleStyle: React.CSSProperties = {
    ...(titleFontFamily ? { fontFamily: titleFontFamily } : {}),
    ...(titleFontSize ? { fontSize: titleFontSize } : {}),
    ...(titleColor ? { color: titleColor } : {}),
  };

  const subtitleStyle: React.CSSProperties = {
    ...(subtitleFontFamily ? { fontFamily: subtitleFontFamily } : {}),
    ...(subtitleFontSize ? { fontSize: subtitleFontSize } : {}),
    ...(subtitleColor ? { color: subtitleColor } : {}),
  };

  const buttonStyle: React.CSSProperties = {
    ...(buttonBgColor ? { backgroundColor: buttonBgColor } : {}),
    ...(buttonTextColor ? { color: buttonTextColor } : {}),
  };

  if (template === 'split') {
    return (
      <section className="min-h-[500px] flex items-center">
        <div className="container mx-auto max-w-7xl px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold text-slate-900 mb-4 leading-tight" style={titleStyle}>{title}</h1>
            <p className="text-xl text-slate-600 mb-8" style={subtitleStyle}>{subtitle}</p>
            {buttonText && (
              <a
                href={buttonLink || '#'}
                className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity text-lg"
                style={Object.keys(buttonStyle).length ? buttonStyle : undefined}
              >
                {buttonText}
              </a>
            )}
          </div>
          {backgroundImage && (
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={backgroundImage} alt="" className="w-full h-80 object-cover" />
            </div>
          )}
        </div>
      </section>
    );
  }

  if (template === 'image-bg') {
    return (
      <section
        className="min-h-[600px] flex items-center justify-center relative bg-cover bg-center"
        style={{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined }}
      >
        {overlayColor && (
          <div className="absolute inset-0" style={{ backgroundColor: overlayColor }} />
        )}
        <div className="relative z-10 text-center px-6 max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight" style={titleStyle}>{title}</h1>
          <p className="text-xl text-white/90 mb-8" style={subtitleStyle}>{subtitle}</p>
          {buttonText && (
            <a
              href={buttonLink || '#'}
              className="inline-block px-8 py-3 bg-white text-slate-900 rounded-lg font-semibold hover:opacity-90 transition-opacity text-lg"
              style={Object.keys(buttonStyle).length ? buttonStyle : undefined}
            >
              {buttonText}
            </a>
          )}
        </div>
      </section>
    );
  }

  if (template === 'gradient') {
    return (
      <section className="min-h-[600px] flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 relative">
        {overlayColor && (
          <div className="absolute inset-0" style={{ backgroundColor: overlayColor }} />
        )}
        <div className="relative z-10 text-center px-6 max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight" style={titleStyle}>{title}</h1>
          <p className="text-xl text-white/90 mb-8" style={subtitleStyle}>{subtitle}</p>
          {buttonText && (
            <a
              href={buttonLink || '#'}
              className="inline-block px-8 py-3 bg-white text-slate-900 rounded-lg font-semibold hover:opacity-90 transition-opacity text-lg"
              style={Object.keys(buttonStyle).length ? buttonStyle : undefined}
            >
              {buttonText}
            </a>
          )}
        </div>
      </section>
    );
  }

  // Default: centered
  return (
    <section className="min-h-[500px] flex items-center justify-center bg-slate-50">
      <div className="text-center px-6 max-w-3xl">
        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight" style={titleStyle}>{title}</h1>
        <p className="text-xl text-slate-600 mb-8" style={subtitleStyle}>{subtitle}</p>
        {buttonText && (
          <a
            href={buttonLink || '#'}
            className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity text-lg"
            style={Object.keys(buttonStyle).length ? buttonStyle : undefined}
          >
            {buttonText}
          </a>
        )}
      </div>
    </section>
  );
}

// ─── Cards ───────────────────────────────────────────────────────────────────

function CardsPreview({ data }: { data: CardsData }) {
  const colClass = data.columns === 2 ? 'md:grid-cols-2' : data.columns === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3';

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto max-w-7xl px-6">
        {data.heading && (
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">{data.heading}</h2>
        )}
        <div className={`grid grid-cols-1 ${colClass} gap-8`}>
          {(data.cards || []).map((card, idx) => {
            const Icon = (LucideIcons as any)[card.icon] || LucideIcons.Star;
            return (
              <div key={idx} className="p-6 rounded-xl bg-slate-50 border border-slate-100 text-center hover:shadow-lg transition-shadow">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 mb-4">
                  <Icon className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{card.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{card.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Rich Text ───────────────────────────────────────────────────────────────

function RichtextPreview({ data }: { data: RichtextData }) {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto max-w-4xl px-6">
        <div
          className="prose prose-lg max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-a:text-blue-600 prose-img:rounded-xl prose-blockquote:border-blue-300"
          dangerouslySetInnerHTML={{ __html: data.html || '' }}
        />
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function FooterPreview({ data }: { data: FooterData }) {
  const { template, companyName, description, links, columns, copyright, socialLinks } = data;

  if (template === 'columns') {
    return (
      <footer className="bg-slate-900 text-slate-300 py-16">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-1">
              <h3 className="text-xl font-bold text-white mb-3">{companyName}</h3>
              {description && <p className="text-sm text-slate-400">{description}</p>}
            </div>
            {(columns || []).map((col, idx) => (
              <div key={idx}>
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                  {col.title}
                </h4>
                <ul className="space-y-2">
                  {col.links.map((link, li) => (
                    <li key={li}>
                      <a href={link.url} className="text-sm text-slate-400 hover:text-white transition-colors">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">{copyright}</p>
            {socialLinks && socialLinks.length > 0 && (
              <div className="flex items-center gap-4">
                {socialLinks.map((sl, idx) => (
                  <a key={idx} href={sl.url} className="text-slate-400 hover:text-white transition-colors text-sm capitalize">
                    {sl.platform}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </footer>
    );
  }

  if (template === 'centered') {
    return (
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="container mx-auto max-w-4xl px-6 text-center">
          <h3 className="text-xl font-bold text-white mb-3">{companyName}</h3>
          {description && <p className="text-sm text-slate-400 mb-6">{description}</p>}
          {socialLinks && socialLinks.length > 0 && (
            <div className="flex items-center justify-center gap-6 mb-6">
              {socialLinks.map((sl, idx) => (
                <a key={idx} href={sl.url} className="text-slate-400 hover:text-white transition-colors capitalize">
                  {sl.platform}
                </a>
              ))}
            </div>
          )}
          {links && links.length > 0 && (
            <div className="flex items-center justify-center gap-6 mb-8">
              {links.map((link, idx) => (
                <a key={idx} href={link.url} className="text-sm text-slate-400 hover:text-white transition-colors">
                  {link.label}
                </a>
              ))}
            </div>
          )}
          <p className="text-sm text-slate-500">{copyright}</p>
        </div>
      </footer>
    );
  }

  // Default: simple
  return (
    <footer className="bg-slate-900 text-slate-300 py-8">
      <div className="container mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-white">{companyName}</span>
        </div>
        {links && links.length > 0 && (
          <div className="flex items-center gap-6">
            {links.map((link, idx) => (
              <a key={idx} href={link.url} className="text-sm text-slate-400 hover:text-white transition-colors">
                {link.label}
              </a>
            ))}
          </div>
        )}
        <p className="text-sm text-slate-500">{copyright}</p>
      </div>
    </footer>
  );
}

// ─── Form Block ───────────────────────────────────────────────────────────────

const WIDTH_MAP: Record<string, string> = {
  narrow: 'max-w-md',
  medium: 'max-w-xl',
  wide: 'max-w-3xl',
  full: 'max-w-full',
};

const PADDING_MAP: Record<string, string> = {
  small: 'py-10',
  medium: 'py-16',
  large: 'py-24',
};

function FormBlockPreview({
  data,
  blockId,
  pageSlug,
}: {
  data: FormBlockData;
  blockId: string;
  pageSlug: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const widthClass = WIDTH_MAP[data.formWidth ?? 'medium'] ?? 'max-w-xl';
  const paddingClass = PADDING_MAP[data.padding ?? 'medium'] ?? 'py-16';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (data.destination === 'firestore' && data.firestoreCollection) {
      setSubmitting(true);
      setError('');
      try {
        await cmsService.submitForm({
          pageSlug,
          blockId,
          firestoreCollection: data.firestoreCollection,
          fields: values,
        });
        setSubmitted(true);
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        }
      } catch (err: any) {
        setError(err.message || 'Submission failed. Please try again.');
      } finally {
        setSubmitting(false);
      }
    } else if (data.destination === 'webhook' && data.webhookUrl) {
      setSubmitting(true);
      setError('');
      try {
        await fetch(data.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageSlug, blockId, fields: values }),
        });
        setSubmitted(true);
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        }
      } catch {
        setError('Submission failed. Please try again.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (submitted) {
    return (
      <section className={`${paddingClass} bg-white`} style={{ backgroundColor: data.backgroundColor }}>
        <div className={`container mx-auto px-6 ${widthClass}`}>
          <div className="text-center py-12 bg-green-50 border border-green-200 rounded-2xl">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-green-800">
              {data.successMessage || 'Thank you! Your message has been sent.'}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const fields: FormField[] = data.fields ?? [];

  // Group consecutive half-width fields into rows
  const rows: (FormField | [FormField, FormField])[] = [];
  let i = 0;
  while (i < fields.length) {
    const curr = fields[i];
    const next = fields[i + 1];
    if (curr.width === 'half' && next?.width === 'half') {
      rows.push([curr, next]);
      i += 2;
    } else {
      rows.push(curr);
      i++;
    }
  }

  return (
    <section
      className={`${paddingClass}`}
      style={{ backgroundColor: data.backgroundColor || '#ffffff' }}
    >
      <div className={`container mx-auto px-6 ${widthClass}`}>
        {(data.formTitle || data.formSubtitle) && (
          <div className="text-center mb-8">
            {data.formTitle && (
              <h2 className="text-3xl font-bold text-slate-900 mb-3">{data.formTitle}</h2>
            )}
            {data.formSubtitle && (
              <p className="text-slate-500 text-lg">{data.formSubtitle}</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot */}
          {data.enableHoneypot && (
            <input
              type="text"
              name="_hp_name"
              tabIndex={-1}
              autoComplete="off"
              className="absolute opacity-0 pointer-events-none h-0 w-0 overflow-hidden"
              aria-hidden="true"
            />
          )}

          {rows.map((row, rowIdx) => {
            if (Array.isArray(row)) {
              return (
                <div key={rowIdx} className="grid grid-cols-2 gap-4">
                  {row.map((field) => (
                    <FormFieldInput
                      key={field.id}
                      field={field}
                      value={values[field.id] ?? ''}
                      onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
                    />
                  ))}
                </div>
              );
            }
            return (
              <FormFieldInput
                key={row.id}
                field={row}
                value={values[row.id] ?? ''}
                onChange={(v) => setValues((prev) => ({ ...prev, [row.id]: v }))}
              />
            );
          })}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-6 rounded-lg text-base font-semibold transition-opacity disabled:opacity-60"
              style={{
                backgroundColor: data.submitButtonColor || '#2563eb',
                color: data.submitButtonTextColor || '#ffffff',
              }}
            >
              {submitting ? 'Sending...' : (data.submitButtonText || 'Submit')}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function FormFieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
}) {
  const baseClass =
    'w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors';

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {field.type === 'textarea' && (
        <textarea
          className={baseClass}
          rows={4}
          placeholder={field.placeholder}
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.type === 'select' && (
        <select
          className={`${baseClass} bg-white`}
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{field.placeholder || 'Select an option'}</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {field.type === 'checkbox' && (
        <div className="space-y-2">
          {(field.options ?? [field.label]).map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                value={opt}
                onChange={(e) => {
                  const current = value ? value.split(',') : [];
                  if (e.target.checked) {
                    onChange([...current, opt].join(','));
                  } else {
                    onChange(current.filter((v) => v !== opt).join(','));
                  }
                }}
                checked={(value || '').split(',').includes(opt)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span className="text-sm text-slate-700">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {field.type === 'radio' && (
        <div className="space-y-2">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={field.id}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                required={field.required}
                className="border-slate-300 text-blue-600"
              />
              <span className="text-sm text-slate-700">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {['text', 'email', 'phone'].includes(field.type) && (
        <input
          type={field.type === 'phone' ? 'tel' : field.type}
          className={baseClass}
          placeholder={field.placeholder}
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
