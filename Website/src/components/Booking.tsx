import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Calendar, Clock, User, Phone, Mail, Sparkles } from "lucide-react";
import { FadeIn, SectionLabel } from "./Section";

const services = [
  "Hair Styling",
  "Hair Spa",
  "Makeup",
  "Facial Treatment",
  "Skincare",
  "Nail Art",
  "Bridal Package",
];

const times = ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00"];

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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { service: "", time: "" } });

  const onSubmit = async (data: FormData) => {
    await new Promise((r) => setTimeout(r, 700));
    toast.success("Reservation received", {
      description: `We'll confirm ${data.service} on ${data.date} at ${data.time} shortly.`,
    });
    reset();
  };

  const inputCls =
    "w-full bg-transparent border-b border-border/70 focus:border-gold outline-none py-3 pl-9 pr-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors";
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
                <input {...register("name")} placeholder="Full name" maxLength={80} className={inputCls} />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>

              <div className="relative pb-5">
                <Phone size={16} className={iconCls} />
                <input {...register("phone")} placeholder="Phone number" maxLength={20} className={inputCls} />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
              </div>

              <div className="relative pb-5 sm:col-span-2">
                <Mail size={16} className={iconCls} />
                <input {...register("email")} type="email" placeholder="Email address" maxLength={255} className={inputCls} />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
              </div>

              <div className="relative pb-5 sm:col-span-2">
                <Sparkles size={16} className={iconCls} />
                <select {...register("service")} className={`${inputCls} appearance-none cursor-pointer`}>
                  <option value="">Select a service</option>
                  {services.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.service && <p className="text-xs text-destructive mt-1">{errors.service.message}</p>}
              </div>

              <div className="relative pb-5">
                <Calendar size={16} className={iconCls} />
                <input {...register("date")} type="date" min={today} className={inputCls} />
                {errors.date && <p className="text-xs text-destructive mt-1">{errors.date.message}</p>}
              </div>

              <div className="relative pb-5">
                <Clock size={16} className={iconCls} />
                <select {...register("time")} className={`${inputCls} appearance-none cursor-pointer`}>
                  <option value="">Preferred time</option>
                  {times.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
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
