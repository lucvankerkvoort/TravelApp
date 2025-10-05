export type Coordinates = {
  lat: number;
  lon: number;
  height?: number;
};

export type Route = {
  id: string;
  name: string;
  description: string;
  path: Coordinates[];
};

export type CityUser = {
  id: string;
  name: string;
  title: string;
  location: Coordinates;
  landmarks: Landmark[];
  routes: Route[];
};

export type City = {
  id: string;
  name: string;
  country: string;
  blurb: string;
  location: Coordinates;
  zoomHeight: number;
  users: CityUser[];
};

// src/types/models.ts
export type LatLng = { lat: number; lng: number };

export type Landmark = {
  id: string;
  name: string;
  position: LatLng;
  kind?: string; // museum, viewpoint, etc.
  description?: string;
};

export type Guide = {
  id: string;
  name: string;
  cityId?: string;
  languages: string[];
  rating?: number;
};

export type RouteLeg = {
  coordinates: LatLng[]; // decoded polyline
  distanceMeters: number;
  durationSeconds: number;
};
