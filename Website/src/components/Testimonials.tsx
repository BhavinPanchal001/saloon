import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import t1 from "@/assets/t1.jpg";
import t2 from "@/assets/t2.jpg";
import t3 from "@/assets/t3.jpg";
import { FadeIn, SectionLabel } from "./Section";

const testimonials = [
  { name: "Elena Marchetti", role: "Editor, Beauté", img: t1, rating: 5,
    quote: "Walking into Glowy feels like sunlight through silk. Every service is composed with intention — I leave glowing inside and out." },
  { name: "Mei Tan", role: "Architect", img: t2, rating: 5,
    quote: "The level of personalization is unmatched. They listen, they refine, and they deliver something that feels exquisitely mine." },
  { name: "Priya Iyer", role: "Brand Director", img: t3, rating: 5,
    quote: "From the bridal trial to the big day — pure poetry. Glowy gave me the most luminous version of myself I've ever met." },
];

export default function Testimonials() {
  const [i, setI] = useState(0);
  const t = testimonials[i];
  const go = (d: number) => setI((p) => (p + d + testimonials.length) % testimonials.length);

  return (
    <section id="testimonials" className="py-32 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60rem] h-[60rem] rounded-full bg-gold/10 blur-3xl -z-10" />
      <div className="mx-auto max-w-5xl px-6 text-center">
        <FadeIn>
          <SectionLabel>Testimonials</SectionLabel>
          <h2 className="mt-6 font-display text-5xl md:text-6xl text-primary leading-[1.05]">
            Loved by those who <em className="gold-text not-italic">glow.</em>
          </h2>
        </FadeIn>

        <div className="mt-16 relative">
          <Quote className="mx-auto text-gold/50" size={48} />
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="mt-8"
            >
              <p className="font-display text-2xl md:text-3xl text-primary leading-relaxed text-balance max-w-3xl mx-auto italic">
                "{t.quote}"
              </p>
              <div className="mt-10 flex flex-col items-center gap-3">
                <img src={t.img} alt={t.name} loading="lazy" className="h-16 w-16 rounded-full object-cover ring-2 ring-gold/40 ring-offset-4 ring-offset-background" />
                <div className="text-gold text-sm">{"★".repeat(t.rating)}</div>
                <div>
                  <div className="text-primary">{t.name}</div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{t.role}</div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 flex justify-center gap-3">
            <button onClick={() => go(-1)} className="h-11 w-11 rounded-full border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors flex items-center justify-center" aria-label="Previous">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => go(1)} className="h-11 w-11 rounded-full border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors flex items-center justify-center" aria-label="Next">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
