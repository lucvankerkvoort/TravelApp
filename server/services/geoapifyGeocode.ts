import { z } from "zod";

const GeoapifyGeocodeSchema = z.object({
  features: z.array(
    z.object({
      properties: z.object({
        lat: z.number(),
        lon: z.number(),
        formatted: z.string().optional(),
      }),
    })
  ),
});

export type GeocodeResult = {
  lat: number;
  lng: number;
  formatted: string | null;
};

export async function geocodePlace(query: string): Promise<GeocodeResult> {
  if (!process.env.GEOAPIFY_KEY) {
    throw new Error("GEOAPIFY_KEY environment variable is not configured");
  }

  const url = new URL("https://api.geoapify.com/v1/geocode/search");
  url.searchParams.set("text", query);
  url.searchParams.set("limit", "1");
  url.searchParams.set("apiKey", process.env.GEOAPIFY_KEY);

  const response = await fetch(url.toString());
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Geoapify geocode failed: ${response.status} ${text}`);
  }

  const json = (await response.json()) as unknown;
  const parsed = GeoapifyGeocodeSchema.parse(json);
  const feature = parsed.features[0];

  if (!feature) {
    throw new Error(`No results found for "${query}"`);
  }

  return {
    lat: feature.properties.lat,
    lng: feature.properties.lon,
    formatted: feature.properties.formatted ?? null,
  };
}
