import Link from "next/link";

export default function PricingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Pricing</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Plans are billed in ZMW. Amounts shown in kwacha; the API stores ngwee.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PlanCard
          name="Mwana"
          price="K0"
          bullets={["5 matches / month", "WhatsApp alerts", "Basic matching"]}
        />
        <PlanCard
          name="Mwezi"
          price="K79 / month"
          bullets={["25 matches / month", "CV generation", "Priority matching"]}
          highlight
        />
        <PlanCard
          name="Bwino"
          price="K199 / month"
          bullets={["Unlimited matches", "Cover letters", "Career coaching"]}
        />
      </div>

      <div className="flex gap-3">
        <Link
          href="/profile"
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Back to profile
        </Link>
        <Link href="/" className="rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900">
          Home
        </Link>
      </div>
    </main>
  );
}

function PlanCard({
  name,
  price,
  bullets,
  highlight,
}: {
  name: string;
  price: string;
  bullets: string[];
  highlight?: boolean;
}) {
  return (
    <section
      className={[
        "rounded-xl border p-4",
        highlight
          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
      ].join(" ")}
    >
      <h2 className="text-lg font-semibold">{name}</h2>
      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{price}</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </section>
  );
}
