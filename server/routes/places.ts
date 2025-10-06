// routes/places.ts
import express, { type Request, type Response } from "express";
import fetch from "node-fetch";
import { z } from "zod";
import { createRedisClient } from "../redis";

import {
  GeoapifyFeatureCollectionSchema,
  GeoapifyFeatureSchema,
  type GeoapifyFeature,
} from "../../shared/geoapify";

const router = express.Router();

const redis = createRedisClient();

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

type CategoryKey = "highlights" | "eatAndDrink" | "activities" | "stays";

const CATEGORY_CONFIG: Array<{ key: CategoryKey; categories: string }> = [
  { key: "highlights", categories: "tourism.sights,tourism.attraction" },
  { key: "eatAndDrink", categories: "catering" },
  { key: "activities", categories: "activity" },
  { key: "stays", categories: "accommodation" },
];

const REDIS_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const cacheKeyForQuery = (query: string) =>
  `places:${query.trim().toLowerCase()}`;

router.get("/", async (req: Request, res: Response) => {
  const { query } = req.query;

  if (typeof query !== "string" || !query.trim()) {
    console.warn("/places called without query parameter");
    return res.status(400).json({ error: "query required" });
  }

  const trimmedQuery = query.trim();
  const cacheKey = cacheKeyForQuery(trimmedQuery);

  console.info("/places request received", {
    query: trimmedQuery,
    cacheKey,
    redisAvailable,
  });

  if (redisAvailable) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as Record<
          CategoryKey,
          CachedFeatures
        >;
        const valid =
          parsed &&
          CATEGORY_CONFIG.every(
            ({ key }) => Array.isArray(parsed[key])
          );
        if (valid) {
          console.info("/places cache hit", { cacheKey });
          return res.json(parsed);
        }
        console.warn("/places cache invalid", { cacheKey });
        await redis.del(cacheKey);
      }
    } catch (err) {
      redisAvailable = false;
      console.warn("Redis read failed, disabling cache until reconnect:", err);
    }
  }

  try {
    console.info("/places querying Geoapify geocode", { query: trimmedQuery });
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
      console.info("/places no location match", { query: trimmedQuery });
      return res.status(404).json({
        error: "No matching location",
        categories: CATEGORY_CONFIG.reduce(
          (acc, { key }) => ({ ...acc, [key]: [] }),
          {} as Record<CategoryKey, unknown[]>
        ),
      });
    }

    console.info("/places fetching category data", { query: trimmedQuery, placeId });
    const categoryResults = await Promise.all(
      CATEGORY_CONFIG.map(async ({ key, categories }) => {
        const placesRes = await fetch(
          `https://api.geoapify.com/v2/places?categories=${categories}&filter=place:${placeId}&limit=20&apiKey=${process.env.GEOAPIFY_KEY}`
        );

        if (!placesRes.ok) {
          throw new Error(
            `Geoapify places failed (${key}): ${placesRes.statusText}`
          );
        }

        const placesJson = (await placesRes.json()) as unknown;
        const parsedPlaces = GeoapifyFeatureCollectionSchema.parse(placesJson);
        return [key, parsedPlaces.features] as [CategoryKey, GeoapifyFeature[]];
      })
    );

    const categorized = Object.fromEntries(categoryResults) as Record<
      CategoryKey,
      GeoapifyFeature[]
    >;

    console.info("/places fetched categories", {
      query: trimmedQuery,
      placeId,
      categoryCounts: Object.fromEntries(
        Object.entries(categorized).map(([category, items]) => [
          category,
          items.length,
        ])
      ),
    });

    if (redisAvailable) {
      try {
        await redis.set(
          cacheKey,
          JSON.stringify(categorized),
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

    return res.json(categorized);
  } catch (err) {
    console.error("/places request failed", {
      query: typeof query === "string" ? query.trim() : query,
      error: err,
    });
    return res.status(500).json({
      error:
        err instanceof Error
          ? err.message
          : "Unknown error fetching attractions",
    });
  }
});

export default router;
