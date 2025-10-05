import { useEffect, useMemo } from "react";
import { Viewer, Entity, Cesium3DTileset } from "resium";
import {
  Cartesian3,
  Color,
  SampledPositionProperty,
  JulianDate,
  IonResource,
  Ion,
  VerticalOrigin,
  HeightReference,
} from "cesium";
import { useCityExplorer } from "@/context/CityExplorerContext";
import type { GeoapifyFeature } from "@/types/geoapify";

export default function GlobeViewer() {
  const {
    viewerRef,
    activeCoords,
    landmarks,
    markerStyles,
    selectedLandmarkId,
    cameraOptions,
    route,
    focusCoords,
  } = useCityExplorer();

  console.log({ landmarks });
  const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

  useEffect(() => {
    if (ionToken) {
      Ion.defaultAccessToken = ionToken;
    }
  }, [ionToken]);

  const tilesetResource = useMemo(() => {
    if (!ionToken) {
      console.warn("Cesium Ion token missing; skipping 3D tileset load.");
      return null;
    }

    try {
      return IonResource.fromAssetId(96188, {
        accessToken: ionToken,
      });
    } catch (err) {
      console.error("Failed to create Ion resource", err);
      return null;
    }
  }, [ionToken]);
  // hook Cesium geocoder → context
  useEffect(() => {
    const v = viewerRef.current?.cesiumElement;
    if (!v || !v.geocoder) return;

    const geocoder = v.geocoder.viewModel;

    // when search completes successfully
    const removeListener = geocoder.complete.addEventListener((result) => {
      if (result && result.destination) {
        const carto = result.destination; // Cartesian3
        const cartoDegrees =
          v.scene.globe.ellipsoid.cartesianToCartographic(carto);
        focusCoords(
          {
            lat: (cartoDegrees.latitude * 180) / Math.PI,
            lng: (cartoDegrees.longitude * 180) / Math.PI,
          },
          { landmarkId: null }
        );
      }
    });

    return () => {
      removeListener();
    };
  }, [viewerRef, focusCoords]);

  // fly camera when activeCoords changes (context → Cesium)
  useEffect(() => {
    const v = viewerRef.current?.cesiumElement;
    if (!v || !activeCoords) return;

    const height = cameraOptions?.height ?? 3200;
    const dest = Cartesian3.fromDegrees(
      activeCoords.lng,
      activeCoords.lat,
      height
    );

    v.camera.flyTo({
      destination: dest,
      duration: cameraOptions?.speed ?? 1.6,
      orientation: {
        roll: v.camera.roll,
      },
    });
  }, [activeCoords, cameraOptions, viewerRef]);

  // route animation path
  const routePosition = useMemo(() => {
    if (!route) return null;
    const sp = new SampledPositionProperty();
    const start = JulianDate.now();
    const dt = 0.5;
    route.coordinates.forEach((c, i) => {
      const time = JulianDate.addSeconds(start, i * dt, new JulianDate());
      sp.addSample(time, Cartesian3.fromDegrees(c.lng, c.lat, 50));
    });
    return sp;
  }, [route]);

  const featurePosition = (feature: GeoapifyFeature) => {
    const coords = feature.geometry?.coordinates;
    if (coords && coords.length === 2) {
      const [lng, lat] = coords;
      return Cartesian3.fromDegrees(lng, lat);
    }
    return Cartesian3.fromDegrees(
      feature.properties.lon,
      feature.properties.lat
    );
  };

  const featureName = (feature: GeoapifyFeature) =>
    feature.properties.name ??
    feature.properties.address_line1 ??
    feature.properties.formatted ??
    "Unnamed place";

  const featureDescription = (feature: GeoapifyFeature) => {
    const { categories, formatted, address_line2, city } = feature.properties;
    if (categories?.length) {
      const raw = categories[0];
      return raw.split(".").pop() ?? raw;
    }
    return address_line2 ?? formatted ?? city ?? "Landmark";
  };

  const featureLatLng = (feature: GeoapifyFeature) => {
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

  console.log({ landmarks });
  return (
    <Viewer ref={viewerRef} geocoder={false} infoBox={false} full>
      {tilesetResource ? <Cesium3DTileset url={tilesetResource} /> : null}
      {landmarks.map((l) => {
        const style = markerStyles[l.properties.place_id];
        const isSelected = selectedLandmarkId === l.properties.place_id;

        const baseColor = style
          ? Color.fromCssColorString(style.color)
          : Color.YELLOW;

        return (
          <Entity
            key={l.properties.place_id}
            name={featureName(l)}
            position={featurePosition(l)}
            onClick={() => {
              const coords = featureLatLng(l);
              focusCoords(coords, {
                height: isSelected ? 1400 : 1600,
                speed: 1.12,
                landmarkId: l.properties.place_id,
              });
            }}
            point={{
              pixelSize: isSelected ? 9 : style ? 6 : 8,
              color: isSelected
                ? Color.fromCssColorString("#f472b6")
                : baseColor,
              outlineColor: isSelected
                ? Color.fromCssColorString("#fff7ed")
                : Color.BLACK,
              outlineWidth: isSelected ? 2.2 : style ? 1.5 : 1,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            }}
            billboard={
              style
                ? {
                    image: style.iconUrl,
                    verticalOrigin: VerticalOrigin.BOTTOM,
                    heightReference: HeightReference.CLAMP_TO_GROUND,
                    scale: isSelected ? 1.12 : 0.85,
                  }
                : undefined
            }
            description={featureDescription(l)}
          />
        );
      })}

      {routePosition && (
        <Entity
          name="Route"
          position={routePosition}
          path={{
            show: true,
            leadTime: 0,
            trailTime: 120,
            width: 3,
            material: Color.CYAN,
          }}
        />
      )}
    </Viewer>
  );
}
