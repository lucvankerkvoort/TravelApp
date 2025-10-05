import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { CesiumComponentRef } from "resium";
import {
  Cartographic,
  Cartesian3,
  GeocoderService,
  IonGeocoderService,
  Math as CesiumMath,
  type Viewer as CesiumViewer,
} from "cesium";
import { GeoapifyFeatureSchema, type GeoapifyFeature } from "@/types/geoapify";
import type { LatLng, Guide, RouteLeg } from "@/types/models";

type MarkerStyle = {
  iconUrl: string;
  color: string;
  icon: string;
};

type CameraOptions = {
  height: number;
  heading?: number;
  pitch?: number;
  speed?: number;
};

type FocusOptions = Partial<CameraOptions> & {
  landmarkId?: string | null;
};

type Ctx = {
  viewerRef: React.RefObject<CesiumComponentRef<CesiumViewer> | null>;

  // focus / camera
  activeCoords: LatLng | null;
  focusCoords: (coords: LatLng, opts?: FocusOptions) => void;

  // data
  landmarks: GeoapifyFeature[];
  markerStyles: Record<string, MarkerStyle>;
  landmarksLoading: boolean;
  selectedLandmarkId: string | null;
  setSelectedLandmarkId: (id: string | null) => void;
  guides: Guide[];
  loadLandmarks: (query: string) => Promise<void>;
  loadGuides: (coords: LatLng) => Promise<void>;

  // routes
  route: RouteLeg | null;
  planRoute: (
    start: LatLng,
    end: LatLng,
    mode?: "driving" | "walking" | "cycling"
  ) => Promise<void>;
  clearRoute: () => void;

  // search
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  isSearching: boolean;
  searchFeedback: string | null;
  handleSearchSubmit: (overrideQuery?: string) => Promise<void> | void;
  getGeocodeSuggestions: (query: string) => Promise<GeocoderService.Result[]>;
  cameraOptions: CameraOptions;
  isLoading: boolean;
  error: string | null;
};

const CityExplorerContext = createContext<Ctx | null>(null);
export const useCityExplorer = () => {
  const ctx = useContext(CityExplorerContext);
  if (!ctx)
    throw new Error("useCityExplorer must be used within CityExplorerProvider");
  return ctx;
};

export const useCityExplorerOptional = (): Ctx | null =>
  useContext(CityExplorerContext);

export function CityExplorerProvider({ children }: { children: ReactNode }) {
  const viewerRef = useRef<CesiumComponentRef<CesiumViewer> | null>(null);
  const geocoderServiceRef = useRef<IonGeocoderService | null>(null);

  const [activeCoords, setActiveCoords] = useState<LatLng | null>(null);
  const [landmarks, setLandmarks] = useState<GeoapifyFeature[]>([]);
  const [markerStyles, setMarkerStyles] = useState<Record<string, MarkerStyle>>(
    {}
  );
  const [landmarksLoading, setLandmarksLoading] = useState(false);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string | null>(
    null
  );
  const [cameraOptions, setCameraOptions] = useState<CameraOptions>({
    height: 3200,
    heading: 0,
    pitch: 0,
    speed: 1.4,
  });
  const [guides, setGuides] = useState<Guide[]>([]);
  const [route, setRoute] = useState<RouteLeg | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
  const [isSearching, setSearching] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Camera control is triggered by context; GlobeViewer performs the actual fly
  const focusCoords = useCallback((coords: LatLng, opts?: FocusOptions) => {
    setActiveCoords(coords);

    setCameraOptions((prev) => {
      const base: CameraOptions = prev ?? {
        height: 3200,
        heading: 0,
        pitch: 0,
        speed: 1.4,
      };

      const { landmarkId, ...cameraOverrides } = opts ?? {};

      const merged: CameraOptions = {
        ...base,
        ...cameraOverrides,
        height: cameraOverrides.height ?? base.height ?? 3200,
      };

      if (opts && Object.prototype.hasOwnProperty.call(opts, "landmarkId")) {
        setSelectedLandmarkId(opts.landmarkId ?? null);
      }

      return merged;
    });
  }, []);

  const loadLandmarks = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setLandmarks([]);
      setMarkerStyles({});
      setLandmarksLoading(false);
      setSelectedLandmarkId(null);
      return;
    }

    setLoading(true);
    setLandmarksLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/places?query=${encodeURIComponent(trimmed)}`
      );
      if (!res.ok) throw new Error("Failed to load landmarks");
      const payload = await res.json();
      const parsed = GeoapifyFeatureSchema.array().parse(payload);

      const styles: Record<string, MarkerStyle> = {};
      setSelectedLandmarkId(null);

      const themeMap: Record<string, { icon: string; color: string }> = {
        tourism: { icon: "binoculars", color: "#29B6F6" },
        architecture: { icon: "landmark", color: "#8E24AA" },
        religion: { icon: "church", color: "#7E57C2" },
        catering: { icon: "utensils", color: "#FF7043" },
        shopping: { icon: "shopping-bag", color: "#AB47BC" },
        accommodation: { icon: "bed", color: "#26A69A" },
        entertainment: { icon: "theater-masks", color: "#FFCA28" },
        natural: { icon: "tree", color: "#66BB6A" },
        sport: { icon: "basketball-ball", color: "#42A5F5" },
        culture: { icon: "palette", color: "#EC407A" },
        historic: { icon: "monument", color: "#FF8A65" },
      };

      parsed.forEach((feature) => {
        const categoriesRaw = feature.properties.categories ?? "";
        const categories =
          typeof categoriesRaw === "string" ? categoriesRaw.split(",") : [];
        const firstCategory = categories[0]?.split(".")[0] ?? "tourism";
        const fallback = { icon: "map-marker-alt", color: "#FF5722" };
        const { icon, color } = themeMap[firstCategory] ?? fallback;

        const params = new URLSearchParams({
          icon,
          color,
          type: "awesome",
          iconType: "awesome",
          size: "large",
        });

        styles[feature.properties.place_id] = {
          icon,
          color,
          iconUrl: `/api/marker?${params.toString()}`,
        };
      });

      setLandmarks(parsed);
      setMarkerStyles(styles);
    } catch (e: any) {
      setError(e.message || "Landmarks failed");
    } finally {
      setLoading(false);
      setLandmarksLoading(false);
    }
  }, []);

  const loadGuides = useCallback(async (coords: LatLng) => {
    // from Firestore or your API
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/guides?lat=${coords.lat}&lng=${coords.lng}`
      );
      if (!res.ok) throw new Error("Failed to load guides");
      const data: Guide[] = await res.json();
      setGuides(data);
    } catch (e: any) {
      setError(e.message || "Guides failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const planRoute = useCallback(
    async (
      start: LatLng,
      end: LatLng,
      mode: "driving" | "walking" | "cycling" = "driving"
    ) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/route?start=${start.lat},${start.lng}&end=${end.lat},${end.lng}&mode=${mode}`
        );
        if (!res.ok) throw new Error("Failed to plan route");
        const data: RouteLeg = await res.json();
        setRoute(data);
      } catch (e: any) {
        setError(e.message || "Route failed");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearRoute = useCallback(() => setRoute(null), []);

  const handleSearchSubmit = useCallback(
    async (overrideQuery?: string) => {
      const sourceQuery = overrideQuery ?? searchQuery;
      const query = sourceQuery.trim();
      if (!query) {
        return;
      }

      if (overrideQuery !== undefined) {
        setSearchQuery(sourceQuery);
      }

      setSearching(true);
      setSearchFeedback(null);

      if (!geocoderServiceRef.current) {
        geocoderServiceRef.current = new IonGeocoderService({
          scene: viewerRef.current?.cesiumElement?.scene!,
        });
      }

      try {
        const geocoderService = geocoderServiceRef.current;
        const results = await geocoderService!.geocode(query);

        if (!results.length) {
          throw new Error("No results found for this search");
        }

        const { destination, displayName } = results[0];

        let coords: LatLng;
        if (destination instanceof Cartesian3) {
          const cartographic = Cartographic.fromCartesian(destination);
          coords = {
            lat: CesiumMath.toDegrees(cartographic.latitude),
            lng: CesiumMath.toDegrees(cartographic.longitude),
          };
        } else if (Array.isArray(destination)) {
          const [west, south, east, north] = destination;
          const center = Cartographic.fromRadians(
            (west + east) / 2,
            (south + north) / 2
          );
          coords = {
            lat: CesiumMath.toDegrees(center.latitude),
            lng: CesiumMath.toDegrees(center.longitude),
          };
        } else if (
          destination &&
          typeof destination === "object" &&
          "west" in destination &&
          "south" in destination &&
          "east" in destination &&
          "north" in destination
        ) {
          const rect = destination as {
            west: number;
            south: number;
            east: number;
            north: number;
          };
          const center = Cartographic.fromRadians(
            (rect.west + rect.east) / 2,
            (rect.south + rect.north) / 2
          );
          coords = {
            lat: CesiumMath.toDegrees(center.latitude),
            lng: CesiumMath.toDegrees(center.longitude),
          };
        } else {
          throw new Error("Unsupported geocoder result format");
        }

        focusCoords(coords, {
          height: 7200,
          // pitch: -25,
          // heading: 0,
          speed: 1.8,
        });
        void loadLandmarks(displayName ?? query);
        setSearchFeedback(`Showing results for “${displayName ?? query}”`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to search";
        setSearchFeedback(message);
      } finally {
        setSearching(false);
      }
    },
    [focusCoords, loadLandmarks, searchQuery, setSearchQuery]
  );

  const getGeocodeSuggestions = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    if (!geocoderServiceRef.current) {
      geocoderServiceRef.current = new IonGeocoderService({
        scene: viewerRef.current?.cesiumElement?.scene!,
      });
    }

    try {
      const geocoderService = geocoderServiceRef.current;
      return await geocoderService!.geocode(trimmed);
    } catch (err) {
      console.warn("Geocode suggestions failed", err);
      return [];
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      viewerRef,
      activeCoords,
      focusCoords,
      landmarks,
      markerStyles,
      landmarksLoading,
      selectedLandmarkId,
      guides,
      loadLandmarks,
      setSelectedLandmarkId,
      loadGuides,
      route,
      planRoute,
      clearRoute,
      searchQuery,
      setSearchQuery,
      isSearching,
      searchFeedback,
      handleSearchSubmit,
      getGeocodeSuggestions,
      cameraOptions,
      isLoading,
      error,
    }),
    [
      activeCoords,
      landmarks,
      markerStyles,
      landmarksLoading,
      selectedLandmarkId,
      guides,
      loadLandmarks,
      loadGuides,
      route,
      planRoute,
      clearRoute,
      searchQuery,
      isSearching,
      searchFeedback,
      handleSearchSubmit,
      getGeocodeSuggestions,
      cameraOptions,
      isLoading,
      error,
    ]
  );

  return (
    <CityExplorerContext.Provider value={value}>
      {children}
    </CityExplorerContext.Provider>
  );
}
