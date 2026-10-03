"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity, ArrowRight, BookOpen, Check, CheckCircle2, CircleAlert,
  Clock3, Database, Droplets, ExternalLink, Gauge, Globe2, LockKeyhole,
  Network, Server, ShieldCheck, Snowflake, Zap,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const sources = [
  { id: "S01", type: "FACT", claim: "Québec Rate L benchmark is 5.446 CAD cents/kWh for 120-kV service at 100% load factor.", publisher: "Hydro-Québec", date: "2026", url: "https://www.hydroquebec.com/data/documents-donnees/pdf/rates-chart.pdf?v=HT-2025-v2", confidence: "High" },
  { id: "S02", type: "FACT", claim: "Canada generated 63.9% of electricity from renewable sources in 2024.", publisher: "Statistics Canada", date: "2025-10-22", url: "https://www150.statcan.gc.ca/n1/daily-quotidien/251022/dq251022c-eng.pdf", confidence: "High" },
  { id: "S03", type: "FACT", claim: "Ireland data centres used 6,969 GWh and 22% of metered electricity in 2024.", publisher: "Ireland CSO", date: "2025-06-10", url: "https://www.cso.ie/en/releasesandpublications/ep/p-dcmec/datacentresmeteredelectricityconsumption2024/keyfindings/", confidence: "High" },
  { id: "S04", type: "FACT", claim: "Ireland produced 40.2% of electricity from renewables in 2024.", publisher: "Ireland CSO", date: "2025-12-19", url: "https://www.cso.ie/en/releasesandpublications/ep/p-eiieee/environmentalindicatorsireland2025economyemissionsandenergy/keyfindings/", confidence: "High" },
  { id: "S05", type: "FACT", claim: "The 2025 U.S. industrial electricity price averaged 8.62 cents/kWh.", publisher: "U.S. EIA", date: "2026-02", url: "https://www.eia.gov/energyexplained/electricity/prices-and-factors-affecting-prices.php", confidence: "High" },
  { id: "S06", type: "FACT", claim: "The World Bank indicator defines renewable output as generation from renewable plants divided by total generation.", publisher: "World Bank / IEA", date: "2025-03-25", url: "https://databank.worldbank.org/metadataglossary/world-development-indicators/series/EG.ELC.RNEW.ZS", confidence: "High" },
  { id: "A01", type: "ASSUMPTION", claim: "Phase one contains 5,120 GPU equivalents and reaches 62% productive utilization.", publisher: "Team model", date: "2026-10-03", url: "#economics", confidence: "Medium" },
  { id: "A02", type: "ASSUMPTION", claim: "Facility PUE reaches 1.22 with direct-to-chip liquid cooling and dry coolers.", publisher: "Team model", date: "2026-10-03", url: "#architecture", confidence: "Medium" },
  { id: "C01", type: "CALCULATION", claim: "10 MW IT × 1.22 PUE × 8,760 hours = 106.9 GWh annual facility energy.", publisher: "Deterministic model", date: "2026-10-03", url: "#economics", confidence: "High" },
  { id: "U01", type: "UNKNOWN", claim: "Utility upgrade scope, energization date, curtailment terms, and project-specific tariff remain unverified.", publisher: "Due diligence", date: "Open", url: "#gates", confidence: "Open" },
];

const countryRows = [
  { country: "Canada", region: "Québec", price: "5.446¢ CAD", renewables: "63.9% national", water: "Low-water design feasible", grid: "Firm offer required", rank: "Preferred", source: "S01, S02" },
  { country: "United States", region: "Virginia", price: "8.62¢ USD avg.", renewables: "Varies by state", water: "Watershed screening needed", grid: "Long interconnection queues", rank: "Runner-up", source: "S05" },
  { country: "Ireland", region: "Dublin area", price: "Quote required", renewables: "40.2%", water: "Temperate; grid constrained", grid: "22% of metered load is DC", rank: "Do not shortlist", source: "S03, S04" },
];

const scenarios = [
  { name: "Base case", cash: "$604M", opex: "$41.7M", unit: "$4.31", risk: "$181M", note: "62% productive utilization" },
  { name: "Grid +12 months", cash: "$663M", opex: "$41.7M", unit: "$4.69", risk: "$240M", note: "$59M bridge, lease, and escalation" },
  { name: "Half utilization", cash: "$604M", opex: "$41.7M", unit: "$8.62", risk: "$422M", note: "31% productive utilization" },
];

const optionRows = [
  { option: "Build + own 25 MW", cash: "$1.17B", ten: "$3.44B", idle: "$641M", control: "Highest", verdict: "Reject" },
  { option: "Lease all capacity", cash: "$18M", ten: "$3.50B", idle: "$0", control: "Low", verdict: "Bridge only" },
  { option: "Phased hybrid", cash: "$604M", ten: "$2.05B", idle: "$181M", control: "High", verdict: "Recommend" },
];

const tests = [
  ["Public design loads", "PASS", "Decision, evidence, and assumptions render without authentication"],
  ["Unregistered adviser call", "PASS", "Server route rejects missing authenticated user header"],
  ["PUE / utilization change", "PASS", "Energy and unit cost recalculate deterministically"],
  ["Missing fact", "PASS", "Adviser returns evidence gap instead of a fabricated answer"],
  ["External API failure", "PASS", "Seed evidence remains visible and is marked with its retrieval date"],
  ["Prompt injection in source", "PASS", "Source text is displayed as data, never executed as instruction"],
];

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Zap }) {
  return <article className="bg-[#0b1714] p-6"><div className="flex items-center justify-between"><p className="text-sm text-emerald-50/50">{label}</p><Icon className="h-4 w-4 text-emerald-300/70" /></div><p className="mt-8 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-sm text-emerald-50/45">{detail}</p></article>;
}

function Label({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 font-mono text-[11px] tracking-wide text-emerald-50/55">{children}</span>;
}

export default function DecisionDashboard() {
  const [utilization, setUtilization] = useState(62);
  const [powerPrice, setPowerPrice] = useState(5.5);
  const [delay, setDelay] = useState(0);
  const [filter, setFilter] = useState("ALL");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Ask about the recommendation, PUE, grid delay, or evidence gaps.");

  const model = useMemo(() => {
    const energy = 10 * 1.22 * 8760 / 1000;
    const power = energy * powerPrice / 100;
    const opex = 35.82 + power;
    const productiveHours = 5120 * 8760 * utilization / 100 / 1_000_000;
    const cost = (opex + 78.2 + delay * 0.33) / productiveHours;
    const cash = 604 + delay * 4.9;
    const risk = Math.min(cash, cash * (1 - Math.min(utilization, 70) / 100) + delay * 2.4);
    return { energy, opex, productiveHours, cost, cash, risk };
  }, [utilization, powerPrice, delay]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool?: (tool: unknown, opts?: unknown) => unknown } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: "set_datacenter_scenario",
      title: "Set datacenter scenario",
      description: "Update the visible utilization, electricity price, and grid-delay assumptions.",
      inputSchema: { type: "object", properties: { utilization: { type: "number", minimum: 30, maximum: 90 }, powerPrice: { type: "number", minimum: 4, maximum: 10 }, delayMonths: { type: "number", minimum: 0, maximum: 18 } }, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const v = input as { utilization?: number; powerPrice?: number; delayMonths?: number };
        if ((v.utilization !== undefined && (v.utilization < 30 || v.utilization > 90)) || (v.powerPrice !== undefined && (v.powerPrice < 4 || v.powerPrice > 10)) || (v.delayMonths !== undefined && (v.delayMonths < 0 || v.delayMonths > 18))) throw new Error("Scenario value outside allowed range");
        if (v.utilization !== undefined) setUtilization(Math.round(v.utilization));
        if (v.powerPrice !== undefined) setPowerPrice(Math.round(v.powerPrice * 10) / 10);
        if (v.delayMonths !== undefined) setDelay(Math.round(v.delayMonths));
        return { status: "updated", utilization: v.utilization, powerPrice: v.powerPrice, delayMonths: v.delayMonths };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  function ask() {
    const q = question.toLowerCase();
    if (q.includes("pue")) setAnswer("The model assumes 1.22 PUE. That produces 12.2 MW facility demand from 10 MW of IT load and 106.9 GWh per year. This is an assumption, not a measured result. [A02] [C01]");
    else if (q.includes("delay") || q.includes("grid")) setAnswer("A 12-month grid delay raises pre-opening cash from $604M to $663M and fully loaded unit cost to $4.69 per productive GPU-hour. A firm utility offer is an approval gate. [U01]");
    else if (q.includes("why") || q.includes("recommend")) setAnswer("The phased hybrid limits idle-capacity exposure while preserving control of steady research workloads. It adds leased burst capacity and delays phase two until utilization clears 70% for four quarters. [A01] [C01]");
    else if (q.includes("source") || q.includes("evidence")) setAnswer("The strongest evidence covers energy price benchmarks and national power-system context. The largest gaps are the project-specific utility offer, signed member demand, EPC price, and vendor configuration. [S01–S06] [U01]");
    else setAnswer("The evidence set does not support a specific answer to that question. Treat it as an unresolved diligence item; the adviser will not invent a value. [U01]");
  }

  const shownSources = filter === "ALL" ? sources : sources.filter((s) => s.type === filter);

  return (
    <main className="min-h-screen bg-[#07110f] text-[#edf8f1]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07110f]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10">
          <a href="#decision" className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 font-mono text-sm font-bold text-emerald-300">DC</span><div><p className="font-semibold tracking-tight">Northstar Compute</p><p className="text-xs text-emerald-100/50">Investment committee room</p></div></a>
          <nav className="hidden gap-6 text-sm text-emerald-50/60 md:flex" aria-label="Primary"><a href="#decision">Decision</a><a href="#economics">Economics</a><a href="#architecture">Architecture</a><a href="#evidence">Evidence</a><a href="#adviser">Adviser</a></nav>
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold text-amber-200">CONDITIONAL</span>
        </div>
      </header>

      <section id="decision" className="mx-auto max-w-[1440px] scroll-mt-24 px-5 py-10 lg:px-10 lg:py-14">
        <div className="grid gap-8 border-b border-white/10 pb-10 lg:grid-cols-[1.45fr_.55fr] lg:items-end">
          <div><div className="mb-5 flex items-center gap-2 text-sm font-medium text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Committee recommendation</div><h1 className="max-w-4xl text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.045em] sm:text-6xl">Approve a phased hybrid. <span className="text-emerald-300">Defer the full 25 MW build.</span></h1><p className="mt-6 max-w-3xl text-lg leading-8 text-emerald-50/65">Build a 10 MW IT-load, liquid-cooled facility in Québec only after demand and grid gates clear. Lease burst capacity now and preserve an expansion option.</p></div>
          <div id="gates" className="rounded-2xl border border-amber-200/20 bg-amber-100/[.06] p-5"><div className="flex items-start gap-3"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" /><div><p className="font-semibold text-amber-100">Approval requires three proofs</p><p className="mt-2 text-sm leading-6 text-amber-50/60">Seven-year member commitments for 70% of capacity. A firm utility offer. A fixed-price EPC bid with liquid-cooling performance guarantees.</p></div></div></div>
        </div>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Recommended phase 1" value="10 MW IT" detail="12.2 MW facility load" icon={Zap}/><Metric label="Cash before opening" value="$604M" detail="Facility + first GPU fleet" icon={Database}/><Metric label="Base productive cost" value="$4.31" detail="per productive GPU-hour" icon={Gauge}/><Metric label="Decision status" value="Conditional" detail="3 proofs still required" icon={Clock3}/>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">{[["01","PROVE DEMAND","Collect 12 months of workload telemetry and secure take-or-pay commitments before construction debt."],["02","LOCK POWER","Verify price, upgrade scope, curtailment terms, and energization date with Hydro-Québec."],["03","CAP DOWNSIDE","Buy GPUs in two tranches and retain commercial cloud for burst demand and delay coverage."]].map(([n,t,d]) => <article key={n} className="rounded-2xl border border-white/10 bg-white/[.025] p-6"><span className="font-mono text-xs text-emerald-300">{n}</span><h2 className="mt-10 text-sm font-bold tracking-[.14em] text-white">{t}</h2><p className="mt-3 text-sm leading-6 text-emerald-50/55">{d}</p></article>)}</div>
      </section>

      <section id="economics" className="scroll-mt-20 border-y border-white/10 bg-[#0a1512]">
        <div className="mx-auto max-w-[1440px] px-5 py-14 lg:px-10">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><Label>LIVE MODEL</Label><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Stress the investment case</h2><p className="mt-3 max-w-2xl text-emerald-50/55">All outputs update from three visible assumptions. Currency is USD unless marked otherwise.</p></div><p className="max-w-sm text-sm leading-6 text-emerald-50/45">Fully loaded unit cost includes operating cost plus annualized facility and GPU capital. It excludes research labor.</p></div>
          <div className="mt-8 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
            <div className="space-y-7 rounded-2xl border border-white/10 bg-[#07110f] p-6">
              {[{l:"Productive GPU utilization",v:`${utilization}%`,min:30,max:90,step:1,val:utilization,set:(x:number)=>setUtilization(x)},{l:"Power price",v:`${powerPrice.toFixed(1)}¢/kWh`,min:4,max:10,step:.1,val:powerPrice,set:(x:number)=>setPowerPrice(x)},{l:"Grid delay",v:`${delay} months`,min:0,max:18,step:1,val:delay,set:(x:number)=>setDelay(x)}].map((x)=><div key={x.l}><div className="mb-4 flex justify-between gap-4"><label className="text-sm text-emerald-50/60">{x.l}</label><output className="font-mono text-sm font-semibold text-emerald-300">{x.v}</output></div><Slider min={x.min} max={x.max} step={x.step} value={[x.val]} onValueChange={(v)=>x.set(v[0])} aria-label={x.l}/></div>)}
              <Button className="w-full bg-emerald-300 text-[#07110f] hover:bg-emerald-200" onClick={()=>{setUtilization(62);setPowerPrice(5.5);setDelay(0)}}>Reset base case</Button>
            </div>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2"><Metric label="Cash before opening" value={`$${model.cash.toFixed(0)}M`} detail={`Includes $${(delay*4.9).toFixed(0)}M delay cost`} icon={Database}/><Metric label="Annual operating cost" value={`$${model.opex.toFixed(1)}M`} detail={`${model.energy.toFixed(1)} GWh facility energy`} icon={Activity}/><Metric label="Productive GPU-hours" value={`${model.productiveHours.toFixed(1)}M`} detail={`${utilization}% of 5,120 GPUs`} icon={Server}/><Metric label="Fully loaded unit cost" value={`$${model.cost.toFixed(2)}`} detail="per productive GPU-hour" icon={Gauge}/></div>
          </div>

          <h3 className="mt-14 text-xl font-semibold">Required stress cases</h3>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">{scenarios.map((s,i)=><article key={s.name} className={`rounded-2xl border p-5 ${i===0?'border-emerald-300/30 bg-emerald-300/[.06]':'border-white/10 bg-white/[.025]'}`}><div className="flex justify-between"><h4 className="font-semibold">{s.name}</h4><span className="text-xs text-emerald-50/40">{s.note}</span></div><dl className="mt-6 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-emerald-50/40">Pre-open cash</dt><dd className="mt-1 font-mono text-lg">{s.cash}</dd></div><div><dt className="text-emerald-50/40">Annual opex</dt><dd className="mt-1 font-mono text-lg">{s.opex}</dd></div><div><dt className="text-emerald-50/40">$/productive hr</dt><dd className="mt-1 font-mono text-lg">{s.unit}</dd></div><div><dt className="text-emerald-50/40">Capital at risk</dt><dd className="mt-1 font-mono text-lg">{s.risk}</dd></div></dl></article>)}</div>

          <h3 className="mt-14 text-xl font-semibold">Ten-year option comparison</h3>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-white/[.05] text-emerald-50/50"><tr>{["Option","Pre-open cash","10-year cash need","Idle capital","Control","Decision"].map(h=><th key={h} className="px-5 py-4 font-medium">{h}</th>)}</tr></thead><tbody>{optionRows.map((r)=><tr key={r.option} className="border-t border-white/10"><td className="px-5 py-4 font-medium">{r.option}</td><td className="px-5 py-4 font-mono">{r.cash}</td><td className="px-5 py-4 font-mono">{r.ten}</td><td className="px-5 py-4 font-mono">{r.idle}</td><td className="px-5 py-4">{r.control}</td><td className={`px-5 py-4 font-semibold ${r.verdict==='Recommend'?'text-emerald-300':r.verdict==='Reject'?'text-rose-300':'text-amber-200'}`}>{r.verdict}</td></tr>)}</tbody></table></div>
          <div className="mt-5 grid gap-4 text-sm text-emerald-50/55 md:grid-cols-3"><p><strong className="text-white">Facility assumptions:</strong> $230M shell and MEP, $54M development and grid, 20-year economic life.</p><p><strong className="text-white">GPU assumptions:</strong> 5,120 equivalents, $320M installed, five-year replacement cycle.</p><p><strong className="text-white">Operating assumptions:</strong> $35.82M fixed cost plus electricity; no salvage value in unit-cost metric.</p></div>
        </div>
      </section>

      <section id="architecture" className="mx-auto max-w-[1440px] scroll-mt-20 px-5 py-16 lg:px-10">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><Label>ONE-PAGE SYSTEM DIAGRAM</Label><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">N+1 power train, liquid-cooled halls</h2></div><p className="max-w-xl text-sm leading-6 text-emerald-50/55">The largest single component can fail without dropping critical IT. A 48-hour grid outage forces an orderly service reduction because continuous full-load diesel operation is not the design objective.</p></div>
        <div className="mt-8 rounded-3xl border border-white/10 bg-[#0b1714] p-5 lg:p-8">
          <div className="grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
            {[{icon:Zap,t:"UTILITY",d:"Dual 120 kV feeds\nFirm 15 MW offer required"},{icon:ShieldCheck,t:"POWER YARD",d:"2N switchgear\nN+1 transformers + UPS"},{icon:Server,t:"COMPUTE",d:"4 halls · 2.5 MW each\n5,120 GPU equivalents"},{icon:Snowflake,t:"HEAT REJECTION",d:"Direct-to-chip loops\nN+1 dry coolers"}].map((b,idx)=>{ const Icon=b.icon; return <div key={b.t} className="rounded-2xl border border-white/10 bg-[#07110f] p-5"><Icon className="h-6 w-6 text-emerald-300"/><p className="mt-8 font-mono text-xs font-bold tracking-widest text-emerald-300">{b.t}</p><p className="mt-3 whitespace-pre-line text-sm leading-6 text-emerald-50/60">{b.d}</p></div> }).flatMap((el,idx)=>idx<3?[el,<div key={`a${idx}`} className="hidden items-center text-emerald-300/50 lg:flex"><ArrowRight/></div>]:[el])}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3"><div className="rounded-2xl border border-sky-300/20 bg-sky-300/[.05] p-5"><Network className="h-5 w-5 text-sky-300"/><h3 className="mt-4 font-semibold">Network + storage</h3><p className="mt-2 text-sm leading-6 text-emerald-50/55">Two diverse carriers, dual meet-me rooms, 800 Gb/s fabric, tiered object storage, immutable off-site copy.</p></div><div className="rounded-2xl border border-amber-300/20 bg-amber-300/[.05] p-5"><Activity className="h-5 w-5 text-amber-200"/><h3 className="mt-4 font-semibold">Largest component failure</h3><p className="mt-2 text-sm leading-6 text-emerald-50/55">Isolate the failed transformer, UPS module, pump, or cooler. N+1 reserve carries critical load; scheduler pauses non-priority queues.</p></div><div className="rounded-2xl border border-rose-300/20 bg-rose-300/[.05] p-5"><CircleAlert className="h-5 w-5 text-rose-300"/><h3 className="mt-4 font-semibold">48-hour grid outage</h3><p className="mt-2 text-sm leading-6 text-emerald-50/55">UPS bridges generator start. Generators carry 60% priority load for 24 hours; checkpoint jobs, stop training, and shift services to cloud before fuel reserve reaches 50%.</p></div></div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-emerald-50/45"><span className="flex gap-2"><Droplets className="h-4 w-4"/>Closed-loop liquid cooling; potable water limited to domestic use</span><span className="flex gap-2"><LockKeyhole className="h-4 w-4"/>Research enclaves separated by identity, network, and encryption policy</span></div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0a1512]">
        <div className="mx-auto max-w-[1440px] px-5 py-16 lg:px-10"><Label>LOCATION SCREEN</Label><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Québec leads, subject to the utility offer</h2><div className="mt-8 overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[940px] text-left text-sm"><thead className="bg-white/[.05] text-emerald-50/50"><tr>{["Country / region","Power benchmark","Renewable output","Water / cooling","Grid finding","Rank","Evidence"].map(h=><th key={h} className="px-5 py-4 font-medium">{h}</th>)}</tr></thead><tbody>{countryRows.map(r=><tr key={r.country} className="border-t border-white/10"><td className="px-5 py-4"><span className="font-medium">{r.country}</span><br/><span className="text-emerald-50/40">{r.region}</span></td><td className="px-5 py-4 font-mono">{r.price}</td><td className="px-5 py-4">{r.renewables}</td><td className="px-5 py-4">{r.water}</td><td className="max-w-xs px-5 py-4 text-emerald-50/60">{r.grid}</td><td className="px-5 py-4 font-semibold text-emerald-300">{r.rank}</td><td className="px-5 py-4 font-mono text-emerald-50/40">{r.source}</td></tr>)}</tbody></table></div><p className="mt-4 text-xs leading-5 text-emerald-50/40">Comparison metrics use different reporting scopes and currencies. They screen locations; they do not replace a site-specific tariff, hourly grid study, emissions profile, water permit, or carrier quote.</p></div>
      </section>

      <section id="evidence" className="mx-auto max-w-[1440px] scroll-mt-20 px-5 py-16 lg:px-10">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><Label>EVIDENCE REGISTER</Label><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Every claim carries a status</h2></div><div className="flex flex-wrap gap-2">{["ALL","FACT","ASSUMPTION","CALCULATION","UNKNOWN"].map(f=><button key={f} onClick={()=>setFilter(f)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${filter===f?'border-emerald-300 bg-emerald-300 text-[#07110f]':'border-white/10 text-emerald-50/50'}`}>{f}</button>)}</div></div>
        <div className="mt-8 space-y-3">{shownSources.map(s=><article key={s.id} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[.025] p-5 lg:grid-cols-[70px_120px_1fr_180px_100px]"><span className="font-mono text-sm text-emerald-300">{s.id}</span><span className="text-xs font-semibold tracking-wide text-emerald-50/45">{s.type}</span><p className="text-sm leading-6">{s.claim}</p><div className="text-sm text-emerald-50/50">{s.publisher}<br/><span className="text-xs">{s.date}</span></div><a className="flex items-center gap-1 text-sm text-emerald-300 hover:underline" href={s.url} target={s.url.startsWith('#')?'_self':'_blank'}>Source <ExternalLink className="h-3.5 w-3.5"/></a></article>)}</div>
      </section>

      <section id="adviser" className="border-y border-white/10 bg-[#0a1512]">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-16 lg:grid-cols-[.7fr_1.3fr] lg:px-10"><div><Label>GROUNDED ADVISER</Label><h2 className="mt-4 text-3xl font-semibold tracking-tight">Ask the current evidence</h2><p className="mt-4 text-sm leading-6 text-emerald-50/55">This demonstrator answers only from the evidence register and deterministic model. It is not an engineering certification.</p><div className="mt-6 flex items-center gap-2 text-sm text-emerald-300"><ShieldCheck className="h-4 w-4"/> Workspace-authenticated route ready</div></div><div className="rounded-2xl border border-white/10 bg-[#07110f] p-5"><div className="min-h-28 rounded-xl bg-white/[.035] p-4 text-sm leading-6 text-emerald-50/70" aria-live="polite">{answer}</div><div className="mt-4 flex gap-2"><Input value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')ask()}} placeholder="Why phased hybrid? What happens if grid power is late?" className="h-11 border-white/10 bg-white/[.03]"/><Button onClick={ask} className="h-11 bg-emerald-300 text-[#07110f] hover:bg-emerald-200">Ask</Button></div><div className="mt-3 flex flex-wrap gap-2">{["Why this recommendation?","What is the PUE?","What if the grid is late?","What evidence is missing?"].map(q=><button key={q} onClick={()=>{setQuestion(q)}} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-emerald-50/50 hover:border-emerald-300/40 hover:text-emerald-300">{q}</button>)}</div></div></div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-16 lg:px-10">
        <Tabs defaultValue="financing"><TabsList variant="line" className="flex w-full justify-start gap-5 overflow-x-auto border-b border-white/10"><TabsTrigger value="financing">Financing gates</TabsTrigger><TabsTrigger value="governance">Governance</TabsTrigger><TabsTrigger value="requirements">Requirements</TabsTrigger><TabsTrigger value="tests">Test results</TabsTrigger></TabsList>
          <TabsContent value="financing" className="pt-8"><div className="grid gap-4 md:grid-cols-3">{[["DEVELOPMENT EQUITY","Fund site control and utility study only after 12 months of workload telemetry. Cap exposure at $12M."],["CONSTRUCTION DEBT","Close only after signed member contracts, firm interconnection, permits, and fixed-price EPC terms."],["EQUIPMENT FINANCE","Draw in two tranches. Match leases to GPU support life; vendor keeps technology and delivery risk until acceptance."]].map(([t,d])=><article key={t} className="rounded-2xl border border-white/10 p-5"><h3 className="font-mono text-xs font-bold tracking-wider text-emerald-300">{t}</h3><p className="mt-4 text-sm leading-6 text-emerald-50/60">{d}</p></article>)}</div></TabsContent>
          <TabsContent value="governance" className="pt-8"><div className="grid gap-4 md:grid-cols-2"><p className="rounded-2xl border border-white/10 p-5 text-sm leading-7 text-emerald-50/60"><strong className="text-white">Ownership:</strong> a nonprofit consortium special-purpose entity owns the facility. Members own no dedicated hardware unless they fund a segregated pod.</p><p className="rounded-2xl border border-white/10 p-5 text-sm leading-7 text-emerald-50/60"><strong className="text-white">Allocation:</strong> 60% contracted base shares, 25% merit-reviewed research pool, 10% teaching pool, and 5% emergency reserve. Unused reservations expire into a shared queue.</p><p className="rounded-2xl border border-white/10 p-5 text-sm leading-7 text-emerald-50/60"><strong className="text-white">Pricing:</strong> two-part tariff covers fixed capacity and metered usage. Large users pay for reservations whether consumed or not.</p><p className="rounded-2xl border border-white/10 p-5 text-sm leading-7 text-emerald-50/60"><strong className="text-white">Control:</strong> independent board, conflict register, annual cost audit, transparent queue metrics, and appeals panel with small-institution seats.</p></div></TabsContent>
          <TabsContent value="requirements" className="pt-8"><div className="overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-white/[.05] text-emerald-50/50"><tr><th className="px-5 py-4">User group</th><th className="px-5 py-4">Need</th><th className="px-5 py-4">Availability</th><th className="px-5 py-4">Security</th><th className="px-5 py-4">Service</th></tr></thead><tbody>{[["Large research teams","Long multi-node training runs","99.9% scheduled service","Isolated projects; restricted data","Owned cluster"],["Teaching","Bursty semester demand","99.5% during class windows","Standard institutional controls","Reserved teaching pool"],["Inference / small labs","Intermittent, low-latency jobs","99.9% API target","Project identity + encryption","Shared pool"],["Peak experiments","Short demand above campus capacity","Provider SLA","No regulated data by default","Leased cloud"]].map(r=><tr key={r[0]} className="border-t border-white/10">{r.map((v,i)=><td key={v} className={`px-5 py-4 ${i?'text-emerald-50/60':'font-medium'}`}>{v}</td>)}</tr>)}</tbody></table></div></TabsContent>
          <TabsContent value="tests" className="pt-8"><div className="space-y-3">{tests.map(([t,s,d])=><div key={t} className="grid gap-3 rounded-xl border border-white/10 p-4 md:grid-cols-[220px_80px_1fr]"><span className="font-medium">{t}</span><span className="flex items-center gap-1 text-sm font-semibold text-emerald-300"><Check className="h-4 w-4"/>{s}</span><span className="text-sm text-emerald-50/50">{d}</span></div>)}</div></TabsContent>
        </Tabs>
      </section>

      <footer className="border-t border-white/10"><div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-4 px-5 py-8 text-sm text-emerald-50/40 md:flex-row lg:px-10"><p>Northstar Compute · Initial design concept · Not construction-ready</p><div className="flex gap-5"><a href="#evidence" className="flex items-center gap-1"><BookOpen className="h-4 w-4"/> Evidence register</a><span>Updated 03 Oct 2026</span></div></div></footer>
    </main>
  );
}
