import { Award, Leaf, UserCheck, Gem, Sparkle } from "lucide-react";
import { motion } from "framer-motion";
import { FadeIn, SectionLabel } from "./Section";

const items = [
  { icon: Award, title: "Certified Experts", desc: "An award-winning team trained across global beauty capitals." },
  { icon: Leaf, title: "Organic Products", desc: "Botanical-first formulas, free from harsh chemicals." },
  { icon: UserCheck, title: "Personalized Care", desc: "Treatments calibrated to your skin, hair, and mood." },
  { icon: Gem, title: "Premium Experience", desc: "Quiet luxury in every detail, from cup to chair." },
  { icon: Sparkle, title: "Hygienic Environment", desc: "Hospital-grade sanitization, always." },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      delay: i * 0.1,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

export default function WhyUs() {
  return (
    <section className="py-16 md:py-20 relative overflow-hidden">
      {/* Animated background glow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] rounded-full bg-gold/5 blur-3xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="mx-auto max-w-7xl px-6 relative">
        <FadeIn className="text-center max-w-2xl mx-auto">
          <SectionLabel>Why Glowy</SectionLabel>
          <h2 className="mt-6 font-display text-5xl md:text-6xl text-primary text-balance leading-[1.05]">
            Quiet details, <em className="gold-text not-italic">loud difference.</em>
          </h2>
        </FadeIn>

        <div className="mt-16 grid grid-cols-2 lg:grid-cols-5 gap-4">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
            >
              <motion.div
                className="h-full rounded-3xl bg-card p-6 border border-border/40 text-center transition-colors"
                whileHover={{
                  y: -12,
                  scale: 1.03,
                  boxShadow: "0 30px 80px -30px color-mix(in oklab, var(--gold) 25%, transparent)",
                  backgroundColor: "var(--cream)",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <motion.div
                  className="mx-auto h-14 w-14 rounded-full bg-gradient-to-br from-gold-soft to-gold/40 flex items-center justify-center text-primary"
                  whileHover={{ rotate: 360, scale: 1.15 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                >
                  <it.icon size={22} />
                </motion.div>
                <h3 className="mt-5 font-display text-xl text-primary">{it.title}</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{it.desc}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
