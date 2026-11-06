import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { BrowseFilters, BrowseGrid, useBrowseState } from "@/components/BrowseCatalog";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse available donations — Student Essentials" },
      { name: "description", content: "Browse all approved donated items available to verified unfunded students. Free to browse, no account required." },
      { property: "og:title", content: "Browse available donations — Student Essentials" },
      { property: "og:description", content: "Browse approved donated items available to verified unfunded students." },
    ],
  }),
  component: Browse,
});

function Browse() {
  const s = useBrowseState();
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <section className="bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Browse available donations</h1>
          <p className="mt-2 text-muted-foreground">Free to browse. Sign in to request.</p>
          <div className="mt-6"><BrowseFilters {...s} /></div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <BrowseGrid q={s.q} cat={s.cat} cond={s.cond} sort={s.sort} />
      </section>
      <Footer />
    </div>
  );
}
