import { motion } from "framer-motion";
import { FadeIn, SectionLabel } from "./Section";

const words = "To empower individuals by revealing their innate radiance through".split(" ");
const highlight = "bespoke, botanical-first";
const rest = "beauty rituals in a sanctuary of quiet luxury.".split(" ");

export default function Mission() {
  return (
    <section className="py-16 md:py-24 bg-cream/30 relative overflow-hidden">
      {/* Decorative animated orbs */}
      <motion.div
        className="absolute -top-20 left-1/4 w-40 h-40 rounded-full bg-gold/10 blur-3xl"
        animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 right-1/4 w-56 h-56 rounded-full bg-teal/8 blur-3xl"
        animate={{ y: [0, 20, 0], x: [0, -15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      <div className="mx-auto max-w-5xl px-6 text-center relative">
        <FadeIn>
          <SectionLabel>Our Mission</SectionLabel>
        </FadeIn>

        {/* Word-by-word reveal heading */}
        <motion.h2
          className="mt-8 font-display text-3xl md:text-5xl text-primary leading-[1.2] text-balance"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        >
          {words.map((word, i) => (
            <motion.span
              key={i}
              className="inline-block mr-[0.3em]"
              variants={{
                hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
                show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
            >
              {word}
            </motion.span>
          ))}
          <motion.em
            className="gold-text not-italic inline-block mr-[0.3em]"
            variants={{
              hidden: { opacity: 0, y: 20, scale: 0.9 },
              show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
            }}
          >
            {highlight}
          </motion.em>
          {" "}
          {rest.map((word, i) => (
            <motion.span
              key={`r-${i}`}
              className="inline-block mr-[0.3em]"
              variants={{
                hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
                show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
            >
              {word}
            </motion.span>
          ))}
        </motion.h2>

        <FadeIn delay={0.6}>
          <motion.div
            className="gold-divider w-24 mx-auto my-10"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
          <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            We believe that beauty is not just about transformation, but about discovering and celebrating your truest self. Every treatment we offer is designed to nurture your confidence, soothe your mind, and elevate your everyday life.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
