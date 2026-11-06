import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Heart, Package, Users, Sparkles, ShieldCheck, ArrowRight, BookOpen, Shirt,
  Apple, Pencil, Coffee, Quote
} from "lucide-react";
import donationHero from "@/assets/donation-hero.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Student Essentials — Donate. Help. Belong." },
      { name: "description", content: "A safe campus platform where students donate essentials to verified unfunded students. Browse items, donate, or request — all collected at the Campus Library." },
      { property: "og:title", content: "Student Essentials — Donate. Help. Belong." },
      { property: "og:description", content: "Donations of books, food, clothing & more for verified unfunded students. Browse freely, register to give or receive." },
    ],
  }),
  component: Landing,
});

function useStats() {
  return useQuery({
    queryKey: ["landing-stats"],
    queryFn: async () => {
      const [donations, collected, available, students] = await Promise.all([
        supabase.from("donations").select("id", { count: "exact", head: true }),
        supabase.from("requests").select("id", { count: "exact", head: true }).eq("status", "collected"),
        supabase.from("donations").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return {
        donations: donations.count ?? 0,
        helped: collected.count ?? 0,
        available: available.count ?? 0,
        students: students.count ?? 0,
      };
    },
  });
}

function Landing() {
  const { data: stats } = useStats();

  const categories = [
    { icon: BookOpen, label: "Books" },
    { icon: Apple, label: "Food" },
    { icon: Shirt, label: "Clothing" },
    { icon: Pencil, label: "Stationery" },
    { icon: Coffee, label: "Toiletries" },
    { icon: Package, label: "Bedding" },
  ];

  return (
    <div className="min-h-screen">
      <AppHeader />

      {/* Hero with donation photo background */}
      <section className="relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 -z-10">
          <img
            src={donationHero}
            alt="Students joining hands over a Donation sign"
            className="h-full w-full object-cover"
          />
          {/* Dark teal overlay for readability + MOYO feel */}
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(10,26,42,0.92)_0%,rgba(15,45,68,0.78)_50%,rgba(20,80,110,0.65)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
        </div>

        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 md:grid-cols-2 md:py-36">
          <div className="flex flex-col justify-center text-white">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Powered by students, for students
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Donate essentials.{" "}
              <span className="bg-gradient-to-r from-primary-glow to-primary bg-clip-text text-transparent">
                Help fellow students.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">
              A safe, verified, on-campus donation platform connecting generous students with unfunded peers. Books, food, clothing and more — collected at the Campus Library.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" search={{ tab: "register" }}>
                <Button size="lg" className="rounded-full bg-gradient-primary text-primary-foreground shadow-elegant hover:opacity-90">
                  Get started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/browse">
                <Button size="lg" variant="outline" className="rounded-full border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white">
                  Browse items <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative hidden md:block">
            <div className="relative grid grid-cols-2 gap-4">
              {categories.slice(0, 4).map((c, i) => (
                <Card key={i} className="glass flex flex-col items-center gap-3 border-white/15 bg-white/10 p-6 text-white shadow-elegant transition-transform hover:-translate-y-1">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
                    <c.icon className="h-7 w-7" />
                  </div>
                  <span className="font-medium">{c.label}</span>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Total donations", value: stats?.donations ?? 0, icon: Package },
            { label: "Students helped", value: stats?.helped ?? 0, icon: Heart },
            { label: "Items available", value: stats?.available ?? 0, icon: Sparkles },
            { label: "Registered students", value: stats?.students ?? 0, icon: Users },
          ].map((s, i) => (
            <Card key={i} className="p-6 text-center shadow-card">
              <s.icon className="mx-auto h-6 w-6 text-primary" />
              <div className="mt-3 font-display text-3xl font-bold">{s.value.toLocaleString()}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">How it works</h2>
          <p className="mt-3 text-muted-foreground">Three simple steps. All collections happen at the Campus Library.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { n: "1", t: "Donate or request", d: "Upload items you no longer need, or request what you need as a verified unfunded student." },
            { n: "2", t: "Admin approves", d: "Our admin team reviews every donation and request to keep things fair and safe." },
            { n: "3", t: "Collect at Library", d: "Approved items are collected at the Campus Library. Rate each other afterwards." },
          ].map((s) => (
            <Card key={s.n} className="p-6 shadow-card">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary font-display text-xl font-bold text-primary-foreground">{s.n}</div>
              <h3 className="mt-5 font-display text-xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Why donate */}
      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">Why donate?</h2>
              <p className="mt-3 text-muted-foreground">Every textbook, jumper, or food parcel changes a student's week. Donations stay on campus, reach verified peers, and build the kind of community we all want to study in.</p>
              <ul className="mt-6 space-y-3">
                {[
                  { i: ShieldCheck, t: "Verified recipients only" },
                  { i: Heart, t: "100% peer-to-peer" },
                  { i: Sparkles, t: "AI matches items to needs" },
                ].map((x, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/15 text-success"><x.i className="h-5 w-5" /></span>
                    <span className="font-medium">{x.t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {categories.map((c, i) => (
                <Card key={i} className="flex flex-col items-center gap-2 p-4 shadow-card">
                  <c.icon className="h-6 w-6 text-primary" />
                  <span className="text-xs font-medium">{c.label}</span>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Success stories */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Student stories</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { q: "I got my entire second-year textbook list through donations. I cried.", n: "Naledi, BCom" },
            { q: "Donating my old winter coat felt small — until I saw it changed a stranger's exam season.", n: "Thabo, Engineering" },
            { q: "The verification process kept it safe. Everyone gets a fair turn.", n: "Aisha, Law" },
          ].map((s, i) => (
            <Card key={i} className="p-6 shadow-card">
              <Quote className="h-6 w-6 text-primary/60" />
              <p className="mt-3 text-sm">{s.q}</p>
              <p className="mt-4 text-sm font-semibold text-muted-foreground">— {s.n}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-muted/30 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-8">
            {[
              { q: "Who can request items?", a: "Only verified unfunded students. You must submit proof of registration, motivation, and your financial status — admin reviews each application." },
              { q: "How many items can I request?", a: "A maximum of 3 requests per calendar month. Priority requests can be flagged for urgent needs (e.g. food, winter clothes)." },
              { q: "Where do I collect items?", a: "Always at the Campus Library. We don't allow off-campus pickups for safety." },
              { q: "What can I donate?", a: "Books, food, clothing, shoes, stationery, toiletries, bedding, electronics, kitchen essentials and more." },
              { q: "Are donations approved?", a: "Yes — every donation is reviewed by admin before it appears publicly." },
            ].map((f, i) => (
              <AccordionItem key={i} value={`q${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Contact / CTA */}
      <section id="contact" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Card className="overflow-hidden bg-gradient-primary p-10 text-primary-foreground shadow-elegant">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Ready to make campus kinder?</h2>
            <p className="mt-3 opacity-90">Register today as a donor or unfunded student. It takes less than a minute.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/auth" search={{ tab: "register" }}>
                <Button size="lg" variant="secondary">Create account</Button>
              </Link>
              <Link to="/browse">
                <Button size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-primary">Browse items</Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      <Footer />
    </div>
  );
}
