import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';

interface AppPageContentProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export default function AppPageContent({ title, description, children }: AppPageContentProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Container maxWidth={false} disableGutters sx={{ px: 0 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: description ? 0.5 : 0 }}>
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        ) : null}
      </Container>
      {children}
    </Box>
  );
}
