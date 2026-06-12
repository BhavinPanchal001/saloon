import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useRef, useEffect, useState } from "react";

function AnimatedCounter({ target, suffix = "" }: { target: string; suffix?: string }) {
  const num = parseInt(target.replace(/[^\d]/g, ""));
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let frame: number;
    const duration = 2000;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * num));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [started, num]);

  return <div ref={ref} className="font-display text-3xl text-primary">{count}{suffix}</div>;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const glowScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.3]);

  return (
    <section ref={sectionRef} id="home" className="relative min-h-screen pt-32 pb-20 overflow-hidden">
      {/* Animated floating glow shapes */}
      <motion.div
        style={{ scale: glowScale }}
        className="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-gold/20 blur-3xl animate-float"
      />
      <motion.div
        style={{ scale: glowScale }}
        className="absolute top-1/3 -right-32 h-[32rem] w-[32rem] rounded-full bg-teal/15 blur-3xl animate-float"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1.5 }}
      />

      {/* Decorative floating particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-gold/40"
          style={{
            left: `${20 + i * 15}%`,
            top: `${30 + (i % 3) * 20}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            delay: i * 0.7,
            ease: "easeInOut",
          }}
        />
      ))}

      <div className="relative mx-auto max-w-7xl px-6 grid lg:grid-cols-12 gap-12 items-center">
        <motion.div
          className="lg:col-span-7"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-card/60 px-4 py-1.5 text-xs tracking-[0.2em] uppercase text-primary mb-8"
          >
            <motion.span
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Sparkles size={14} className="text-gold" />
            </motion.span>
            Glow To Go With Glowy
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="font-display text-[clamp(3rem,8vw,7rem)] leading-[0.95] text-balance text-primary"
          >
            Reveal Your <br />
            Natural <em className="not-italic gold-text">Glow.</em>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-8 max-w-lg text-base md:text-lg text-muted-foreground leading-relaxed"
          >
            Premium beauty rituals crafted with personalized care, quiet luxury, and radiant selfcare designed to help you glow with confidence
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <motion.a
              href="#booking"
              className="group inline-flex items-center gap-3 rounded-full bg-primary px-7 py-4 text-sm tracking-wide text-primary-foreground shadow-soft transition-all"
              whileHover={{ scale: 1.03, boxShadow: "0 30px 80px -30px color-mix(in oklab, var(--gold) 35%, transparent)" }}
              whileTap={{ scale: 0.97 }}
            >
              Book Appointment
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </motion.a>
            <motion.a
              href="#services"
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 px-7 py-4 text-sm text-primary transition-colors"
              whileHover={{ scale: 1.03, backgroundColor: "var(--cream)" }}
              whileTap={{ scale: 0.97 }}
            >
              Explore Services
            </motion.a>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-14 flex items-center gap-10"
          >
            {[
              ["12", "+", "Years Crafting Beauty"],
              ["8", "K", "Happy Clients"],
              ["50", "+", "Signature Rituals"],
            ].map(([n, suffix, l]) => (
              <div key={l}>
                <AnimatedCounter target={n} suffix={suffix} />
                <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{l}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-5 relative"
        >
          <motion.div
            style={{ y: imgY }}
            className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-glow"
          >
            <motion.img
              src="/hair_styling.png"
              alt="Glowy salon experience"
              width={1280}
              height={1600}
              className="h-full w-full object-cover"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.6 }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30, x: -20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            transition={{ duration: 0.9, delay: 1 }}
            whileHover={{ scale: 1.05, y: -5 }}
            className="absolute -bottom-6 -left-6 glass rounded-2xl p-5 shadow-soft border border-white/40 max-w-[16rem]"
          >
            <motion.div
              className="flex items-center gap-2 text-gold text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3, duration: 0.5 }}
            >
              {["★", "★", "★", "★", "★"].map((star, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.3 + i * 0.1, type: "spring", stiffness: 300 }}
                >
                  {star}
                </motion.span>
              ))}
            </motion.div>
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
