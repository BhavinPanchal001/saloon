import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Scale } from "lucide-react";
import { FadeIn, SectionLabel } from "@/components/Section";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const Route = createFileRoute("/terms-conditions")({
  component: TermsConditions,
});

function TermsConditions() {
  return (
    <main className="min-h-screen bg-background overflow-x-hidden pt-20">
      <Navbar />

      <section className="py-24 relative overflow-hidden">
        <div className="absolute top-20 -left-20 w-[30rem] h-[30rem] rounded-full bg-gold/5 blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-[30rem] h-[30rem] rounded-full bg-teal/5 blur-3xl" />

        <div className="mx-auto max-w-4xl px-6 relative">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-12"
          >
            <ArrowLeft size={14} /> Back to Home
          </Link>

          <FadeIn>
            <div className="mb-16">
              <SectionLabel>Our Agreement & Standards</SectionLabel>
              <h1 className="mt-6 font-display text-5xl md:text-6xl text-primary leading-tight">
                Terms & <em className="gold-text not-italic">Conditions.</em>
              </h1>
              <p className="mt-6 text-sm text-muted-foreground">
                Last updated: May 21, 2026
              </p>
              <div className="h-px bg-border mt-8" />
            </div>
          </FadeIn>

          <div className="space-y-12 text-foreground/80 leading-relaxed">
            <FadeIn delay={0.05}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10 text-gold text-sm font-medium">
                    1
                  </span>
                  <h2 className="font-display text-2xl text-primary md:text-3xl">Acceptance of Terms</h2>
                </div>
                <p className="pl-11 text-sm md:text-base text-muted-foreground">
                  Welcome to Glowy. By accessing our platform, booking rituals, or entering our sanctuary, you agree to comply with and be bound by the following Terms & Conditions. These terms govern the relationship between Glowy and our valued guests. Please read them thoroughly before utilizing our digital booking features or services.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10 text-gold text-sm font-medium">
                    2
                  </span>
                  <h2 className="font-display text-2xl text-primary md:text-3xl">Appointment Booking & Cancellation</h2>
                </div>
                <div className="pl-11 space-y-3 text-sm md:text-base text-muted-foreground">
                  <p>
                    To maintain our dedicated studio schedule and prepare custom botanical ingredients, we enforce a strict booking standard:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Booking Guarantee:</strong> All premium appointments must be secured with valid contact details and payment pre-authorization when required.</li>
                    <li><strong>Cancellation Window:</strong> We request a minimum of 24 hours notice for any cancellations or rescheduling requests. Cancellations made with less than 24 hours notice may incur a cancellation charge up to 50% of the scheduled service value.</li>
                    <li><strong>No-Show Policy:</strong> Guests who do not arrive for their scheduled rituals without prior communication will be billed for the full cost of the treatment.</li>
                  </ul>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.15}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10 text-gold text-sm font-medium">
                    3
                  </span>
                  <h2 className="font-display text-2xl text-primary md:text-3xl">Studio Etiquette & Safety</h2>
                </div>
                <p className="pl-11 text-sm md:text-base text-muted-foreground">
                  To ensure a calm, sensory, and luxurious atmosphere for all guests, we ask that you silence mobile devices upon entering the studio. Please arrive 10-15 minutes prior to your booking to indulge in a welcome herbal tea and fill out skin assessment details. Please disclose any skin sensitivities, medical histories, or specific preferences to your ritual specialist before starting any service.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10 text-gold text-sm font-medium">
                    4
                  </span>
                  <h2 className="font-display text-2xl text-primary md:text-3xl">Boutique Purchase Policies</h2>
                </div>
                <p className="pl-11 text-sm md:text-base text-muted-foreground">
                  Products purchased from our online boutique or in-store showroom are eligible for exchange or store credit within 14 days of purchase, provided they are completely unopened, unused, and in their pristine original packaging. Due to hygiene standards, open skincare, botanical oils, or custom cosmetic formulas are strictly non-refundable and non-exchangeable.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.25}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10 text-gold text-sm font-medium">
                    5
                  </span>
                  <h2 className="font-display text-2xl text-primary md:text-3xl">Intellectual Property</h2>
                </div>
                <p className="pl-11 text-sm md:text-base text-muted-foreground">
                  All digital assets, photographic compositions, typography, logos, and custom copy hosted on this website are the absolute property of Glowy. Any unauthorized duplication, redistribution, or modification of these materials for commercial use is strictly prohibited.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10 text-gold text-sm font-medium">
                    6
                  </span>
                  <h2 className="font-display text-2xl text-primary md:text-3xl">Limitation of Liability</h2>
                </div>
                <p className="pl-11 text-sm md:text-base text-muted-foreground">
                  While our treatments utilize premium botanical and dermaceutical-grade ingredients, results may vary depending on skin types and pre-existing conditions. Glowy is not liable for minor adverse reactions arising from undeclared medical conditions, allergies, or neglect of post-treatment care routines recommended by our specialists.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.35}>
              <div className="rounded-3xl border border-gold/10 bg-cream/30 p-8 flex flex-col md:flex-row items-center gap-6 mt-16">
                <div className="h-12 w-12 rounded-full bg-gold/15 flex items-center justify-center text-gold shrink-0">
                  <Scale size={24} />
                </div>
                <div>
                  <h3 className="font-display text-xl text-primary">Need More Information?</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    If you have questions or require clarifications regarding our booking, cancellation, or treatment agreements, please reach out to our front desk at glowy.beautyspasb@gmail.com or call us directly.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
