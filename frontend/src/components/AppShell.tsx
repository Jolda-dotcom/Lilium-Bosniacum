import type { ReactNode } from "react";
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import { NavLink } from 'react-router-dom';
import RefreshIcon from '@mui/icons-material/Refresh';
import PowerIcon from '@mui/icons-material/Power';
import PowerOffIcon from '@mui/icons-material/PowerOff';
import AddIcon from '@mui/icons-material/Add';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';

interface AppShellProps {
  theme: "light" | "dark";
  loading: boolean;
  refreshAll: () => void;
  handlePowerOnAll: () => void;
  handlePowerOffAll: () => void;
  handleOpenModal: () => void;
  toggleTheme: () => void;
  children: ReactNode;
}

export default function AppShell({
  theme,
  loading,
  refreshAll,
  handlePowerOnAll,
  handlePowerOffAll,
  handleOpenModal,
  toggleTheme,
  children,
}: AppShellProps) {
  return (
    <>
      <AppBar position="fixed" color="default" elevation={3}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Herceg TV Control
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Refresh">
              <Box component="span">
                <IconButton color="inherit" aria-label="refresh" onClick={refreshAll} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Box>
            </Tooltip>
            <Tooltip title="Power On All TVs">
              <Box component="span">
                <Button color="inherit" startIcon={<PowerIcon />} onClick={handlePowerOnAll}>
                  Upali sve
                </Button>
              </Box>
            </Tooltip>
            <Tooltip title="Power Off All TVs">
              <Box component="span">
                <Button color="inherit" startIcon={<PowerOffIcon />} onClick={handlePowerOffAll}>
                  Isključi sve
                </Button>
              </Box>
            </Tooltip>
            <Tooltip title="Add Device">
              <Box component="span">
                <Button color="inherit" startIcon={<AddIcon />} onClick={handleOpenModal}>
                  Dodaj
                </Button>
              </Box>
            </Tooltip>
            <IconButton color="inherit" aria-label="toggle theme" onClick={toggleTheme}>
              {theme === "light" ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box className={`app theme-${theme}`}>
        <Box component="aside" className="sidebar">
          <Typography component="h2">TV Upravljač</Typography>
          <Box className="sidebar-menu">
            <NavLink to="/" end className={({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '')}>
              📊 Početna
            </NavLink>
            <NavLink to="/devices" className={({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '')}>
              📺 Uređaji
            </NavLink>
            <NavLink to="/groups" className={({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '')}>
              👥 Grupe
            </NavLink>
            <NavLink to="/users" className={({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '')}>
              👤 Korisnici
            </NavLink>
            <NavLink to="/audit" className={({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '')}>
              📜 Audit log
            </NavLink>
            <NavLink to="/settings" className={({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '')}>
              ⚙️ Postavke
            </NavLink>
          </Box>
        </Box>

        <Box component="main" className="content">{children}</Box>
      </Box>
    </>
  );
}
