import { apiFetch } from './api';

export interface AlertOut {
  id: string;
  device_id: string;
  type: string;
  category: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export async function getAlerts(params?: {
  device_id?: string;
  unread?: boolean;
}): Promise<AlertOut[]> {
  const query = new URLSearchParams();
  if (params?.device_id) query.set('device_id', params.device_id);
  if (params?.unread !== undefined) query.set('unread', String(params.unread));
  const qs = query.toString();
  return apiFetch<AlertOut[]>(`/api/alerts/${qs ? `?${qs}` : ''}`);
}

export async function markAlertRead(alertId: string): Promise<void> {
  await apiFetch(`/api/alerts/${alertId}/read`, { method: 'PATCH' });
}

export async function markAllRead(): Promise<void> {
  await apiFetch('/api/alerts/read-all', { method: 'POST' });
}
