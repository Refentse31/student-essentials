import { createFileRoute } from "@tanstack/react-router";
import { DashLayout } from "@/components/DashLayout";
import { BrowseFilters, BrowseGrid, useBrowseState } from "@/components/BrowseCatalog";

export const Route = createFileRoute("/_authenticated/browse-items")({
  head: () => ({
    meta: [
      { title: "Browse items — Student Essentials" },
      { name: "description", content: "Browse approved donated essentials and request what you need from your dashboard." },
      { property: "og:title", content: "Browse items — Student Essentials" },
      { property: "og:description", content: "Browse approved donated essentials and request what you need." },
    ],
  }),
  component: BrowseItemsPage,
});

function BrowseItemsPage() {
  const s = useBrowseState();
  return (
    <DashLayout>
      <h1 className="mb-2 font-display text-2xl font-bold">Browse items</h1>
      <p className="mb-6 text-sm text-muted-foreground">Find available donations and send a request.</p>
      <div className="mb-6"><BrowseFilters {...s} /></div>
      <BrowseGrid q={s.q} cat={s.cat} cond={s.cond} sort={s.sort} />
    </DashLayout>
  );
}
