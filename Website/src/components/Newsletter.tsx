import { motion } from "framer-motion";
import { FadeIn } from "./Section";

export default function Newsletter() {
  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-5xl px-6">
        <FadeIn>
          <motion.div
            className="rounded-[2.5rem] bg-gradient-to-br from-cream via-nude/40 to-gold-soft/30 p-12 md:p-16 text-center relative overflow-hidden border border-gold/20"
            whileHover={{ boxShadow: "0 30px 80px -30px color-mix(in oklab, var(--gold) 35%, transparent)" }}
            transition={{ duration: 0.5 }}
          >
            <div className="absolute inset-0 grain opacity-40" />

            {/* Animated glow ring */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] rounded-full border border-gold/10"
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.1, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20rem] h-[20rem] rounded-full border border-gold/15"
              animate={{ scale: [1.1, 1, 1.1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />

            <div className="relative">
              <motion.div
                className="text-xs uppercase tracking-[0.3em] text-gold"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                Glow Letter
              </motion.div>
              <motion.h2
                className="mt-4 font-display text-4xl md:text-5xl text-primary text-balance"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.7 }}
              >
                Soft beauty notes, in your inbox.
              </motion.h2>
              <motion.p
                className="mt-4 text-muted-foreground max-w-md mx-auto"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.7 }}
              >
                Seasonal rituals, member-only offerings, and quiet inspiration — once a month.
              </motion.p>
              <motion.form
                onSubmit={(e) => e.preventDefault()}
                className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto bg-card rounded-full p-2 shadow-soft"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6, duration: 0.7 }}
              >
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  className="flex-1 bg-transparent px-5 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
                />
                <motion.button
                  className="rounded-full bg-gradient-to-r from-gold to-gold-soft text-primary px-6 py-3 text-sm transition-shadow"
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 60px -15px color-mix(in oklab, var(--gold) 40%, transparent)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  Subscribe
                </motion.button>
              </motion.form>
            </div>
          </motion.div>
        </FadeIn>
      </div>
    </section>
  );
}
