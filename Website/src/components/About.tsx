import { motion, useScroll, useTransform } from "framer-motion";
import { FadeIn, SectionLabel } from "./Section";
import { Leaf, Heart } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import about from "@/assets/about.jpg";

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
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
      setCount(Math.floor(eased * target));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [started, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const imgScale = useTransform(scrollYProgress, [0, 0.5], [1.1, 1]);
  const imgOpacity = useTransform(scrollYProgress, [0, 0.3], [0.7, 1]);

  return (
    <section ref={sectionRef} id="about" className="relative py-16 md:py-20 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-16 items-center">
        <FadeIn className="relative">
          <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-soft">
            <motion.img
              src={about}
              alt="Glowy salon interior"
              width={1200}
              height={1400}
              loading="lazy"
              className="h-full w-full object-cover"
              style={{ scale: imgScale, opacity: imgOpacity }}
            />
            {/* Image reveal overlay */}
            <motion.div
              className="absolute inset-0 bg-cream origin-bottom"
              initial={{ scaleY: 1 }}
              whileInView={{ scaleY: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            />
          </div>
          <motion.div
            className="absolute -bottom-8 -right-4 lg:-right-12 w-48 h-48 rounded-full glass border border-white/50 flex flex-col items-center justify-center text-center p-6 shadow-soft"
            initial={{ scale: 0, opacity: 0, rotate: -20 }}
            whileInView={{ scale: 1, opacity: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.6 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <span className="font-display text-4xl text-primary">
              <AnimatedCounter target={12} suffix="+" />
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Years of <br />Devoted Care</span>
          </motion.div>
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
              Founded by master stylist Aanya Rao, Glowy is a luxury beauty house dedicated to personalized care, premium rituals, and modern self-care experiences.
              Every treatment is thoughtfully crafted to deliver relaxation, confidence, and radiant beauty.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We blend organic botanicals with refined techniques in a calm and elegant environment designed to make every client feel cared for, confident, and renewed.
            </p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="grid grid-cols-2 gap-6 mt-10">
              <motion.div
                className="rounded-2xl bg-card p-6 border border-border/50 hover:shadow-soft transition-shadow"
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <motion.div
                  whileHover={{ rotate: 15, scale: 1.2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Leaf className="text-teal" size={22} />
                </motion.div>
                <h3 className="mt-4 text-lg text-primary">Botanical First</h3>
                <p className="text-sm text-muted-foreground mt-2">Clean, organic, ethically sourced ingredients in every ritual.</p>
              </motion.div>
              <motion.div
                className="rounded-2xl bg-card p-6 border border-border/50 hover:shadow-soft transition-shadow"
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <motion.div
                  whileHover={{ rotate: 15, scale: 1.2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Heart className="text-gold" size={22} />
                </motion.div>
                <h3 className="mt-4 text-lg text-primary">Bespoke Care</h3>
                <p className="text-sm text-muted-foreground mt-2">A consultation, then a ritual shaped only for you.</p>
              </motion.div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
