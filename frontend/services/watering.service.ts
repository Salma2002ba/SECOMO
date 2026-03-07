import { apiFetch } from './api';

export interface WateringEventOut {
  id: string;
  device_id: string;
  mode: string;
  duration_sec: number;
  reason: string | null;
  humidity_before: number | null;
  humidity_after: number | null;
  started_at: string;
  ended_at: string | null;
}

export async function triggerWatering(
  deviceId: string,
  durationSec: number,
  reason: string,
): Promise<WateringEventOut> {
  return apiFetch<WateringEventOut>(`/api/devices/${deviceId}/watering`, {
    method: 'POST',
    body: JSON.stringify({ duration_sec: durationSec, reason }),
  });
}

export async function getWateringHistory(
  deviceId: string,
  limit: number = 50,
): Promise<WateringEventOut[]> {
  return apiFetch<WateringEventOut[]>(
    `/api/devices/${deviceId}/watering-history?limit=${limit}`,
  );
}
