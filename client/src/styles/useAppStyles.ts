import { makeStyles } from "tss-react/mui";

export const PRIMARY_DARK = "#001BB7";
export const PRIMARY_BRIGHT = "#0046FF";
export const ACCENT = "#FF8040";
export const LIGHT = "#E9E9E9";

export const useAppStyles = makeStyles()(() => ({
  appShell: {
    width: "100vw",
    height: "100vh",
    margin: 0,
    background:
      "radial-gradient(circle at 20% 25%, rgba(0, 27, 183, 0.92) 0%, rgba(0, 70, 255, 0.85) 55%, rgba(0, 27, 183, 0.98) 100%)",
    color: LIGHT,
    fontFamily:
      "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  viewerShell: {
    position: "relative",
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    top: "1.5rem",
    left: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    width: "24rem",
    maxWidth: "90vw",
    zIndex: 10,
  },
  searchForm: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
    background:
      "linear-gradient(135deg, rgba(0, 27, 183, 0.85), rgba(0, 70, 255, 0.75))",
    borderRadius: "1rem",
    padding: "0.9rem",
    boxShadow: "0 20px 42px rgba(0, 27, 183, 0.45)",
    backdropFilter: "blur(18px)",
    border: "1px solid rgba(233, 233, 233, 0.22)",
  },
  searchInput: {
    flex: 1,
    "& .MuiOutlinedInput-root": {
      borderRadius: "0.85rem",
      backgroundColor: "rgba(0, 27, 183, 0.3)",
      transition:
        "border-color 160ms ease, box-shadow 160ms ease, background 160ms ease",
      color: LIGHT,
      "& fieldset": {
        borderColor: "rgba(233, 233, 233, 0.2)",
      },
      "&:hover fieldset": {
        borderColor: "rgba(233, 233, 233, 0.45)",
      },
      "&.Mui-focused": {
        backgroundColor: "rgba(0, 27, 183, 0.55)",
        boxShadow: "0 12px 30px rgba(0, 70, 255, 0.35)",
      },
      "&.Mui-focused fieldset": {
        borderColor: "rgba(233, 233, 233, 0.65)",
      },
    },
    "& .MuiOutlinedInput-input": {
      padding: "0.65rem 1rem",
      fontSize: "0.98rem",
      color: LIGHT,
      "&::placeholder": {
        color: "rgba(233, 233, 233, 0.6)",
        opacity: 1,
      },
    },
  },
  searchButton: {
    padding: "0.68rem 1.25rem",
    fontSize: "0.98rem",
    borderRadius: "0.85rem",
    background:
      "linear-gradient(135deg, rgba(255, 128, 64, 1), rgba(233, 233, 233, 0.85))",
    color: PRIMARY_DARK,
    fontWeight: 600,
    cursor: "pointer",
    textTransform: "none",
    boxShadow: "0 20px 34px rgba(255, 128, 64, 0.35)",
    transition:
      "transform 160ms ease, filter 160ms ease, box-shadow 160ms ease",
    "&:hover": {
      transform: "translateY(-2px)",
      filter: "brightness(1.05)",
      boxShadow: "0 24px 40px rgba(255, 128, 64, 0.45)",
    },
    "&.Mui-disabled": {
      cursor: "not-allowed",
      filter: "grayscale(0.3)",
      opacity: 0.65,
    },
  },
  feedback: {
    margin: 0,
    marginLeft: "0.5rem",
    color: "rgba(233, 233, 233, 0.7)",
    fontSize: "0.85rem",
  },
  sidebarCard: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    background:
      "linear-gradient(155deg, rgba(0, 27, 183, 0.9), rgba(0, 70, 255, 0.78))",
    borderRadius: "1.25rem",
    padding: "1.35rem",
    boxShadow: "0 32px 60px rgba(0, 27, 183, 0.48)",
    border: "1px solid rgba(233, 233, 233, 0.18)",
    maxHeight: "65vh",
    overflow: "hidden",
  },
  cityHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  },
  cityTitle: {
    margin: 0,
    fontSize: "1.5rem",
    fontWeight: 700,
    color: LIGHT,
  },
  citySubtitle: {
    margin: 0,
    fontSize: "0.95rem",
    color: "rgba(233, 233, 233, 0.72)",
  },
  cityBlurb: {
    margin: 0,
    fontSize: "0.95rem",
    color: "rgba(233, 233, 233, 0.78)",
    lineHeight: 1.5,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    overflow: "auto",
    paddingRight: "0.35rem",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "rgba(233, 233, 233, 0.75)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  sectionSubtitle: {
    margin: "0 0 0.4rem",
    fontSize: "0.9rem",
    fontWeight: 600,
    color: LIGHT,
  },
  listColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    overflowY: "auto",
    maxHeight: "30vh",
    paddingRight: "0.35rem",
    scrollBehavior: "smooth",
    scrollbarWidth: "thin",
    scrollbarColor: "rgba(148, 163, 184, 0.4) transparent",
    "&::-webkit-scrollbar": {
      width: "6px",
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: "rgba(233, 233, 233, 0.35)",
      borderRadius: "999px",
    },
  },
  listButton: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "0.2rem",
    padding: "0.85rem 1rem",
    borderRadius: "1rem",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(233, 233, 233, 0.2)",
    background:
      "linear-gradient(140deg, rgba(0, 27, 183, 0.42), rgba(0, 70, 255, 0.35))",
    color: LIGHT,
    cursor: "pointer",
    textTransform: "none",
    transition:
      "border-color 150ms ease, background 200ms ease, transform 160ms ease",
    outline: "none",
    "&:hover": {
      borderColor: "rgba(233, 233, 233, 0.45)",
      background:
        "linear-gradient(140deg, rgba(0, 27, 183, 0.65), rgba(0, 70, 255, 0.5))",
      transform: "translateY(-1px)",
    },
    "&.Mui-focusVisible": {
      borderColor: "rgba(233, 233, 233, 0.75)",
      boxShadow: "0 0 0 2px rgba(0, 70, 255, 0.35)",
    },
  },
  listButtonActive: {
    borderColor: "rgba(255, 128, 64, 0.9)",
    background:
      "linear-gradient(135deg, rgba(255, 128, 64, 0.6), rgba(255, 128, 64, 0.35))",
    transform: "translateY(-1.5px) scale(1.02)",
    boxShadow: "0 16px 30px rgba(255, 128, 64, 0.28)",
  },
  listButtonTitle: {
    fontSize: "0.98rem",
    fontWeight: 700,
    color: LIGHT,
    letterSpacing: "0.01em",
    padding: "16px",
  },
  listButtonSubtitle: {
    fontSize: "0.82rem",
    color: "rgba(233, 233, 233, 0.7)",
    letterSpacing: "0.01em",
  },
  bulletList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  bulletItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.2rem",
    padding: "0.6rem 0.7rem",
    borderRadius: "0.6rem",
    backgroundColor: "rgba(0, 27, 183, 0.35)",
  },
  bulletMeta: {
    fontSize: "0.8rem",
    color: "rgba(233, 233, 233, 0.7)",
  },
  listItemPrimary: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: LIGHT,
    display: "block",
  },
}));
