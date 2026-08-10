import AppContainer from "../containers/AppContainer";
import LoginPage from "./LoginPage";
import { useAuth } from "../hooks/useAuth";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";

export default function AuthGate() {
  const { authenticated, loading, checkingSession, error, login } = useAuth();

  if (checkingSession) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
          backgroundColor: "background.default",
        }}
      >
        <Paper sx={{ p: 4, borderRadius: 3, boxShadow: 3, textAlign: "center" }}>
          <CircularProgress size={36} sx={{ mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
            Provjeravam tvoju sesiju...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Molim pričekaj dok se sesija ponovno učitava.
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (!authenticated) {
    return <LoginPage onLogin={login} loading={loading} error={error} />;
  }

  return <AppContainer />;
}
