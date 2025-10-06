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
import { apiUrl } from "@/lib/api";
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

export type CategoryKey = "highlights" | "eatAndDrink" | "activities" | "stays";

export type CityLandmark = GeoapifyFeature & { __category: CategoryKey };

type RouteStop = {
  lat: number;
  lng: number;
  label?: string | null;
};

export const CATEGORY_CONFIG: Array<{ key: CategoryKey; label: string }> = [
  { key: "highlights", label: "Highlights" },
  { key: "eatAndDrink", label: "Eat & Drink" },
  { key: "activities", label: "Activities" },
  { key: "stays", label: "Places to Stay" },
];

export const CATEGORY_THEME: Record<
  CategoryKey,
  { icon: string; color: string }
> = {
  highlights: { icon: "star", color: "#0046FF" },
  eatAndDrink: { icon: "utensils", color: "#73C8D2" },
  activities: { icon: "running", color: "#F5F1DC" },
  stays: { icon: "bed", color: "#FF9013" },
};

const createCategoryBuckets = (): Record<CategoryKey, CityLandmark[]> => ({
  highlights: [],
  eatAndDrink: [],
  activities: [],
  stays: [],
});

type Ctx = {
  viewerRef: React.RefObject<CesiumComponentRef<CesiumViewer> | null>;

  // focus / camera
  activeCoords: LatLng | null;
  focusCoords: (coords: LatLng, opts?: FocusOptions) => void;

  // data
  landmarks: CityLandmark[];
  landmarksByCategory: Record<CategoryKey, CityLandmark[]>;
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
  applyRouteLeg: (route: RouteLeg, stops?: RouteStop[]) => void;
  routeStops: RouteStop[];
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
  const [landmarks, setLandmarks] = useState<CityLandmark[]>([]);
  const [landmarksByCategory, setLandmarksByCategory] = useState<
    Record<CategoryKey, CityLandmark[]>
  >(createCategoryBuckets);
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
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);

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
      setLandmarksByCategory(createCategoryBuckets());
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
        apiUrl(`/api/places?query=${encodeURIComponent(trimmed)}`)
      );
      if (!res.ok) throw new Error("Failed to load landmarks");
      const payload = (await res.json()) as Partial<
        Record<CategoryKey, unknown>
      >;

      const flattened: CityLandmark[] = [];
      const grouped = createCategoryBuckets();
      const styles: Record<string, MarkerStyle> = {};
      setSelectedLandmarkId(null);

      CATEGORY_CONFIG.forEach(({ key }) => {
        const parsedList = GeoapifyFeatureSchema.array().safeParse(
          payload[key]
        );
        if (!parsedList.success) {
          return;
        }

        parsedList.data.forEach((feature) => {
          const themed = CATEGORY_THEME[key];
          const placeId = feature.properties.place_id;
          if (!placeId) {
            return;
          }

          const params = new URLSearchParams({
            icon: themed.icon,
            color: themed.color,
            type: "awesome",
            iconType: "awesome",
            size: "large",
          });

          styles[placeId] = {
            icon: themed.icon,
            color: themed.color,
            iconUrl: `/api/marker?${params.toString()}`,
          };

          const enriched = { ...feature, __category: key };
          grouped[key].push(enriched);
          flattened.push(enriched);
        });
      });

      setMarkerStyles(styles);
      setLandmarks(flattened);
      setLandmarksByCategory(grouped);
    } catch (e: any) {
      setError(e.message || "Landmarks failed");
      setLandmarksByCategory(createCategoryBuckets());
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
        apiUrl(`/api/guides?lat=${coords.lat}&lng=${coords.lng}`)
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
        apiUrl(
          `/api/route?start=${start.lat},${start.lng}&end=${end.lat},${end.lng}&mode=${mode}`
        )
      );
      if (!res.ok) throw new Error("Failed to plan route");
      const data: RouteLeg = await res.json();
      setRoute(data);
      setRouteStops([
        { lat: start.lat, lng: start.lng, label: "Start" },
        { lat: end.lat, lng: end.lng, label: "Finish" },
      ]);
    } catch (e: any) {
      setError(e.message || "Route failed");
    } finally {
      setLoading(false);
    }
    },
    []
  );

  const clearRoute = useCallback(() => {
    setRoute(null);
    setRouteStops([]);
  }, []);

  const applyRouteLeg = useCallback(
    (leg: RouteLeg, stops?: RouteStop[]) => {
      if (!leg?.coordinates?.length) {
        console.warn("applyRouteLeg received empty route", leg);
        return;
      }
      console.info("applyRouteLeg setting route", {
        points: leg.coordinates.length,
        distance: leg.distanceMeters,
        duration: leg.durationSeconds,
        stops: stops?.length ?? 0,
      });
      setRoute(leg);
      setRouteStops(stops ?? []);
    },
    []
  );

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
      landmarksByCategory,
      markerStyles,
      landmarksLoading,
      selectedLandmarkId,
      setSelectedLandmarkId,
      guides,
      loadLandmarks,
      loadGuides,
      route,
      routeStops,
      planRoute,
      applyRouteLeg,
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
      landmarksByCategory,
      markerStyles,
      landmarksLoading,
      selectedLandmarkId,
      setSelectedLandmarkId,
      guides,
      loadLandmarks,
      loadGuides,
      route,
      routeStops,
      planRoute,
      applyRouteLeg,
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
