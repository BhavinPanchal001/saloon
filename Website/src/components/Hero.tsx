import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import hero from "@/assets/hero.jpg";

export default function Hero() {
  return (
    <section id="home" className="relative min-h-screen pt-32 pb-20 overflow-hidden">
      {/* Soft floating glow shapes */}
      <div className="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-gold/20 blur-3xl animate-float" />
      <div
        className="absolute top-1/3 -right-32 h-[32rem] w-[32rem] rounded-full bg-teal/15 blur-3xl animate-float"
        style={{ animationDelay: "2s" }}
      />

      <div className="relative mx-auto max-w-7xl px-6 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-card/60 px-4 py-1.5 text-xs tracking-[0.2em] uppercase text-primary mb-8"
          >
            <Sparkles size={14} className="text-gold" />
            Glow To Go With Glowy
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1 }}
            className="font-display text-[clamp(3rem,8vw,7rem)] leading-[0.95] text-balance text-primary"
          >
            Reveal Your <br />
            Natural <em className="not-italic gold-text">Glow.</em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="mt-8 max-w-lg text-base md:text-lg text-muted-foreground leading-relaxed"
          >
            A sanctuary of soft light, premium care, and quiet luxury. Curated
            beauty rituals designed to let your most radiant self step forward.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.45 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <a
              href="#booking"
              className="group inline-flex items-center gap-3 rounded-full bg-primary px-7 py-4 text-sm tracking-wide text-primary-foreground shadow-soft hover:shadow-glow transition-all"
            >
              Book Appointment
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#services"
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 px-7 py-4 text-sm text-primary hover:bg-cream transition-colors"
            >
              Explore Services
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="mt-14 flex items-center gap-10"
          >
            {[
              ["12+", "Years Crafting Beauty"],
              ["8K", "Happy Clients"],
              ["50+", "Signature Rituals"],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="font-display text-3xl text-primary">{n}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{l}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="lg:col-span-5 relative"
        >
          <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-glow">
            <img
              src={hero}
              alt="Glowy salon model"
              width={1280}
              height={1600}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="absolute -bottom-6 -left-6 glass rounded-2xl p-5 shadow-soft border border-white/40 max-w-[16rem]"
          >
            <div className="flex items-center gap-2 text-gold text-sm">★★★★★</div>
            <p className="mt-2 text-sm text-foreground/80 leading-snug">
              "An experience that feels like a gentle exhale."
            </p>
            <p className="mt-2 text-xs text-muted-foreground">— Vogue Beauty</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
