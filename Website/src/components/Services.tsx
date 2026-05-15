import { useState } from "react";
import { Scissors, Sparkles, Brush, Droplets, Flower2, Hand, Crown, ArrowUpRight, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn, SectionLabel } from "./Section";
import g2 from "@/assets/g2.jpg";
import g3 from "@/assets/g3.jpg";
import g4 from "@/assets/g4.jpg";
import g5 from "@/assets/g5.jpg";
import g1 from "@/assets/g1.jpg";
import g6 from "@/assets/g6.jpg";
import hero from "@/assets/hero.jpg";

const services = [
  { icon: Scissors, title: "Hair Styling", desc: "Precision cuts, soft layers, editorial blowouts.", duration: "60–90 min", from: "RM 1,800", img: g2 },
  { icon: Droplets, title: "Hair Spa", desc: "Cold-pressed botanicals to restore softness and shine.", duration: "75 min", from: "RM 2,400", img: g3 },
  { icon: Brush, title: "Makeup", desc: "Dewy day looks to luminous evenings.", duration: "60 min", from: "RM 2,200", img: hero },
  { icon: Flower2, title: "Facial Treatments", desc: "Lymphatic massage with hand-blended serums.", duration: "75 min", from: "RM 3,200", img: g1 },
  { icon: Sparkles, title: "Skincare Rituals", desc: "Custom regimens for visibly luminous skin.", duration: "60 min", from: "RM 2,800", img: g6 },
  { icon: Hand, title: "Nail Art", desc: "Sculpted nails, minimalist or signature finishes.", duration: "60 min", from: "RM 1,400", img: g4 },
  { icon: Crown, title: "Signature Experience", desc: "Our curated salon ritual for a complete transformation.", duration: "Half day", from: "RM 19,999", img: "/salon_interior.png" },
];

export default function Services() {
  const [active, setActive] = useState(0);
  const a = services[active];

  return (
    <section id="services" className="relative py-32 md:py-40 bg-cream/60 overflow-hidden">
      <div className="absolute top-20 -left-32 w-[24rem] h-[24rem] rounded-full bg-gold/10 blur-3xl" />
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16">
          <FadeIn>
            <div className="flex items-baseline gap-4">
              <span className="font-display italic text-gold text-lg">Chapter I</span>
              <span className="h-px w-12 bg-gold/50" />
            </div>
            <SectionLabel>The Service Index</SectionLabel>
            <h2 className="mt-6 font-display text-5xl md:text-6xl text-primary text-balance leading-[1.05] max-w-2xl">
              Rituals crafted for <em className="gold-text not-italic">timeless beauty.</em>
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="max-w-md text-muted-foreground">
              An index of our signature ceremonies. Hover or tap a number to preview.
            </p>
          </FadeIn>
        </div>

        <FadeIn delay={0.15}>
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            {/* Editorial list */}
            <ul className="lg:col-span-7 divide-y divide-border/60 border-y border-border/60">
              {services.map((s, i) => {
                const isActive = i === active;
                return (
                  <li
                    key={s.title}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => setActive(i)}
                    className="group cursor-pointer relative"
                  >
                    <div className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-6 py-6 md:py-7 transition-all">
                      <span
                        className={`font-display text-2xl transition-colors ${
                          isActive ? "text-gold" : "text-muted-foreground/50"
                        }`}
                      >
                        0{i + 1}
                      </span>

                      <div className="flex items-center gap-4 min-w-0">
                        <s.icon
                          size={20}
                          className={`shrink-0 transition-colors ${isActive ? "text-gold" : "text-primary/60"}`}
                        />
                        <div className="min-w-0">
                          <h3
                            className={`font-display text-2xl md:text-3xl transition-all ${
                              isActive ? "text-primary translate-x-1" : "text-primary/70"
                            }`}
                          >
                            {s.title}
                          </h3>
                          <p
                            className={`mt-1 text-sm text-muted-foreground transition-all ${
                              isActive ? "opacity-100 max-h-12" : "opacity-0 max-h-0 md:opacity-60 md:max-h-12"
                            } overflow-hidden`}
                          >
                            {s.desc}
                          </p>
                        </div>
                      </div>

                      <div className="hidden sm:flex flex-col items-end gap-1">
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">From</div>
                        <div className="font-display text-lg text-primary">{s.from}</div>
                        <a
                          href="#booking"
                          className={`text-[10px] uppercase tracking-widest transition-all ${
                            isActive ? "text-gold opacity-100" : "text-gold/60 opacity-0 group-hover:opacity-100"
                          } hover:text-primary border-b border-gold/30`}
                        >
                          Book Now
                        </a>
                      </div>

                      <ArrowUpRight
                        size={18}
                        className={`absolute right-0 top-1/2 -translate-y-1/2 sm:hidden transition-colors ${
                          isActive ? "text-gold" : "text-muted-foreground/40"
                        }`}
                      />
                    </div>

                    {isActive && (
                      <motion.span
                        layoutId="svc-bar"
                        className="absolute left-0 top-0 bottom-0 w-px bg-gold"
                      />
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Sticky preview */}
            <div className="lg:col-span-5 lg:sticky lg:top-28">
              <AnimatePresence mode="wait">
                <motion.div
                  key={a.title}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-soft"
                >
                  <img src={a.img} alt={a.title} className="h-full w-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-7 text-primary-foreground">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-2">
                      Service · 0{active + 1}
                    </div>
                    <h4 className="font-display text-3xl">{a.title}</h4>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-primary-foreground/80">
                        <Clock size={13} className="text-gold" /> {a.duration}
                      </div>
                      <a
                        href="#booking"
                        className="inline-flex items-center gap-2 rounded-full bg-gold text-primary px-4 py-2 text-xs hover:bg-gold-soft transition-colors"
                      >
                        Book Now
                        <ArrowUpRight size={13} />
                      </a>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
