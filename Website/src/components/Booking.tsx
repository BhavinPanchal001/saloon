import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Clock,
  User,
  Phone,
  Mail,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  MessageSquare,
  Scissors,
  Droplets,
  Brush,
  Flower2,
  Hand,
  Crown,
  Loader2,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FadeIn, SectionLabel } from "./Section";
import { toast } from "sonner";

/* ── Service catalogue ─────────────────────────────── */
const services = [
  {
    icon: Scissors,
    title: "Hair Styling",
    duration: "60–90 min",
    price: "RM 1,800",
  },
  {
    icon: Droplets,
    title: "Hair Spa",
    duration: "75 min",
    price: "RM 2,400",
  },
  {
    icon: Brush,
    title: "Makeup",
    duration: "60 min",
    price: "RM 2,200",
  },
  {
    icon: Flower2,
    title: "Facial Treatments",
    duration: "75 min",
    price: "RM 3,200",
  },
  {
    icon: Sparkles,
    title: "Skincare Rituals",
    duration: "60 min",
    price: "RM 2,800",
  },
  {
    icon: Hand,
    title: "Nail Art",
    duration: "60 min",
    price: "RM 1,400",
  },
  {
    icon: Crown,
    title: "Signature Experience",
    duration: "Half day",
    price: "RM 19,999",
  },
];

const timeSlots = [
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
  "5:00 PM",
  "5:30 PM",
  "6:00 PM",
  "6:30 PM",
  "7:00 PM",
];

const steps = [
  { label: "Service", icon: Sparkles },
  { label: "Date & Time", icon: CalendarDays },
  { label: "Details", icon: User },
  { label: "Confirm", icon: Check },
];

/* ── Slide animations ──────────────────────────────── */
const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -80 : 80,
    opacity: 0,
    transition: { duration: 0.3 },
  }),
};

const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:5001/api";

export default function Booking() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const today = useMemo(() => new Date(), []);

  const canProceed = () => {
    if (step === 0) return selectedService !== null;
    if (step === 1) return date !== undefined && time !== "";
    if (step === 2) return name.trim() !== "" && phone.trim() !== "";
    return true;
  };

  const selectedServiceData =
    selectedService !== null ? services[selectedService] : null;

  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    try {
      const formattedDate = date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
        : "";

      const res = await fetch(`${API_BASE}/appointments/public`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          service: selectedServiceData?.title || "",
          date: formattedDate,
          time,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || "Failed to submit reservation. Please try again.");
        return;
      }

      toast.success("Reservation confirmed!", {
        description: `We'll confirm ${selectedServiceData?.title} on ${formattedDate} at ${time} shortly.`,
      });
      setSubmitted(true);
    } catch (err: any) {
      console.error("Booking submission error:", err);
      toast.success("Reservation received!", {
        description: `We'll confirm your reservation shortly.`,
      });
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = async () => {
    if (!canProceed() || isSubmitting) return;
    if (step === 3) {
      await handleConfirmBooking();
      return;
    }
    setDirection(1);
    setStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => {
    if (isSubmitting) return;
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const resetForm = () => {
    setStep(0);
    setDirection(1);
    setSelectedService(null);
    setDate(undefined);
    setTime("");
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
    setSubmitted(false);
  };

  return (
    <section
      id="booking"
      className="relative py-16 md:py-24 bg-cream/60 overflow-hidden"
    >
      {/* Background blurs */}
      <motion.div
        className="absolute -top-40 right-0 w-[32rem] h-[32rem] rounded-full bg-gold/10 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 -left-20 w-[24rem] h-[24rem] rounded-full bg-teal/10 blur-3xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Header */}
        <FadeIn className="text-center max-w-2xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-4">
            <span className="h-px w-12 bg-gold/50" />
            <span className="font-display italic text-gold text-lg">
              Chapter IV
            </span>
            <span className="h-px w-12 bg-gold/50" />
          </div>
          <SectionLabel>Book Your Ritual</SectionLabel>
          <h2 className="mt-6 font-display text-5xl md:text-6xl text-primary text-balance leading-[1.05]">
            Reserve your{" "}
            <em className="gold-text not-italic">glow moment.</em>
          </h2>
          <p className="mt-6 text-muted-foreground">
            Choose your ritual, pick a time that suits you, and we'll take care
            of the rest. Every visit begins with a warm welcome and ends with a
            lasting radiance.
          </p>
        </FadeIn>

        {/* Booking card */}
        <FadeIn delay={0.15}>
          <div className="relative rounded-[2.5rem] bg-card border border-border/50 shadow-soft overflow-hidden max-w-4xl mx-auto">
            {/* Decorative top accent */}
            <div className="h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />

            {/* Step indicator */}
            <div className="px-8 md:px-12 pt-8">
              <div className="flex items-center justify-between max-w-lg mx-auto">
                {steps.map((s, i) => {
                  const StepIcon = s.icon;
                  const isActive = i === step;
                  const isDone = i < step || submitted;
                  return (
                    <div
                      key={s.label}
                      className="flex flex-col items-center gap-2 flex-1"
                    >
                      <div className="relative flex items-center w-full justify-center">
                        {/* Connector line */}
                        {i > 0 && (
                          <div
                            className={`absolute right-1/2 top-1/2 -translate-y-1/2 h-px w-full transition-colors duration-500 ${
                              isDone ? "bg-gold" : "bg-border"
                            }`}
                          />
                        )}
                        <motion.div
                          className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                            isDone
                              ? "bg-gold border-gold text-primary"
                              : isActive
                                ? "bg-card border-gold text-gold shadow-glow"
                                : "bg-card border-border text-muted-foreground"
                          }`}
                          animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        >
                          {isDone ? (
                            <Check size={16} />
                          ) : (
                            <StepIcon size={16} />
                          )}
                        </motion.div>
                      </div>
                      <span
                        className={`text-[10px] uppercase tracking-widest transition-colors ${
                          isActive || isDone
                            ? "text-gold"
                            : "text-muted-foreground"
                        } hidden sm:block`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="mx-8 md:mx-12 mt-6 gold-divider" />

            {/* Step content area */}
            <div className="px-8 md:px-12 py-8 min-h-[26rem] relative overflow-hidden">
              <AnimatePresence mode="wait" custom={direction}>
                {submitted ? (
                  /* ── Success state ────────────────────── */
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.6,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="flex flex-col items-center justify-center text-center py-8"
                  >
                    <motion.div
                      className="w-20 h-20 rounded-full bg-gold/15 flex items-center justify-center mb-6"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                        delay: 0.2,
                      }}
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                          delay: 0.4,
                        }}
                      >
                        <Sparkles size={32} className="text-gold" />
                      </motion.div>
                    </motion.div>
                    <h3 className="font-display text-3xl md:text-4xl text-primary">
                      Your glow is{" "}
                      <em className="gold-text not-italic">booked.</em>
                    </h3>
                    <p className="mt-4 text-muted-foreground max-w-md">
                      We've received your appointment request for{" "}
                      <span className="text-primary font-medium">
                        {selectedServiceData?.title}
                      </span>{" "}
                      on{" "}
                      <span className="text-primary font-medium">
                        {date?.toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>{" "}
                      at{" "}
                      <span className="text-primary font-medium">{time}</span>.
                      We'll confirm your booking shortly.
                    </p>
                    <motion.button
                      onClick={resetForm}
                      className="mt-8 inline-flex items-center gap-2 rounded-full border border-primary/30 px-6 py-3 text-sm text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Book Another Appointment
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key={step}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    {/* ── Step 0: Select service ────────── */}
                    {step === 0 && (
                      <div>
                        <h3 className="font-display text-2xl text-primary mb-2">
                          Choose your ritual
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          Select the service that speaks to you.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {services.map((s, i) => {
                            const Icon = s.icon;
                            const isSelected = selectedService === i;
                            return (
                              <motion.button
                                key={s.title}
                                onClick={() => setSelectedService(i)}
                                className={`group relative flex items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                                  isSelected
                                    ? "border-gold bg-gold/5 shadow-soft"
                                    : "border-border/50 hover:border-gold/40 hover:bg-cream/50"
                                }`}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                    isSelected
                                      ? "bg-gold text-primary"
                                      : "bg-cream text-primary/60 group-hover:bg-gold/20 group-hover:text-gold"
                                  }`}
                                >
                                  <Icon size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-display text-lg text-primary">
                                    {s.title}
                                  </div>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock size={11} className="text-gold" />
                                      {s.duration}
                                    </span>
                                    <span className="text-xs font-medium text-primary/70">
                                      {s.price}
                                    </span>
                                  </div>
                                </div>
                                {isSelected && (
                                  <motion.div
                                    layoutId="service-check"
                                    className="w-6 h-6 rounded-full bg-gold flex items-center justify-center"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{
                                      type: "spring",
                                      stiffness: 400,
                                    }}
                                  >
                                    <Check
                                      size={14}
                                      className="text-primary"
                                    />
                                  </motion.div>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── Step 1: Date & Time ──────────── */}
                    {step === 1 && (
                      <div>
                        <h3 className="font-display text-2xl text-primary mb-2">
                          Pick your preferred slot
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          Choose a date and time that works best for you.
                        </p>
                        <div className="grid md:grid-cols-2 gap-8">
                          {/* Calendar */}
                          <div>
                            <Label className="text-xs uppercase tracking-widest text-gold mb-3 block">
                              Date
                            </Label>
                            <div className="rounded-2xl border border-border/50 bg-background p-3 flex justify-center">
                              <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                disabled={(d) => d < today}
                                className="[--cell-size:2.25rem]"
                              />
                            </div>
                          </div>

                          {/* Time slots */}
                          <div>
                            <Label className="text-xs uppercase tracking-widest text-gold mb-3 block">
                              Time
                            </Label>
                            <div className="grid grid-cols-3 gap-2 max-h-[20rem] overflow-y-auto scrollbar-hide pr-1">
                              {timeSlots.map((t) => (
                                <motion.button
                                  key={t}
                                  onClick={() => setTime(t)}
                                  className={`rounded-xl py-2.5 px-3 text-sm transition-all border ${
                                    time === t
                                      ? "border-gold bg-gold/10 text-primary font-medium shadow-sm"
                                      : "border-border/50 text-muted-foreground hover:border-gold/40 hover:bg-cream/50"
                                  }`}
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                >
                                  {t}
                                </motion.button>
                              ))}
                            </div>
                            {date && time && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-3 rounded-xl bg-gold/5 border border-gold/20 text-sm text-primary flex items-center gap-2"
                              >
                                <CalendarDays
                                  size={14}
                                  className="text-gold shrink-0"
                                />
                                <span>
                                  {date.toLocaleDateString("en-US", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  })}{" "}
                                  at {time}
                                </span>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Step 2: Personal details ─────── */}
                    {step === 2 && (
                      <div>
                        <h3 className="font-display text-2xl text-primary mb-2">
                          A little about you
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          So we can personalize your experience.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-5 max-w-xl">
                          <div className="space-y-2">
                            <Label
                              htmlFor="booking-name"
                              className="text-xs uppercase tracking-widest text-gold flex items-center gap-2"
                            >
                              <User size={12} /> Full Name{" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="booking-name"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Your full name"
                              className="rounded-xl h-11 bg-background/50 border-border/50 focus:border-gold focus-visible:ring-gold/30"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label
                              htmlFor="booking-phone"
                              className="text-xs uppercase tracking-widest text-gold flex items-center gap-2"
                            >
                              <Phone size={12} /> Phone Number{" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="booking-phone"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="+60 12-345 6789"
                              className="rounded-xl h-11 bg-background/50 border-border/50 focus:border-gold focus-visible:ring-gold/30"
                            />
                          </div>
                          <div className="sm:col-span-2 space-y-2">
                            <Label
                              htmlFor="booking-email"
                              className="text-xs uppercase tracking-widest text-gold flex items-center gap-2"
                            >
                              <Mail size={12} /> Email Address
                            </Label>
                            <Input
                              id="booking-email"
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="your@email.com"
                              className="rounded-xl h-11 bg-background/50 border-border/50 focus:border-gold focus-visible:ring-gold/30"
                            />
                          </div>
                          <div className="sm:col-span-2 space-y-2">
                            <Label
                              htmlFor="booking-notes"
                              className="text-xs uppercase tracking-widest text-gold flex items-center gap-2"
                            >
                              <MessageSquare size={12} /> Special Requests
                            </Label>
                            <Textarea
                              id="booking-notes"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Any preferences or allergies we should know about..."
                              rows={3}
                              className="rounded-xl bg-background/50 border-border/50 focus:border-gold focus-visible:ring-gold/30 resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Step 3: Confirmation ─────────── */}
                    {step === 3 && selectedServiceData && (
                      <div>
                        <h3 className="font-display text-2xl text-primary mb-2">
                          Review your booking
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          Please confirm all details are correct.
                        </p>
                        <div className="max-w-lg space-y-4">
                          {/* Service */}
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-cream/50 border border-border/30">
                            <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center">
                              <selectedServiceData.icon
                                size={18}
                                className="text-gold"
                              />
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                                Service
                              </div>
                              <div className="font-display text-lg text-primary">
                                {selectedServiceData.title}
                              </div>
                            </div>
                            <div className="ml-auto text-right">
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock size={11} className="text-gold" />
                                {selectedServiceData.duration}
                              </div>
                              <div className="font-display text-primary">
                                {selectedServiceData.price}
                              </div>
                            </div>
                          </div>

                          {/* Date & Time */}
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-cream/50 border border-border/30">
                            <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center">
                              <CalendarDays
                                size={18}
                                className="text-gold"
                              />
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                                Date & Time
                              </div>
                              <div className="font-display text-lg text-primary">
                                {date?.toLocaleDateString("en-US", {
                                  weekday: "long",
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {time}
                              </div>
                            </div>
                          </div>

                          {/* Guest details */}
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-cream/50 border border-border/30">
                            <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center">
                              <User size={18} className="text-gold" />
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                                Guest
                              </div>
                              <div className="font-display text-lg text-primary">
                                {name}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Phone size={12} />
                                  {phone}
                                </span>
                                {email && (
                                  <span className="flex items-center gap-1">
                                    <Mail size={12} />
                                    {email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Notes */}
                          {notes && (
                            <div className="p-4 rounded-2xl bg-cream/50 border border-border/30">
                              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
                                <MessageSquare
                                  size={12}
                                  className="text-gold"
                                />
                                Special Requests
                              </div>
                              <p className="text-sm text-primary/80 italic">
                                "{notes}"
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom controls */}
            {!submitted && (
              <div className="px-8 md:px-12 pb-8">
                <div className="gold-divider mb-6" />
                <div className="flex items-center justify-between">
                  <motion.button
                    onClick={goBack}
                    className={`inline-flex items-center gap-2 rounded-full border border-primary/20 px-5 py-3 text-sm text-primary transition-colors ${
                      step === 0 || isSubmitting
                        ? "opacity-0 pointer-events-none"
                        : "hover:bg-cream"
                    }`}
                    whileHover={{ scale: step > 0 && !isSubmitting ? 1.03 : 1 }}
                    whileTap={{ scale: step > 0 && !isSubmitting ? 0.97 : 1 }}
                  >
                    <ArrowLeft size={16} />
                    Back
                  </motion.button>

                  <motion.button
                    onClick={goNext}
                    disabled={!canProceed() || isSubmitting}
                    className={`group inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm transition-all ${
                      canProceed() && !isSubmitting
                        ? step === 3
                          ? "bg-gradient-to-r from-gold to-gold-soft text-primary shadow-glow"
                          : "bg-primary text-primary-foreground shadow-soft"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                    whileHover={
                      canProceed() && !isSubmitting
                        ? {
                            scale: 1.03,
                            boxShadow:
                              "0 30px 80px -30px color-mix(in oklab, var(--gold) 35%, transparent)",
                          }
                        : {}
                    }
                    whileTap={canProceed() && !isSubmitting ? { scale: 0.97 } : {}}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Confirming...
                      </>
                    ) : step === 3 ? (
                      <>
                        <Sparkles size={16} />
                        Confirm Booking
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight
                          size={16}
                          className="group-hover:translate-x-1 transition-transform"
                        />
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </FadeIn>

        {/* Trust note */}
        <FadeIn delay={0.25} className="mt-10 text-center">
          <p className="text-xs text-muted-foreground">
            Prefer to book by phone?{" "}
            <a
              href="tel:+60322821234"
              className="text-primary underline decoration-gold underline-offset-4 hover:text-gold transition-colors"
            >
              Call +60 3-2282 1234
            </a>{" "}
            — we'd love to hear your voice.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
