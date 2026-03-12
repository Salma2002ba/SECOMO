import { apiFetch } from './api';

export interface SensorReadingOut {
  id: number;
  device_id: string;
  timestamp: string;
  temp_air: number | null;
  temp_water: number | null;
  humidity_air: number | null;
  humidity_soil: number | null;
  light: number | null;
  soil_ph: number | null;
  watts: number | null;
  battery_level: number | null;
  water_tank_level: number | null;
}

export async function getReadings(
  deviceId: string,
  last: number = 60,
): Promise<SensorReadingOut[]> {
  return apiFetch<SensorReadingOut[]>(
    `/api/devices/${deviceId}/readings?last=${last}`,
  );
}
