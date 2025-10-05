import { Math as CesiumMath, Rectangle, Cartesian3 } from "cesium";
import type { Viewer as CesiumViewer } from "cesium";

import type { Coordinates } from "../../types/models";

export const toCartesian = ({ lon, lat, height = 0 }: Coordinates) =>
  Cartesian3.fromDegrees(lon, lat, height);

export const toCartesianPath = (path: Coordinates[]) =>
  path.map((point) => toCartesian(point));

export const flyToDestination = (
  viewer: CesiumViewer,
  destination: Rectangle | Cartesian3,
  duration = 2.2
) => {

  if (destination instanceof Rectangle) {
    viewer.camera.flyTo({ destination, duration });
    return;
  }

  viewer.camera.flyTo({
    destination,
    duration,
    orientation: {
      heading: CesiumMath.toRadians(0),
      roll: 0,
    },
  });
};
