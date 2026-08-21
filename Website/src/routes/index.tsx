import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Mission from "@/components/Mission";
import Services from "@/components/Services";
import WhyUs from "@/components/WhyUs";
// import Gallery from "@/components/Gallery";
// import Testimonials from "@/components/Testimonials";
import Pricing from "@/components/Pricing";
import Products from "@/components/Products";
import Booking from "@/components/Booking";

import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Glowy — Glow To Go With Glowy | Luxury Beauty Salon" },
      { name: "description", content: "Glowy is a soft-luxury beauty salon offering hair, skin, makeup, nails and bridal rituals. Quiet care, botanical-first, beautifully composed." },
      { property: "og:title", content: "Glowy — Luxury Beauty Salon" },
      { property: "og:description", content: "A sanctuary of soft light and premium beauty rituals. Glow To Go With Glowy." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <Hero />
      <About />
      <Mission />
      <Services />
      <WhyUs />
      {/* <Gallery /> */}
      {/* <Testimonials /> */}
      <Pricing />
      <Products />
      <Booking />

      <Newsletter />
      <Footer />
      <Toaster position="top-center" />
    </main>
  );
}
