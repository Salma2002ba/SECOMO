
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export type ThemeType = 'light' | 'dark';
export type UnitType = 'celsius' | 'fahrenheit';
export type LanguageType = 'FR' | 'EN';

export interface User {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  createdAt: string;
  theme: ThemeType;
  language: LanguageType;
  unit: UnitType;
  timezone: string;
}

export type DeviceSize = 'Petit' | 'Moyen' | 'Grand';
export type DeviceLevel = 'Base' | 'Intermédiaire' | 'Final';

export interface DeviceConfig {
  autoVentilation: boolean;
  autoLighting: boolean;
  samplingFrequencySec: number;
  phCalibrationOffset: number;
}

export interface Station {
  id: string;
  name: string;
  locationLabel: string;
  createdAt: string;
}

export interface Device {
  id: string;
  name: string;
  size: DeviceSize;
  level: DeviceLevel;
  locationLabel: string;
  currentPlantProfileId?: string;
  stationId?: string;
  bacPosition?: { row: number; col: number };
  physicalId?: string;
  isLightOn: boolean;
  isFanOn: boolean;
  createdAt: string;
  isWatering: boolean;
  lastWatering?: string;
  automationEnabled: boolean;
  config: DeviceConfig;
}

export interface SensorReading {
  deviceId: string;
  timestamp: string;
  tempAir: number;
  humidity: number;
  light: number;
  soilPh: number;
  batteryLevel: number;
}

export enum WateringMode {
  MANUAL = 'MANUAL',
  AUTO = 'AUTO'
}

export interface WateringEvent {
  id: string;
  deviceId: string;
  timestamp: string;
  mode: WateringMode;
  durationSec: number;
  reason: string;
}

export interface PlantProfile {
  id: string;
  name: string;
  humidityMin: number;
  humidityMax: number;
  tempMin: number;
  tempMax: number;
  lightMin: number;
  phMin: number;
  phMax: number;
  notes: string;
}

export type AlertType = 'info' | 'warning' | 'critical';

export type AlertCategory = 'humidity' | 'temperature' | 'ph' | 'light';

export interface Alert {
  id: string;
  deviceId: string;
  deviceName: string;
  plantName: string;
  category: AlertCategory;
  message: string;
  type: AlertType;
  timestamp: string;
  read?: boolean;
}

export interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  precipProb: number;
  city?: string;
}

export type SensorStatus = 'ok' | 'low' | 'high' | 'neutral';

export interface Recommendation {
  id: string;
  text: string;
  severity: AlertType;
  action?: string;
}
