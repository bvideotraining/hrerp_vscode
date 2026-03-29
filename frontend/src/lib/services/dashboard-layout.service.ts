import type { WidgetItem, DashboardLayout } from '../dashboard-widget-registry';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

function getAuthHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { ...getAuthHeaders(), ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as any).message || `API error ${response.status}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

export interface AiWidgetSuggestion {
  widgetId: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

class DashboardLayoutService {
  /** Fetch saved layout for a role. Returns null if no layout saved yet. */
  getLayout(roleId: string): Promise<DashboardLayout | null> {
    return apiFetch(`/api/settings/dashboard-layouts/${roleId}`);
  }

  /** Save (overwrite) the widget list for a role. */
  saveLayout(roleId: string, widgets: WidgetItem[]): Promise<DashboardLayout> {
    return apiFetch(`/api/settings/dashboard-layouts/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify({ widgets }),
    });
  }

  /** Ask Gemini to suggest widgets for a role. */
  aiSuggest(roleId: string, role: object): Promise<AiWidgetSuggestion[]> {
    return apiFetch(`/api/settings/dashboard-layouts/${roleId}/ai-suggest`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }
}

export const dashboardLayoutService = new DashboardLayoutService();
