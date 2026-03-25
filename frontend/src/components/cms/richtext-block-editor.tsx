'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { RichtextData } from '@/lib/services/cms.service';
import { cmsService } from '@/lib/services/cms.service';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Link,
  Unlink,
  Image as ImageIcon,
  Video,
  Undo2,
  Redo2,
  Minus,
  Type,
  Palette,
  Upload,
} from 'lucide-react';

interface Props {
  data: RichtextData;
  onChange: (data: RichtextData) => void;
}

interface ToolbarButton {
  icon: any;
  command: string;
  value?: string;
  title: string;
}

const FONT_SIZES = ['1', '2', '3', '4', '5', '6', '7'];

export default function RichtextBlockEditor({ data, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (editorRef.current && !initialized.current) {
      editorRef.current.innerHTML = data.html || '';
      initialized.current = true;
    }
  }, [data.html]);

  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange({ html: editorRef.current.innerHTML });
    }
  }, [onChange]);

  const handleInsertLink = () => {
    const url = prompt('Enter URL:');
    if (url) execCmd('createLink', url);
  };

  const handleRemoveLink = () => {
    execCmd('unlink');
  };

  const handleInsertImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const { url } = await cmsService.uploadImage(file);
        execCmd('insertImage', url);
      } catch (err) {
        console.error('Upload failed:', err);
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleInsertVideo = () => {
    const url = prompt('Enter video URL (YouTube/Vimeo embed URL):');
    if (url) {
      const iframe = `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;margin:16px 0"><iframe src="${url}" style="position:absolute;top:0;left:0;width:100%;height:100%" frameborder="0" allowfullscreen></iframe></div>`;
      execCmd('insertHTML', iframe);
    }
  };

  const handleFontSize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    execCmd('fontSize', e.target.value);
  };

  const handleTextColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    execCmd('foreColor', e.target.value);
  };

  const handleBgColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    execCmd('hiliteColor', e.target.value);
  };

  const toolbarGroups: ToolbarButton[][] = [
    [
      { icon: Undo2, command: 'undo', title: 'Undo' },
      { icon: Redo2, command: 'redo', title: 'Redo' },
    ],
    [
      { icon: Bold, command: 'bold', title: 'Bold' },
      { icon: Italic, command: 'italic', title: 'Italic' },
      { icon: Underline, command: 'underline', title: 'Underline' },
      { icon: Strikethrough, command: 'strikeThrough', title: 'Strikethrough' },
    ],
    [
      { icon: Heading1, command: 'formatBlock', value: 'H1', title: 'Heading 1' },
      { icon: Heading2, command: 'formatBlock', value: 'H2', title: 'Heading 2' },
      { icon: Heading3, command: 'formatBlock', value: 'H3', title: 'Heading 3' },
      { icon: Type, command: 'formatBlock', value: 'P', title: 'Paragraph' },
    ],
    [
      { icon: AlignLeft, command: 'justifyLeft', title: 'Align Left' },
      { icon: AlignCenter, command: 'justifyCenter', title: 'Center' },
      { icon: AlignRight, command: 'justifyRight', title: 'Align Right' },
      { icon: AlignJustify, command: 'justifyFull', title: 'Justify' },
    ],
    [
      { icon: List, command: 'insertUnorderedList', title: 'Bullet List' },
      { icon: ListOrdered, command: 'insertOrderedList', title: 'Numbered List' },
      { icon: Quote, command: 'formatBlock', value: 'BLOCKQUOTE', title: 'Quote' },
      { icon: Code, command: 'formatBlock', value: 'PRE', title: 'Code Block' },
      { icon: Minus, command: 'insertHorizontalRule', title: 'Horizontal Rule' },
    ],
  ];

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 px-2 py-1.5 flex flex-wrap items-center gap-1">
        {toolbarGroups.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {gi > 0 && <div className="w-px h-6 bg-slate-200 mx-1" />}
            {group.map((btn) => {
              const Icon = btn.icon;
              return (
                <button
                  key={btn.command + (btn.value || '')}
                  type="button"
                  onClick={() => execCmd(btn.command, btn.value)}
                  title={btn.title}
                  className="p-1.5 rounded hover:bg-slate-200 transition-colors"
                >
                  <Icon className="h-4 w-4 text-slate-600" />
                </button>
              );
            })}
          </div>
        ))}

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Font Size */}
        <select
          onChange={handleFontSize}
          title="Font Size"
          className="px-1.5 py-1 text-xs border border-slate-200 rounded bg-white"
          defaultValue="3"
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              Size {s}
            </option>
          ))}
        </select>

        {/* Text Color */}
        <label title="Text Color" className="relative cursor-pointer p-1.5 rounded hover:bg-slate-200">
          <Palette className="h-4 w-4 text-slate-600" />
          <input
            type="color"
            onChange={handleTextColor}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>

        {/* Background Color */}
        <label title="Highlight Color" className="relative cursor-pointer p-1.5 rounded hover:bg-slate-200">
          <Palette className="h-4 w-4 text-amber-600" />
          <input
            type="color"
            onChange={handleBgColor}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Link */}
        <button
          type="button"
          onClick={handleInsertLink}
          title="Insert Link"
          className="p-1.5 rounded hover:bg-slate-200"
        >
          <Link className="h-4 w-4 text-slate-600" />
        </button>
        <button
          type="button"
          onClick={handleRemoveLink}
          title="Remove Link"
          className="p-1.5 rounded hover:bg-slate-200"
        >
          <Unlink className="h-4 w-4 text-slate-600" />
        </button>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Media */}
        <button
          type="button"
          onClick={handleInsertImage}
          title="Insert Image"
          disabled={uploading}
          className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50"
        >
          <ImageIcon className="h-4 w-4 text-slate-600" />
        </button>
        <button
          type="button"
          onClick={handleInsertVideo}
          title="Insert Video"
          className="p-1.5 rounded hover:bg-slate-200"
        >
          <Video className="h-4 w-4 text-slate-600" />
        </button>

        {uploading && (
          <span className="text-xs text-blue-600 ml-2">Uploading image...</span>
        )}
      </div>

      {/* Content Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        suppressContentEditableWarning
        className="min-h-[200px] p-4 prose prose-sm max-w-none focus:outline-none [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 [&_a]:text-blue-600 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_pre]:bg-slate-100 [&_pre]:p-3 [&_pre]:rounded-lg"
      />
    </div>
  );
}
