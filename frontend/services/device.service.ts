import { apiFetch } from './api';

export interface DeviceOut {
  id: string;
  name: string;
  api_key: string;
  size: string;
  level: string;
  location_label: string;
  automation_enabled: boolean;
  is_online: boolean;
  last_seen_at: string | null;
  created_at: string;
  station_id: string | null;
  bac_row: number | null;
  bac_col: number | null;
}

export interface PlantConfigOut {
  id: string;
  device_id: string;
  plant_id: string | null;
  name: string;
  humidity_min: number;
  humidity_max: number;
  temp_min: number;
  temp_max: number;
  light_min: number;
  ph_min: number;
  ph_max: number;
  notes: string;
}

export async function getDevices(): Promise<DeviceOut[]> {
  return apiFetch<DeviceOut[]>('/api/devices/');
}

export async function createDevice(data: {
  name: string;
  size?: string;
  level?: string;
  location_label?: string;
  station_id?: string | null;
  bac_row?: number | null;
  bac_col?: number | null;
}): Promise<DeviceOut> {
  return apiFetch<DeviceOut>('/api/devices/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDevice(
  deviceId: string,
  data: Partial<{
    name: string;
    size: string;
    level: string;
    location_label: string;
    automation_enabled: boolean;
    station_id: string | null;
    bac_row: number | null;
    bac_col: number | null;
  }>,
): Promise<DeviceOut> {
  return apiFetch<DeviceOut>(`/api/devices/${deviceId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteDevice(deviceId: string): Promise<void> {
  await apiFetch(`/api/devices/${deviceId}`, { method: 'DELETE' });
}

export async function getPlantConfig(deviceId: string): Promise<PlantConfigOut | null> {
  try {
    return await apiFetch<PlantConfigOut>(`/api/devices/${deviceId}/plant-config`);
  } catch {
    return null;
  }
}

export async function setPlantConfig(
  deviceId: string,
  data: {
    plant_id?: string;
    name: string;
    humidity_min: number;
    humidity_max: number;
    temp_min: number;
    temp_max: number;
    light_min: number;
    ph_min: number;
    ph_max: number;
    notes?: string;
  },
): Promise<PlantConfigOut> {
  return apiFetch<PlantConfigOut>(`/api/devices/${deviceId}/plant-config`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
