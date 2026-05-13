import { Award, Leaf, UserCheck, Gem, Sparkle } from "lucide-react";
import { FadeIn, SectionLabel } from "./Section";

const items = [
  { icon: Award, title: "Certified Experts", desc: "An award-winning team trained across global beauty capitals." },
  { icon: Leaf, title: "Organic Products", desc: "Botanical-first formulas, free from harsh chemicals." },
  { icon: UserCheck, title: "Personalized Care", desc: "Treatments calibrated to your skin, hair, and mood." },
  { icon: Gem, title: "Premium Experience", desc: "Quiet luxury in every detail, from cup to chair." },
  { icon: Sparkle, title: "Hygienic Environment", desc: "Hospital-grade sanitization, always." },
];

export default function WhyUs() {
  return (
    <section className="py-32">
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn className="text-center max-w-2xl mx-auto">
          <SectionLabel>Why Glowy</SectionLabel>
          <h2 className="mt-6 font-display text-5xl md:text-6xl text-primary text-balance leading-[1.05]">
            Quiet details, <em className="gold-text not-italic">loud difference.</em>
          </h2>
        </FadeIn>

        <div className="mt-16 grid grid-cols-2 lg:grid-cols-5 gap-4">
          {items.map((it, i) => (
            <FadeIn key={it.title} delay={i * 0.06}>
              <div className="h-full rounded-3xl bg-card p-6 border border-border/40 text-center hover:bg-cream transition-colors">
                <div className="mx-auto h-14 w-14 rounded-full bg-gradient-to-br from-gold-soft to-gold/40 flex items-center justify-center text-primary">
                  <it.icon size={22} />
                </div>
                <h3 className="mt-5 font-display text-xl text-primary">{it.title}</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{it.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
