import express, { type Request, type Response } from "express";
import fetch from "node-fetch";

const router = express.Router();

const DEFAULT_ICON = "location-dot";
const DEFAULT_COLOR = "%23FF5722";
const DEFAULT_ICON_TYPE = "awesome";
const DEFAULT_TYPE = "awesome";

const buildMarkerUrl = (query: Record<string, string | undefined>) => {
  const params = new URLSearchParams();
  params.set("apiKey", process.env.GEOAPIFY_KEY ?? "");

  params.set("type", query.type ?? DEFAULT_TYPE);
  params.set("iconType", query.iconType ?? DEFAULT_ICON_TYPE);
  params.set("icon", query.icon ?? DEFAULT_ICON);
  params.set("color", query.color ?? DEFAULT_COLOR);

  if (query.text) {
    params.set("text", query.text);
  }
  if (query.size) {
    params.set("size", query.size);
  }
  if (query.scale) {
    params.set("scale", query.scale);
  }

  return `https://api.geoapify.com/v1/icon/?${params.toString()}`;
};

router.get("/", async (req: Request, res: Response) => {
  if (!process.env.GEOAPIFY_KEY) {
    return res
      .status(500)
      .json({ error: "GEOAPIFY_KEY must be configured for marker icons" });
  }

  const markerUrl = buildMarkerUrl({
    icon: typeof req.query.icon === "string" ? req.query.icon : undefined,
    color: typeof req.query.color === "string" ? req.query.color : undefined,
    type: typeof req.query.type === "string" ? req.query.type : undefined,
    iconType:
      typeof req.query.iconType === "string" ? req.query.iconType : undefined,
    text: typeof req.query.text === "string" ? req.query.text : undefined,
    size: typeof req.query.size === "string" ? req.query.size : undefined,
    scale: typeof req.query.scale === "string" ? req.query.scale : undefined,
  });

  try {
    const response = await fetch(markerUrl);
    if (!response.ok) {
      throw new Error(
        `Geoapify marker request failed: ${response.status} ${response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "image/png";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("Marker generation failed", err);
    res.status(500).json({ error: "Failed to generate marker icon" });
  }
});

export default router;
