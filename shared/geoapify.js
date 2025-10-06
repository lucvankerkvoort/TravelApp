"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoapifyFeatureCollectionSchema = exports.GeoapifyFeatureSchema = void 0;
const zod_1 = require("zod");
exports.GeoapifyFeatureSchema = zod_1.z.object({
    type: zod_1.z.literal("Feature"),
    properties: zod_1.z.object({
        name: zod_1.z.string().optional(),
        old_name: zod_1.z.string().optional(),
        country: zod_1.z.string().optional(),
        country_code: zod_1.z.string().optional(),
        state: zod_1.z.string().optional(),
        state_code: zod_1.z.string().optional(),
        county: zod_1.z.string().optional(),
        city: zod_1.z.string().optional(),
        district: zod_1.z.string().optional(),
        neighbourhood: zod_1.z.string().optional(),
        street: zod_1.z.string().optional(),
        housenumber: zod_1.z.string().optional(),
        postcode: zod_1.z.string().optional(),
        iso3166_2: zod_1.z.string().optional(),
        lon: zod_1.z.number(),
        lat: zod_1.z.number(),
        formatted: zod_1.z.string().optional(),
        address_line1: zod_1.z.string().optional(),
        address_line2: zod_1.z.string().optional(),
        categories: zod_1.z.array(zod_1.z.string()).optional(),
        details: zod_1.z.unknown().optional(), // safer than forcing string[]
        datasource: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
        website: zod_1.z.string().url().optional(),
        opening_hours: zod_1.z.string().optional(),
        operator: zod_1.z.string().optional(),
        name_other: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
        name_international: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
        ele: zod_1.z.number().optional(),
        contact: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
        facilities: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
        wiki_and_media: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
        historic: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
        building: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
        place_id: zod_1.z.string(),
    }),
    geometry: zod_1.z.object({
        type: zod_1.z.literal("Point"),
        coordinates: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]), // [lon, lat]
    }),
});
exports.GeoapifyFeatureCollectionSchema = zod_1.z
    .object({
    type: zod_1.z.literal("FeatureCollection"),
    features: zod_1.z.array(exports.GeoapifyFeatureSchema),
})
    .passthrough();
