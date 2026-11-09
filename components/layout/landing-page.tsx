"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Bot, FileDown, Gauge, GitCompareArrows, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { DealScoreGauge } from "@/components/analysis/deal-score-gauge";

const FEATURES = [
  { icon: Gauge, title: "Deal Score Engine", text: "Weighted 0–100 score across ROI, cashflow, cap rate, DSCR and yield." },
  { icon: BarChart3, title: "Full Financial Model", text: "True amortisation, NOI, DSCR, break-even occupancy and 10-year projections." },
  { icon: Bot, title: "AI-Style Summaries", text: "Analyst-grade narrative covering performance, risk, market outlook and verdict." },
  { icon: GitCompareArrows, title: "Portfolio & Compare", text: "Save deals locally, filter and compare up to three side by side." },
  { icon: FileDown, title: "PDF Reports", text: "Export a branded investment memo with metrics, charts and recommendation." },
  { icon: ShieldCheck, title: "Market Intelligence", text: "Regional tax, insurance, appreciation and yield baselines for US, UK, CA and AU." },
];

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-aurora">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild>
            <Link href="/dashboard">
              Open App <ArrowRight />
            </Link>
          </Button>
        </div>
      </header>

      <main className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-24 pt-10 lg:grid-cols-2 lg:items-center lg:pt-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Bot className="size-3.5" /> AI-powered property investment analysis
          </span>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Know if a property is{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-indigo-500 bg-clip-text text-transparent">
              worth buying
            </span>{" "}
            in minutes.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            PropertyIQ models mortgage, cashflow, ROI, cap rate and DSCR for buy & hold, short-term rental, BRRRR,
            fix & flip and commercial deals — then scores the opportunity and writes the investment memo for you.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" variant="gradient" asChild>
              <Link href="/dashboard">
                Analyse a property <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/portfolio">View portfolio</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="glass relative rounded-3xl p-6 glow-primary"
        >
          <div className="flex flex-col items-center gap-2">
            <DealScoreGauge score={84} grade="excellent" size={220} />
            <span className="rounded-full bg-success/15 px-3 py-1 text-sm font-semibold text-success">Strong Buy</span>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[
              ["Cashflow", "+$412/mo"],
              ["Cap Rate", "6.8%"],
              ["DSCR", "1.31x"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border/60 bg-background/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{k}</p>
                <p className="mt-1 text-lg font-bold tabular">{v}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </main>

      <section className="relative mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
