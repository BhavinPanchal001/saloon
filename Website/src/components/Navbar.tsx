import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const links = [
  ["Home", "/#home"],
  ["About", "/#about"],
  ["Services", "/#services"],
  ["Packages", "/#pricing"],
  ["Products", "/#products"],
  // ["Gallery", "/#gallery"],
  // ["Testimonials", "/#testimonials"],
  ["Contact", "/#contact"],
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "glass border-b border-border/50 py-3" : "py-5"
        }`}
    >
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
        <a href="/#home" className="flex items-center gap-2">
          <img src="/GLOWY LOGO (With BG)1.jpg" alt="Glowy" className="h-10 w-auto" />
        </a>

        <nav className="hidden lg:flex items-center gap-9">
          {links.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="text-sm tracking-wide text-foreground/80 hover:text-primary transition-colors relative after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 after:bg-gold after:transition-all hover:after:w-full"
            >
              {label}
            </a>
          ))}
        </nav>

        <a
          href="/#booking"
          className="hidden lg:inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm text-primary-foreground hover:bg-teal transition-colors shadow-soft"
        >
          Book Appointment
        </a>

        <button
          className="lg:hidden p-2 text-primary"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden overflow-hidden glass border-t border-border/50"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {links.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="text-foreground/80 hover:text-primary py-1"
                >
                  {label}
                </a>
              ))}
              <a
                href="/#booking"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-full bg-primary text-primary-foreground text-center py-3 text-sm"
              >
                Book Appointment
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
