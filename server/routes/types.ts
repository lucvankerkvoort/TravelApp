import { z } from "zod";

export const LatLngSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const FeatureSchema = z.object({
  type: z.literal("Feature"),
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number()]), // [lon, lat]
  }),
  properties: z.object({
    xid: z.string(),
    name: z.string().default(""),
    kinds: z.string().default(""),
    rate: z.number().optional(),
  }),
});

export const FeatureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(FeatureSchema),
});

export type Feature = z.infer<typeof FeatureSchema>;
export type FeatureCollection = z.infer<typeof FeatureCollectionSchema>;

// Shared Lat/Lng
export type LatLng = {
  lat: number;
  lng: number;
};

// Raw GeoJSON Feature
export interface OTMFeature {
  type: "Feature";
  id?: string;
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    xid: string;
    name: string;
    kinds: string;
    rate?: number;
  };
}

// FeatureCollection wrapper
export interface OTMFeatureCollection {
  type: "FeatureCollection";
  features: OTMFeature[];
}

// Normalized suggestion for your app
export interface Suggestion {
  id: string;
  name: string;
  kind: string;
  position: LatLng;
}

// Raw landmark result from the radius endpoint
export const LandmarkResultSchema = z.object({
  xid: z.string(),
  name: z.string().default(""),
  kinds: z.string().default(""),
  point: z.object({
    lat: z.number(),
    lon: z.number(),
  }),
});

export const LandmarkResultsSchema = z.array(LandmarkResultSchema);

export type LandmarkResult = z.infer<typeof LandmarkResultSchema>;

// Normalized landmark used throughout the app
export type Landmark = {
  id: string;
  name: string;
  kind?: string;
  position: LatLng;
};

// Geoname lookup response
export const GeonameResultSchema = z
  .object({
    name: z.string().default(""),
    lat: z.coerce.number().optional(),
    lon: z.coerce.number().optional(),
  })
  .passthrough();

export type GeonameResult = z.infer<typeof GeonameResultSchema>;

// Normalized search payload returned by the API
export type SearchResult = {
  coords: LatLng;
  message: string;
};

// ---------- Geoapify ----------
export {
  GeoapifyFeatureSchema,
  GeoapifyFeatureCollectionSchema,
  type GeoapifyFeature,
  type GeoapifyFeatureCollection,
} from "../../shared/geoapify";
