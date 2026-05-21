import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Shield } from "lucide-react";
import { FadeIn, SectionLabel } from "@/components/Section";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
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
              <SectionLabel>Your Sanctuary & Trust</SectionLabel>
              <h1 className="mt-6 font-display text-5xl md:text-6xl text-primary leading-tight">
                Privacy <em className="gold-text not-italic">Policy.</em>
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
                  <h2 className="font-display text-2xl text-primary md:text-3xl">Introduction</h2>
                </div>
                <p className="pl-11 text-sm md:text-base text-muted-foreground">
                  At Glowy, we cherish the trust you place in us when sharing your personal information. As a sanctuary of soft luxury, quiet care, and botanical rituals, we are fully committed to protecting your privacy. This Privacy Policy details how we collect, use, disclose, and secure your personal data when you visit our beauty salon or interact with our online platform.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10 text-gold text-sm font-medium">
                    2
                  </span>
                  <h2 className="font-display text-2xl text-primary md:text-3xl">Information We Collect</h2>
                </div>
                <div className="pl-11 space-y-3 text-sm md:text-base text-muted-foreground">
                  <p>
                    We collect personal details that help us craft your signature rituals and optimize your bookings. This includes:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Contact Information:</strong> Your full name, telephone number, and email address.</li>
                    <li><strong>Appointment Details:</strong> Selected services, date, time, stylist preferences, and notes regarding custom botanical treatments.</li>
                    <li><strong>Health & Skin Consultation Data:</strong> Voluntary information regarding skin allergies, hair types, or unique wellness conditions to ensure safety during specialized treatment rituals.</li>
                    <li><strong>Payment Information:</strong> Credit card details or billing information processed securely via authorized third-party gateways.</li>
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
                  <h2 className="font-display text-2xl text-primary md:text-3xl">How We Use Your Information</h2>
                </div>
                <div className="pl-11 space-y-3 text-sm md:text-base text-muted-foreground">
                  <p>
                    Your data is curated with maximum discretion. We utilize your details solely to:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Process, manage, and verify your salon appointments and botanical consultations.</li>
                    <li>Deliver tailormade communication, appointment reminders, and newsletters with your consent.</li>
                    <li>Ensure safety and customization of luxury treatments tailored to your skin and health parameters.</li>
                    <li>Enhance our digital booking interface, boutique collections, and interactive guest experiences.</li>
                  </ul>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10 text-gold text-sm font-medium">
                    4
                  </span>
                  <h2 className="font-display text-2xl text-primary md:text-3xl">Data Protection & Discretion</h2>
                </div>
                <p className="pl-11 text-sm md:text-base text-muted-foreground">
                  We implement robust digital and physical security protocols to preserve the absolute confidentiality of your records. We never sell, rent, or trade your personal information to third parties. Access to your personal data is restricted to authorized specialists who require it to perform designated salon rituals.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.25}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10 text-gold text-sm font-medium">
                    5
                  </span>
                  <h2 className="font-display text-2xl text-primary md:text-3xl">Your Rights & Choices</h2>
                </div>
                <p className="pl-11 text-sm md:text-base text-muted-foreground">
                  You possess the complete freedom to access, correct, or request the deletion of your personal data at any moment. Additionally, you may unsubscribe from our seasonal promotions and newsletter updates via the links provided or by reaching out to our concierge desk at glowy.beautyspasb@gmail.com.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10 text-gold text-sm font-medium">
                    6
                  </span>
                  <h2 className="font-display text-2xl text-primary md:text-3xl">Updates to This Policy</h2>
                </div>
                <p className="pl-11 text-sm md:text-base text-muted-foreground">
                  We reserve the right to refine this Privacy Policy to reflect changes in our operational procedures or legal framework. We encourage our guests to review this page periodically to remain informed about our trust and privacy practices.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.35}>
              <div className="rounded-3xl border border-gold/10 bg-cream/30 p-8 flex flex-col md:flex-row items-center gap-6 mt-16">
                <div className="h-12 w-12 rounded-full bg-gold/15 flex items-center justify-center text-gold shrink-0">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="font-display text-xl text-primary">Need Clarification?</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    If you have questions regarding our data collection or quiet care principles, please reach out to our privacy representative at glowy.beautyspasb@gmail.com or call us directly.
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
