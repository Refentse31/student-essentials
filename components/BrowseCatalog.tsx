import { itemImageSrc } from "@/lib/itemImage";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Package, Calendar, MapPin } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { notifyAdmins, notifyUsers } from "@/lib/notify";

const CATEGORIES = ["books","food","clothing","shoes","stationery","toiletries","bedding","electronics","kitchen","other"] as const;

export function BrowseFilters({
  q, setQ, cat, setCat, cond, setCond, sort, setSort,
}: {
  q: string; setQ: (v: string) => void;
  cat: string; setCat: (v: string) => void;
  cond: string; setCond: (v: string) => void;
  sort: string; setSort: (v: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items…" className="pl-9" />
      </div>
      <Select value={cat} onValueChange={setCat}>
        <SelectTrigger className="min-w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={cond} onValueChange={setCond}>
        <SelectTrigger className="min-w-[140px]"><SelectValue placeholder="Condition" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any condition</SelectItem>
          <SelectItem value="new">New</SelectItem>
          <SelectItem value="like_new">Like new</SelectItem>
          <SelectItem value="good">Good</SelectItem>
          <SelectItem value="fair">Fair</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sort} onValueChange={setSort}>
        <SelectTrigger className="min-w-[140px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="oldest">Oldest</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function useBrowseState() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [cond, setCond] = useState("all");
  const [sort, setSort] = useState("newest");
  return { q, setQ, cat, setCat, cond, setCond, sort, setSort };
}

export function BrowseGrid({ q, cat, cond, sort }: { q: string; cat: string; cond: string; sort: string }) {
  const { user, profile, roles } = useAuth();
  const navigate = useNavigate();

  const { data: items, isLoading } = useQuery({
    queryKey: ["browse", q, cat, cond, sort],
    queryFn: async () => {
      let query = supabase.from("donations").select("*").eq("status", "approved");
      if (cat !== "all") query = query.eq("category", cat as never);
      if (cond !== "all") query = query.eq("condition", cond as never);
      if (q.trim()) query = query.ilike("item_name", `%${q.trim()}%`);
      query = query.order("created_at", { ascending: sort === "oldest" });
      const { data, error } = await query.limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleRequest = async (donationId: string) => {
    if (!user) {
      toast.info("Please sign in to request items");
      navigate({ to: "/auth", search: { tab: "register" } });
      return;
    }
    if (!roles.includes("unfunded")) {
      toast.error("Only unfunded student accounts can request items.");
      return;
    }
    if (profile?.verification_status !== "approved") {
      toast.info("You need to be verified to request items.");
      navigate({ to: "/verify" });
      return;
    }
    const { error } = await supabase.from("requests").insert({ requester_id: user.id, donation_id: donationId });
    if (error) { toast.error(error.message); return; }
    toast.success("Request submitted! Awaiting admin approval.");
    const { data: d } = await supabase.from("donations").select("item_name,donor_id").eq("id", donationId).maybeSingle();
    const name = d?.item_name ?? "an item";
    await notifyAdmins({ type: "item_requested", title: `New request: ${name}`, body: "A student requested this item and it needs review.", link: "/admin/requests" });
    if (d?.donor_id) await notifyUsers([d.donor_id], { type: "item_requested", title: `Your item was requested: ${name}`, body: "An admin will review the request.", link: "/my-donations" });
  };

  if (isLoading) return <p className="text-center text-muted-foreground">Loading items…</p>;
  if (!items?.length) {
    return (
      <Card className="p-12 text-center">
        <Package className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 font-medium">No items match your filters yet.</p>
        <p className="text-sm text-muted-foreground">Try different filters or check back soon.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((it) => (
        <Card key={it.id} className="overflow-hidden shadow-card transition-shadow hover:shadow-elegant">
          <div className="aspect-square w-full bg-muted">
            {it.image_url ? (
              <img src={itemImageSrc(it.image_url)!} alt={it.item_name} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground"><Package className="h-10 w-10" /></div>
            )}
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-tight">{it.item_name}</h3>
              <Badge variant="secondary" className="capitalize">{it.category}</Badge>
            </div>
            {it.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{it.description}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="capitalize">{it.condition.replace("_"," ")}</span>
              <span>· Qty {it.quantity}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDistanceToNow(new Date(it.created_at), { addSuffix: true })}</span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />Campus Library</div>
            <Button
              className="mt-4 w-full bg-gradient-primary text-primary-foreground"
              onClick={() => handleRequest(it.id)}
              disabled={roles.includes("unfunded") && profile?.verification_status !== "approved"}
            >
              {roles.includes("unfunded") && profile?.verification_status !== "approved" ? "Approval required" : "Request item"}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
