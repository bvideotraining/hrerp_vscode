'use client';

import { useState } from 'react';
import {
  X, Plus, Trash2, Eye, Download, FileText, Upload, Loader2, CheckCircle, AlertCircle,
} from 'lucide-react';
import { employeeService } from '@/lib/services/employee.service';
import { EmployeeDocument } from '@/types/employee';

/* ─── Attachment viewer sub-modal ──────────────────────────────────── */
function AttachmentViewer({ doc, onClose }: { doc: EmployeeDocument; onClose: () => void }) {
  const src = doc.fileUrl || doc.fileContent || '';
  const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(doc.file) || src.startsWith('data:image/') || src.includes('image');
  const isPdf = /\.pdf$/i.test(doc.file) || src.startsWith('data:application/pdf') || src.includes('pdf');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-semibold text-slate-900">{doc.type}</p>
              <p className="text-xs text-slate-500">{doc.file}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={src} download={doc.file} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="h-4 w-4" /> Download
            </a>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {isImage && <img src={src} alt={doc.file} className="max-w-full mx-auto rounded-lg shadow" />}
          {isPdf && <iframe src={src} className="w-full rounded-lg" style={{ height: '65vh' }} title={doc.file} />}
          {!isImage && !isPdf && (
            <div className="flex flex-col items-center justify-center h-48 gap-4 text-slate-500">
              <FileText className="h-16 w-16 text-slate-300" />
              <p className="text-sm">Preview not available for this file type.</p>
              <a href={src} download={doc.file} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                <Download className="h-4 w-4" /> Download to view
              </a>
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t border-slate-200 flex flex-wrap gap-4 text-xs text-slate-600 rounded-b-xl">
          {doc.receivedDate && <span><span className="font-medium">Received:</span> {doc.receivedDate}</span>}
          {doc.expiryDate && <span><span className="font-medium">Expires:</span> {doc.expiryDate}</span>}
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
            doc.status === 'Current' ? 'bg-green-100 text-green-800' :
            doc.status === 'Renewal Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
          }`}>{doc.status}</span>
          {doc.notes && <span><span className="font-medium">Notes:</span> {doc.notes}</span>}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Modal ────────────────────────────────────────────────────── */
interface Props {
  employeeId: string;
  employeeName: string;
  initialDocuments: EmployeeDocument[];
  onClose: () => void;
  onSaved: (docs: EmployeeDocument[]) => void;
}

const EMPTY_NEW = {
  type: '',
  receivedDate: '',
  expiryDate: '',
  status: 'Current' as const,
  notes: '',
  file: null as File | null,
};

export function EmployeeDocumentsModal({ employeeId, employeeName, initialDocuments, onClose, onSaved }: Props) {
  const [documents, setDocuments] = useState<EmployeeDocument[]>(
    // Filter out any phantom records (no type/receivedDate) from previous broken saves
    (initialDocuments || []).filter(d => d && d.type && d.receivedDate)
  );
  const [newDoc, setNewDoc] = useState({ ...EMPTY_NEW });
  const [viewingDoc, setViewingDoc] = useState<EmployeeDocument | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleAddDocument = async () => {
    if (!newDoc.type.trim() || !newDoc.receivedDate) {
      setUploadError('Document type and received date are required.');
      return;
    }
    setUploadError('');
    setUploading(true);

    try {
      let fileUrl: string | undefined;
      let fileName = '';

      if (newDoc.file) {
        if (newDoc.file.size > 10 * 1024 * 1024) {
          setUploadError('File must be smaller than 10 MB.');
          setUploading(false);
          return;
        }
        const result = await employeeService.uploadEmployeeDocument(employeeId, newDoc.file);
        fileUrl = result.url;
        fileName = result.originalName;
      }

      const entry: EmployeeDocument = {
        id: Date.now().toString(),
        type: newDoc.type.trim(),
        file: fileName,
        fileUrl,
        receivedDate: newDoc.receivedDate,
        expiryDate: newDoc.expiryDate || undefined,
        notes: newDoc.notes.trim() || undefined,
        status: newDoc.status,
      };

      setDocuments(prev => [...prev, entry]);
      setNewDoc({ ...EMPTY_NEW });
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveError('');
    setSaved(false);
    try {
      // If user filled the form but forgot to click "Add Document", include it automatically
      let docsToSave = [...documents];
      if (newDoc.type.trim() && newDoc.receivedDate) {
        setUploadError('');
        let fileUrl: string | undefined;
        let fileName = '';
        if (newDoc.file) {
          const result = await employeeService.uploadEmployeeDocument(employeeId, newDoc.file);
          fileUrl = result.url;
          fileName = result.originalName;
        }
        const entry: EmployeeDocument = {
          id: Date.now().toString(),
          type: newDoc.type.trim(),
          file: fileName,
          fileUrl,
          receivedDate: newDoc.receivedDate,
          expiryDate: newDoc.expiryDate || undefined,
          notes: newDoc.notes.trim() || undefined,
          status: newDoc.status,
        };
        docsToSave = [...docsToSave, entry];
        setDocuments(docsToSave);
        setNewDoc({ ...EMPTY_NEW });
      }
      await employeeService.updateEmployeeDocuments(employeeId, docsToSave);
      setSaved(true);
      onSaved(docsToSave);
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save documents. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="font-bold text-slate-900 text-lg">Employee File / Documents</h2>
                <p className="text-xs text-slate-500">{employeeName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* ── Add new document form ── */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add New Document
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Document Type <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Passport, Visa, Emirates ID"
                    value={newDoc.type}
                    onChange={e => setNewDoc({ ...newDoc, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Received Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={newDoc.receivedDate}
                    onChange={e => setNewDoc({ ...newDoc, receivedDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={newDoc.expiryDate}
                    onChange={e => setNewDoc({ ...newDoc, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select
                    value={newDoc.status}
                    onChange={e => setNewDoc({ ...newDoc, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Current">Current</option>
                    <option value="Renewal Pending">Renewal Pending</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    placeholder="Any notes..."
                    value={newDoc.notes}
                    onChange={e => setNewDoc({ ...newDoc, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">File Attachment (max 10 MB)</label>
                  <input
                    type="file"
                    onChange={e => setNewDoc({ ...newDoc, file: e.target.files?.[0] || null })}
                    className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              {uploadError && (
                <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />{uploadError}
                </div>
              )}

              <button
                type="button"
                onClick={handleAddDocument}
                disabled={uploading}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4" /> Add Document</>}
              </button>
            </div>

            {/* ── Documents table ── */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                Documents on File
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">{documents.length}</span>
              </h3>

              {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2 border border-dashed border-slate-200 rounded-lg">
                  <FileText className="h-10 w-10 text-slate-200" />
                  <p className="text-sm">No documents yet. Add one above.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Document Type</th>
                        <th className="px-4 py-3 text-left font-semibold">Received Date</th>
                        <th className="px-4 py-3 text-left font-semibold">Expiry Date</th>
                        <th className="px-4 py-3 text-left font-semibold">Attachment</th>
                        <th className="px-4 py-3 text-center font-semibold">Status</th>
                        <th className="px-4 py-3 text-center font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {documents.map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">{doc.type}</td>
                          <td className="px-4 py-3 text-slate-600">{doc.receivedDate || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{doc.expiryDate || '—'}</td>
                          <td className="px-4 py-3">
                            {(doc.fileUrl || doc.fileContent) ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setViewingDoc(doc)}
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                                >
                                  <Eye className="h-3.5 w-3.5" /> View
                                </button>
                                <a
                                  href={doc.fileUrl || doc.fileContent}
                                  download={doc.file}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-xs"
                                >
                                  <Download className="h-3.5 w-3.5" /> Download
                                </a>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{doc.file || 'No file'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              doc.status === 'Current' ? 'bg-green-100 text-green-800' :
                              doc.status === 'Renewal Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>{doc.status}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemove(doc.id)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Remove document"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
            <div>
              {saveError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />{saveError}
                </div>
              )}
              {saved && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" /> Documents saved successfully!
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><CheckCircle className="h-4 w-4" /> Save All Documents</>}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Nested attachment viewer */}
      {viewingDoc && <AttachmentViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />}
    </>
  );
}
