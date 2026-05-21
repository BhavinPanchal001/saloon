import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { FadeIn, SectionLabel } from "./Section";

const products = [
  {
    name: "Botanical Glow Serum",
    category: "Skincare",
    price: "RM 240",
    desc: "A concentrated blend of cold-pressed botanicals for instant luminosity.",
    image: "/p1.png",
  },
  {
    name: "Midnight Recovery Oil",
    category: "Treatment",
    price: "RM 320",
    desc: "Restorative facial oil that works with your skin's circadian rhythm.",
    image: "/p2.png",
  },
  {
    name: "Silk Ritual Pillowcase",
    category: "Lifestyle",
    price: "RM 180",
    desc: "100% Mulberry silk to preserve hair health and skin hydration.",
    image: "/p3.png",
  },
  {
    name: "Rose Water Mist",
    category: "Hydration",
    price: "RM 120",
    desc: "Steam-distilled Damask rose petals for a refreshing midday glow.",
    image: "/p4.png",
  },
];

export default function Products() {
  return (
    <section id="products" className="py-16 md:py-24 bg-cream/30 relative overflow-hidden">
      <div className="absolute top-40 right-0 w-[30rem] h-[30rem] rounded-full bg-gold/5 blur-3xl" />
      
      <div className="mx-auto max-w-7xl px-6 relative">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-20">
          <FadeIn>
            <SectionLabel>The Boutique</SectionLabel>
            <h2 className="mt-6 font-display text-5xl md:text-6xl text-primary leading-[1.05]">
              Take the ritual <em className="gold-text not-italic">home.</em>
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="max-w-md text-muted-foreground leading-relaxed">
              Our signature collection of professional-grade formulas and 
              considered essentials, curated by our senior specialists.
            </p>
          </FadeIn>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((p, i) => (
            <FadeIn key={p.name} delay={i * 0.1}>
              <div className="group cursor-pointer">
                <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-white shadow-soft transition-transform duration-500 group-hover:-translate-y-2">
                  <img 
                    src={p.image} 
                    alt={p.name} 
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/5" />
                  
                  <div className="absolute top-4 left-4">
                    <span className="rounded-full bg-white/90 backdrop-blur-md px-3 py-1 text-[10px] uppercase tracking-widest text-primary font-medium border border-gold/10">
                      {p.category}
                    </span>
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-2xl text-primary">{p.name}</h3>
                    <span className="font-display text-lg text-gold">{p.price}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.4} className="mt-20 text-center">
          <Link 
            to="/boutique" 
            className="inline-flex items-center gap-3 text-sm tracking-widest uppercase text-primary hover:text-gold transition-colors group"
          >
            Explore Full Collection 
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-2" />
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}
