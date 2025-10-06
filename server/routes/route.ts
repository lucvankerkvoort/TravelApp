import express, { type Request, type Response } from "express";
import {
  fetchGeoapifyRoute,
  parseWaypoints,
  type GeoapifyMode,
} from "../services/geoapifyRouting";

const parseWaypointString = (raw: string, label: string) => {
  const [latStr, lngStr] = raw.split(",");
  const lat = Number.parseFloat(latStr ?? "");
  const lng = Number.parseFloat(lngStr ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`${label} must contain numeric "lat,lng"`);
  }
  return { lat, lng };
};

const parseViaParam = (raw: unknown): Array<{ lat: number; lng: number }> => {
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw
    .split("|")
    .map((segment, idx) =>
      parseWaypointString(segment.trim(), `via[${idx}]`)
    );
};

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    let waypoints: Array<{ lat: number; lng: number }> = [];

    if (typeof req.query.waypoints === "string" && req.query.waypoints.trim()) {
      waypoints = req.query.waypoints
        .split("|")
        .map((segment, idx) =>
          parseWaypointString(segment.trim(), `waypoints[${idx}]`)
        );
    } else {
      const { start, end } = parseWaypoints(req.query.start, req.query.end);
      const via = parseViaParam(req.query.via);
      waypoints = [start, ...via, end];
    }

    if (waypoints.length < 2) {
      throw new Error("At least two waypoints are required");
    }

    const mode = (req.query.mode as string | undefined)?.toLowerCase() as
      | GeoapifyMode
      | undefined;

    console.info("/route planning", {
      waypoints,
      mode: mode ?? "driving",
    });

    const payload = await fetchGeoapifyRoute({ waypoints, mode });

    console.info("/route response", {
      points: payload.coordinates.length,
      distanceMeters: payload.distanceMeters,
      durationSeconds: payload.durationSeconds,
    });

    res.json(payload);
  } catch (err) {
    console.error("/route request failed", err);
    res.status(400).json({
      error: err instanceof Error ? err.message : "Failed to plan route",
    });
  }
});

export default router;
