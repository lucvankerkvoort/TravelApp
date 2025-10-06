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
export const GeoapifyFeatureSchema = z.object({
  type: z.literal("Feature"),
  properties: z.object({
    name: z.string().optional(),
    old_name: z.string().optional(),
    country: z.string().optional(),
    country_code: z.string().optional(),
    state: z.string().optional(),
    state_code: z.string().optional(),
    county: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    neighbourhood: z.string().optional(),
    street: z.string().optional(),
    housenumber: z.string().optional(),
    postcode: z.string().optional(),
    iso3166_2: z.string().optional(),
    lon: z.number(),
    lat: z.number(),
    formatted: z.string().optional(),
    address_line1: z.string().optional(),
    address_line2: z.string().optional(),
    categories: z.array(z.string()).optional(),
    details: z.unknown().optional(), // safer than forcing string[]
    datasource: z.record(z.string(), z.unknown()).optional(),
    website: z.string().url().optional(),
    opening_hours: z.string().optional(),
    operator: z.string().optional(),
    name_other: z.record(z.string(), z.string()).optional(),
    name_international: z.record(z.string(), z.string()).optional(),
    ele: z.number().optional(),
    contact: z.record(z.string(), z.unknown()).optional(),
    facilities: z.record(z.string(), z.unknown()).optional(),
    wiki_and_media: z.record(z.string(), z.unknown()).optional(),
    historic: z.record(z.string(), z.unknown()).optional(),
    building: z.record(z.string(), z.unknown()).optional(),
    place_id: z.string(),
  }),
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number()]), // [lon, lat]
  }),
});

export const GeoapifyFeatureCollectionSchema = z
  .object({
    type: z.literal("FeatureCollection"),
    features: z.array(GeoapifyFeatureSchema),
  })
  .passthrough();

export type GeoapifyFeature = z.infer<typeof GeoapifyFeatureSchema>;
export type GeoapifyFeatureCollection = z.infer<
  typeof GeoapifyFeatureCollectionSchema
>;
