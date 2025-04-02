import { AppBar, Box, Toolbar, Typography } from "@mui/material";

import { AgentStatus } from "./components/AgentStatus";
import { Chat } from "./components/Chat";
import { ConnectionSettings } from "./components/ConnectionSettings";
import { ContextChain } from "./components/ContextChain";
import { Events } from "./components/Events";
import { GridLayout } from "./components/GridLayout";
import { Pipeline } from "./components/Pipeline";
import { MonitorProvider } from "./contexts/MonitorProvider";
import { ThemeProvider } from "./theme/ThemeProvider";

function AppContent() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "auto",
        minHeight: "100vh",
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden"
      }}
    >
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider"
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            Maiar Agent Monitor
          </Typography>
          <ConnectionSettings />
        </Toolbar>
      </AppBar>
      <Toolbar /> {/* Spacer for fixed AppBar */}
      <GridLayout
        children={{
          status: <AgentStatus />,
          pipeline: <Pipeline />,
          contextChain: <ContextChain />,
          chat: <Chat />,
          events: <Events />
        }}
      />
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider>
      <MonitorProvider>
        <AppContent />
      </MonitorProvider>
    </ThemeProvider>
  );
}

export default App;
