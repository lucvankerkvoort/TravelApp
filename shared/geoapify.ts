import { z } from "zod";

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
