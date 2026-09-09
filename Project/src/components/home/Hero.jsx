import { Box, Container, Grid, Typography, Button, Stack } from '@mui/material';
import { motion } from 'framer-motion';
import { tokens } from '../../theme/theme';

export default function Hero() {
  return (
    <Box sx={{ position: 'relative', bgcolor: tokens.parchment, overflow: 'hidden' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 0 } }}>
        <Grid container spacing={0} alignItems="stretch">
          <Grid
            size={{ xs: 12, md: 6 }}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              py: { xs: 2, md: 10 },
              pr: { md: 6 },
              zIndex: 2,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <Typography variant="body2" sx={{ color: tokens.mistySage, fontWeight: 600, mb: 2 }}>
                Mullayanagiri Estate, 1,200m
              </Typography>
              <Typography
                variant="h1"
                sx={{ fontSize: { xs: '2.4rem', md: '3.4rem' }, mb: 3, maxWidth: 480 }}
              >
                Coffee that still tastes like the hill it grew on.
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 420, mb: 4 }}>
                Roasted in small batches within days of picking, from the shade-grown
                estates of Chikkamagaluru — where the Western Ghats meet the monsoon.
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  href="/category/coffee"
                  sx={{ bgcolor: tokens.deepForest, '&:hover': { bgcolor: tokens.espressoBark } }}
                >
                  Shop coffee
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  href="/about"
                  sx={{ borderColor: tokens.espressoBark, color: tokens.espressoBark }}
                >
                  Our story
                </Button>
              </Stack>
            </motion.div>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }} sx={{ position: 'relative', minHeight: { xs: 320, md: 560 } }}>
            <motion.div
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(150deg, ${tokens.mistySage} 0%, ${tokens.deepForest} 60%, ${tokens.espressoBark} 100%)`,
                margin: 'auto',
                width: '110%',
                left: '-5%',
              }}
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
