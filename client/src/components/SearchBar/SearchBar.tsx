import { useState, useEffect } from "react";
import {
  Autocomplete,
  TextField,
  Typography,
  Stack,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import { Cartographic, Cartesian3, Math as CesiumMath } from "cesium";

import { useAppStyles } from "@/styles/useAppStyles";
import { useCityExplorer } from "@/context/CityExplorerContext";

type SuggestionType = {
  id: string;
  name: string;
  kind?: string;
  position: { lat: number; lng: number };
};

const SearchBar = () => {
  const { classes } = useAppStyles();
  const {
    searchQuery,
    searchFeedback,
    setSearchQuery,
    handleSearchSubmit,
    focusCoords,
    loadLandmarks,
    getGeocodeSuggestions,
  } = useCityExplorer();

  const [inputValue, setInputValue] = useState(searchQuery ?? "");
  const [options, setOptions] = useState<SuggestionType[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const destinationToLatLng = (
    destination: unknown
  ): SuggestionType["position"] | null => {
    if (destination instanceof Cartesian3) {
      const cartographic = Cartographic.fromCartesian(destination);
      return {
        lat: CesiumMath.toDegrees(cartographic.latitude),
        lng: CesiumMath.toDegrees(cartographic.longitude),
      };
    }

    if (Array.isArray(destination) && destination.length === 4) {
      const [west, south, east, north] = destination;
      const center = Cartographic.fromRadians(
        (west + east) / 2,
        (south + north) / 2
      );
      return {
        lat: CesiumMath.toDegrees(center.latitude),
        lng: CesiumMath.toDegrees(center.longitude),
      };
    }

    if (
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
      return {
        lat: CesiumMath.toDegrees(center.latitude),
        lng: CesiumMath.toDegrees(center.longitude),
      };
    }

    return null;
  };

  // fetch autocomplete suggestions as user types
  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length < 2) {
      setOptions([]);
      setOptionsLoading(false);
      return;
    }

    const fetchOptions = async () => {
      setOptionsLoading(true);
      try {
        const results = await getGeocodeSuggestions(trimmed);
        const mapped: SuggestionType[] = results
          .map((result, idx) => {
            const coords = destinationToLatLng(result.destination);
            if (!coords) {
              return null;
            }
            return {
              id: `${result.displayName ?? trimmed}-${idx}`,
              name: result.displayName ?? trimmed,
              position: coords,
            } satisfies SuggestionType;
          })
          .filter((item): item is SuggestionType => Boolean(item));
        setOptions(mapped);
      } catch (err) {
        console.warn("Autocomplete suggestions failed", err);
        setOptions([]);
      } finally {
        setOptionsLoading(false);
      }
    };

    const timer = window.setTimeout(() => {
      void fetchOptions();
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [getGeocodeSuggestions, inputValue]);

  return (
    <Stack spacing={0.5} className={classes.searchForm} component="section">
      <Autocomplete
        freeSolo
        options={options}
        loading={optionsLoading}
        loadingText="Searching Cesium..."
        noOptionsText={inputValue.length < 2 ? "Keep typing" : "No matches"}
        sx={{ width: "100%" }}
        getOptionLabel={(opt) => (typeof opt === "string" ? opt : opt.name)}
        ListboxProps={{
          sx: {
            backdropFilter: "blur(16px)",
            backgroundColor: "rgba(15, 23, 42, 0.92)",
            color: "#f8fafc",
            borderRadius: "0.85rem",
            padding: "0.35rem 0",
            "& .MuiAutocomplete-option": {
              padding: "0.55rem 1rem",
              borderRadius: "0.65rem",
              margin: "0.1rem 0.5rem",
              transition: "background 150ms ease",
              fontSize: "0.95rem",
              "&:hover": {
                backgroundColor: "rgba(59, 130, 246, 0.16)",
              },
              "&.Mui-focused": {
                backgroundColor: "rgba(59, 130, 246, 0.22)",
              },
            },
          },
        }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: "1rem",
              background:
                "linear-gradient(140deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9))",
            },
          },
        }}
        onInputChange={(_, newVal) => {
          setInputValue(newVal);
          // setSearchQuery(newVal); // keep context in sync
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void handleSearchSubmit(inputValue);
          }
        }}
        onChange={(_, selected) => {
          if (selected && typeof selected !== "string") {
            if (selected.position) {
              focusCoords(selected.position, { landmarkId: null });
            }
            const query = selected.name?.trim() ?? inputValue.trim();
            if (query) {
              setSearchQuery(query);
              void loadLandmarks(query);
              void handleSearchSubmit(query);
            }
          } else if (typeof selected === "string") {
            const query = selected.trim();
            if (query) {
              setSearchQuery(query);
              void loadLandmarks(query);
              void handleSearchSubmit(query);
            }
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            className={classes.searchInput}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon
                    sx={{ color: "rgba(203, 213, 225, 0.7)" }}
                  />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end" sx={{ gap: 1 }}>
                  {optionsLoading ? (
                    <CircularProgress color="inherit" size={18} thickness={4} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </InputAdornment>
              ),
            }}
            placeholder="Search for a city or place"
            variant="outlined"
            fullWidth
          />
        )}
      />
      {searchFeedback && (
        <Typography className={classes.feedback}>
          <MyLocationIcon sx={{ fontSize: 16, mr: 0.5 }} /> {searchFeedback}
        </Typography>
      )}
    </Stack>
  );
};

export default SearchBar;
