import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { FadeIn, SectionLabel } from "@/components/Section";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const Route = createFileRoute("/boutique")({
  component: Boutique,
});

const fullCollection = [
  {
    name: "Exfoliating Silk Mitt",
    category: "Accessories",
    price: "RM 85",
    desc: "100% cocoon silk for gentle but effective full-body exfoliation.",
    image: "/p5.png",
  },
  {
    name: "Gold Infused Mask",
    category: "Treatment",
    price: "RM 450",
    desc: "A rich, gold-flecked cream mask for deep nourishment and radiance.",
    image: "/p6.png",
  },
  {
    name: "Neroli Body Butter",
    category: "Body Care",
    price: "RM 210",
    desc: "Whipped shea butter infused with pure neroli and orange blossom.",
    image: "/p7.png",
  },
  {
    name: "Quietude Room Spray",
    category: "Home",
    price: "RM 140",
    desc: "A calming mist of lavender, cedarwood, and soft jasmine.",
    image: "/p8.png",
  },
  {
    name: "Bamboo Charcoal Cleanser",
    category: "Skincare",
    price: "RM 190",
    desc: "Deep-cleaning gel that draws out impurities without stripping moisture.",
    image: "/p9.png",
  },
  {
    name: "Vitamin C Elixir",
    category: "Serum",
    price: "RM 280",
    desc: "High-potency antioxidant serum for bright, even-toned skin.",
    image: "/p10.png",
  },
  {
    name: "Hand-Blended Herbal Tea",
    category: "Wellness",
    price: "RM 65",
    desc: "A soothing blend of dried rose, chamomile, and lemon balm.",
    image: "/p11.png",
  },
  {
    name: "Sandalwood Beard Oil",
    category: "Men's Care",
    price: "RM 150",
    desc: "Nourishing oil with a warm, woody scent for a softened beard.",
    image: "/p12.png",
  },
];

function Boutique() {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden pt-20">
      <Navbar />
      
      <section className="py-24 relative overflow-hidden">
        <div className="absolute top-20 -left-20 w-[30rem] h-[30rem] rounded-full bg-gold/5 blur-3xl" />
        
        <div className="mx-auto max-w-7xl px-6 relative">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-12"
          >
            <ArrowLeft size={14} /> Back to Home
          </Link>

          <div className="max-w-3xl mb-20">
            <SectionLabel>The Full Collection</SectionLabel>
            <h1 className="mt-6 font-display text-6xl md:text-7xl text-primary leading-[1.05]">
              Curated rituals for <em className="gold-text not-italic">every moment.</em>
            </h1>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
              Explore our complete range of professional-grade formulas, botanical 
              skincare, and considered lifestyle essentials. Each piece is hand-selected 
              to bring the Glowy sanctuary experience into your home.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
            {fullCollection.map((p, i) => (
              <FadeIn key={p.name} delay={i * 0.05}>
                <div className="group">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-white shadow-soft transition-transform duration-500 group-hover:-translate-y-2">
                    <img 
                      src={p.image} 
                      alt={p.name} 
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/5" />
                    
                    <div className="absolute top-5 left-5">
                      <span className="rounded-full bg-white/90 backdrop-blur-md px-4 py-1.5 text-[10px] uppercase tracking-widest text-primary font-medium border border-gold/10 shadow-sm">
                        {p.category}
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-3xl text-primary">{p.name}</h3>
                      <span className="font-display text-xl text-gold">{p.price}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
