import { Check, Clock, Sparkles, ArrowRight } from "lucide-react";
import { FadeIn, SectionLabel } from "./Section";

const tiers = [
  {
    name: "Basic Glow",
    price: "RM 2,499",
    duration: "90 minutes",
    desc: "Essential rituals for everyday radiance.",
    features: [
      "Express botanical facial",
      "Hair wash & soft blow dry",
      "Classic file & polish manicure",
      "Welcome herbal infusion",
      "Take-home glow oil sample",
    ],
    note: "Perfect for a midweek reset.",
  },
  {
    name: "Premium Glow",
    price: "RM 5,999",
    duration: "3 hours",
    desc: "Our signature curated experience.",
    features: [
      "Botanical sculpting facial (75 min)",
      "Hair spa with aroma scalp massage",
      "Gel manicure & express pedicure",
      "Soft glow day makeup",
      "Personal beauty consultation",
      "Champagne or matcha service",
    ],
    note: "Most loved by our regulars.",
  },
  {
    name: "Bridal Glow",
    price: "RM 19,999",
    duration: "Full day",
    desc: "A composed ritual for your forever moment.",
    features: [
      "3 pre-bridal sessions over 6 weeks",
      "HD bridal makeup with airbrush option",
      "Hair styling, drape & trial",
      "Luxury mani-pedi with art",
      "Body polish & glow ritual",
      "Personal beauty director on the day",
      "Touch-up kit to take home",
    ],
    note: "Reserve at least 8 weeks in advance.",
  },
];

export default function Pricing() {
  const featured = tiers[1];
  const sides = [tiers[0], tiers[2]];

  return (
    <>
      {/* Distinct break between Services and Packages */}
      <div className="bg-background pt-0">
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-center gap-6 py-2">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/50" />
          <Sparkles className="text-gold" size={18} />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/50" />
        </div>
      </div>

      <section id="pricing" className="pt-0 pb-16 md:pt-0 md:pb-24 bg-background relative overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[60rem] h-[60rem] rounded-full bg-gold/5 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6">
          <FadeIn className="text-center max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-4">
              <span className="h-px w-12 bg-gold/50" />
              <span className="font-display italic text-gold text-lg">Chapter II</span>
              <span className="h-px w-12 bg-gold/50" />
            </div>
            <SectionLabel>Curated Packages</SectionLabel>
            <h2 className="mt-6 font-display text-5xl md:text-6xl text-primary text-balance leading-[1.05]">
              Three ways to <em className="gold-text not-italic">glow.</em>
            </h2>
            <p className="mt-6 text-muted-foreground">
              Composed bundles that pair multiple rituals at a softer price.
              Every package includes consultation, premium products, and our
              quiet hospitality.
            </p>
          </FadeIn>

          {/* Spotlight layout: featured center, two side cards */}
          <div className="mt-20 grid lg:grid-cols-12 gap-6 items-center">
            {/* Left side */}
            <FadeIn delay={0.05} className="lg:col-span-3 lg:order-1 order-2">
              <SideCard tier={sides[0]} align="right" />
            </FadeIn>

            {/* Featured center */}
            <FadeIn delay={0.15} className="lg:col-span-6 lg:order-2 order-1">
              <div className="relative rounded-[2.5rem] bg-primary text-primary-foreground p-10 md:p-12 shadow-glow border border-gold/30 overflow-hidden">
                <div className="absolute top-6 right-6 inline-flex items-center gap-2 rounded-full bg-gold/15 border border-gold/40 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-gold">
                  <Sparkles size={11} /> Most Loved
                </div>

                <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-gold/10 blur-3xl" />

                <div className="relative">
                  <h3 className="font-display text-4xl md:text-5xl">{featured.name}</h3>
                  <p className="mt-3 text-primary-foreground/70 max-w-md">{featured.desc}</p>

                  <div className="mt-8 flex items-end gap-4">
                    <span className="font-display text-7xl gold-text leading-none">{featured.price}</span>
                    <div className="pb-2 flex items-center gap-1.5 text-xs text-primary-foreground/60">
                      <Clock size={12} className="text-gold" /> {featured.duration}
                    </div>
                  </div>

                  <div className="my-8 h-px bg-white/15" />

                  <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                    {featured.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm">
                        <Check size={16} className="text-gold mt-0.5 shrink-0" />
                        <span className="text-primary-foreground/85">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="mt-8 text-xs italic text-primary-foreground/60">{featured.note}</p>

                  <a
                    href="#booking"
                    className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-gold text-primary px-8 py-4 text-sm hover:bg-gold-soft transition-colors w-full sm:w-auto"
                  >
                    Book Demo {featured.name}
                    <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            </FadeIn>

            {/* Right side */}
            <FadeIn delay={0.25} className="lg:col-span-3 lg:order-3 order-3">
              <SideCard tier={sides[1]} align="left" />
            </FadeIn>
          </div>

          <FadeIn delay={0.3} className="mt-16 text-center">
            <p className="text-sm text-muted-foreground">
              Looking for something bespoke?{" "}
              <a href="#booking" className="text-primary underline decoration-gold underline-offset-4 hover:text-gold transition-colors">
                Talk to our concierge
              </a>
            </p>
          </FadeIn>
        </div>
      </section>
    </>
  );
}

function SideCard({
  tier,
  align,
}: {
  tier: (typeof tiers)[number];
  align: "left" | "right";
}) {
  return (
    <div
      className={`rounded-[1.75rem] bg-card border border-border/50 p-7 hover:shadow-soft transition-all hover:-translate-y-1 ${
        align === "right" ? "lg:text-right" : "lg:text-left"
      }`}
    >
      <h3 className="font-display text-2xl text-primary">{tier.name}</h3>
      <p className="mt-2 text-xs text-muted-foreground">{tier.desc}</p>

      <div className={`mt-5 flex items-baseline gap-2 ${align === "right" ? "lg:justify-end" : ""}`}>
        <span className="font-display text-3xl text-primary">{tier.price}</span>
      </div>
      <div className={`mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground ${align === "right" ? "lg:justify-end" : ""}`}>
        <Clock size={11} className="text-gold" /> {tier.duration}
      </div>

      <div className="gold-divider my-5" />

      <ul className="space-y-2">
        {tier.features.slice(0, 4).map((f) => (
          <li
            key={f}
            className={`flex items-start gap-2 text-xs text-foreground/75 ${
              align === "right" ? "lg:flex-row-reverse lg:text-right" : ""
            }`}
          >
            <Check size={12} className="text-teal mt-0.5 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
        {tier.features.length > 4 && (
          <li className={`text-[11px] italic text-muted-foreground ${align === "right" ? "lg:text-right" : ""}`}>
            + {tier.features.length - 4} more inclusions
          </li>
        )}
      </ul>

      <a
        href="#booking"
        className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-primary/30 px-5 py-2.5 text-xs text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
      >
        Book Demo {tier.name}
      </a>
    </div>
  );
}
