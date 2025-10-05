// Sidebar.tsx
// Presents the explorer data coming from context.
// Responsibilities:
// - Summarise the current selection state and loading/errors.
// - List nearby landmarks with camera-focus actions.
// - Surface available local guides and route information.

import { useEffect, useRef } from "react";
import {
  Paper,
  Stack,
  Typography,
  Button,
  CircularProgress,
} from "@mui/material";

import { useAppStyles } from "@/styles/useAppStyles";
import { useCityExplorer } from "@/context/CityExplorerContext";
import type { GeoapifyFeature } from "@/types/geoapify";
import type { LatLng } from "@/types/models";

const formatDistance = (meters: number) => {
  if (meters < 1000) {
    return `${meters.toFixed(0)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

const formatDuration = (seconds: number) => {
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)} min`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
};

const Sidebar = () => {
  const { classes, cx } = useAppStyles();
  const {
    activeCoords,
    focusCoords,
    landmarks,
    setSelectedLandmarkId,
    selectedLandmarkId,
    landmarksLoading,
    guides,
    route,
    planRoute,
    clearRoute,
    isLoading,
    error,
  } = useCityExplorer();

  const landmarkRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const listColumnRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!selectedLandmarkId || landmarksLoading) return;
    const node = landmarkRefs.current[selectedLandmarkId];
    const container = listColumnRef.current;
    if (!node || !container) return;

    requestAnimationFrame(() => {
      const nodeRect = node.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      if (
        nodeRect.top < containerRect.top ||
        nodeRect.bottom > containerRect.bottom
      ) {
        container.scrollTo({
          top:
            container.scrollTop +
            (nodeRect.top - containerRect.top) -
            containerRect.height / 2 +
            nodeRect.height / 2,
          behavior: "smooth",
        });
      }
    });
  }, [selectedLandmarkId, landmarksLoading]);
  const hasSelection = Boolean(activeCoords);
  const canPlanRoute = !route && landmarks.length >= 2;

  console.log({ route, guides, landmarks });

  const featureToLatLng = (feature: GeoapifyFeature): LatLng => {
    const coords = feature.geometry?.coordinates;
    if (coords && coords.length === 2) {
      const [lng, lat] = coords;
      return { lat, lng };
    }

    return {
      lat: feature.properties.lat,
      lng: feature.properties.lon,
    };
  };

  const resolveLabel = (feature: GeoapifyFeature) =>
    feature.properties.name ??
    feature.properties.address_line1 ??
    feature.properties.formatted ??
    "Unnamed place";

  const resolveSubtitle = (feature: GeoapifyFeature) => {
    const { categories, address_line2, district, city, country } =
      feature.properties;
    if (categories?.length) {
      const raw = categories[0];
      return raw.split(".").pop() ?? raw;
    }
    return address_line2 ?? district ?? city ?? country ?? "Scenic viewpoint";
  };

  const handleLandmarkFocus = (landmark: GeoapifyFeature) => {
    setSelectedLandmarkId(landmark.properties.place_id);
    focusCoords(featureToLatLng(landmark), {
      height: 1600,
      speed: 1.15,
      landmarkId: landmark.properties.place_id,
    });
  };

  const handlePlanRoute = () => {
    if (!canPlanRoute) {
      return;
    }

    const start = featureToLatLng(landmarks[0]);
    const end = featureToLatLng(landmarks[landmarks.length - 1]);
    void planRoute(start, end, "walking");
  };

  return (
    <Paper className={classes.sidebarCard} elevation={0} square>
      <Stack spacing={1.5}>
        <Stack component="header" spacing={0.75} className={classes.cityHeader}>
          <Typography variant="h5" className={classes.cityTitle}>
            {hasSelection ? "Local highlights" : "Explore a destination"}
          </Typography>
          <Typography variant="body2" className={classes.cityBlurb}>
            {hasSelection
              ? "Select a landmark to reposition the camera or plot a walking route."
              : "Search or pick a spot on the globe to load nearby guides and routes."}
          </Typography>
        </Stack>

        {error ? (
          <Typography className={classes.feedback} role="alert">
            {error}
          </Typography>
        ) : null}

        {isLoading ? (
          <Typography className={classes.feedback}>
            Loading experiences…
          </Typography>
        ) : null}

        <Stack component="section" spacing={1.25} className={classes.section}>
          <Typography variant="subtitle1" className={classes.sectionTitle}>
            Landmarks
          </Typography>
          {landmarksLoading ? (
            <Stack
              alignItems="center"
              py={1.5}
              gap={1}
              sx={{ color: "#c4cfff" }}
            >
              <CircularProgress size={26} sx={{ color: "#7dd3fc" }} />
              <Typography className={classes.cityBlurb}>
                Bringing in fresh highlights…
              </Typography>
            </Stack>
          ) : landmarks.length ? (
            <Stack
              spacing={0.5}
              ref={listColumnRef}
              className={classes.listColumn}
            >
              {landmarks.map((landmark) => (
                <Button
                  key={landmark.properties.place_id}
                  onClick={() => handleLandmarkFocus(landmark)}
                  className={cx(
                    classes.listButton,
                    selectedLandmarkId === landmark.properties.place_id &&
                      classes.listButtonActive
                  )}
                  variant="outlined"
                  fullWidth
                  ref={(el) => {
                    landmarkRefs.current[landmark.properties.place_id] = el;
                  }}
                >
                  <Typography
                    component="span"
                    className={classes.listButtonTitle}
                  >
                    {resolveLabel(landmark)}
                  </Typography>
                  <Typography
                    component="span"
                    className={classes.listButtonSubtitle}
                  >
                    {resolveSubtitle(landmark)}
                  </Typography>
                </Button>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" className={classes.cityBlurb}>
              {hasSelection
                ? "No featured landmarks yet for this area."
                : "Select a destination to see curated landmarks."}
            </Typography>
          )}
        </Stack>

        <Stack component="section" spacing={1.25} className={classes.section}>
          <Typography variant="subtitle1" className={classes.sectionTitle}>
            Available guides
          </Typography>
          {guides.length ? (
            <Stack spacing={0.5} className={classes.listColumn}>
              {guides.map((guide) => (
                <Stack
                  key={guide.id}
                  className={cx(classes.listButton, classes.listButtonActive)}
                  component="div"
                >
                  <Typography className={classes.listButtonTitle}>
                    {guide.name}
                  </Typography>
                  <Typography className={classes.listButtonSubtitle}>
                    Languages: {guide.languages.join(", ")}
                  </Typography>
                  {guide.rating ? (
                    <Typography className={classes.listButtonSubtitle}>
                      Rating {guide.rating.toFixed(1)} ★
                    </Typography>
                  ) : null}
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" className={classes.cityBlurb}>
              {hasSelection
                ? "Guides will appear once they are available for this location."
                : "Pick a city to discover recommended local guides."}
            </Typography>
          )}
        </Stack>

        <Stack component="section" spacing={1} className={classes.section}>
          <Typography variant="subtitle1" className={classes.sectionTitle}>
            Route planner
          </Typography>
          {route ? (
            <Stack spacing={0.5}>
              <Typography className={classes.listButtonSubtitle}>
                Distance · {formatDistance(route.distanceMeters)}
              </Typography>
              <Typography className={classes.listButtonSubtitle}>
                Duration · {formatDuration(route.durationSeconds)}
              </Typography>
              <Button
                onClick={clearRoute}
                className={classes.listButton}
                variant="outlined"
              >
                Clear route
              </Button>
            </Stack>
          ) : (
            <Button
              onClick={handlePlanRoute}
              className={classes.listButton}
              variant="outlined"
              disabled={!canPlanRoute}
            >
              {canPlanRoute
                ? "Plan walking route"
                : "Add two landmarks to plan a route"}
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
};

export default Sidebar;
