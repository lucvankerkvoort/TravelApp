import { z } from "zod";

const GeoapifyRouteSchema = z.object({
  features: z
    .array(
      z.object({
        geometry: z.object({
          type: z.enum(["LineString", "MultiLineString"]),
          coordinates: z.any(),
        }),
        properties: z.object({
          distance: z.number(),
          time: z.number(),
        }),
      })
    )
    .nonempty(),
});

export type GeoapifyMode = "driving" | "walking" | "cycling";

const MODE_MAP: Record<GeoapifyMode, string> = {
  driving: "drive",
  walking: "walk",
  cycling: "bike",
};

const parseWaypoint = (raw: unknown, label: string) => {
  if (typeof raw !== "string") {
    throw new Error(`${label} must be provided as "lat,lng"`);
  }

  const [latStr, lngStr] = raw.split(",");
  const lat = Number.parseFloat(latStr ?? "");
  const lng = Number.parseFloat(lngStr ?? "");

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`${label} must contain numeric latitude and longitude`);
  }

  return { lat, lng };
};

export const parseWaypoints = (startRaw: unknown, endRaw: unknown) => ({
  start: parseWaypoint(startRaw, "start"),
  end: parseWaypoint(endRaw, "end"),
});

export type RoutePayload = {
  coordinates: Array<{ lat: number; lng: number }>;
  distanceMeters: number;
  durationSeconds: number;
};

export async function fetchGeoapifyRoute(opts: {
  waypoints: Array<{ lat: number; lng: number }>;
  mode?: GeoapifyMode;
}): Promise<RoutePayload> {
  if (!process.env.GEOAPIFY_KEY) {
    throw new Error("GEOAPIFY_KEY environment variable is not configured");
  }

  if (!opts.waypoints || opts.waypoints.length < 2) {
    throw new Error("At least two waypoints are required to plan a route");
  }

  const mappedMode = opts.mode ? MODE_MAP[opts.mode] ?? "drive" : "drive";

  const url = new URL("https://api.geoapify.com/v1/routing");
  url.searchParams.set(
    "waypoints",
    opts.waypoints
      .map((wp) => `${wp.lat},${wp.lng}`)
      .join("|")
  );
  url.searchParams.set("mode", mappedMode);
  url.searchParams.set("units", "metric");
  url.searchParams.set("lang", "en");
  url.searchParams.set("apiKey", process.env.GEOAPIFY_KEY);

  console.info("geoapifyRoutings.fetch", {
    waypoints: opts.waypoints,
    mappedMode,
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Geoapify routing failed: ${response.status} ${text}`);
  }

  const json = (await response.json()) as unknown;
  const parsed = GeoapifyRouteSchema.parse(json);
  const firstFeature = parsed.features[0];

  const coordinatesRaw = firstFeature.geometry.coordinates;

  const coordinates: Array<{ lat: number; lng: number }> =
    firstFeature.geometry.type === "LineString"
      ? (coordinatesRaw as Array<[number, number]>).map(([lng, lat]) => ({
          lat,
          lng,
        }))
      : (coordinatesRaw as Array<Array<[number, number]>>)
          .flat()
          .map(([lng, lat]) => ({ lat, lng }));

  const routePayload = {
    coordinates,
    distanceMeters: firstFeature.properties.distance,
    durationSeconds: firstFeature.properties.time,
  };

  console.info("geoapifyRouting.fetchGeoapifyRoute.success", {
    mode: opts.mode ?? "driving",
    waypointCount: opts.waypoints.length,
    points: coordinates.length,
    distanceMeters: routePayload.distanceMeters,
    durationSeconds: routePayload.durationSeconds,
  });

  return routePayload;
}
