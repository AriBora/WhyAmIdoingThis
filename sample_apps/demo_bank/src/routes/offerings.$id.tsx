import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { track, useScreenView } from "@/lib/analytics";
import { getOffering, applyPathFor, categoryLabels } from "@/lib/offerings";

export const Route = createFileRoute("/offerings/$id")({
  component: OfferingDetail,
});

function OfferingDetail() {
  const { id } = useParams({ from: "/offerings/$id" });
  const navigate = useNavigate();
  const offering = getOffering(id);
  useScreenView(offering ? `offering_${offering.id}` : "offering_unknown");

  if (!offering) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Offering not found</h1>
          <p className="text-sm text-muted-foreground mt-2">This product isn't available right now.</p>
          <Link to="/" className="inline-block mt-4 text-sm text-primary underline">Back to home</Link>
        </div>
      </div>
    );
  }

  function apply() {
    if (!offering) return;
    track("apply_click", {
      screen_name: `offering_${offering.id}`,
      category: offering.category,
      offering_id: offering.id,
      offering_title: offering.title,
    });
    track("button_click", { screen_name: `offering_${offering.id}`, button_label: "Apply" });
    const dest = applyPathFor(offering.category);
    const redirect = `${dest}?offering=${encodeURIComponent(offering.id)}`;
    navigate({ to: "/login", search: { redirect } });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">D</div>
            <span className="font-semibold tracking-tight">DemoBank</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        </div>
      </header>

      <section className={`bg-gradient-to-br ${offering.accent} text-white`}>
        <div className="max-w-5xl mx-auto px-6 py-14">
          <p className="text-xs uppercase tracking-widest opacity-80">{categoryLabels[offering.category]}</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">{offering.title}</h1>
          <p className="mt-3 text-base md:text-lg opacity-90 max-w-2xl">{offering.tagline}</p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Overview</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{offering.description}</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Highlights</h2>
            <ul className="mt-2 space-y-2">
              {offering.highlights.map((h, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-primary">✓</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Details</h2>
            <dl className="mt-2 border rounded-2xl divide-y bg-card">
              {offering.details.map((d, i) => (
                <div key={i} className="flex justify-between px-4 py-3 text-sm">
                  <dt className="text-muted-foreground">{d.label}</dt>
                  <dd className="font-medium">{d.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <aside className="md:sticky md:top-6 h-fit">
          <div className="border rounded-2xl bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Ready to get started?</p>
            <p className="text-sm mt-1">Sign in to complete your application in a few minutes.</p>
            <button
              data-track={`apply_${offering.id}`}
              onClick={apply}
              className="mt-4 w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90 transition"
            >
              Apply
            </button>
            <Link
              to="/contact"
              data-track={`offering_${offering.id}_contact`}
              onClick={() => track("button_click", { screen_name: `offering_${offering.id}`, button_label: "Have questions? Contact us" })}
              className="mt-3 block text-center text-xs text-muted-foreground underline"
            >
              Have questions? Contact us
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}