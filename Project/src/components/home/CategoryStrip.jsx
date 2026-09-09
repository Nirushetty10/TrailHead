import { Box, Container, Grid, Typography, Stack } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { tokens } from '../../theme/theme';
import { categories } from '../../data/categories';

export default function CategoryStrip() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontSize: { xs: '1.8rem', md: '2.2rem' } }}>
          Shop by category
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        {categories.map((cat, i) => (
          <Grid size={{ xs: 6, sm: 4, md: 3 }} key={cat.slug}>
            <Box
              component="a"
              href={`/category/${cat.slug}`}
              sx={{
                textDecoration: 'none',
                color: 'inherit',
                position: 'relative',
                aspectRatio: '3 / 4',
                borderRadius: 1,
                overflow: 'hidden',
                background: `linear-gradient(200deg, ${
                  i % 2 === 0 ? tokens.mistySage : tokens.marigold
                } 0%, ${tokens.espressoBark} 130%)`,
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                transition: 'transform 200ms ease',
                '&:hover': { transform: 'translateY(-4px)' },
              }}
            >
              <Typography variant="h6" sx={{ color: tokens.ivory, mb: 0.25 }}>
                {cat.name}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="body2" sx={{ color: tokens.parchment, opacity: 0.9 }}>
                  {cat.tagline}
                </Typography>
                <ArrowForwardRoundedIcon sx={{ fontSize: 15, color: tokens.parchment }} />
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
