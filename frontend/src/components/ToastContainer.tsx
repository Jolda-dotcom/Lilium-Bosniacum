import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import type { ToastMessage } from "../types/app";

interface ToastContainerProps {
  messages: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ messages, onRemove }: ToastContainerProps) {
  return (
    <>
      {messages.map((toast, idx) => (
        <Snackbar
          key={toast.id}
          open
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          autoHideDuration={4000}
          onClose={() => onRemove(toast.id)}
          sx={{ mt: `${idx * 6}px` }}
        >
          <Alert
            onClose={() => onRemove(toast.id)}
            severity={toast.type as "success" | "error" | "info" | "warning"}
            variant="filled"
          >
            <Typography component="span" variant="subtitle2" sx={{ display: "block", fontWeight: 700 }}>
              {toast.title}
            </Typography>
            <Typography component="span" variant="body2" sx={{ display: "block" }}>
              {toast.message}
            </Typography>
          </Alert>
        </Snackbar>
      ))}
    </>
  );
}
