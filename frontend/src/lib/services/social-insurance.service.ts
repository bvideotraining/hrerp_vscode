const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

export type FormType = 'form1' | 'form6';

export interface SocialInsuranceAttachment {
  name: string;
  url: string;
  mimeType?: string;
  formType?: FormType | null;
  uploadedAt?: string;
}

export interface SocialInsuranceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  insuranceNumber: string;
  insurableWage: number;
  enrollmentDate: string;
  employeeShare: number;
  employerShare: number;
  attachments: SocialInsuranceAttachment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSocialInsurancePayload {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  insuranceNumber: string;
  insurableWage: number;
  enrollmentDate: string;
  attachments?: SocialInsuranceAttachment[];
}

export const socialInsuranceService = {
  getAll(employeeId?: string): Promise<SocialInsuranceRecord[]> {
    const qs = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : '';
    return apiFetch<SocialInsuranceRecord[]>(`/api/social-insurance${qs}`);
  },

  getOne(id: string): Promise<SocialInsuranceRecord> {
    return apiFetch<SocialInsuranceRecord>(`/api/social-insurance/${encodeURIComponent(id)}`);
  },

  create(payload: CreateSocialInsurancePayload): Promise<SocialInsuranceRecord> {
    return apiFetch<SocialInsuranceRecord>('/api/social-insurance', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: Partial<CreateSocialInsurancePayload>): Promise<SocialInsuranceRecord> {
    return apiFetch<SocialInsuranceRecord>(`/api/social-insurance/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  remove(id: string): Promise<{ id: string }> {
    return apiFetch<{ id: string }>(`/api/social-insurance/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  /** Upload an attachment before a policy exists — returns { url, name, mimeType } */
  uploadAttachment(file: File): Promise<SocialInsuranceAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_URL}/api/social-insurance/upload-attachment`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || res.statusText);
      }
      return res.json();
    });
  },

  /** Upload an attachment to an existing policy */
  uploadPolicyAttachment(
    policyId: string,
    file: File,
    formType?: FormType,
  ): Promise<{ id: string; attachment: SocialInsuranceAttachment; attachments: SocialInsuranceAttachment[] }> {
    const formData = new FormData();
    formData.append('file', file);
    const qs = formType ? `?formType=${formType}` : '';
    return fetch(`${API_URL}/api/social-insurance/${encodeURIComponent(policyId)}/upload-attachment${qs}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || res.statusText);
      }
      return res.json();
    });
  },
};
