import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

export default function PageFallback() {
  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="body1" color="text.secondary">
        Učitavanje stranice...
      </Typography>
    </Container>
  );
}
