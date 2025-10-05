// routes/places.ts
import express, { type Request, type Response } from "express";
import fetch from "node-fetch";
import { z } from "zod";
import Redis from "ioredis";

import {
  GeoapifyFeatureCollectionSchema,
  GeoapifyFeatureSchema,
} from "../../shared/geoapify";

const router = express.Router();

const redis = new Redis({
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? "6379"),
  lazyConnect: true,
  enableReadyCheck: false,
});

let redisAvailable = true;

const ensureRedisConnection = async () => {
  try {
    await redis.connect();
    redisAvailable = true;
  } catch (err) {
    redisAvailable = false;
    console.warn("Redis connection failed; caching disabled:", err);
  }
};

void ensureRedisConnection();

redis.on("error", (err) => {
  redisAvailable = false;
  console.warn("Redis error; caching disabled until recovery:", err);
});

redis.on("end", () => {
  redisAvailable = false;
  console.warn("Redis connection closed; caching disabled.");
});

redis.on("connect", () => {
  redisAvailable = true;
  console.info("Redis connection re-established; caching enabled.");
});

const GeoapifyGeocodeSchema = z.object({
  features: z.array(
    z.object({
      properties: z.object({
        place_id: z.string(),
      }),
    })
  ),
});

type GeoapifyGeocodeResponse = z.infer<typeof GeoapifyGeocodeSchema>;
type CachedFeatures = z.infer<typeof GeoapifyFeatureSchema>[];

const REDIS_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const cacheKeyForQuery = (query: string) =>
  `places:${query.trim().toLowerCase()}`;

router.get("/", async (req: Request, res: Response) => {
  const { query } = req.query;

  if (typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "query required" });
  }

  const trimmedQuery = query.trim();
  const cacheKey = cacheKeyForQuery(trimmedQuery);

  if (redisAvailable) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = GeoapifyFeatureSchema.array().safeParse(
          JSON.parse(cached)
        );
        if (parsed.success) {
          return res.json(parsed.data);
        }
        await redis.del(cacheKey);
      }
    } catch (err) {
      redisAvailable = false;
      console.warn("Redis read failed, disabling cache until reconnect:", err);
    }
  }

  try {
    const geoRes = await fetch(
      `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
        trimmedQuery
      )}&apiKey=${process.env.GEOAPIFY_KEY}`
    );

    if (!geoRes.ok) {
      throw new Error(`Geoapify geocode failed: ${geoRes.statusText}`);
    }

    const geoJson = (await geoRes.json()) as unknown;
    const parsedGeo: GeoapifyGeocodeResponse = GeoapifyGeocodeSchema.parse(
      geoJson
    );

    const placeId = parsedGeo.features[0]?.properties.place_id;
    if (!placeId) {
      throw new Error("Place ID not found");
    }

    const placesRes = await fetch(
      `https://api.geoapify.com/v2/places?categories=tourism.sights,tourism.attraction&filter=place:${placeId}&limit=20&apiKey=${process.env.GEOAPIFY_KEY}`
    );

    if (!placesRes.ok) {
      throw new Error(`Geoapify places failed: ${placesRes.statusText}`);
    }

    const placesJson = (await placesRes.json()) as unknown;
    const parsedPlaces = GeoapifyFeatureCollectionSchema.parse(placesJson);
    const features: CachedFeatures = parsedPlaces.features;

    if (redisAvailable) {
      try {
        await redis.set(
          cacheKey,
          JSON.stringify(features),
          "EX",
          REDIS_TTL_SECONDS
        );
      } catch (err) {
        redisAvailable = false;
        console.warn(
          "Redis write failed, disabling cache until reconnect:",
          err
        );
      }
    }

    return res.json(features);
  } catch (err) {
    console.error("Failed to fetch attractions:", err);
    return res.status(500).json({
      error:
        err instanceof Error
          ? err.message
          : "Unknown error fetching attractions",
    });
  }
});

export default router;
