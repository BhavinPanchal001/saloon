import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Calendar, Clock, User, Phone, Mail, Sparkles, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn, SectionLabel } from "./Section";

const categories = [
  {
    label: "Individual Services",
    options: [
      "Hair Styling",
      "Hair Spa",
      "Makeup",
      "Facial Treatments",
      "Skincare Rituals",
      "Nail Art",
    ],
  },
  {
    label: "Curated Packages",
    options: ["Basic Glow", "Premium Glow", "Bridal Glow"],
  },
];

const times = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
  "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
  "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM"
];

interface FormState {
  name: string;
  phone: string;
  email: string;
  service: string;
  date: string;
  time: string;
  notes: string;
}

const initialFormState: FormState = {
  name: "",
  phone: "",
  email: "",
  service: "",
  date: "",
  time: "",
  notes: "",
};

export default function Booking() {
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [serviceOpen, setServiceOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);

  const serviceRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click only when a dropdown is open
  useEffect(() => {
    if (!serviceOpen && !timeOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (serviceOpen && serviceRef.current && !serviceRef.current.contains(target)) {
        setServiceOpen(false);
      }
      if (timeOpen && timeRef.current && !timeRef.current.contains(target)) {
        setTimeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [serviceOpen, timeOpen]);

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = "Please share your name (at least 2 characters)";
    }
    if (!formData.phone.trim() || !/^[+\d\s()-]{7,20}$/.test(formData.phone.trim())) {
      newErrors.phone = "Enter a valid phone number";
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Enter a valid email address";
    }
    if (!formData.service) {
      newErrors.service = "Please choose a service or package";
    }
    if (!formData.date) {
      newErrors.date = "Please pick a date";
    }
    if (!formData.time) {
      newErrors.time = "Please pick a preferred time";
    }
    if (formData.notes.length > 500) {
      newErrors.notes = "Keep notes under 500 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      toast.success("Reservation received", {
        description: `We'll confirm ${formData.service} on ${formData.date} at ${formData.time} shortly.`,
      });
      setFormData(initialFormState);
      setErrors({});
    } catch {
      toast.error("Failed to submit reservation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls =
    "w-full bg-transparent border-b border-border/70 focus:border-gold outline-none py-3 pl-9 pr-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors cursor-pointer flex items-center justify-between";
  const iconCls = "absolute left-0 top-3.5 text-gold pointer-events-none";

  return (
    <section id="booking" className="py-16 md:py-20 relative overflow-hidden">
      <div className="absolute -top-24 right-0 w-[28rem] h-[28rem] rounded-full bg-teal/10 blur-3xl -z-10" />
      <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-16 items-start">
        <FadeIn>
          <SectionLabel>Reserve Your Ritual</SectionLabel>
          <h2 className="mt-6 font-display text-5xl md:text-6xl text-primary leading-[1.05] text-balance">
            Book a quiet <em className="gold-text not-italic">moment</em> for yourself.
          </h2>
          <div className="gold-divider my-8 max-w-xs" />
          <p className="text-muted-foreground leading-relaxed">
            Tell us a little about the ritual you'd love. Our concierge replies
            within an hour with a confirmation, a tailored note, and a warm welcome.
          </p>

          <div className="mt-10 space-y-6">
            {[
              ["Concierge response", "Within 60 minutes"],
              ["Cancellation", "Free up to 24 hours before"],
              ["First-time guests", "Complimentary consultation included"],
            ].map(([t, d]) => (
              <div key={t} className="flex items-start gap-4">
                <Sparkles className="text-gold mt-1" size={18} />
                <div>
                  <div className="text-primary">{t}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{d}</div>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <form
            onSubmit={handleSubmit}
            noValidate
            data-lenis-prevent
            className="rounded-[2rem] bg-card p-8 md:p-10 border border-border/50 shadow-soft"
          >
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
              <div className="relative pb-5">
                <User size={16} className={iconCls} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Full name"
                  maxLength={80}
                  autoComplete="name"
                  className="w-full bg-transparent border-b border-border/70 focus:border-gold outline-none py-3 pl-9 pr-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors"
                />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>

              <div className="relative pb-5">
                <Phone size={16} className={iconCls} />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="Phone number"
                  maxLength={20}
                  autoComplete="tel"
                  className="w-full bg-transparent border-b border-border/70 focus:border-gold outline-none py-3 pl-9 pr-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors"
                />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
              </div>

              <div className="relative pb-5 sm:col-span-2">
                <Mail size={16} className={iconCls} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="Email address"
                  maxLength={255}
                  autoComplete="email"
                  className="w-full bg-transparent border-b border-border/70 focus:border-gold outline-none py-3 pl-9 pr-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors"
                />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>

              {/* Custom Service Dropdown */}
              <div className="relative pb-5 sm:col-span-2" ref={serviceRef}>
                <Sparkles size={16} className={iconCls} />
                <button
                  type="button"
                  onClick={() => setServiceOpen(!serviceOpen)}
                  className={inputCls}
                >
                  <span className={formData.service ? "text-foreground" : "text-muted-foreground/60"}>
                    {formData.service || "Select a service or package"}
                  </span>
                  <ChevronDown size={14} className={`text-gold transition-transform duration-300 ${serviceOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {serviceOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      data-lenis-prevent
                      className="absolute left-0 right-0 top-full mt-2 z-20 max-h-80 overflow-y-auto rounded-2xl bg-white/90 backdrop-blur-xl border border-gold/20 shadow-glow p-2 scrollbar-hide"
                    >
                      {categories.map((cat) => (
                        <div key={cat.label} className="mb-2">
                          <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-gold font-semibold">{cat.label}</div>
                          {cat.options.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                handleChange("service", s);
                                setServiceOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                                formData.service === s ? "bg-gold/10 text-primary font-medium" : "text-foreground/80 hover:bg-cream"
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                {errors.service && <p className="text-xs text-destructive mt-1">{errors.service}</p>}
              </div>

              <div className="relative pb-5">
                <Calendar size={16} className={iconCls} />
                <input
                  type="date"
                  name="date"
                  min={today}
                  value={formData.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  className="w-full bg-transparent border-b border-border/70 focus:border-gold outline-none py-3 pl-9 pr-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors"
                />
                {errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
              </div>

              {/* Custom Time Dropdown */}
              <div className="relative pb-5" ref={timeRef}>
                <Clock size={16} className={iconCls} />
                <button
                  type="button"
                  onClick={() => setTimeOpen(!timeOpen)}
                  className={inputCls}
                >
                  <span className={formData.time ? "text-foreground" : "text-muted-foreground/60"}>
                    {formData.time || "Preferred time"}
                  </span>
                  <ChevronDown size={14} className={`text-gold transition-transform duration-300 ${timeOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {timeOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      data-lenis-prevent
                      className="absolute left-0 right-0 top-full mt-2 z-20 max-h-80 overflow-y-auto rounded-2xl bg-white/95 backdrop-blur-xl border border-gold/20 shadow-glow p-3 scrollbar-hide"
                    >
                      <div className="space-y-4">
                        {[
                          { label: "Morning", slots: times.filter(t => t.endsWith("AM")) },
                          { label: "Afternoon", slots: times.filter(t => t.endsWith("PM") && (t.startsWith("12") || ["01", "02", "03", "04"].some(h => t.startsWith(h)))) },
                          { label: "Evening", slots: times.filter(t => t.endsWith("PM") && ["05", "06", "07", "08"].some(h => t.startsWith(h))) }
                        ].map((section) => (
                          <div key={section.label}>
                            <div className="px-2 mb-2 text-[10px] uppercase tracking-widest text-gold/60 font-semibold">{section.label}</div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {section.slots.map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => {
                                    handleChange("time", t);
                                    setTimeOpen(false);
                                  }}
                                  className={`px-3 py-2 rounded-xl text-xs text-center transition-colors cursor-pointer border ${
                                    formData.time === t
                                      ? "bg-gold/15 border-gold/40 text-primary font-medium"
                                      : "border-transparent text-foreground/70 hover:bg-cream hover:border-gold/10"
                                  }`}
                                >
                                  {t.replace(" AM", "").replace(" PM", "")}
                                  <span className="ml-1 opacity-40 text-[9px]">{t.slice(-2)}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {errors.time && <p className="text-xs text-destructive mt-1">{errors.time}</p>}
              </div>

              <div className="sm:col-span-2 pt-2">
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="Anything we should know? (allergies, preferences, occasion)"
                  maxLength={500}
                  rows={3}
                  className="w-full bg-cream/50 rounded-2xl p-4 text-sm outline-none border border-transparent focus:border-gold transition-colors resize-none placeholder:text-muted-foreground/60"
                />
                {errors.notes && <p className="text-xs text-destructive mt-1">{errors.notes}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 text-sm tracking-wide text-primary-foreground hover:bg-teal disabled:opacity-60 transition-all shadow-soft hover:shadow-glow cursor-pointer"
            >
              {isSubmitting ? "Reserving…" : "Confirm Appointment"}
            </button>
            <p className="mt-4 text-[11px] text-center text-muted-foreground">
              By booking you agree to our gentle cancellation policy.
            </p>
          </form>
        </FadeIn>
      </div>
    </section>
  );
}
