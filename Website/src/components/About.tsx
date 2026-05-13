import about from "@/assets/about.jpg";
import { FadeIn, SectionLabel } from "./Section";
import { Leaf, Heart } from "lucide-react";

export default function About() {
  return (
    <section id="about" className="relative py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-16 items-center">
        <FadeIn className="relative">
          <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-soft">
            <img src={about} alt="Glowy salon interior" width={1200} height={1400} loading="lazy" className="h-full w-full object-cover" />
          </div>
          <div className="absolute -bottom-8 -right-4 lg:-right-12 w-48 h-48 rounded-full glass border border-white/50 flex flex-col items-center justify-center text-center p-6 shadow-soft">
            <span className="font-display text-4xl text-primary">12<span className="gold-text">+</span></span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Years of <br />Devoted Care</span>
          </div>
        </FadeIn>

        <div>
          <FadeIn>
            <SectionLabel>Our Story</SectionLabel>
            <h2 className="mt-6 font-display text-5xl md:text-6xl text-primary leading-[1.05] text-balance">
              Where ritual meets <em className="gold-text not-italic">radiance.</em>
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="gold-divider my-8" />
            <p className="text-muted-foreground leading-relaxed text-lg">
              Founded by master stylist Aanya Rao, Glowy is a slow-beauty house
              built on the belief that softness is strength. Every treatment is
              composed like a poem — deliberate, gentle, transformative.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We blend organic botanicals with Japanese precision and Parisian
              finesse, delivered in a space that feels like sunlight through linen.
            </p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="grid grid-cols-2 gap-6 mt-10">
              <div className="rounded-2xl bg-card p-6 border border-border/50">
                <Leaf className="text-teal" size={22} />
                <h3 className="mt-4 text-lg text-primary">Botanical First</h3>
                <p className="text-sm text-muted-foreground mt-2">Clean, organic, ethically sourced ingredients in every ritual.</p>
              </div>
              <div className="rounded-2xl bg-card p-6 border border-border/50">
                <Heart className="text-gold" size={22} />
                <h3 className="mt-4 text-lg text-primary">Bespoke Care</h3>
                <p className="text-sm text-muted-foreground mt-2">A consultation, then a ritual shaped only for you.</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
