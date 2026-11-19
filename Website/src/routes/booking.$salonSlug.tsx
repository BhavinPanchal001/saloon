import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";

const fixtureSalons = {
  "pc2-aster": {
    name: "Aster Sample Salon",
    outlets: ["PC2-A1", "PC2-A2"],
    services: ["Haircut", "Scalp treatment"],
  },
  "pc2-birch": {
    name: "Birch Sample Salon",
    outlets: ["PC2-B1"],
    services: ["Haircut", "Manicure"],
  },
};

export const Route = createFileRoute("/booking/$salonSlug")({
  loader: ({ params }) => {
    if (!import.meta.env.DEV || !Object.hasOwn(fixtureSalons, params.salonSlug)) throw notFound();
    return fixtureSalons[params.salonSlug as keyof typeof fixtureSalons];
  },
  component: SalonBookingPreview,
});

function SalonBookingPreview() {
  const salon = Route.useLoaderData();
  const { salonSlug } = Route.useParams();
  return <BookingForm key={salonSlug} salon={salon} />;
}

function BookingForm({ salon }: { salon: (typeof fixtureSalons)[keyof typeof fixtureSalons] }) {
  const [outlet, setOutlet] = useState("");
  const [service, setService] = useState("");
  const [date, setDate] = useState("");

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-semibold">{salon.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Booking preview with sample data. Appointments are unavailable in this preview.
      </p>
      <form className="mt-8 grid gap-5" onSubmit={(event) => event.preventDefault()}>
        <label className="grid gap-2 font-medium">
          Outlet
          <select className="rounded border bg-background p-2" required value={outlet} onChange={(event) => setOutlet(event.target.value)}>
            <option value="" disabled>Select an outlet</option>
            {salon.outlets.map((entry) => <option key={entry}>{entry}</option>)}
          </select>
        </label>
        <label className="grid gap-2 font-medium">
          Service
          <select className="rounded border bg-background p-2" required value={service} onChange={(event) => setService(event.target.value)}>
            <option value="" disabled>Select a service</option>
            {salon.services.map((entry) => <option key={entry}>{entry}</option>)}
          </select>
        </label>
        <label className="grid gap-2 font-medium">
          Preferred date
          <input className="rounded border bg-background p-2" type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        {outlet && service && date && (
          <p role="status" className="rounded border p-3">{service} at {outlet} on {date}</p>
        )}
      </form>
    </main>
  );
}
