import { List, ListItem, ListItemText, Stack, Typography } from "@mui/material";

import type { CityUser } from "@/types/models";
import { useAppStyles } from "@/styles/useAppStyles";
export type UserCardProps = {
  user: CityUser;
};

export const UserCard = ({ user }: UserCardProps) => {
  const { classes } = useAppStyles();

  return (
    <Stack component="section" spacing={1.5} className={classes.section}>
      <Typography variant="subtitle1" className={classes.sectionTitle}>
        {user.name}'s highlights
      </Typography>
      <Stack spacing={1.25}>
        <div>
          <Typography variant="subtitle2" className={classes.sectionSubtitle}>
            Landmarks
          </Typography>
          <List className={classes.bulletList} disablePadding>
            {user.landmarks.map((landmark) => (
              <ListItem
                key={landmark.id}
                className={classes.bulletItem}
                disableGutters
              >
                <ListItemText
                  primaryTypographyProps={{
                    className: classes.listItemPrimary,
                  }}
                  primary={landmark.name}
                  secondaryTypographyProps={{ className: classes.bulletMeta }}
                  secondary={landmark?.kind}
                />
              </ListItem>
            ))}
          </List>
        </div>
        <div>
          <Typography variant="subtitle2" className={classes.sectionSubtitle}>
            Routes
          </Typography>
          <List className={classes.bulletList} disablePadding>
            {user.routes.map((route) => (
              <ListItem
                key={route.id}
                className={classes.bulletItem}
                disableGutters
              >
                <ListItemText
                  primaryTypographyProps={{
                    className: classes.listItemPrimary,
                  }}
                  primary={route.name}
                  secondaryTypographyProps={{ className: classes.bulletMeta }}
                  secondary={route.description}
                />
              </ListItem>
            ))}
          </List>
        </div>
      </Stack>
    </Stack>
  );
};

export default UserCard;
