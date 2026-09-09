import { Box } from '@mui/material';
import Hero from '../components/home/Hero';
import CategoryStrip from '../components/home/CategoryStrip';
import ProductRail from '../components/home/ProductRail';
import BrandStory from '../components/home/BrandStory';
import WhyChooseUs from '../components/home/WhyChooseUs';
import CustomerReviews from '../components/home/CustomerReviews';
import ContourDivider from '../components/common/ContourDivider';
import { featuredProductSlugs, bestSellerSlugs, newArrivalSlugs } from '../data/products';

export default function Home() {
  return (
    <Box>
      <Hero />
      <CategoryStrip />

      <ProductRail
        title="Featured this week"
        subtitle="A short list, curated by hand, changed every Monday."
        slugs={featuredProductSlugs}
        viewAllHref="/category/coffee"
      />

      <ContourDivider />

      <ProductRail
        title="Best sellers"
        subtitle="What most first-time customers order."
        slugs={bestSellerSlugs}
      />

      <BrandStory />

      <ProductRail title="New arrivals" slugs={newArrivalSlugs} />

      <WhyChooseUs />
      <CustomerReviews />
    </Box>
  );
}
