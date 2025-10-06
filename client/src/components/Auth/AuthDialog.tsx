import { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  Typography,
  Divider,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import AppleIcon from "@mui/icons-material/Apple";
import { useAuth } from "@/context/AuthContext";

export type AuthMode = "signin" | "signup";

interface AuthDialogProps {
  open: boolean;
  mode: AuthMode;
  onClose: () => void;
  onSwitchMode: (mode: AuthMode) => void;
}

const AuthDialog = ({ open, mode, onClose, onSwitchMode }: AuthDialogProps) => {
  const {
    signInWithEmail,
    registerWithEmail,
    signInWithGoogle,
    signInWithApple,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = mode === "signin" ? "Sign in" : "Create an account";
  const submitLabel = mode === "signin" ? "Sign in" : "Sign up";

  const helperText = useMemo(
    () =>
      mode === "signin"
        ? "New here?"
        : "Already have an account?",
    [mode]
  );

  const helperButton = useMemo(
    () => (mode === "signin" ? "Create one" : "Sign in"),
    [mode]
  );

  const toggleMode = () => {
    onSwitchMode(mode === "signin" ? "signup" : "signin");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "signin") {
        await signInWithEmail(email.trim(), password.trim());
      } else {
        await registerWithEmail(email.trim(), password.trim());
      }
      onClose();
      setEmail("");
      setPassword("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Auth failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign-in failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApple = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signInWithApple();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Apple sign-in failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKey = (evt: React.KeyboardEvent<HTMLDivElement>) => {
    if (evt.key === "Enter" && !submitting) {
      evt.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} onKeyDown={handleKey} fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} mt={0.5}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            fullWidth
          />
          {error ? (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          ) : null}
          <Stack spacing={1.1} mt={1.5}>
            <Button
              variant="contained"
              onClick={() => void handleSubmit()}
              disabled={submitting}
            >
              {submitLabel}
            </Button>
            <Divider>or continue with</Divider>
            <Button
              variant="outlined"
              onClick={() => void handleGoogle()}
              startIcon={<GoogleIcon />}
              disabled={submitting}
            >
              Google
            </Button>
            <Button
              variant="outlined"
              onClick={() => void handleApple()}
              startIcon={<AppleIcon />}
              disabled={submitting}
            >
              Apple
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
          width="100%"
        >
          <Typography variant="body2" color="text.secondary">
            {helperText}
          </Typography>
          <Button onClick={toggleMode} disabled={submitting}>
            {helperButton}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default AuthDialog;
