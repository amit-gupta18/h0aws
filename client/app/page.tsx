import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-border/50">
        <div className="flex items-center justify-between px-5 py-3.5 max-w-6xl mx-auto">
          <div className="text-primary font-bold text-xl tracking-tight">Rakhat</div>
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

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-5 pt-14 pb-16 lg:pt-20 lg:pb-24">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
            {/* Copy */}
            <div className="flex-1 max-w-xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 bg-primary/8 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Built for Indian GST
              </div>

              <h1 className="text-[2.5rem] leading-[1.15] md:text-5xl lg:text-[3.25rem] font-bold text-foreground tracking-tight mb-5">
                Bill faster. Get paid.<br />Stay GST-ready.
              </h1>

              <p className="text-base md:text-lg text-muted-foreground mb-8 leading-relaxed">
                Rakhat helps kirana stores, wholesalers, and service shops create GST invoices in seconds — no CA needed.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
                <Link href="/signup">
                  <Button className="h-11 px-7 text-[15px] font-semibold w-full sm:w-auto">
                    Create your first invoice →
                  </Button>
                </Link>
                <button className="h-11 px-6 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  See how it works
                </button>
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
                  Free download • Android only • ~90MB • After installing, tap &apos;Install anyway&apos; if prompted.
                </p>
              </div>

              {/* Stats */}
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

            {/* Invoice card */}
            <div className="flex-1 max-w-md mt-12 lg:mt-0 mx-auto w-full">
              <div className="bg-card rounded-2xl border border-border shadow-[0_8px_32px_rgba(0,0,0,0.10)] p-6 rotate-[-1.5deg] hover:rotate-0 transition-transform duration-300">
                {/* Invoice header */}
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

                {/* Items table */}
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

                {/* Totals */}
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

        {/* Features strip */}
        <section className="border-t border-border bg-muted/30">
          <div className="max-w-6xl mx-auto px-5 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-10">
            {[
              { icon: "⚡", title: "Invoice in 30 seconds", desc: "Pick items, add customer, done. GST auto-calculated." },
              { icon: "📄", title: "PDF ready instantly", desc: "Download or share a professional PDF invoice immediately." },
              { icon: "📊", title: "Built-in GST reports", desc: "GSTR-ready summaries — CGST, SGST, IGST all separated." },
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
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-5 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Rakhat · GST billing for Indian SMBs
      </footer>
    </div>
  );
}
