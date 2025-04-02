import { useContext } from "react";

import { MonitorContext } from "../contexts/MonitorContext";

// Hook to use the monitor context
export function useMonitor() {
  const context = useContext(MonitorContext);
  if (!context) {
    throw new Error("useMonitor must be used within a MonitorProvider");
  }
  return context;
}
