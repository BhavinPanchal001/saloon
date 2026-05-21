import { FadeIn } from "./Section";

export default function Newsletter() {
  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-5xl px-6">
        <FadeIn>
          <div className="rounded-[2.5rem] bg-gradient-to-br from-cream via-nude/40 to-gold-soft/30 p-12 md:p-16 text-center relative overflow-hidden border border-gold/20">
            <div className="absolute inset-0 grain opacity-40" />
            <div className="relative">
              <div className="text-xs uppercase tracking-[0.3em] text-gold">Glow Letter</div>
              <h2 className="mt-4 font-display text-4xl md:text-5xl text-primary text-balance">
                Soft beauty notes, in your inbox.
              </h2>
              <p className="mt-4 text-muted-foreground max-w-md mx-auto">
                Seasonal rituals, member-only offerings, and quiet inspiration — once a month.
              </p>
              <form
                onSubmit={(e) => e.preventDefault()}
                className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto bg-card rounded-full p-2 shadow-soft"
              >
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  className="flex-1 bg-transparent px-5 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
                />
                <button className="rounded-full bg-gradient-to-r from-gold to-gold-soft text-primary px-6 py-3 text-sm hover:shadow-glow transition-shadow">
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
