import {
  Navigation,
  Hero,
  LogoCloud,
  BentoFeatures,
  ProductShowcase,
  Stats,
  Testimonials,
  Pricing,
  FAQ,
  CTA,
  Footer,
} from './sections';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#000000] text-white antialiased selection:bg-blue-500/20 selection:text-white overflow-x-hidden">
      <Navigation />
      <Hero />
      <LogoCloud />
      <BentoFeatures />
      <ProductShowcase />
      <Stats />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}
