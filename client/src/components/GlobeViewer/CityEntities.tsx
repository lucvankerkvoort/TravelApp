import { useCallback } from "react";
import { Cartesian2, Color } from "cesium";
import { Entity, LabelGraphics, PointGraphics, PolylineGraphics } from "resium";

import { useCityExplorerOptional } from "../../context/CityExplorerContext";
import type { City, CityUser, Coordinates } from "../../types/models";
import { flyToDestination, toCartesian, toCartesianPath } from "./utils";

type UserLandmark = CityUser["landmarks"][number] & {
  location?: Coordinates;
  position?: { lat: number; lng: number };
};

export type CityEntitiesProps = {
  activeCity?: City | null;
  activeUser?: CityUser | null;
  activeUserId?: string | null;
  onUserFocus?: (user: CityUser) => void;
};

export const CityEntities = ({
  activeCity: providedActiveCity,
  activeUser: providedActiveUser,
  activeUserId: providedActiveUserId,
  onUserFocus: providedOnUserFocus,
}: CityEntitiesProps) => {
  const context = useCityExplorerOptional();

  const viewerRef = context?.viewerRef ?? null;
  const contextFocusUser = (context as { focusUser?: (user: CityUser) => void } | null)?.focusUser;

  const activeCity = providedActiveCity ?? null;
  const activeUser = providedActiveUser ?? null;
  const activeUserId = providedActiveUserId ?? null;

  const handleUserFocus = useCallback(
    (user: CityUser) => {
      if (providedOnUserFocus) {
        providedOnUserFocus(user);
        return;
      }

      contextFocusUser?.(user);
    },
    [contextFocusUser, providedOnUserFocus]
  );

  const handleLandmarkFocus = useCallback(
    (coordinates: Coordinates) => {
      const viewer = viewerRef?.current?.cesiumElement ?? null;
      if (!viewer) {
        return;
      }

      const destination = toCartesian({
        ...coordinates,
        height: coordinates.height ?? 600,
      });
      flyToDestination(viewer, destination, 1.2);
    },
    [viewerRef]
  );

  const resolveLandmarkCoordinates = (landmark: UserLandmark): Coordinates | null => {
    if (landmark.location) {
      return landmark.location;
    }
    if (landmark.position) {
      return { lat: landmark.position.lat, lon: landmark.position.lng };
    }
    return null;
  };

  if (!activeCity) {
    return null;
  }

  return (
    <>
      {activeCity.users.map((user: CityUser) => {
        const isSelected = user.id === activeUserId;
        return (
          <Entity
            key={user.id}
            name={user.name}
            position={toCartesian(user.location)}
            onClick={() => handleUserFocus(user)}
          >
            <PointGraphics
              color={(isSelected ? Color.CYAN : Color.ORANGE).withAlpha(0.9)}
              pixelSize={isSelected ? 16 : 12}
              outlineColor={Color.WHITE}
              outlineWidth={2}
            />
            <LabelGraphics
              text={`${user.name} — ${user.title}`}
              font="14px 'Inter', sans-serif"
              fillColor={Color.WHITE}
              showBackground
              backgroundColor={Color.BLACK.withAlpha(0.55)}
              pixelOffset={new Cartesian2(0, -18)}
            />
          </Entity>
        );
      })}

      {activeUser
        ? activeUser.landmarks.map((landmark: UserLandmark) => {
            const coords = resolveLandmarkCoordinates(landmark);
            if (!coords) {
              return null;
            }

            return (
              <Entity
                key={landmark.id}
                name={landmark.name}
                position={toCartesian(coords)}
                onClick={() => handleLandmarkFocus(coords)}
              >
                <PointGraphics
                  color={Color.YELLOW.withAlpha(0.95)}
                  pixelSize={10}
                  outlineColor={Color.BLACK}
                  outlineWidth={1}
                />
                <LabelGraphics
                  text={landmark.name}
                  font="13px 'Inter', sans-serif"
                  fillColor={Color.YELLOW}
                  showBackground
                  backgroundColor={Color.BLACK.withAlpha(0.6)}
                  pixelOffset={new Cartesian2(0, -16)}
                />
              </Entity>
            );
          })
        : null}

      {activeUser
        ? activeUser.routes.map((route: CityUser["routes"][number]) => (
            <Entity key={route.id} name={route.name}>
              <PolylineGraphics
                positions={toCartesianPath(route.path)}
                width={4}
                material={Color.CYAN.withAlpha(0.85)}
              />
            </Entity>
          ))
        : null}
    </>
  );
};

export default CityEntities;
