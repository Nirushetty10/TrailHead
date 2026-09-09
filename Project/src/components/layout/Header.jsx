import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Container,
  Stack,
  Typography,
  IconButton,
  Badge,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  InputBase,
  Box,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import { tokens } from '../../theme/theme';
import { categories } from '../../data/categories';

export default function Header() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{ bgcolor: tokens.parchment, color: tokens.espressoBark, borderBottom: '1px solid', borderColor: 'divider' }}
    >
      <Container maxWidth="lg" disableGutters={false}>
        <Toolbar disableGutters sx={{ py: 1.5, gap: 2 }}>
          {isMobile && (
            <IconButton edge="start" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
              <MenuRoundedIcon />
            </IconButton>
          )}

          <Typography
            variant="h6"
            component="a"
            href="/"
            sx={{
              fontFamily: '"Fraunces", serif',
              fontWeight: 700,
              textDecoration: 'none',
              color: 'inherit',
              flexShrink: 0,
            }}
          >
            Chikkamagaluru Coffee Co.
          </Typography>

          {!isMobile && (
            <Stack direction="row" spacing={3} sx={{ ml: 3 }}>
              {categories.map((cat) => (
                <Typography
                  key={cat.slug}
                  component="a"
                  href={`/category/${cat.slug}`}
                  variant="body2"
                  sx={{
                    color: 'inherit',
                    textDecoration: 'none',
                    fontWeight: 500,
                    '&:hover': { color: tokens.mistySage },
                  }}
                >
                  {cat.name}
                </Typography>
              ))}
            </Stack>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {!isMobile && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                px: 1.5,
                py: 0.5,
                width: 240,
              }}
            >
              <SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              <InputBase placeholder="Search coffee, honey…" fullWidth sx={{ fontSize: 14 }} />
            </Stack>
          )}

          <Stack direction="row" spacing={0.5}>
            {isMobile && (
              <IconButton aria-label="Search">
                <SearchRoundedIcon />
              </IconButton>
            )}
            <IconButton aria-label="Wishlist" href="/wishlist">
              <FavoriteBorderRoundedIcon />
            </IconButton>
            <IconButton aria-label="Cart" href="/cart">
              <Badge badgeContent={2} sx={{ '& .MuiBadge-badge': { bgcolor: tokens.marigold, color: tokens.espressoBark } }}>
                <ShoppingBagOutlinedIcon />
              </Badge>
            </IconButton>
            <IconButton aria-label="Account" href="/account">
              <PersonOutlineRoundedIcon />
            </IconButton>
          </Stack>
        </Toolbar>
      </Container>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 260, pt: 2 }} role="presentation">
          <Typography sx={{ px: 2, pb: 1, fontFamily: '"Fraunces", serif', fontWeight: 700 }}>
            Chikkamagaluru Coffee Co.
          </Typography>
          <List>
            {categories.map((cat) => (
              <ListItemButton key={cat.slug} component="a" href={`/category/${cat.slug}`}>
                <ListItemText primary={cat.name} secondary={cat.tagline} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}
