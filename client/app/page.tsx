import Link from "next/link";
import { Button } from "@/components/ui/button";

const INTELLIGENCE_FEATURES = [
  {
    title: "Bill OCR",
    desc: "Photograph a supplier invoice — Rakhat extracts GSTIN, amounts, and tax breakup. Confirm once, purchase logged.",
    tag: "Automation",
  },
  {
    title: "Composition advisory",
    desc: "See if switching to the 1% composition scheme saves money. Real FY math, explained in plain language.",
    tag: "Advisory",
  },
  {
    title: "ITC reconciliation",
    desc: "Spot mismatches between your claimed input credit and what suppliers filed — before a GST notice arrives.",
    tag: "Reconciliation",
  },
  {
    title: "ITR-ready package",
    desc: "One PDF for your CA: revenue by month, expenses, GST paid, ITC claimed, and net profit estimate.",
    tag: "Document prep",
  },
];

const PLATFORM_MODULES = [
  {
    title: "GST invoicing",
    desc: "CGST, SGST, IGST auto-calculated. B2B & B2C. PDF in seconds. Edit invoices with customer locked.",
  },
  {
    title: "Inventory & audit",
    desc: "Optional stock tracking, manual adjustments, and a full history of who changed what.",
  },
  {
    title: "Expenses & P&L",
    desc: "Category-wise expenses feed owner-only Insights — revenue trends, top customers, net profit.",
  },
  {
    title: "Roles for your team",
    desc: "Owner, accountant, and viewer roles. Your CA sees books; staff see stock — not your margins.",
  },
  {
    title: "Purchase register",
    desc: "Log supplier bills for input GST. Feeds GSTR-2 prep and liability estimates.",
  },
  {
    title: "GSTR-1 exports",
    desc: "B2B, B2C, HSN summaries and CSV exports — ready to review before portal filing.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Create your business",
    desc: "Sign up, add GSTIN and state code. Invite your accountant as ACCOUNTANT role.",
  },
  {
    step: "2",
    title: "Bill & track daily",
    desc: "Invoices, stock, expenses — all in one tenant. Mobile app for the counter.",
  },
  {
    step: "3",
    title: "Stay compliance-ready",
    desc: "GST Intelligence flags risks, advises on schemes, and hands your CA a clean ITR pack.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-border/50">
        <div className="flex items-center justify-between px-5 py-3.5 max-w-6xl mx-auto">
          <div className="text-primary font-bold text-xl tracking-tight">Rakhat</div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#intelligence" className="hover:text-foreground transition-colors">GST Intelligence</a>
            <a href="#platform" className="hover:text-foreground transition-colors">Platform</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" className="text-foreground font-medium text-sm h-9 px-4">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="font-semibold text-sm h-9 px-4">
                Get started free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-5 pt-14 pb-16 lg:pt-20 lg:pb-24">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
            <div className="flex-1 max-w-xl">
              <div className="inline-flex items-center gap-1.5 bg-primary/8 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                GST billing + compliance intelligence
              </div>

              <h1 className="text-[2.5rem] leading-[1.15] md:text-5xl lg:text-[3.25rem] font-bold text-foreground tracking-tight mb-5">
                Bill faster.<br />Understand GST.<br />Skip the CA anxiety.
              </h1>

              <p className="text-base md:text-lg text-muted-foreground mb-8 leading-relaxed">
                Rakhat is the accounting OS for Indian kirana stores, wholesalers, and service shops — GST invoices, stock audit, and an AI compliance layer that thinks like a CA.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
                <Link href="/signup">
                  <Button className="h-11 px-7 text-[15px] font-semibold w-full sm:w-auto">
                    Create your first invoice →
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button variant="outline" className="h-11 px-6 text-[15px] font-medium w-full sm:w-auto">
                    See how it works
                  </Button>
                </a>
              </div>

              <div className="mb-10">
                <a
                  href="https://pub-4b4369895e0243c5bed03042435c4106.r2.dev/application-a57c367a-9c00-4f52-a5ed-d91e14cc5c8c.apk"
                  download
                >
                  <Button variant="outline" className="h-11 px-7 text-[15px] font-semibold w-full sm:w-auto">
                    Download for Android
                  </Button>
                </a>
                <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">
                  Free download · Android · ~90MB
                </p>
              </div>

              <div className="flex items-center gap-6 md:gap-8">
                <div>
                  <div className="text-xl font-bold text-foreground">12,000+</div>
                  <div className="text-xs text-muted-foreground mt-0.5">shops trust Rakhat</div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <div className="text-xl font-bold text-foreground">₹48 Cr+</div>
                  <div className="text-xs text-muted-foreground mt-0.5">billed on platform</div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <div className="text-xl font-bold text-foreground">4.9 ★</div>
                  <div className="text-xs text-muted-foreground mt-0.5">average rating</div>
                </div>
              </div>
            </div>

            <div className="flex-1 max-w-md mt-12 lg:mt-0 mx-auto w-full">
              <div className="bg-card rounded-2xl border border-border shadow-[0_8px_32px_rgba(0,0,0,0.10)] p-6 rotate-[-1.5deg] hover:rotate-0 transition-transform duration-300">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-1">Tax Invoice</p>
                    <p className="text-xs text-muted-foreground font-mono">INV-2025-0143</p>
                  </div>
                  <span className="bg-success-subtle text-success text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                    Issued
                  </span>
                </div>
                <div className="flex justify-between items-end mb-5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Sharma General Store</p>
                    <p className="text-xs text-muted-foreground mt-0.5">MG Road, Ahmedabad</p>
                  </div>
                  <p className="text-lg font-black tracking-[0.15em] text-muted-foreground/20 select-none">INVOICE</p>
                </div>
                <div className="rounded-lg border border-border overflow-hidden mb-4">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-muted border-b border-border">
                        <th className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Item</th>
                        <th className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Qty</th>
                        <th className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="px-3 py-2.5 text-sm text-foreground">Basmati Rice 5kg</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground text-right font-mono">2</td>
                        <td className="px-3 py-2.5 text-sm text-foreground text-right font-mono">₹840</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5 text-sm text-foreground">Toor Dal 2kg</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground text-right font-mono">3</td>
                        <td className="px-3 py-2.5 text-sm text-foreground text-right font-mono">₹540</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <div className="text-xs text-muted-foreground">
                    GST (5%) <span className="font-mono ml-1">₹69</span>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Total</div>
                    <div className="text-xl font-bold text-primary font-mono">₹1,449</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick features */}
        <section className="border-t border-border bg-muted/30">
          <div className="max-w-6xl mx-auto px-5 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-10">
            {[
              { icon: "⚡", title: "Invoice in 30 seconds", desc: "Pick items, add customer, done. GST auto-calculated." },
              { icon: "🧠", title: "Compliance intelligence", desc: "OCR bills, scheme advice, ITC alerts — not just billing." },
              { icon: "📊", title: "GSTR-ready exports", desc: "B2B, B2C, HSN summaries and CSV for your CA." },
            ].map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="text-2xl mt-0.5">{f.icon}</div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* GST Intelligence */}
        <section id="intelligence" className="border-t border-border py-16 lg:py-20">
          <div className="max-w-6xl mx-auto px-5">
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">GST Intelligence</p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">
                Vyapar removed accounting knowledge.<br className="hidden sm:block" /> Rakhat removes compliance knowledge.
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed">
                Four capabilities inside the billing tool you already use — automation, advisory, reconciliation signals, and CA-ready document prep. Built for shopkeepers under ₹2 crore turnover.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {INTELLIGENCE_FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors"
                >
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/8 px-2.5 py-1 rounded-full mb-4">
                    {f.tag}
                  </span>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Full platform */}
        <section id="platform" className="border-t border-border bg-muted/30 py-16 lg:py-20">
          <div className="max-w-6xl mx-auto px-5">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Full platform</p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">
                Billing that grows into business operations
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed">
                Simple enough for the counter. Rigorous enough for the accountant. One tenant, role-based access, India-first GST.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {PLATFORM_MODULES.map((m) => (
                <div key={m.title} className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-2">{m.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="border-t border-border py-16 lg:py-20">
          <div className="max-w-6xl mx-auto px-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              <div className="bg-card border border-border rounded-2xl p-8">
                <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">For shop owners</p>
                <h3 className="text-xl font-bold text-foreground mb-3">Bill on the counter. Sleep on GST.</h3>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex gap-2"><span className="text-success">✓</span> Create tax invoices in seconds — UPI, cash, credit</li>
                  <li className="flex gap-2"><span className="text-success">✓</span> Upload supplier bills — no typing</li>
                  <li className="flex gap-2"><span className="text-success">✓</span> Know if composition scheme saves money</li>
                  <li className="flex gap-2"><span className="text-success">✓</span> Android app for mobile billing</li>
                </ul>
              </div>
              <div className="bg-card border border-border rounded-2xl p-8">
                <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">For accountants</p>
                <h3 className="text-xl font-bold text-foreground mb-3">Clean books. Audit trail. Exports.</h3>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex gap-2"><span className="text-success">✓</span> ACCOUNTANT role — full write access, separate from owner</li>
                  <li className="flex gap-2"><span className="text-success">✓</span> GSTR-1 B2B / B2C / HSN from issued invoices</li>
                  <li className="flex gap-2"><span className="text-success">✓</span> Purchase register for input GST</li>
                  <li className="flex gap-2"><span className="text-success">✓</span> ITR-ready PDF package each financial year</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t border-border bg-muted/30 py-16 lg:py-20">
          <div className="max-w-6xl mx-auto px-5">
            <div className="text-center max-w-xl mx-auto mb-12">
              <h2 className="text-3xl font-bold text-foreground tracking-tight mb-3">How it works</h2>
              <p className="text-muted-foreground">From signup to compliance-ready in three steps.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {STEPS.map((s) => (
                <div key={s.step} className="text-center md:text-left">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm mb-4">
                    {s.step}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border py-16 lg:py-20">
          <div className="max-w-6xl mx-auto px-5 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-4">
              Start billing. Stay GST-ready.
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Free to start. No CA required for day-to-day compliance intelligence on businesses under ₹2 crore turnover.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup">
                <Button className="h-11 px-8 text-[15px] font-semibold w-full sm:w-auto">
                  Get started free →
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="h-11 px-8 text-[15px] font-medium w-full sm:w-auto">
                  Log in to dashboard
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Rakhat · GST billing & compliance intelligence for Indian SMBs
      </footer>
    </div>
  );
}
