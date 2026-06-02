import { Instagram, Facebook, MapPin, Phone, Mail, Clock } from "lucide-react";
import { Link } from "@tanstack/react-router";

// Custom Tiktok icon component matching Lucide styling perfectly
const Tiktok = ({ size = 24, ...props }: { size?: number } & React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const LotusIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s-4-6-4-10c0-3 2-5 4-5s4 2 4 5c0 4-4 10-4 10z" />
    <path d="M12 22s-6-3-8-8c-2-4 0-7 0-7s2 1 4 4c2 3 4 11 4 11z" />
    <path d="M12 22s6-3 8-8c2-4 0-7 0-7s-2 1-4 4c-2 3-4 11-4 11z" />
  </svg>
);

// ==========================================
// UPDATE YOUR SOCIAL MEDIA LINKS HERE:
// ==========================================
const SOCIAL_LINKS = [
  {
    icon: Instagram,
    href: "https://instagram.com/your_username", // <-- Replace with your Instagram URL
    label: "Instagram",
  },
  {
    icon: Facebook,
    href: "https://facebook.com/your_page",       // <-- Replace with your Facebook URL
    label: "Facebook",
  },
  {
    icon: Tiktok,
    href: "https://tiktok.com/@your_username",     // <-- Replace with your TikTok URL
    label: "TikTok",
  },
];

export default function Footer() {
  return (
    <footer id="contact" className="bg-primary text-primary-foreground pt-16 pb-8 mt-12 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-[30rem] h-[30rem] rounded-full bg-gold/10 blur-3xl" />
      <div className="mx-auto max-w-7xl px-6 relative">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-4">
            <img src="/GLOWY LOGO (Without BG).png" alt="Glowy" className="h-10 w-auto mb-5" />
            <p className="text-primary-foreground/90 leading-relaxed max-w-sm text-[15px]">
              A sanctuary of soft light and
              <br />
              considered beauty.
            </p>
            <p className="mt-5 text-primary-foreground/90 font-medium text-[15px]">
              Glow To Go With Glowy <span className="text-gold ml-1">✨</span>
            </p>
            <div className="mt-6 flex gap-4">
              {SOCIAL_LINKS.map((social, i) => {
                const Icon = social.icon;
                return (
                  <a
                    key={i}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="h-10 w-10 rounded-full border border-white/15 flex items-center justify-center hover:bg-gold hover:text-primary hover:border-gold transition-colors"
                  >
                    <Icon size={16} />
                  </a>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-sm uppercase tracking-widest text-gold">Explore</h4>
            <ul className="mt-6 space-y-4 text-[15px] text-primary-foreground/80">
              <li><a href="#about" className="hover:text-gold transition-colors">About</a></li>
              <li><a href="#services" className="hover:text-gold transition-colors">Services</a></li>
              <li><a href="#packages" className="hover:text-gold transition-colors">Packages</a></li>
              <li><a href="#products" className="hover:text-gold transition-colors">Products</a></li>
              <li><a href="#contact" className="hover:text-gold transition-colors">Contact</a></li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h4 className="text-sm uppercase tracking-widest text-gold">Contact</h4>
            <ul className="mt-6 space-y-4 text-[15px] text-primary-foreground/80">
              <li className="flex gap-3 items-start">
                <MapPin size={18} className="text-gold shrink-0 mt-0.5" />
                <span className="leading-relaxed">15, Jalan Telawi, Bangsar, 59100<br />Kuala Lumpur, Malaysia</span>
              </li>
              <li className="flex gap-3 items-center">
                <Phone size={18} className="text-gold shrink-0" />
                <span>+60 3-2282 1234</span>
              </li>
              <li className="flex gap-3 items-center">
                <Mail size={18} className="text-gold shrink-0" />
                <span>glowy.beautyspasb@gmail.com</span>
              </li>
              <li className="flex gap-3 items-center">
                <Clock size={18} className="text-gold shrink-0" />
                <span>Sun – Sat · 10am – 8pm</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h4 className="text-sm uppercase tracking-widest text-gold">Find Us</h4>
            <div className="mt-5 rounded-2xl overflow-hidden border border-white/10 aspect-[4/3]">
              <iframe
                title="Glowy Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3983.833596570648!2d101.6705626750379!3d3.131179653138863!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31cc4974f1b88e17%3A0x633190df03772186!2s15%2C%20Jalan%20Telawi%202%2C%20Bangsar%2C%2059100%20Kuala%20Lumpur%2C%20Wilayah%20Persekutuan%20Kuala%20Lumpur%2C%20Malaysia!5e0!3m2!1sen!2smy!4v1716300000000!5m2!1sen!2smy"
                className="w-full h-full grayscale opacity-90"
                loading="lazy"
                style={{ border: 0 }}
                allowFullScreen={true}
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-6">
          <div className="flex items-center justify-center gap-3 w-full">
            <div className="h-px bg-gold/40 flex-1 max-w-[45%]"></div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gold/70"></div>
              <LotusIcon size={24} className="text-gold" />
              <div className="w-1.5 h-1.5 rounded-full bg-gold/70"></div>
            </div>
            <div className="h-px bg-gold/40 flex-1 max-w-[45%]"></div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between text-[13px] text-primary-foreground/70 w-full">
            <p className="flex-1 text-center md:text-left mb-4 md:mb-0">© {new Date().getFullYear()} Glowy. Crafted with quiet care.</p>
            <div className="flex gap-4 items-center justify-center flex-none">
              <Link to="/privacy-policy" className="hover:text-primary-foreground transition-colors">Privacy Policy</Link>
              <span className="text-primary-foreground/30">|</span>
              <Link to="/terms-conditions" className="hover:text-primary-foreground transition-colors">Terms & Conditions</Link>
            </div>

          </div>
        </div>
      </div>
    </footer>
  );
}
