import g1 from "@/assets/g1.jpg";
import g2 from "@/assets/g2.jpg";
import g3 from "@/assets/g3.jpg";
import g4 from "@/assets/g4.jpg";
import g5 from "@/assets/g5.jpg";
import g6 from "@/assets/g6.jpg";
import { FadeIn, SectionLabel } from "./Section";

const images = [
  { src: g1, span: "row-span-2" },
  { src: g2, span: "" },
  { src: g3, span: "row-span-2" },
  { src: g4, span: "" },
  { src: g5, span: "row-span-2" },
  { src: g6, span: "" },
];

export default function Gallery() {
  return (
    <section id="gallery" className="py-32 bg-cream/60">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
          <FadeIn>
            <SectionLabel>Gallery</SectionLabel>
            <h2 className="mt-6 font-display text-5xl md:text-6xl text-primary text-balance leading-[1.05]">
              Moments of <em className="gold-text not-italic">slow beauty.</em>
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="max-w-sm text-muted-foreground">
              A scrapbook of soft light, careful hands, and quiet transformations.
            </p>
          </FadeIn>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 auto-rows-[180px] md:auto-rows-[240px] gap-4">
          {images.map((im, i) => (
            <FadeIn key={i} delay={i * 0.05} className={im.span}>
              <div className="group relative h-full w-full overflow-hidden rounded-3xl shadow-soft">
                <img
                  src={im.src}
                  alt="Glowy gallery"
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
