'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Employee, EmployeeCategory } from '@/types/employee';
import { employeeValidationSchema } from '@/lib/validation/employee';
import { organizationService } from '@/lib/services/organization.service';
import { settingsService } from '@/lib/services/settings.service';
import { employeeService } from '@/lib/services/employee.service';
import { Upload, Plus, Trash2, AlertCircle, Eye, Pencil, X, FileText, Download, Loader2 } from 'lucide-react';

interface EmployeeFormProps {
  initialData?: Employee;
  onSubmit: (data: Partial<Employee>) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FieldErrors {
  [key: string]: string;
}

const categories: EmployeeCategory[] = ['WhiteCollar', 'BlueCollar', 'Management', 'PartTime'];
const currencies = [
  'AED', 'USD', 'EUR', 'GBP', 'EGP', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD', 'LBP',
];

export function EmployeeForm({ initialData, onSubmit, onCancel, isLoading }: EmployeeFormProps) {
  const [formData, setFormData] = useState<Partial<Employee>>(
    initialData || {
      fullName: '',
      employeeCode: '',
      email: '',
      phone: '',
      nationalId: '',
      dateOfBirth: '',
      gender: 'M',
      branch: '',
      department: '',
      jobTitle: '',
      category: 'WhiteCollar',
      currentSalary: 0,
      startDate: new Date().toISOString().split('T')[0],
      currency: '',
      paymentMethod: 'Bank Transfer',
      documents: [],
      employmentStatus: 'Active',
      currentAddress: '',
      positionType: 'Full-time',
      employmentType: 'Permanent',
      nationality: '',
    }
  );

  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isUploading, setIsUploading] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  // Dynamic org data
  const [branches, setBranches] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  useEffect(() => {
    Promise.all([
      organizationService.getBranches(),
      organizationService.getDepartments(),
      organizationService.getJobTitles(),
      settingsService.getConfig(),
    ]).then(([b, d, j, cfg]) => {
      setBranches(b.filter((x) => x.isActive !== false).map((x) => x.name));
      setDepartments(d.map((x) => x.name));
      setJobTitles(j.map((x) => x.name));
      // Pre-populate currency with system default if not already set
      if (cfg?.defaultCurrency) {
        setFormData((prev) => ({
          ...prev,
          currency: prev.currency || cfg.defaultCurrency,
        }));
      }
    }).catch(() => {
      // fallback to empty — selects will be empty until data loads
    });
  }, []);
  const [newDocument, setNewDocument] = useState({
    type: '',
    receivedDate: '',
    expiryDate: '',
    file: null as File | null,
    notes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const processedValue = name === 'employeeCode' ? value.toUpperCase() : value;
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be smaller than 5 MB.');
      e.target.value = '';
      return;
    }
    setProfilePicture(file);
    // Preview only — actual upload to Firebase Storage happens on submit
  };

  const handleAddDocument = () => {
    if (!newDocument.type || !newDocument.receivedDate) return;

    const addEntry = (fileContent?: string, fileName?: string) => {
      setFormData(prev => ({
        ...prev,
        documents: [
          ...(prev.documents || []),
          {
            id: Date.now().toString(),
            type: newDocument.type,
            file: fileName || '',
            fileContent,
            receivedDate: newDocument.receivedDate,
            expiryDate: newDocument.expiryDate,
            notes: newDocument.notes,
            status: 'Current'
          }
        ]
      }));
      setNewDocument({ type: '', receivedDate: '', expiryDate: '', file: null, notes: '' });
    };

    if (newDocument.file) {
      if (newDocument.file.size > 1 * 1024 * 1024) {
        alert('Attachment must be smaller than 1 MB. Please choose a smaller file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        addEntry(ev.target?.result as string, newDocument.file!.name);
      };
      reader.readAsDataURL(newDocument.file);
    } else {
      addEntry();
    }
  };

  const handleRemoveDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: (prev.documents || []).filter((_, i) => i !== index)
    }));
  };

  // ── Inline document editing ──────────────────────────────────────────
  const [editingDocIndex, setEditingDocIndex] = useState<number | null>(null);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);

  const handleStartEditDoc = (idx: number) => {
    setEditingDocIndex(idx);
    setEditingDoc({ ...(formData.documents as any[])[idx] });
  };

  const handleSaveEditDoc = () => {
    if (editingDocIndex === null || !editingDoc) return;
    setFormData(prev => {
      const docs = [...(prev.documents as any[])];
      docs[editingDocIndex] = { ...editingDoc };
      return { ...prev, documents: docs };
    });
    setEditingDocIndex(null);
    setEditingDoc(null);
  };

  const handleCancelEditDoc = () => {
    setEditingDocIndex(null);
    setEditingDoc(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Upload new profile photo to Firebase Storage first
      let profilePictureUrl = formData.profilePicture;
      if (profilePicture) {
        setIsUploading(true);
        profilePictureUrl = await employeeService.uploadProfilePhoto(profilePicture);
        setIsUploading(false);
      }

      // Filter out phantom/incomplete documents that were saved with missing required fields
      const validDocuments = ((formData.documents as any[]) || []).filter(
        (doc: any) => doc && doc.type && doc.receivedDate
      );
      const validatedData = employeeValidationSchema.parse({
        ...formData,
        profilePicture: profilePictureUrl,
        documents: validDocuments,
        currentSalary: Number(formData.currentSalary) || 0
      });
      setFieldErrors({});
      onSubmit(validatedData as Partial<Employee>);
    } catch (error: any) {
      setIsUploading(false);
      console.error('Form validation failed:', error);
      // Zod v4 uses .issues (not .errors)
      const issues = error?.issues ?? error?.errors ?? null;
      if (Array.isArray(issues) && issues.length > 0) {
        const newErrors: FieldErrors = {};
        issues.forEach((err: any) => {
          try {
            const path = Array.isArray(err.path) ? err.path.join('.') : String(err.path ?? 'general');
            newErrors[path || 'general'] = err.message ?? 'Invalid value';
          } catch (_) {}
        });
        setFieldErrors(newErrors);
      } else if (error?.message) {
        // Non-Zod error (e.g. network issue before validation)
        setFieldErrors({ general: error.message });
      }
    }
  };

  // Auto-scroll to error summary whenever errors change
  useEffect(() => {
    if (Object.keys(fieldErrors).length > 0) {
      errorSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [fieldErrors]);

  const getFieldError = (fieldName: string) => fieldErrors[fieldName];
  const hasError = (fieldName: string) => !!fieldErrors[fieldName];

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl">
      {/* Validation Summary — shown at top immediately when errors exist */}
      {Object.keys(fieldErrors).length > 0 && (
        <div ref={errorSummaryRef} className="rounded-lg border border-red-300 bg-red-50 p-4 shadow-sm">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-900">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {Object.keys(fieldErrors).length} error{Object.keys(fieldErrors).length > 1 ? 's' : ''} — please fix before saving:
          </p>
          <ul className="ml-6 space-y-1 list-disc text-sm text-red-800">
            {Object.entries(fieldErrors).map(([field, msg]) => (
              <li key={field}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Personal Information */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
          <span>👤</span> Personal Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Photo Upload */}
          <div className="flex items-center justify-center">
            <label className="cursor-pointer">
              <div className="w-32 h-32 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center hover:border-blue-500 transition-colors overflow-hidden">
                {(profilePicture || formData.profilePicture) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
              src={profilePicture ? URL.createObjectURL(profilePicture) : formData.profilePicture!}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-center">
                    <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Upload Photo</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Form Fields */}
          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName || ''}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  hasError('fullName')
                    ? 'border-red-300 bg-red-50 focus:ring-red-500'
                    : 'border-slate-300 focus:ring-blue-500'
                }`}
                placeholder="Enter full name"
              />
              {hasError('fullName') && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />{getFieldError('fullName')}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Employee Code *</label>
                <input
                  type="text"
                  name="employeeCode"
                  value={formData.employeeCode || ''}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    hasError('employeeCode')
                      ? 'border-red-300 bg-red-50 focus:ring-red-500'
                      : 'border-slate-300 focus:ring-blue-500'
                  }`}
                  placeholder="e.g., EMP001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">ID Number *</label>
                <input
                  type="text"
                  name="nationalId"
                  value={formData.nationalId || ''}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    hasError('nationalId')
                      ? 'border-red-300 bg-red-50 focus:ring-red-500'
                      : 'border-slate-300 focus:ring-blue-500'
                  }`}
                  placeholder="National ID / Passport"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date of Birth *</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth || ''}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    hasError('dateOfBirth')
                      ? 'border-red-300 bg-red-50 focus:ring-red-500'
                      : 'border-slate-300 focus:ring-blue-500'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Mobile Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    hasError('phone')
                      ? 'border-red-300 bg-red-50 focus:ring-red-500'
                      : 'border-slate-300 focus:ring-blue-500'
                  }`}
                  placeholder="+971501234567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  hasError('email')
                    ? 'border-red-300 bg-red-50 focus:ring-red-500'
                    : 'border-slate-300 focus:ring-blue-500'
                }`}
                placeholder="name@company.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Gender *</label>
                <select
                  name="gender"
                  value={formData.gender || 'M'}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nationality</label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. UAE, Egyptian, Indian"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
              <input
                type="text"
                name="currentAddress"
                value={formData.currentAddress || ''}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  hasError('currentAddress')
                    ? 'border-red-300 bg-red-50 focus:ring-red-500'
                    : 'border-slate-300 focus:ring-blue-500'
                }`}
                placeholder="Current address"
              />
              {hasError('currentAddress') && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />{getFieldError('currentAddress')}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Employment Details */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
          <span>💼</span> Employment Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Category *</label>
            <select
              name="category"
              value={formData.category || 'WhiteCollar'}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Department *</label>
            <select
              name="department"
              value={formData.department || ''}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                hasError('department')
                  ? 'border-red-300 bg-red-50 focus:ring-red-500'
                  : 'border-slate-300 focus:ring-blue-500'
              }`}
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            {hasError('department') && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />{getFieldError('department')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Branch *</label>
            <select
              name="branch"
              value={formData.branch || ''}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                hasError('branch')
                  ? 'border-red-300 bg-red-50 focus:ring-red-500'
                  : 'border-slate-300 focus:ring-blue-500'
              }`}
            >
              <option value="">Select Branch</option>
              {branches.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
            {hasError('branch') && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />{getFieldError('branch')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Job Title *</label>
            <select
              name="jobTitle"
              value={formData.jobTitle || ''}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                hasError('jobTitle')
                  ? 'border-red-300 bg-red-50 focus:ring-red-500'
                  : 'border-slate-300 focus:ring-blue-500'
              }`}
            >
              <option value="">Select Job Title</option>
              {jobTitles.map(title => (
                <option key={title} value={title}>{title}</option>
              ))}
            </select>
            {hasError('jobTitle') && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />{getFieldError('jobTitle')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Start Date *</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Current Salary{formData.currency ? ` (${formData.currency})` : ''} *</label>
            <input
              type="number"
              name="currentSalary"
              value={formData.currentSalary || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Currency *</label>
            <select
              name="currency"
              value={formData.currency || ''}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                hasError('currency')
                  ? 'border-red-300 bg-red-50 focus:ring-red-500'
                  : 'border-slate-300 focus:ring-blue-500'
              }`}
            >
              <option value="">Select Currency</option>
              {currencies.map(curr => (
                <option key={curr} value={curr}>{curr}</option>
              ))}
            </select>
            {hasError('currency') && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />{getFieldError('currency')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Resignation Date (Optional)</label>
            <input
              type="date"
              name="resignationDate"
              value={formData.resignationDate || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Employment Type *</label>
            <select
              name="employmentType"
              value={formData.employmentType || 'Permanent'}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Permanent">Permanent</option>
              <option value="Contract">Contract</option>
              <option value="Temporary">Temporary</option>
              <option value="Probation">Probation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method *</label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod || 'Bank Transfer'}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="WPS">WPS</option>
            </select>
          </div>
        </div>
      </section>

      {/* Bank Account */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
          <span>🏦</span> Bank Account
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Bank Name</label>
            <input
              type="text"
              name="bankName"
              value={formData.bankName || ''}
              onChange={handleInputChange}
              placeholder="e.g. Emirates NBD"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Account Number</label>
            <input
              type="text"
              name="accountNumber"
              value={formData.accountNumber || ''}
              onChange={handleInputChange}
              placeholder="e.g. 1234567890"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Documents */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
          <span>📄</span> Employee File / Documents
        </h2>

        <div className="mb-6 p-4 bg-slate-50 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Document Type</label>
              <input
                type="text"
                placeholder="e.g., Contract"
                value={newDocument.type}
                onChange={(e) => setNewDocument({ ...newDocument, type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Received Date</label>
              <input
                type="date"
                value={newDocument.receivedDate}
                onChange={(e) => setNewDocument({ ...newDocument, receivedDate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Expiry Date</label>
              <input
                type="date"
                value={newDocument.expiryDate}
                onChange={(e) => setNewDocument({ ...newDocument, expiryDate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span>To attach files, save the employee first then use <strong>Manage Documents</strong> on the employee details page.</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
            <textarea
              placeholder="Notes..."
              value={newDocument.notes}
              onChange={(e) => setNewDocument({ ...newDocument, notes: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
            />
          </div>
          <button
            type="button"
            onClick={handleAddDocument}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Document
          </button>
        </div>

        {(formData.documents || []).length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Document Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Received Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Expiry Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Attachment</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(formData.documents as any[]).map((doc, idx) => (
                  editingDocIndex === idx ? (
                    /* ── Edit row ── */
                    <tr key={idx} className="bg-blue-50">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editingDoc.type}
                          onChange={e => setEditingDoc({ ...editingDoc, type: e.target.value })}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          value={editingDoc.receivedDate}
                          onChange={e => setEditingDoc({ ...editingDoc, receivedDate: e.target.value })}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          value={editingDoc.expiryDate || ''}
                          onChange={e => setEditingDoc({ ...editingDoc, expiryDate: e.target.value })}
                          className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500">
                        {editingDoc.file ? (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            {editingDoc.file}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={handleSaveEditDoc}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors font-medium"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditDoc}
                            className="px-3 py-1 border border-slate-300 text-slate-600 text-xs rounded hover:bg-slate-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    /* ── Normal row ── */
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{doc.type}</td>
                      <td className="px-4 py-3 text-slate-600">{doc.receivedDate || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{doc.expiryDate || '—'}</td>
                      <td className="px-4 py-3">
                        {doc.fileContent ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setViewingDoc(doc)}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                            <a
                              href={doc.fileContent}
                              download={doc.file}
                              className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-xs"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No file</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEditDoc(idx)}
                            className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(idx)}
                            className="p-1.5 rounded hover:bg-red-50 text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Inline attachment viewer modal */}
        {viewingDoc && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setViewingDoc(null)}
          >
            <div
              className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-slate-900">{viewingDoc.type}</p>
                    <p className="text-xs text-slate-500">{viewingDoc.file}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={viewingDoc.fileContent}
                    download={viewingDoc.file}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="h-4 w-4" /> Download
                  </a>
                  <button
                    type="button"
                    onClick={() => setViewingDoc(null)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {/* Preview */}
              <div className="flex-1 overflow-auto p-4 bg-slate-50">
                {(viewingDoc.fileContent.startsWith('data:image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(viewingDoc.file || '')) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={viewingDoc.fileContent} alt={viewingDoc.file} className="max-w-full mx-auto rounded-lg shadow" />
                ) : (viewingDoc.fileContent.startsWith('data:application/pdf') || /\.pdf$/i.test(viewingDoc.file || '')) ? (
                  <iframe src={viewingDoc.fileContent} className="w-full rounded-lg" style={{ height: '65vh' }} title={viewingDoc.file} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 gap-4 text-slate-500">
                    <FileText className="h-16 w-16 text-slate-300" />
                    <p className="text-sm">Preview not available for this file type.</p>
                    <a href={viewingDoc.fileContent} download={viewingDoc.file} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                      <Download className="h-4 w-4" /> Download to view
                    </a>
                  </div>
                )}
              </div>
              {/* Footer */}
              <div className="px-6 py-3 border-t border-slate-200 flex flex-wrap gap-4 text-xs text-slate-600 rounded-b-xl bg-white">
                <span><span className="font-medium">Received:</span> {viewingDoc.receivedDate}</span>
                {viewingDoc.expiryDate && <span><span className="font-medium">Expires:</span> {viewingDoc.expiryDate}</span>}
                {viewingDoc.notes && <span><span className="font-medium">Notes:</span> {viewingDoc.notes}</span>}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || isUploading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors font-medium flex items-center gap-2"
        >
          {isUploading ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading photo...</> : isLoading ? 'Saving...' : 'Save Employee'}
        </button>
      </div>
    </form>
  );
}
