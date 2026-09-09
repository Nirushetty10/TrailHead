import { Box, Container, Grid, Typography, Stack } from '@mui/material';
import { tokens } from '../../theme/theme';
import ContourDivider from '../common/ContourDivider';

export default function BrandStory() {
  return (
    <Box sx={{ bgcolor: tokens.deepForest, color: tokens.parchment }}>
      <ContourDivider tone="dark" />
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
        <Grid container spacing={{ xs: 4, md: 8 }} alignItems="center">
          <Grid size={{ xs: 12, md: 5 }}>
            <Box
              sx={{
                aspectRatio: '4 / 5',
                borderRadius: 1,
                background: `linear-gradient(200deg, ${tokens.marigold} 0%, ${tokens.espressoBark} 100%)`,
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography variant="body2" sx={{ color: tokens.marigold, fontWeight: 600, mb: 1.5 }}>
              Since 2014
            </Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.4rem' }, mb: 2.5, maxWidth: 560 }}>
              We still pick, dry and sort on the same estate we started with.
            </Typography>
            <Stack spacing={2} sx={{ maxWidth: 560 }}>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Chikkamagaluru Coffee Co. began with a single 12-acre plot on the
                slopes of Mullayanagiri, where three generations of the same family
                have grown coffee under a canopy of silver oak and jackfruit trees.
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Today we work with eleven neighbouring estates across Chikkamagaluru
                and Coorg, paying growers directly and roasting every batch within a
                week of harvest — never longer.
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
