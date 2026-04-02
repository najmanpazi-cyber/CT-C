import { useLayoutEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function MaterialIcon({
  name,
  className = "",
  fill = false,
}: {
  name: string;
  className?: string;
  fill?: boolean;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#f2f4f6] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full p-6 flex justify-between items-center gap-4 text-left"
      >
        <h3 className="font-bold text-[#191c1e]">{q}</h3>
        <MaterialIcon
          name={open ? "expand_less" : "expand_more"}
          className="text-[#6d7a77] shrink-0"
        />
      </button>
      {open && (
        <div className="px-6 pb-6 -mt-2">
          <p className="text-[#3d4947] text-sm leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const FAQ_DATA = [
  {
    q: "What is NCCI PTP edit validation?",
    a: "CMS publishes Correct Coding Initiative (CCI) edits that define which CPT code pairs should not be billed together. ClaimVex checks your code combinations against these edits automatically.",
  },
  {
    q: "How does ClaimVex check modifier 59 usage?",
    a: "ClaimVex validates whether a 59/X modifier is appropriate and recommends specific X-modifiers (XE, XS, XP, XU) that provide better audit protection than legacy modifier 59.",
  },
  {
    q: "Do I need to integrate with my EHR or practice management system?",
    a: "No. ClaimVex is browser-based — just paste your CPT codes and click validate. No software installation, no IT department needed, no EHR integration required.",
  },
  {
    q: "How current are the validation rules?",
    a: "ClaimVex uses official CMS NCCI PTP edit tables, MUE values, and Medicare Physician Fee Schedule data, updated quarterly when CMS publishes new rule sets.",
  },
  {
    q: "Is my claim data stored or shared?",
    a: "No. Your validation data is associated with your account for your history dashboard, but claim data is never shared with third parties. ClaimVex does not store protected health information (PHI).",
  },
  {
    q: "Who is ClaimVex built for?",
    a: "ClaimVex is built specifically for orthopedic practices — medical coders, billing managers, and outsourced billing companies handling musculoskeletal procedure coding.",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Landing() {
  useLayoutEffect(() => {
    document.title =
      "ClaimVex — Orthopedic CPT Code Validation Tool | Try Free";

    // Meta description
    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );
    if (meta) {
      meta.content =
        "Validate orthopedic CPT codes against NCCI edits, MUE limits, and global periods in seconds. Catch denials before submission. Free 30-day trial.";
    }
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <div className="bg-[#f7f9fb] font-body text-[#191c1e]">
      {/* ── JSON-LD: FAQ Schema ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ_DATA.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />

      {/* ── JSON-LD: SoftwareApplication Schema ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "ClaimVex",
            applicationCategory: "HealthcareApplication",
            operatingSystem: "Web",
            description:
              "Orthopedic CPT code validation engine. Validates against NCCI PTP edits, MUE limits, modifier 59/X rules, and global surgical periods.",
            offers: {
              "@type": "Offer",
              price: "99.00",
              priceCurrency: "USD",
            },
          }),
        }}
      />

      {/* ═══════════════════════════ NAV ═══════════════════════════ */}
      <header className="sticky top-0 z-50 bg-[#0A2540] shadow-lg shadow-[#0A2540]/10">
        <nav className="flex justify-between items-center w-full px-6 md:px-8 py-4 max-w-7xl mx-auto">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <img src="/claimvex-logo-white.png" alt="ClaimVex" className="h-10 w-auto" />
            <span className="px-2 py-0.5 bg-[#00685f]/20 text-[#6bd8cb] text-[10px] font-bold uppercase tracking-wider rounded border border-[#00685f]/30">
              Beta
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            <a
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              href="#how-it-works"
            >
              How It Works
            </a>
            <a
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              href="#features"
            >
              Features
            </a>
            <a
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              href="#pricing"
            >
              Pricing
            </a>
            <a
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              href="#compare"
            >
              Compare
            </a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="bg-gradient-to-br from-[#00685f] to-[#008378] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-black/20"
            >
              Try Free →
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <MaterialIcon name={mobileMenuOpen ? "close" : "menu"} />
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0A2540] border-t border-white/10 px-6 pb-6 space-y-4">
            <a onClick={closeMobile} className="block text-sm text-slate-300 hover:text-white py-2" href="#how-it-works">How It Works</a>
            <a onClick={closeMobile} className="block text-sm text-slate-300 hover:text-white py-2" href="#features">Features</a>
            <a onClick={closeMobile} className="block text-sm text-slate-300 hover:text-white py-2" href="#pricing">Pricing</a>
            <a onClick={closeMobile} className="block text-sm text-slate-300 hover:text-white py-2" href="#compare">Compare</a>
            <Link onClick={closeMobile} to="/login" className="block text-sm text-slate-300 hover:text-white py-2">Login</Link>
            <Link onClick={closeMobile} to="/signup" className="block bg-gradient-to-br from-[#00685f] to-[#008378] text-white text-center px-6 py-3 rounded-lg font-bold text-sm">Start Free Trial →</Link>
          </div>
        )}
      </header>

      <main>
        {/* ═══════════════════════════ HERO ═══════════════════════════ */}
        <section className="bg-gradient-to-br from-[#0A2540] to-[#05111d] pt-20 pb-32 overflow-hidden relative">
          <div className="max-w-7xl mx-auto px-6 md:px-8 grid md:grid-cols-2 gap-16 items-center">
            <div className="z-10">
              <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight mb-6">
                Catch Orthopedic Coding Errors Before They Become Denials
              </h1>
              <p className="text-lg text-slate-300 font-medium mb-10 max-w-lg leading-relaxed">
                Validate CPT codes against NCCI edits, MUE limits, and global
                periods in seconds — catching denial-causing errors before you
                hit submit. Built specifically for orthopedic practices.
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    to="/signup"
                    className="bg-gradient-to-br from-[#00685f] to-[#008378] text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-[#00685f]/20 hover:brightness-110 transition-all text-center"
                  >
                    Start Free Trial →
                  </Link>
                </div>
                <p className="text-xs text-slate-400/80 font-medium ml-1">
                  No credit card required · 30-day free trial
                </p>
              </div>
            </div>

            {/* Validation Card Mockup */}
            <div className="relative">
              <div className="bg-white p-6 rounded-2xl shadow-2xl border-l-4 border-[#ba1a1a] transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-[#191c1e] font-bold text-xl">
                      Validation Alert
                    </h3>
                    <p className="text-[#3d4947] text-sm">
                      Procedure Bundle Conflict
                    </p>
                  </div>
                  <MaterialIcon
                    name="error"
                    className="text-[#ba1a1a] text-3xl"
                    fill
                  />
                </div>
                <div className="space-y-4 mb-6">
                  <div className="p-3 bg-[#ffdad6]/30 rounded-lg border border-[#ba1a1a]/10">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-bold text-[#ba1a1a]">
                        PTP Pair Check FAIL
                      </span>
                      <span className="font-mono text-[#3d4947]">
                        Code 29881 vs 29880
                      </span>
                    </div>
                    <p className="text-xs text-[#93000a]">
                      The comprehensive procedure includes the component
                      procedure.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                    <div className="p-2 bg-[#eceef0] rounded border border-[#bcc9c6]/30">
                      <p className="text-[#3d4947] mb-1 uppercase tracking-tighter">
                        Rule Reference
                      </p>
                      <p className="text-[#191c1e] font-bold">R-3.1.1</p>
                    </div>
                    <div className="p-2 bg-[#eceef0] rounded border border-[#bcc9c6]/30">
                      <p className="text-[#3d4947] mb-1 uppercase tracking-tighter">
                        Citation
                      </p>
                      <p className="text-[#191c1e] font-bold">CMS NCCI Edits</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-[#e6e8ea] py-2 text-xs font-bold rounded-lg text-center">
                    Dismiss
                  </div>
                  <div className="flex-1 bg-[#3b6187] text-white py-2 text-xs font-bold rounded-lg text-center">
                    Fix Modifier
                  </div>
                </div>
              </div>
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#00685f]/20 rounded-full blur-3xl -z-10" />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════ TRUST BAR ═══════════════════════════ */}
        <div className="bg-[#f2f4f6] py-6 border-y border-[#bcc9c6]/10">
          <div className="max-w-7xl mx-auto px-6 md:px-8 flex flex-col lg:flex-row justify-between items-center gap-4 text-[#3d4947]">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
              <div className="flex items-center gap-2 font-bold text-sm tracking-wide uppercase">
                <MaterialIcon name="verified_user" className="text-[#00685f] text-xl" />
                Powered by CMS NCCI Edits · MUE Tables · Medicare Physician Fee
                Schedule
              </div>
              <div className="hidden md:block w-px h-4 bg-[#bcc9c6]/30" />
              <div className="text-[11px] font-medium text-[#3d4947] flex items-center gap-2">
                <MaterialIcon name="shield_with_heart" className="text-[#3b6187] text-lg" />
                Your claim data is never stored. Validation runs in your
                browser.
              </div>
            </div>
            <div className="text-[10px] font-bold text-[#6d7a77] uppercase flex items-center gap-2">
              <span className="w-2 h-2 bg-[#00685f] rounded-full" />
              Rule data updated quarterly
            </div>
          </div>
        </div>

        {/* ═══════════════════════════ PROBLEM SECTION ═══════════════════════════ */}
        <section className="py-24 bg-[#f7f9fb] overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 md:px-8">
            <div className="grid md:grid-cols-12 gap-16">
              <div className="md:col-span-5">
                <h2 className="font-headline text-4xl font-black text-[#191c1e] mb-6 leading-tight">
                  The Orthopedic Billing Problem
                </h2>
                <p className="font-body text-[#3d4947] mb-8 leading-relaxed">
                  Orthopedic surgery is uniquely complex, often involving dozens
                  of procedure combinations within a single case. A single
                  missed Procedure-to-Procedure (PTP) edit or a misapplied
                  modifier 59 can lead to immediate denials. In an era of
                  shrinking margins, these manual errors are no longer
                  sustainable.
                </p>
                <div className="bg-[#00685f]/5 p-6 rounded-2xl border-l-4 border-[#00685f]">
                  <p className="italic text-[#00685f] font-medium">
                    "Clinical precision shouldn't stop in the OR. It needs to
                    follow the claim to the payer."
                  </p>
                </div>
              </div>
              <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-8 bg-white rounded-2xl shadow-sm border border-[#bcc9c6]/10">
                  <h4 className="text-[#00685f] text-4xl font-black mb-2">
                    $9.4B
                  </h4>
                  <p className="font-bold text-[#191c1e]">lost annually</p>
                  <p className="text-sm text-[#3d4947] mt-2">
                    To preventable coding errors and uncompensated reworks.
                  </p>
                </div>
                <div className="p-8 bg-white rounded-2xl shadow-sm border border-[#bcc9c6]/10">
                  <h4 className="text-[#ba1a1a] text-4xl font-black mb-2">
                    1 in 4
                  </h4>
                  <p className="font-bold text-[#191c1e]">claims denied</p>
                  <p className="text-sm text-[#3d4947] mt-2">
                    Ortho claims face higher scrutiny due to bundling rules.
                  </p>
                </div>
                <div className="p-8 bg-white rounded-2xl shadow-sm border border-[#bcc9c6]/10 sm:col-span-2">
                  <div className="flex items-center gap-6">
                    <h4 className="text-[#3b6187] text-4xl font-black">
                      $25–$50
                    </h4>
                    <div>
                      <p className="font-bold text-[#191c1e]">rework cost</p>
                      <p className="text-sm text-[#3d4947]">
                        The average administrative cost per denied claim rework.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════ HOW IT WORKS ═══════════════════════════ */}
        <section className="py-24 bg-[#f2f4f6]" id="how-it-works">
          <div className="max-w-7xl mx-auto px-6 md:px-8">
            <div className="text-center mb-16">
              <h2 className="font-headline text-3xl font-black text-[#191c1e]">
                Precision in Three Steps
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-12">
              {[
                {
                  icon: "input",
                  title: "Enter codes",
                  desc: "Simply type your CPT and ICD-10 pairs. ClaimVex automatically detects potential modifiers.",
                  bg: "bg-[#008378]/20",
                  color: "text-[#00685f]",
                },
                {
                  icon: "bolt",
                  title: "Instant validation",
                  desc: "Our engine cross-references 1M+ active CMS rules in milliseconds to find errors.",
                  bg: "bg-[#acd2fd]/20",
                  color: "text-[#3b6187]",
                },
                {
                  icon: "task_alt",
                  title: "Submit clean claims",
                  desc: "Export your verified codes directly into your EMR or billing system with confidence.",
                  bg: "bg-[#00685f]/10",
                  color: "text-[#00685f]",
                },
              ].map((step) => (
                <div
                  key={step.title}
                  className="flex flex-col items-center text-center"
                >
                  <div
                    className={`w-16 h-16 ${step.bg} rounded-2xl flex items-center justify-center mb-6 ${step.color} shadow-inner`}
                  >
                    <MaterialIcon name={step.icon} className="text-3xl" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-[#3d4947] text-sm leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════ 5 MODULES ═══════════════════════════ */}
        <section className="py-24 bg-[#f7f9fb]" id="features">
          <div className="max-w-7xl mx-auto px-6 md:px-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
              <div>
                <h2 className="font-headline text-4xl font-black text-[#191c1e] mb-4">
                  5 Validation Modules
                </h2>
                <p className="text-[#3d4947] max-w-lg">
                  Advanced algorithmic checks designed to mirror the workflow of
                  a senior orthopedic coder.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                {
                  icon: "account_tree",
                  title: "PTP Pair Check",
                  status: "Fail Found",
                  statusColor: "bg-[#ba1a1a]",
                  statusText: "text-[#ba1a1a]",
                  desc: "Identifies procedures that should not be reported together.",
                },
                {
                  icon: "numbers",
                  title: "MUE Limit Check",
                  status: "Pass",
                  statusColor: "bg-[#00685f]",
                  statusText: "text-[#00685f]",
                  desc: "Validates units of service against medically unlikely edits.",
                },
                {
                  icon: "rule",
                  title: "Modifier 59/X",
                  status: "Pass",
                  statusColor: "bg-[#00685f]",
                  statusText: "text-[#00685f]",
                  desc: "Ensures appropriate use of distinct procedural modifiers.",
                },
                {
                  icon: "calendar_month",
                  title: "Global Period",
                  status: "Pass",
                  statusColor: "bg-[#00685f]",
                  statusText: "text-[#00685f]",
                  desc: "Detects overlaps with global surgical packages (10/90 days).",
                },
                {
                  icon: "description",
                  title: "Documentation",
                  status: "Required",
                  statusColor: "bg-[#6d7a77]",
                  statusText: "text-[#3d4947]",
                  desc: "Flag codes that require operative report attachments.",
                },
              ].map((mod) => (
                <div
                  key={mod.title}
                  className="p-6 bg-[#f2f4f6] rounded-xl border border-[#bcc9c6]/10 hover:border-[#00685f]/30 transition-colors"
                >
                  <MaterialIcon
                    name={mod.icon}
                    className="text-[#00685f] mb-4"
                  />
                  <h4 className="font-bold mb-2">{mod.title}</h4>
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className={`w-2 h-2 ${mod.statusColor} rounded-full`}
                    />
                    <span
                      className={`text-[10px] font-bold ${mod.statusText} uppercase`}
                    >
                      {mod.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#3d4947] leading-relaxed">
                    {mod.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════ ROI SECTION ═══════════════════════════ */}
        <section className="py-24 bg-[#e0e3e5]/30">
          <div className="max-w-7xl mx-auto px-6 md:px-8 flex flex-col md:flex-row gap-16 items-center">
            <div className="flex-1">
              <h2 className="font-headline text-4xl font-black mb-6">
                Quantifiable Results
              </h2>
              <p className="text-[#3d4947] mb-10 text-lg leading-relaxed">
                Our ROI dashboard allows practice managers to see exactly how
                much revenue is being protected month-over-month. Stop guessing
                and start seeing the value of accurate coding.
              </p>
              <Link
                to="/signup"
                className="flex items-center gap-2 text-[#00685f] font-bold hover:gap-4 transition-all"
              >
                View Sample ROI Report{" "}
                <MaterialIcon name="arrow_forward" />
              </Link>
            </div>
            <div className="flex-1 w-full">
              <div className="bg-white p-8 rounded-3xl shadow-xl border border-[#bcc9c6]/10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                  <div>
                    <h3 className="font-bold text-lg">Performance History</h3>
                    <p className="text-xs text-[#3d4947]">
                      Jan 1 – Mar 31, 2026
                    </p>
                  </div>
                  <div className="bg-[#00685f] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-md">
                    <MaterialIcon name="download" className="text-sm" /> Export
                    ROI Report
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-[#3d4947] uppercase mb-1">
                      Errors Caught
                    </p>
                    <p className="text-2xl font-black text-[#191c1e]">1,422</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-[#3d4947] uppercase mb-1">
                      Savings Protected
                    </p>
                    <p className="text-2xl font-black text-[#00685f]">$42.1k</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-[#3d4947] uppercase mb-1">
                      Accuracy Score
                    </p>
                    <p className="text-2xl font-black text-[#3b6187]">99.8%</p>
                  </div>
                </div>
                {/* Abstract chart */}
                <div className="h-32 w-full flex items-end gap-2">
                  {[40, 55, 45, 70, 65, 85, 100].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-[#00685f] rounded-t-sm"
                      style={{
                        height: `${h}%`,
                        opacity: 0.2 + (i / 6) * 0.8,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════ PRICING ═══════════════════════════ */}
        <section
          className="py-24 bg-[#f7f9fb] relative overflow-hidden"
          id="pricing"
        >
          <div className="max-w-7xl mx-auto px-6 md:px-8 flex justify-center">
            <h2 className="sr-only">Simple, Transparent Pricing</h2>
            <div className="max-w-md w-full bg-[#0A2540] p-10 rounded-[2rem] shadow-2xl relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#00685f] text-white px-6 py-1 rounded-full text-xs font-black uppercase tracking-widest border-4 border-[#f7f9fb]">
                Founding Partner
              </div>
              <div className="text-center mb-10">
                <h3 className="text-slate-300 font-medium mb-4">
                  Complete Validation Suite
                </h3>
                <div className="flex flex-col items-center">
                  <div className="flex justify-center items-end gap-1 mb-2">
                    <span className="text-5xl font-black text-white">$99</span>
                    <span className="text-slate-400 mb-2">/month</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed max-w-[240px] mt-1 font-medium">
                    Less than the cost of 3 denied claims per month. Each denial
                    costs $44 in rework on average.
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 mt-4 uppercase tracking-tighter">
                  Locked-in pricing for early adopters
                </p>
              </div>
              <ul className="space-y-4 mb-10 text-slate-300">
                {[
                  "Unlimited CPT Validations",
                  "Quarterly Rule Engine Updates",
                  "ROI Analytics Dashboard",
                  "Export to PDF/CSV Reports",
                  "Priority Email Support",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <MaterialIcon
                      name="check_circle"
                      className="text-[#6bd8cb] text-lg"
                      fill
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className="block w-full bg-gradient-to-br from-[#00685f] to-[#008378] text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-black/40 hover:scale-[1.02] active:scale-95 transition-all text-center"
              >
                Start Free Trial →
              </Link>
            </div>
          </div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#00685f]/10 rounded-full blur-3xl" />
        </section>

        {/* ═══════════════════════════ COMPARISON ═══════════════════════════ */}
        <section className="py-24 bg-[#f2f4f6]" id="compare">
          <div className="max-w-7xl mx-auto px-6 md:px-8">
            <div className="text-center mb-16">
              <h2 className="font-headline text-3xl font-black mb-4">
                How We Compare
              </h2>
              <p className="text-[#3d4947]">
                Specific tools for specific specialties.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[#3d4947] font-bold text-sm border-b border-[#bcc9c6]/30">
                    <th className="py-6 px-4">Feature</th>
                    <th className="py-6 px-4 text-[#00685f] font-black">
                      ClaimVex
                    </th>
                    <th className="py-6 px-4">Enterprise CAC</th>
                    <th className="py-6 px-4">Manual References</th>
                  </tr>
                </thead>
                <tbody className="text-[#191c1e] font-medium">
                  {[
                    {
                      feature: "Ortho-Specific Logic",
                      cv: <MaterialIcon name="done" className="text-[#00685f]" />,
                      ent: <MaterialIcon name="remove" className="text-[#3d4947]" />,
                      manual: <MaterialIcon name="close" className="text-[#3d4947]" />,
                    },
                    {
                      feature: "CMS Rule Sync",
                      cv: <span className="font-bold text-[#00685f]">Real-time</span>,
                      ent: "Annual",
                      manual: "Manual",
                      highlight: true,
                    },
                    {
                      feature: "User Interface",
                      cv: "Clinical Architect",
                      ent: "Legacy/Grid",
                      manual: "Physical Books",
                    },
                    {
                      feature: "Implementation",
                      cv: "Instant",
                      ent: "6+ Months",
                      manual: "N/A",
                    },
                  ].map((row) => (
                    <tr
                      key={row.feature}
                      className={`border-b border-[#bcc9c6]/10 ${row.highlight ? "bg-[#00685f]/5" : ""}`}
                    >
                      <td className="py-5 px-4 text-sm">{row.feature}</td>
                      <td className="py-5 px-4">{row.cv}</td>
                      <td className="py-5 px-4">{row.ent}</td>
                      <td className="py-5 px-4">{row.manual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════ FAQ ═══════════════════════════ */}
        <section className="py-24 bg-[#f7f9fb]" id="faq">
          <div className="max-w-4xl mx-auto px-6 md:px-8">
            <div className="text-center mb-16">
              <h2 className="font-headline text-3xl font-black text-[#191c1e] mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-[#3d4947]">
                Everything you need to know about precision coding validation.
              </p>
            </div>
            <div className="space-y-4">
              {FAQ_DATA.map((faq) => (
                <FAQItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════ FINAL CTA ═══════════════════════════ */}
        <section className="py-24 bg-gradient-to-br from-[#0A2540] to-[#05111d] text-white">
          <div className="max-w-4xl mx-auto px-6 md:px-8 text-center">
            <h2 className="font-headline text-4xl font-black mb-8 leading-tight">
              Catch coding errors before they become denials.
            </h2>
            <Link
              to="/signup"
              className="inline-block bg-gradient-to-br from-[#00685f] to-[#008378] text-white px-12 py-5 rounded-2xl font-bold text-xl shadow-2xl shadow-[#00685f]/30 hover:scale-105 transition-all"
            >
              Start Your Free Trial
            </Link>
            <p className="mt-8 text-slate-400 text-sm font-medium">
              No credit card required. Cancel anytime.
            </p>
          </div>
        </section>
      </main>

      {/* ═══════════════════════════ FOOTER ═══════════════════════════ */}
      <footer className="bg-slate-50">
        <div className="flex flex-col md:flex-row justify-between items-start w-full px-6 md:px-8 py-16 max-w-7xl mx-auto gap-10">
          <div className="mb-10 md:mb-0">
            <img src="/claimvex-logo.png" alt="ClaimVex" className="h-8 mb-6 block" />
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              The precision engine for musculoskeletal procedure validation.
              Built for billing teams who demand 100% accuracy.
            </p>
            <div className="mt-6 flex items-center gap-2 text-[#00685f] font-bold">
              <MaterialIcon name="mail" />
              pazi@claimvex.com
            </div>
          </div>
          <div className="grid grid-cols-2 gap-16">
            <div>
              <h5 className="text-base font-bold text-[#191c1e] mb-6">
                Product
              </h5>
              <ul className="space-y-4">
                <li>
                  <a
                    className="text-sm text-slate-500 hover:text-[#00685f] transition-colors"
                    href="#how-it-works"
                  >
                    How It Works
                  </a>
                </li>
                <li>
                  <a
                    className="text-sm text-slate-500 hover:text-[#00685f] transition-colors"
                    href="#features"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    className="text-sm text-slate-500 hover:text-[#00685f] transition-colors"
                    href="#pricing"
                  >
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="text-base font-bold text-[#191c1e] mb-6">
                Legal
              </h5>
              <ul className="space-y-4">
                <li>
                  <a
                    className="text-sm text-slate-500 hover:text-[#00685f] transition-colors"
                    href="#"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    className="text-sm text-slate-500 hover:text-[#00685f] transition-colors"
                    href="#"
                  >
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-8 pb-12">
          <div className="pt-8 border-t border-[#bcc9c6]/20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-sm text-slate-500">
                © 2026 ClaimVex. All rights reserved.
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center md:text-right max-w-md">
                Disclaimer: This tool does not store or process Protected Health
                Information (PHI). Always verify coding with official CMS
                guidelines.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
