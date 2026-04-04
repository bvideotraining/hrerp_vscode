'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Owner {
  id: string;
  name: string;
  createdAt: Date | string;
}

export function OwnersPanel() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    passwordConfirm: '',
  });

  useEffect(() => {
    fetchOwners();
  }, []);

  const fetchOwners = async () => {
    try {
      setLoading(true);
      setError('');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/developer/owners`);

      if (!response.ok) {
        throw new Error(`Failed to fetch owners: ${response.statusText}`);
      }

      const data = await response.json();
      setOwners(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch owners');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsAdding(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/developer/owners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          password: formData.password,
          passwordConfirm: formData.passwordConfirm,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add owner');
      }

      setSuccess('Owner added successfully');
      setFormData({ name: '', password: '', passwordConfirm: '' });
      setShowAddModal(false);
      await fetchOwners();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add owner');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteOwner = async (id: string) => {
    if (!confirm('Are you sure you want to remove this owner? This cannot be undone.')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      setIsDeleting(id);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/developer/owners/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete owner');
      }

      setSuccess('Owner removed successfully');
      await fetchOwners();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete owner');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden sticky top-24">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-200"
      >
        <div className="text-left">
          <h2 className="font-semibold text-slate-900">Owner Accounts</h2>
          <p className="text-xs text-slate-500 mt-0.5">{owners.length} owner(s)</p>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-slate-600" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-600" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 text-xs">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-green-700 text-xs">{success}</p>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            </div>
          ) : owners.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-500">No owners yet</p>
            </div>
          ) : (
            // Owners List
            <div className="space-y-2">
              {owners.map((owner) => (
                <div
                  key={owner.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{owner.name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(owner.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteOwner(owner.id)}
                    disabled={owners.length <= 1 || isDeleting === owner.id}
                    title={owners.length <= 1 ? 'At least one owner must remain' : 'Delete owner'}
                    className={`p-2 rounded transition-colors ${
                      owners.length <= 1 || isDeleting === owner.id
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                    }`}
                  >
                    {isDeleting === owner.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Owner Button */}
          {!showAddModal && (
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors border border-blue-200"
            >
              <Plus className="h-4 w-4" />
              Add Owner
            </button>
          )}

          {/* Add Owner Form */}
          {showAddModal && (
            <form onSubmit={handleAddOwner} className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Owner name"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isAdding}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Min 8 characters"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isAdding}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={formData.passwordConfirm}
                  onChange={(e) =>
                    setFormData({ ...formData, passwordConfirm: e.target.value })
                  }
                  placeholder="Confirm password"
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isAdding}
                  required
                  minLength={8}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isAdding}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded font-medium text-sm flex items-center justify-center gap-1"
                >
                  {isAdding && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ name: '', password: '', passwordConfirm: '' });
                    setError('');
                  }}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
