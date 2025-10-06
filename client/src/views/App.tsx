import { Box } from "@mui/material";

import GlobeViewer from "@/components/GlobeViewer/GlobeViewer";
import Sidebar from "@/components/Sidebar/Sidebar";
import SearchBar from "@/components/SearchBar/SearchBar";
import { useAppStyles } from "@/styles/useAppStyles";
import { CityExplorerProvider } from "@/context/CityExplorerContext";
import { AuthProvider } from "@/context/AuthContext";
import FloatingAssistant from "@/components/Assistant/FloatingAssistant";
import AuthLauncher from "@/components/Auth/AuthLauncher";

const App = () => {
  const { classes } = useAppStyles();

  return (
    <Box component="main" className={classes.appShell}>
      <Box className={classes.viewerShell}>
        <AuthProvider>
          <CityExplorerProvider>
            <GlobeViewer />
            <Box className={classes.overlay}>
              <AuthLauncher />
              <SearchBar />
              <Sidebar />
            </Box>
            <FloatingAssistant />
          </CityExplorerProvider>
        </AuthProvider>
      </Box>
    </Box>
  );
};

export default App;
