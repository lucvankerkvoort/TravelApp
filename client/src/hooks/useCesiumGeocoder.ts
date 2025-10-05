import { useMemo } from "react";
import { Ion, IonGeocoderService, type Viewer as CesiumViewer } from "cesium";

export const useCesiumGeocoder = (viewer: CesiumViewer | undefined | null) =>
  useMemo(() => {
    if (!Ion.defaultAccessToken || !viewer) {
      return null;
    }

    return new IonGeocoderService({
      scene: viewer.scene,
      accessToken: Ion.defaultAccessToken,
    });
  }, [viewer]);
