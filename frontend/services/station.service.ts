import { apiFetch } from './api';

export interface StationOut {
  id: string;
  name: string;
  location_label: string;
  created_at: string;
}

export async function getStations(): Promise<StationOut[]> {
  return apiFetch<StationOut[]>('/api/stations/');
}

export async function createStation(data: { name: string; location_label?: string }): Promise<StationOut> {
  return apiFetch<StationOut>('/api/stations/', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateStation(stationId: string, data: { name?: string; location_label?: string }): Promise<StationOut> {
  return apiFetch<StationOut>(`/api/stations/${stationId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteStation(stationId: string): Promise<void> {
  await apiFetch(`/api/stations/${stationId}`, { method: 'DELETE' });
}
