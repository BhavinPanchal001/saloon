import { Instagram, Facebook, MapPin, Phone, Mail, Clock } from "lucide-react";

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
    <footer id="contact" className="bg-primary text-primary-foreground pt-24 pb-10 mt-12 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-[30rem] h-[30rem] rounded-full bg-gold/10 blur-3xl" />
      <div className="mx-auto max-w-7xl px-6 relative">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <img src="/GLOWY LOGO (Without BG).png" alt="Glowy" className="h-10 w-auto" />
            <p className="mt-6 text-primary-foreground/70 leading-relaxed max-w-sm">
              A sanctuary of soft light and considered beauty. Glow to go, with Glowy.
            </p>
            <div className="mt-6 flex gap-3">
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
            <ul className="mt-5 space-y-3 text-sm text-primary-foreground/75">
              <li><a href="#about" className="hover:text-gold transition-colors">About</a></li>
              <li><a href="#services" className="hover:text-gold transition-colors">Services</a></li>
              <li><a href="#gallery" className="hover:text-gold transition-colors">Gallery</a></li>
              <li><a href="#pricing" className="hover:text-gold transition-colors">Pricing</a></li>
              <li><a href="#testimonials" className="hover:text-gold transition-colors">Testimonials</a></li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h4 className="text-sm uppercase tracking-widest text-gold">Contact</h4>
            <ul className="mt-5 space-y-4 text-sm text-primary-foreground/80">
              <li className="flex gap-3"><MapPin size={16} className="text-gold mt-0.5 shrink-0" /> 15, Jalan Telawi, Bangsar, 59100 Kuala Lumpur, Malaysia</li>
              <li className="flex gap-3"><Phone size={16} className="text-gold mt-0.5 shrink-0" /> +60 3-2282 1234</li>
              <li className="flex gap-3"><Mail size={16} className="text-gold mt-0.5 shrink-0" /> hello@glowy.salon.my</li>
              <li className="flex gap-3"><Clock size={16} className="text-gold mt-0.5 shrink-0" /> Tue – Sun · 10am – 8pm</li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h4 className="text-sm uppercase tracking-widest text-gold">Find Us</h4>
            <div className="mt-5 rounded-2xl overflow-hidden border border-white/10 aspect-[4/3]">
              <iframe
                title="Glowy Location"
                src="https://www.openstreetmap.org/export/embed.html?bbox=101.65,3.10,101.72,3.18&layer=mapnik"
                className="w-full h-full grayscale opacity-90"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row gap-4 items-center justify-between text-xs text-primary-foreground/50">
          <p>© {new Date().getFullYear()} Glowy. Crafted with quiet care.</p>
          <p>Glow To Go With Glowy ✦</p>
        </div>
      </div>
    </footer>
  );
}
