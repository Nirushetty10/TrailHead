import { Container, Grid, Typography, Stack, Box } from '@mui/material';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import Grade4OutlinedIcon from '@mui/icons-material/Grade';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import AgricultureOutlinedIcon from '@mui/icons-material/AgricultureOutlined';
import { tokens } from '../../theme/theme';

const points = [
  {
    icon: AgricultureOutlinedIcon,
    title: 'Bought direct from eleven estates',
    body: 'No auction houses, no middlemen — we pay growers in Chikkamagaluru and Coorg directly.',
  },
  {
    icon: Grade4OutlinedIcon,
    title: 'Roasted after you order',
    body: 'Coffee is roasted within 48 hours of dispatch, not months ahead in bulk.',
  },
  {
    icon: VerifiedOutlinedIcon,
    title: 'Lab-tested for purity',
    body: 'Every batch of honey and pepper is tested for adulteration before it ships.',
  },
  {
    icon: LocalShippingOutlinedIcon,
    title: 'Free shipping above ₹999',
    body: 'Delivered in 3–6 business days across India, tracked door to door.',
  },
];

export default function WhyChooseUs() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
      <Typography variant="h3" sx={{ fontSize: { xs: '1.8rem', md: '2.2rem' }, mb: 4, maxWidth: 520 }}>
        Why people order from us more than once
      </Typography>
      <Grid container spacing={4}>
        {points.map((point) => {
          const Icon = point.icon;
          return (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={point.title}>
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    bgcolor: tokens.parchment,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon sx={{ color: tokens.deepForest }} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {point.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {point.body}
                </Typography>
              </Stack>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
}
