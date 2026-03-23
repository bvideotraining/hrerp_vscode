'use client';

import React, { useState, useEffect } from 'react';
import { Employee, EmployeeCategory } from '@/types/employee';
import { employeeValidationSchema } from '@/lib/validation/employee';
import { organizationService } from '@/lib/services/organization.service';
import { Upload, Plus, Trash2, AlertCircle } from 'lucide-react';

interface EmployeeFormProps {
  initialData?: Employee;
  onSubmit: (data: Partial<Employee>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FieldErrors {
  [key: string]: string;
}

const categories: EmployeeCategory[] = ['WhiteCollar', 'BlueCollar', 'Management', 'PartTime'];
const currencies = ['AED', 'USD', 'EUR', 'EGP', 'SAR'];

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
      branch: 'Dubai Main',
      department: 'HR',
      jobTitle: 'HR Manager',
      category: 'WhiteCollar',
      currentSalary: 0,
      startDate: new Date().toISOString().split('T')[0],
      currency: 'AED',
      paymentMethod: 'Bank Transfer',
      documents: [],
      employmentStatus: 'Active',
      currentAddress: '',
      positionType: 'Full-time',
      employmentType: 'Permanent'
    }
  );

  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Dynamic org data
  const [branches, setBranches] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  useEffect(() => {
    Promise.all([
      organizationService.getBranches(),
      organizationService.getDepartments(),
      organizationService.getJobTitles(),
    ]).then(([b, d, j]) => {
      setBranches(b.filter((x) => x.isActive !== false).map((x) => x.name));
      setDepartments(d.map((x) => x.name));
      setJobTitles(j.map((x) => x.name));
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
    setFormData(prev => ({
      ...prev,
      [name]: value
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
    if (e.target.files?.[0]) {
      setProfilePicture(e.target.files[0]);
    }
  };

  const handleAddDocument = () => {
    if (newDocument.type && newDocument.receivedDate && newDocument.file) {
      setFormData(prev => ({
        ...prev,
        documents: [
          ...(prev.documents || []),
          {
            id: Date.now().toString(),
            type: newDocument.type,
            file: newDocument.file?.name || 'document',
            receivedDate: newDocument.receivedDate,
            expiryDate: newDocument.expiryDate,
            notes: newDocument.notes,
            status: 'Current'
          }
        ]
      }));
      setNewDocument({
        type: '',
        receivedDate: '',
        expiryDate: '',
        file: null,
        notes: ''
      });
    }
  };

  const handleRemoveDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: (prev.documents || []).filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validatedData = employeeValidationSchema.parse({
        ...formData,
        currentSalary: Number(formData.currentSalary) || 0
      });
      setFieldErrors({});
      onSubmit(validatedData);
    } catch (error: any) {
      if (error.errors) {
        const newErrors: FieldErrors = {};
        error.errors.forEach((err: any) => {
          const path = err.path.join('.');
          newErrors[path] = err.message;
        });
        setFieldErrors(newErrors);
      }
    }
  };

  const getFieldError = (fieldName: string) => fieldErrors[fieldName];
  const hasError = (fieldName: string) => !!fieldErrors[fieldName];

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl">
      {/* Personal Information */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
          <span>👤</span> Personal Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Photo Upload */}
          <div className="flex items-center justify-center">
            <label className="cursor-pointer">
              <div className="w-32 h-32 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center hover:border-blue-500 transition-colors">
                {profilePicture ? (
                  <img
                    src={URL.createObjectURL(profilePicture)}
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
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Branch *</label>
            <select
              name="branch"
              value={formData.branch || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {branches.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Job Title *</label>
            <select
              name="jobTitle"
              value={formData.jobTitle || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {jobTitles.map(title => (
                <option key={title} value={title}>{title}</option>
              ))}
            </select>
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
            <label className="block text-sm font-medium text-slate-700 mb-2">Current Salary ({formData.currency || 'AED'}) *</label>
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
            <label className="block text-sm font-medium text-slate-700 mb-2">Currency</label>
            <select
              name="currency"
              value={formData.currency || 'AED'}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {currencies.map(curr => (
                <option key={curr} value={curr}>{curr}</option>
              ))}
            </select>
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Attachment</label>
              <input
                type="file"
                onChange={(e) => setNewDocument({ ...newDocument, file: e.target.files?.[0] || null })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
          <div className="space-y-3">
            {(formData.documents || []).map((doc: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{doc.type}</p>
                  <p className="text-xs text-slate-600">{doc.file}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveDocument(idx)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Validation Summary */}
      {Object.keys(fieldErrors).length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-900">
            <AlertCircle className="h-4 w-4" />
            Please fix the following errors:
          </p>
          <ul className="ml-6 space-y-1 list-disc text-sm text-red-800">
            {Object.entries(fieldErrors).map(([field, error]) => (
              <li key={field}>{error}</li>
            ))}
          </ul>
        </div>
      )}

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
          disabled={isLoading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors font-medium"
        >
          {isLoading ? 'Saving...' : 'Save Employee'}
        </button>
      </div>
    </form>
  );
}
