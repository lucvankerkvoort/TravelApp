import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import AuthDialog, { type AuthMode } from "./AuthDialog";
import { useAuth } from "@/context/AuthContext";

const getInitials = (displayName?: string | null, email?: string | null) => {
  const source = displayName ?? email ?? "";
  if (!source) return "?";
  const parts = source.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const AuthLauncher = () => {
  const {
    user,
    loading,
    signOutUser,
  } = useAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<AuthMode>("signin");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpenDialog = (mode: AuthMode) => {
    setDialogMode(mode);
    setDialogOpen(true);
    setAnchorEl(null);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    setAnchorEl(null);
    await signOutUser();
  };

  if (loading) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
        <CircularProgress size={18} sx={{ color: "#cbd5f5" }} />
        <Typography variant="body2" sx={{ color: "#cbd5f5" }}>
          Loading profile…
        </Typography>
      </Stack>
    );
  }

  return (
    <>
      {!user ? (
        <Stack direction="row" justifyContent="flex-end">
          <Button
            startIcon={<LoginIcon />}
            variant="outlined"
            onClick={() => handleOpenDialog("signin")}
            sx={{
              borderRadius: "999px",
              borderColor: "rgba(148, 163, 184, 0.35)",
              color: "#f8fafc",
              textTransform: "none",
              px: 1.5,
              py: 0.5,
              fontWeight: 600,
              "&:hover": {
                borderColor: "rgba(148, 163, 184, 0.55)",
                backgroundColor: "rgba(148, 163, 184, 0.1)",
              },
            }}
          >
            Sign in
          </Button>
        </Stack>
      ) : (
        <Stack direction="row" justifyContent="flex-end" alignItems="center">
          <Stack spacing={0} alignItems="flex-end" mr={1}>
            <Typography variant="body2" sx={{ color: "#cbd5f5", fontWeight: 600 }}>
              {user.displayName ?? user.email ?? "Account"}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(203,213,225,0.6)" }}>
              Signed in
            </Typography>
          </Stack>
          <IconButton
            onClick={handleMenuOpen}
            sx={{
              borderRadius: "50%",
              border: "1px solid rgba(148,163,184,0.3)",
              p: 0.3,
            }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                background:
                  "linear-gradient(135deg, rgba(56,189,248,0.5), rgba(129,140,248,0.6))",
                color: "#0b1120",
              }}
            >
              {getInitials(user.displayName, user.email)}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem disabled>
              <Stack direction="row" spacing={1} alignItems="center">
                <PersonIcon fontSize="small" />
                <span>{user.email ?? user.displayName ?? "Signed in"}</span>
              </Stack>
            </MenuItem>
            <MenuItem onClick={handleSignOut}>
              <Stack direction="row" spacing={1} alignItems="center">
                <LogoutIcon fontSize="small" />
                <span>Sign out</span>
              </Stack>
            </MenuItem>
          </Menu>
        </Stack>
      )}
      <AuthDialog
        open={dialogOpen}
        mode={dialogMode}
        onClose={handleCloseDialog}
        onSwitchMode={setDialogMode}
      />
    </>
  );
};

export default AuthLauncher;
