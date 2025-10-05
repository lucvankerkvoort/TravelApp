import { useEffect, useState } from "react";
import { createWorldTerrainAsync, type TerrainProvider } from "cesium";

export const useCesiumTerrain = () => {
  const [terrainProvider, setTerrainProvider] = useState<TerrainProvider>();

  useEffect(() => {
    let cancelled = false;

    void createWorldTerrainAsync()
      .then((provider) => {
        if (!cancelled) {
          setTerrainProvider(provider);
        }
      })
      .catch((error) => {
        console.error("Failed to load world terrain", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return terrainProvider;
};
