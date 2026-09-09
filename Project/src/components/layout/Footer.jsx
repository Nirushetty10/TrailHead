import { Box, Container, Grid, Stack, Typography, TextField, Button } from '@mui/material';
import { tokens } from '../../theme/theme';
import { categories } from '../../data/categories';
import ContourDivider from '../common/ContourDivider';

const helpLinks = [
  { label: 'Track your order', href: '/account/orders' },
  { label: 'Shipping information', href: '/help/shipping' },
  { label: 'Returns & exchanges', href: '/help/returns' },
  { label: 'FAQs', href: '/help/faq' },
  { label: 'Contact us', href: '/help/contact' },
];

const companyLinks = [
  { label: 'Our story', href: '/about' },
  { label: 'The estates', href: '/about/estates' },
  { label: 'Sustainability', href: '/about/sustainability' },
  { label: 'Reviews', href: '/reviews' },
];

export default function Footer() {
  return (
    <Box component="footer" sx={{ bgcolor: tokens.deepForest, color: tokens.parchment, mt: 10 }}>
      <ContourDivider tone="dark" flip />

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Grid container spacing={5}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="h5" sx={{ fontFamily: '"Fraunces", serif', mb: 1.5 }}>
              Chikkamagaluru Coffee Co.
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, maxWidth: 320 }}>
              Coffee, honey and pepper grown on the same hills where the Baba Budangiri
              range meets the monsoon — packed and shipped from Chikkamagaluru, Karnataka.
            </Typography>
          </Grid>

          <Grid size={{ xs: 6, md: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
              Shop
            </Typography>
            <Stack spacing={1}>
              {categories.map((cat) => (
                <Typography
                  key={cat.slug}
                  component="a"
                  href={`/category/${cat.slug}`}
                  variant="body2"
                  sx={{ color: 'inherit', opacity: 0.8, textDecoration: 'none', '&:hover': { opacity: 1 } }}
                >
                  {cat.name}
                </Typography>
              ))}
            </Stack>
          </Grid>

          <Grid size={{ xs: 6, md: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
              Help
            </Typography>
            <Stack spacing={1}>
              {helpLinks.map((link) => (
                <Typography
                  key={link.href}
                  component="a"
                  href={link.href}
                  variant="body2"
                  sx={{ color: 'inherit', opacity: 0.8, textDecoration: 'none', '&:hover': { opacity: 1 } }}
                >
                  {link.label}
                </Typography>
              ))}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
              Get harvest updates
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 1.5 }}>
              One email a season — new harvests, gift collections, nothing else.
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                placeholder="you@example.com"
                variant="outlined"
                fullWidth
                sx={{
                  bgcolor: tokens.parchment,
                  borderRadius: 1,
                  '& .MuiOutlinedInput-root': { borderRadius: 1 },
                }}
              />
              <Button
                variant="contained"
                sx={{ bgcolor: tokens.marigold, color: tokens.espressoBark, '&:hover': { bgcolor: '#c99433' }, flexShrink: 0 }}
              >
                Subscribe
              </Button>
            </Stack>
          </Grid>
        </Grid>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={1}
          sx={{ mt: 6, pt: 3, borderTop: '1px solid rgba(237,232,222,0.15)' }}
        >
          <Typography variant="body2" sx={{ opacity: 0.65 }}>
            © {new Date().getFullYear()} Chikkamagaluru Coffee Co. All rights reserved.
          </Typography>
          <Stack direction="row" spacing={1}>
            {companyLinks.map((link) => (
              <Typography
                key={link.href}
                component="a"
                href={link.href}
                variant="body2"
                sx={{ color: 'inherit', opacity: 0.65, textDecoration: 'none', '&:hover': { opacity: 1 } }}
              >
                {link.label}
              </Typography>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
