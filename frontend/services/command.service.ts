import { apiFetch } from './api';

export interface CommandOut {
  id: string;
  device_id: string;
  action: string;
  params: Record<string, any>;
  status: string;
  created_at: string;
  sent_at: string | null;
  ack_at: string | null;
}

export async function sendCommand(
  deviceId: string,
  action: string,
  params: Record<string, any> = {},
): Promise<CommandOut> {
  return apiFetch<CommandOut>(`/api/devices/${deviceId}/commands`, {
    method: 'POST',
    body: JSON.stringify({ action, params }),
  });
}
