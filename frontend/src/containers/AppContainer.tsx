import { Suspense, lazy } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import AppLayout from "../components/AppLayout";
import AppGlobalUI from "../components/AppGlobalUI";
import { useAppContainer } from "../hooks/useAppContainer";
import {
  formatPowerText,
  formatStatusText,
} from "../utils/device";
import {
  getActionLabel,
  getAvailableActionsForDevice,
} from "../utils/schedule";

const DashboardPage = lazy(() => import("../components/Dashboard"));
const DevicesPage = lazy(() => import("../components/Devices"));
const GroupsPage = lazy(() => import("../components/Groups"));
const AuditPage = lazy(() => import("../components/Audit"));
const SettingsPage = lazy(() => import("../components/Settings"));

export default function AppContainer() {
  const {
    activePage,
    muiTheme,
    pageFallback,
    appLayoutProps,
    pageContentProps: {
      dashboardProps,
      groupsProps,
      auditProps,
      settingsProps,
      devicesProps,
    },
    globalUIProps,
  } = useAppContainer();

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <AppLayout {...appLayoutProps}>
        {activePage === "dashboard" && (
          <Suspense fallback={pageFallback}>
            <DashboardPage {...dashboardProps} />
          </Suspense>
        )}
        {activePage === "groups" && (
          <Suspense fallback={pageFallback}>
            <GroupsPage {...groupsProps} />
          </Suspense>
        )}
        {activePage === "audit" && (
          <Suspense fallback={pageFallback}>
            <AuditPage {...auditProps} />
          </Suspense>
        )}
        {activePage === "settings" && (
          <Suspense fallback={pageFallback}>
            <SettingsPage {...settingsProps} />
          </Suspense>
        )}
        {activePage === "devices" && (
          <Suspense fallback={pageFallback}>
            <DevicesPage
              {...devicesProps}
              formatPowerText={formatPowerText}
              formatStatusText={formatStatusText}
              getAvailableActionsForDevice={getAvailableActionsForDevice}
              getActionLabel={getActionLabel}
            />
          </Suspense>
        )}
        {activePage === "notfound" && (
          <Container maxWidth="sm" sx={{ py: 6 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>404 - Stranica nije pronadena</Typography>
            <Typography variant="body1" color="text.secondary">Stranica koju trašiš ne postoji.</Typography>
          </Container>
        )}

        <AppGlobalUI {...globalUIProps} />
      </AppLayout>
    </ThemeProvider>
  );
}
