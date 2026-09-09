import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme/theme';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Header />
      {/* React Router will replace this direct render once further pages
          (category, product detail, cart, checkout, account) are built. */}
      <Home />
      <Footer />
    </ThemeProvider>
  );
}
