import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Phone,
  Mail,
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  HeartHandshake,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { FadeIn, SectionLabel } from "./Section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const ritualInterests = [
  "Hair & Scalp Rituals",
  "Bespoke Facial & Skincare",
  "Bridal & Special Occasion",
  "Nail Art & Hand Spa",
  "Full Day Sanctuary Package",
];

export default function Consultation() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedInterest, setSelectedInterest] = useState(ritualInterests[0]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      toast.error("Please enter your first name");
      return;
    }
    if (!phone.trim()) {
      toast.error("Please provide your phone number so we can reach you");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      toast.success("Consultation Request Received", {
        description: `Thank you ${firstName.trim()}! Our master ritualist will contact you shortly.`,
      });
    }, 900);
  };

  const handleReset = () => {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setMessage("");
    setSelectedInterest(ritualInterests[0]);
    setSubmitted(false);
  };

  return (
    <section
      id="consultation"
      className="relative py-20 md:py-28 bg-gradient-to-b from-background via-cream/40 to-background overflow-hidden"
    >
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -right-24 w-96 h-96 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-teal/10 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <FadeIn>
            <SectionLabel>Personal Consultation</SectionLabel>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl md:text-5xl text-primary tracking-tight">
              Compose Your Bespoke Ritual
            </h2>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
              Seeking tailored beauty guidance, bridal care, or a customized hair & skin regimen? 
              Share your details and our senior ritualists will compose a personalized itinerary.
            </p>
          </FadeIn>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-stretch max-w-5xl mx-auto">
          {/* Left card: Highlights & concierge note */}
          <FadeIn delay={0.15} className="lg:col-span-5 h-full">
            <div className="h-full rounded-[2rem] bg-gradient-to-br from-primary via-teal-deep to-primary text-primary-foreground p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden shadow-elevated border border-gold/20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/20 border border-gold/30 text-xs uppercase tracking-widest text-gold-soft mb-6">
                  <Sparkles size={13} className="text-gold" />
                  White-Glove Concierge
                </div>

                <h3 className="font-display text-2xl sm:text-3xl text-ivory mb-4 leading-snug">
                  Personalized care, from the very first step.
                </h3>

                <p className="text-sm text-ivory/80 leading-relaxed mb-8">
                  Every ritual at Glowy begins with attentive listening. Tell us your preferences,
                  schedule constraints, or beauty goals.
                </p>

                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock size={15} className="text-gold" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-ivory">Prompt Concierge Reply</h4>
                      <p className="text-xs text-ivory/70">Personal response via WhatsApp or call within 2 hours.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center shrink-0 mt-0.5">
                      <HeartHandshake size={15} className="text-gold" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-ivory">Custom Tailored Programs</h4>
                      <p className="text-xs text-ivory/70">Specially crafted for bridal prep, hair revitalization, or sensitive skin.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck size={15} className="text-gold" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-ivory">Zero Obligation</h4>
                      <p className="text-xs text-ivory/70">Complimentary consultation without any pressure or rush.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 text-xs text-ivory/60 flex items-center justify-between">
                <span>Direct Hotline</span>
                <a
                  href="tel:+60322821234"
                  className="text-gold hover:text-gold-soft underline underline-offset-2 transition-colors"
                >
                  +60 3-2282 1234
                </a>
              </div>
            </div>
          </FadeIn>

          {/* Right card: Form with First & Last Name fields */}
          <FadeIn delay={0.25} className="lg:col-span-7 h-full">
            <div className="h-full rounded-[2rem] bg-card/85 backdrop-blur-xl border border-border/80 shadow-soft p-8 sm:p-10 flex flex-col justify-center">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-10 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-gold/15 text-gold flex items-center justify-center mx-auto mb-5 shadow-soft">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="font-display text-2xl text-primary mb-2">
                    Inquiry Received, {firstName}!
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                    Our concierge team has received your request for{" "}
                    <span className="font-medium text-primary">{selectedInterest}</span>. We will reach out to you at{" "}
                    <span className="font-medium text-primary">{phone}</span> shortly.
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-6 py-2.5 text-sm font-medium text-primary hover:bg-cream hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    Submit Another Request
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-2">
                    <div className="text-xs uppercase tracking-widest text-gold font-medium">
                      Guest Information
                    </div>
                    <span className="text-xs text-muted-foreground">* Required fields</span>
                  </div>

                  {/* ── First & Last Name Fields ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="consultation-first-name"
                        className="text-xs uppercase tracking-wider text-primary/80 font-medium flex items-center gap-1.5"
                      >
                        <User size={13} className="text-gold" />
                        First Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="consultation-first-name"
                        name="firstName"
                        type="text"
                        autoComplete="given-name"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="e.g. Eleanor"
                        className="rounded-xl h-11 bg-background/50 border-border/70 focus:border-gold focus-visible:ring-gold/25 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="consultation-last-name"
                        className="text-xs uppercase tracking-wider text-primary/80 font-medium flex items-center gap-1.5"
                      >
                        <User size={13} className="text-gold" />
                        Last Name
                      </Label>
                      <Input
                        id="consultation-last-name"
                        name="lastName"
                        type="text"
                        autoComplete="family-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="e.g. Vance"
                        className="rounded-xl h-11 bg-background/50 border-border/70 focus:border-gold focus-visible:ring-gold/25 transition-all"
                      />
                    </div>
                  </div>

                  {/* ── Phone & Email Fields ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="consultation-phone"
                        className="text-xs uppercase tracking-wider text-primary/80 font-medium flex items-center gap-1.5"
                      >
                        <Phone size={13} className="text-gold" />
                        Phone Number <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="consultation-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+60 12-345 6789"
                        className="rounded-xl h-11 bg-background/50 border-border/70 focus:border-gold focus-visible:ring-gold/25 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="consultation-email"
                        className="text-xs uppercase tracking-wider text-primary/80 font-medium flex items-center gap-1.5"
                      >
                        <Mail size={13} className="text-gold" />
                        Email Address
                      </Label>
                      <Input
                        id="consultation-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="eleanor@example.com"
                        className="rounded-xl h-11 bg-background/50 border-border/70 focus:border-gold focus-visible:ring-gold/25 transition-all"
                      />
                    </div>
                  </div>

                  {/* ── Ritual Interest Selection ── */}
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-primary/80 font-medium flex items-center gap-1.5">
                      <Sparkles size={13} className="text-gold" />
                      Area of Interest
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {ritualInterests.map((interest) => (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => setSelectedInterest(interest)}
                          className={`text-xs px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                            selectedInterest === interest
                              ? "bg-gold/15 border-gold text-primary font-medium shadow-sm"
                              : "border-border/60 bg-cream/30 text-muted-foreground hover:border-gold/40 hover:text-foreground"
                          }`}
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Message / Note ── */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="consultation-message"
                      className="text-xs uppercase tracking-wider text-primary/80 font-medium flex items-center gap-1.5"
                    >
                      <MessageSquare size={13} className="text-gold" />
                      Your Vision or Questions
                    </Label>
                    <Textarea
                      id="consultation-message"
                      name="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us about your preferred timing, specific skin or hair concerns, or upcoming events..."
                      rows={3}
                      className="rounded-xl bg-background/50 border-border/70 focus:border-gold focus-visible:ring-gold/25 resize-none transition-all"
                    />
                  </div>

                  {/* ── Submit button ── */}
                  <div className="pt-2">
                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-gold via-gold-soft to-gold text-primary font-medium text-sm flex items-center justify-center gap-2 shadow-glow hover:brightness-105 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <span>Submitting Your Inquiry...</span>
                      ) : (
                        <>
                          <Send size={15} />
                          <span>Request Bespoke Consultation</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              )}
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
