
import { PlantProfile, Device, Role, User } from './types';

export const INITIAL_PLANTS: PlantProfile[] = [
  {
    id: 'p1',
    name: 'Basilic Grand Vert',
    humidityMin: 50,
    humidityMax: 70,
    tempMin: 18,
    tempMax: 28,
    lightMin: 60,
    phMin: 6.0,
    phMax: 7.5,
    notes: 'Aime la chaleur et l\'humidité constante.'
  },
  {
    id: 'p2',
    name: 'Tomates Cerises',
    humidityMin: 60,
    humidityMax: 85,
    tempMin: 20,
    tempMax: 32,
    lightMin: 75,
    phMin: 5.5,
    phMax: 6.8,
    notes: 'Exige beaucoup de lumière et de nutriments.'
  },
  {
    id: 'p3',
    name: 'Menthe Poivrée',
    humidityMin: 65,
    humidityMax: 90,
    tempMin: 12,
    tempMax: 25,
    lightMin: 40,
    phMin: 6.0,
    phMax: 7.0,
    notes: 'Très robuste, préfère un sol toujours humide.'
  }
];

export const INITIAL_DEVICES: Device[] = [
  {
    id: 'dev-001',
    name: 'Unité Balcon Sud',
    size: 'Moyen',
    level: 'Intermédiaire',
    locationLabel: 'Balcon Principal',
    currentPlantProfileId: 'p1',
    createdAt: new Date().toISOString(),
    isWatering: false,
    automationEnabled: true,
    config: {
      hasTempWater: true,
      hasPowerMeter: true,
      samplingFrequencySec: 10,
      phCalibrationOffset: 0.1
    }
  },
  {
    id: 'dev-002',
    name: 'Carré Potager Cuisine',
    size: 'Petit',
    level: 'Base',
    locationLabel: 'Plan de travail',
    currentPlantProfileId: 'p3',
    createdAt: new Date().toISOString(),
    isWatering: false,
    automationEnabled: false,
    config: {
      hasTempWater: false,
      hasPowerMeter: false,
      samplingFrequencySec: 30,
      phCalibrationOffset: 0
    }
  }
];

export const MOCK_USER: User = {
  id: 'u1',
  email: 'admin@secomo.io',
  role: Role.ADMIN,
  firstName: 'Jean',
  lastName: 'Dupont',
  createdAt: '2024-01-15T10:00:00.000Z',
  theme: 'light',
  language: 'FR',
  unit: 'celsius',
  timezone: 'Europe/Paris'
};
