import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { fetchJson } from "../utils/api";
import { useAuth } from "../hooks/useAuth";

interface UserListItem {
  id: number;
  username: string;
  role: string;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

const baseUrl = "";

export default function UsersPage() {
  const { authenticated, loading: authLoading, user } = useAuth(baseUrl);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<"admin" | "viewer">("viewer");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<UserListItem | null>(null);
  const [passwordValue, setPasswordValue] = useState("");
  const [deleteUser, setDeleteUser] = useState<UserListItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchJson<UserListItem[]>(`${baseUrl}/auth/users`, {
        credentials: "include",
      });
      setUsers(data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authenticated || user?.role !== "admin") {
      return;
    }

    let active = true;

    const refresh = async () => {
      await loadUsers();
      if (!active) {
        return;
      }
    };

    void refresh();

    return () => {
      active = false;
    };
  }, [authenticated, user?.role, loadUsers]);

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createUsername.trim() || !createPassword) {
      setError("Username and password are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const created = await fetchJson<UserListItem>(`${baseUrl}/auth/users`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: createUsername.trim(),
          password: createPassword,
          role: createRole,
        }),
      });

      setUsers((current) => [created, ...current].sort((left, right) => left.username.localeCompare(right.username)));
      setCreateOpen(false);
      setCreateUsername("");
      setCreatePassword("");
      setCreateRole("viewer");
      setNotice(`Korisnik ${created.username} je dodan.`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      await fetchJson(`${baseUrl}/auth/users/${deleteUser.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setUsers((current) => current.filter((item) => item.id !== deleteUser.id));
      setDeleteUser(null);
      setNotice(`Korisnik ${deleteUser.username} je obrisan.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passwordUser || !passwordValue) {
      setError("Password is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      await fetchJson(`${baseUrl}/auth/users/${passwordUser.id}/password`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: passwordValue }),
      });
      setPasswordOpen(false);
      setPasswordUser(null);
      setPasswordValue("");
      setNotice(`Lozinka za ${passwordUser.username} je ažurirana.`);
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : "Unable to update password.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!authenticated || user?.role !== "admin") {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Only administrators can access this page.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Korisnici
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Upravljanje korisnicima i pristupom aplikaciji.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {notice && <Alert severity="success">{notice}</Alert>}

        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6">Lista korisnika</Typography>
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              Dodaj korisnika
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : users.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              Nema korisnika.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Korisnik</TableCell>
                    <TableCell>Uloga</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Akcije</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>{item.username}</TableCell>
                      <TableCell>{item.role}</TableCell>
                      <TableCell>{item.is_active ? "Aktivan" : "Neaktivan"}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                          <Button size="small" variant="outlined" onClick={() => {
                            setPasswordUser(item);
                            setPasswordOpen(true);
                          }}>
                            Lozinka
                          </Button>
                          <Button size="small" color="error" variant="outlined" onClick={() => setDeleteUser(item)}>
                            Obriši
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Stack>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Dodaj korisnika</DialogTitle>
        <Box component="form" onSubmit={handleCreateUser}>
          <DialogContent sx={{ display: "grid", gap: 2 }}>
            <TextField
              label="Korisničko ime"
              value={createUsername}
              onChange={(event) => setCreateUsername(event.target.value)}
              autoFocus
              required
            />
            <TextField
              label="Lozinka"
              type="password"
              value={createPassword}
              onChange={(event) => setCreatePassword(event.target.value)}
              required
            />
            <FormControl fullWidth>
              <InputLabel id="user-role-select-label">Uloga</InputLabel>
              <Select
                labelId="user-role-select-label"
                label="Uloga"
                value={createRole}
                onChange={(event) => setCreateRole(event.target.value as "admin" | "viewer")}
              >
                <MenuItem value="viewer">Viewer</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Otkaži</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? "Spremanje..." : "Spremi"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={passwordOpen} onClose={() => setPasswordOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Promijeni lozinku</DialogTitle>
        <Box component="form" onSubmit={handlePasswordUpdate}>
          <DialogContent>
            <TextField
              label={`Nova lozinka za ${passwordUser?.username || "korisnika"}`}
              type="password"
              value={passwordValue}
              onChange={(event) => setPasswordValue(event.target.value)}
              fullWidth
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPasswordOpen(false)}>Otkaži</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? "Spremanje..." : "Spremi"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(deleteUser)} onClose={() => setDeleteUser(null)}>
        <DialogTitle>Obriši korisnika</DialogTitle>
        <DialogContent>
          <Typography>
            Želite li obrisati korisnika {deleteUser?.username}? Ova akcija je nepovratna.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteUser(null)}>Otkaži</Button>
          <Button color="error" variant="contained" onClick={handleDeleteUser} disabled={submitting}>
            {submitting ? "Brisanje..." : "Obriši"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
