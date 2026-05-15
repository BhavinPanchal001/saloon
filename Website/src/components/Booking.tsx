import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

const schema = z.object({
  name: z.string().trim().min(2, "Please share your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().min(7, "Enter a valid phone").max(20).regex(/^[+\d\s()-]+$/, "Digits only"),
  service: z.string().min(1, "Choose a service"),
  date: z.string().min(1, "Pick a date"),
  time: z.string().min(1, "Pick a time"),
  notes: z.string().max(500, "Keep notes under 500 characters").optional(),
});

type FormData = z.infer<typeof schema>;

export default function Booking() {
  const today = new Date().toISOString().split("T")[0];
  const [serviceOpen, setServiceOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  
  const serviceRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { service: "", time: "" } });

  const selectedService = watch("service");
  const selectedTime = watch("time");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serviceRef.current && !serviceRef.current.contains(event.target as Node)) setServiceOpen(false);
      if (timeRef.current && !timeRef.current.contains(event.target as Node)) setTimeOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onSubmit = async (data: FormData) => {
    await new Promise((r) => setTimeout(r, 700));
    toast.success("Reservation received", {
      description: `We'll confirm ${data.service} on ${data.date} at ${data.time} shortly.`,
    });
    reset();
  };

  const inputCls =
    "w-full bg-transparent border-b border-border/70 focus:border-gold outline-none py-3 pl-9 pr-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors cursor-pointer flex items-center justify-between";
  const iconCls = "absolute left-0 top-3.5 text-gold";

  return (
    <section id="booking" className="py-32 relative overflow-hidden">
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
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="rounded-[2rem] bg-card p-8 md:p-10 border border-border/50 shadow-soft"
          >
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
              <div className="relative pb-5">
                <User size={16} className={iconCls} />
                <input {...register("name")} placeholder="Full name" maxLength={80} className="w-full bg-transparent border-b border-border/70 focus:border-gold outline-none py-3 pl-9 pr-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors" />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>

              <div className="relative pb-5">
                <Phone size={16} className={iconCls} />
                <input {...register("phone")} placeholder="Phone number" maxLength={20} className="w-full bg-transparent border-b border-border/70 focus:border-gold outline-none py-3 pl-9 pr-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors" />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
              </div>

              <div className="relative pb-5 sm:col-span-2">
                <Mail size={16} className={iconCls} />
                <input {...register("email")} type="email" placeholder="Email address" maxLength={255} className="w-full bg-transparent border-b border-border/70 focus:border-gold outline-none py-3 pl-9 pr-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors" />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
              </div>

              {/* Custom Service Dropdown */}
              <div className="relative pb-5 sm:col-span-2" ref={serviceRef}>
                <Sparkles size={16} className={iconCls} />
                <div 
                  onClick={() => setServiceOpen(!serviceOpen)}
                  className={inputCls}
                >
                  <span className={selectedService ? "text-foreground" : "text-muted-foreground/60"}>
                    {selectedService || "Select a service or package"}
                  </span>
                  <ChevronDown size={14} className={`text-gold transition-transform duration-300 ${serviceOpen ? "rotate-180" : ""}`} />
                </div>
                
                <AnimatePresence>
                  {serviceOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute left-0 right-0 top-full mt-2 z-20 max-h-80 overflow-y-auto rounded-2xl bg-white/90 backdrop-blur-xl border border-gold/20 shadow-glow p-2 scrollbar-hide"
                    >
                      {categories.map((cat) => (
                        <div key={cat.label} className="mb-2">
                          <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-gold font-semibold">{cat.label}</div>
                          {cat.options.map((s) => (
                            <div
                              key={s}
                              onClick={() => {
                                setValue("service", s, { shouldValidate: true });
                                setServiceOpen(false);
                              }}
                              className={`px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                                selectedService === s ? "bg-gold/10 text-primary font-medium" : "text-foreground/80 hover:bg-cream"
                              }`}
                            >
                              {s}
                            </div>
                          ))}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                {errors.service && <p className="text-xs text-destructive mt-1">{errors.service.message}</p>}
              </div>

              <div className="relative pb-5">
                <Calendar size={16} className={iconCls} />
                <input {...register("date")} type="date" min={today} className="w-full bg-transparent border-b border-border/70 focus:border-gold outline-none py-3 pl-9 pr-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors" />
                {errors.date && <p className="text-xs text-destructive mt-1">{errors.date.message}</p>}
              </div>

              {/* Custom Time Dropdown */}
              <div className="relative pb-5" ref={timeRef}>
                <Clock size={16} className={iconCls} />
                <div 
                  onClick={() => setTimeOpen(!timeOpen)}
                  className={inputCls}
                >
                  <span className={selectedTime ? "text-foreground" : "text-muted-foreground/60"}>
                    {selectedTime || "Preferred time"}
                  </span>
                  <ChevronDown size={14} className={`text-gold transition-transform duration-300 ${timeOpen ? "rotate-180" : ""}`} />
                </div>

                <AnimatePresence>
                  {timeOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
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
                                <div
                                  key={t}
                                  onClick={() => {
                                    setValue("time", t, { shouldValidate: true });
                                    setTimeOpen(false);
                                  }}
                                  className={`px-3 py-2 rounded-xl text-xs text-center transition-colors cursor-pointer border ${
                                    selectedTime === t 
                                      ? "bg-gold/15 border-gold/40 text-primary font-medium" 
                                      : "border-transparent text-foreground/70 hover:bg-cream hover:border-gold/10"
                                  }`}
                                >
                                  {t.replace(" AM", "").replace(" PM", "")}
                                  <span className="ml-1 opacity-40 text-[9px]">{t.slice(-2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {errors.time && <p className="text-xs text-destructive mt-1">{errors.time.message}</p>}
              </div>

              <div className="sm:col-span-2 pt-2">
                <textarea
                  {...register("notes")}
                  placeholder="Anything we should know? (allergies, preferences, occasion)"
                  maxLength={500}
                  rows={3}
                  className="w-full bg-cream/50 rounded-2xl p-4 text-sm outline-none border border-transparent focus:border-gold transition-colors resize-none placeholder:text-muted-foreground/60"
                />
                {errors.notes && <p className="text-xs text-destructive mt-1">{errors.notes.message}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 text-sm tracking-wide text-primary-foreground hover:bg-teal disabled:opacity-60 transition-all shadow-soft hover:shadow-glow"
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
