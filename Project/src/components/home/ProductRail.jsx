import { Container, Grid, Typography, Stack, Button } from '@mui/material';
import { products as allProducts } from '../../data/products';
import ProductCard from '../common/ProductCard';

/**
 * @param {{ title: string, subtitle?: string, slugs: string[], viewAllHref?: string }} props
 */
export default function ProductRail({ title, subtitle, slugs, viewAllHref }) {
  const items = slugs
    .map((slug) => allProducts.find((p) => p.slug === slug))
    .filter(Boolean);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-end"
        sx={{ mb: 3 }}
        flexWrap="wrap"
      >
        <div>
          <Typography variant="h3" sx={{ fontSize: { xs: '1.7rem', md: '2rem' } }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </div>
        {viewAllHref && (
          <Button href={viewAllHref} sx={{ fontWeight: 600 }}>
            View all
          </Button>
        )}
      </Stack>

      <Grid container spacing={2.5}>
        {items.map((product) => (
          <Grid size={{ xs: 6, sm: 4, md: 3 }} key={product.id}>
            <ProductCard product={product} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
