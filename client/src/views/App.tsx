import { Box } from "@mui/material";

import GlobeViewer from "@/components/GlobeViewer/GlobeViewer";
import Sidebar from "@/components/Sidebar/Sidebar";
import SearchBar from "@/components/SearchBar/SearchBar";
import { useAppStyles } from "@/styles/useAppStyles";
import { CityExplorerProvider } from "@/context/CityExplorerContext";
import FloatingAssistant from "@/components/Assistant/FloatingAssistant";

const App = () => {
  const { classes } = useAppStyles();

  return (
    <Box component="main" className={classes.appShell}>
      <Box className={classes.viewerShell}>
        <CityExplorerProvider>
          <GlobeViewer />
          <Box className={classes.overlay}>
            <SearchBar />
            <Sidebar />
          </Box>
          <FloatingAssistant />
        </CityExplorerProvider>
      </Box>
    </Box>
  );
};

export default App;
