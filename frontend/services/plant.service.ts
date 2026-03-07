import { apiFetch } from './api';

export interface PlantOut {
  id: string;
  name: string;
  humidity_min: number;
  humidity_max: number;
  temp_min: number;
  temp_max: number;
  light_min: number;
  ph_min: number;
  ph_max: number;
  notes: string;
  is_default: boolean;
  created_at: string;
}

export async function getPlants(): Promise<PlantOut[]> {
  return apiFetch<PlantOut[]>('/api/plants/');
}

export async function createPlant(data: {
  name: string;
  humidity_min: number;
  humidity_max: number;
  temp_min: number;
  temp_max: number;
  light_min: number;
  ph_min: number;
  ph_max: number;
  notes?: string;
}): Promise<PlantOut> {
  return apiFetch<PlantOut>('/api/plants/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePlant(
  plantId: string,
  data: Partial<{
    name: string;
    humidity_min: number;
    humidity_max: number;
    temp_min: number;
    temp_max: number;
    light_min: number;
    ph_min: number;
    ph_max: number;
    notes: string;
  }>,
): Promise<PlantOut> {
  return apiFetch<PlantOut>(`/api/plants/${plantId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deletePlant(plantId: string): Promise<void> {
  await apiFetch(`/api/plants/${plantId}`, { method: 'DELETE' });
}
