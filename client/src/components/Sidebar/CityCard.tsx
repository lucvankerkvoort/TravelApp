import { Button, Stack, Typography } from "@mui/material";

import type { City, CityUser } from "../../types/models";
import { useAppStyles } from "../../styles/useAppStyles";

export type CityCardProps = {
  city: City;
  activeUserId: string | null;
  onUserSelect?: (user: CityUser) => void;
};

export const CityCard = ({ city, activeUserId, onUserSelect }: CityCardProps) => {
  const { classes, cx } = useAppStyles();

  return (
    <Stack spacing={1.5}>
      <Stack component="header" spacing={0.5} className={classes.cityHeader}>
        <Typography variant="h5" className={classes.cityTitle}>
          {city.name}
        </Typography>
        <Typography variant="body2" className={classes.citySubtitle}>
          {city.country}
        </Typography>
        <Typography variant="body2" className={classes.cityBlurb}>
          {city.blurb}
        </Typography>
      </Stack>

      <Stack component="section" spacing={1.5} className={classes.section}>
        <Typography variant="subtitle1" className={classes.sectionTitle}>
          Local hosts
        </Typography>
        <Stack spacing={0.5} className={classes.listColumn}>
          {city.users.map((user) => {
            const isSelected = user.id === activeUserId;
            return (
              <Button
                key={user.id}
                onClick={() => onUserSelect?.(user)}
                className={cx(
                  classes.listButton,
                  isSelected && classes.listButtonActive
                )}
                variant="outlined"
                fullWidth
              >
                <Typography component="span" className={classes.listButtonTitle}>
                  {user.name}
                </Typography>
                <Typography component="span" className={classes.listButtonSubtitle}>
                  {user.title}
                </Typography>
              </Button>
            );
          })}
        </Stack>
      </Stack>
    </Stack>
  );
};

export default CityCard;
