import { Container, Grid, Typography, Stack, Box } from '@mui/material';
import { tokens } from '../../theme/theme';
import Rating from '../common/Rating';

const reviews = [
  {
    name: 'Ananya R., Bengaluru',
    rating: 5,
    text: "The estate arabica genuinely tastes different from what I've had before — much less bitter, and it arrived within four days of roasting.",
    product: 'Chikkamagaluru Estate Arabica',
  },
  {
    name: 'Vikram S., Mumbai',
    rating: 5,
    text: 'Sent the gift box to my parents for their anniversary. The packaging alone made it feel premium, and the coffee held up.',
    product: "Coffee Lover's Gift Box",
  },
  {
    name: 'Meera K., Chennai',
    rating: 4,
    text: 'Honey crystallised within a few weeks which threw me off at first, but that turned out to be a sign it was actually raw and unfiltered.',
    product: 'Wild Forest Honey',
  },
];

export default function CustomerReviews() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
      <Typography variant="h3" sx={{ fontSize: { xs: '1.8rem', md: '2.2rem' }, mb: 4 }}>
        What customers are saying
      </Typography>
      <Grid container spacing={3}>
        {reviews.map((review) => (
          <Grid size={{ xs: 12, md: 4 }} key={review.name}>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 3,
                height: '100%',
                bgcolor: 'background.paper',
              }}
            >
              <Stack spacing={1.5} sx={{ height: '100%' }}>
                <Rating value={review.rating} />
                <Typography variant="body1" sx={{ flexGrow: 1 }}>
                  "{review.text}"
                </Typography>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {review.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: tokens.mistySage }}>
                    Verified purchase — {review.product}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
