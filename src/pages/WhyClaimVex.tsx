import { Link } from "react-router-dom";

function MaterialIcon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

const COMPARISONS = [
  { feature: "Orthopedic-specific CPT rules", claimvex: true, enterprise: true, generic: false },
  { feature: "NCCI PTP bundling checks", claimvex: true, enterprise: true, generic: false },
  { feature: "Modifier 59 vs XE/XS/XP/XU logic", claimvex: true, enterprise: false, generic: false },
  { feature: "MUE unit limit validation", claimvex: true, enterprise: true, generic: false },
  { feature: "Global period conflict detection", claimvex: true, enterprise: true, generic: false },
  { feature: "Documentation sufficiency checks", claimvex: true, enterprise: false, generic: false },
  { feature: "No EHR integration required", claimvex: true, enterprise: false, generic: true },
  { feature: "Results in under 5 seconds", claimvex: true, enterprise: true, generic: true },
  { feature: "ROI tracking & export", claimvex: true, enterprise: true, generic: false },
  { feature: "Price under $100/month", claimvex: true, enterprise: false, generic: true },
  { feature: "No implementation project", claimvex: true, enterprise: false, generic: true },
];

function Check({ yes }: { yes: boolean }) {
  return yes
    ? <MaterialIcon name="check_circle" className="text-cv-secondary text-lg" />
    : <MaterialIcon name="cancel" className="text-cv-outline-variant/40 text-lg" />;
}

export default function WhyClaimVex() {
  return (
    <div className="min-h-screen bg-cv-surface font-body text-cv-on-surface">
      {/* Nav */}
      <nav className="border-b border-cv-outline-variant/30 bg-cv-surface-container-lowest">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-8 py-4">
          <Link to="/" className="text-2xl font-extrabold tracking-tight text-cv-primary font-headline">ClaimVex</Link>
          <Link to="/signup" className="bg-medical-gradient text-cv-on-primary px-6 py-2.5 text-sm font-bold rounded-lg shadow-sm hover:shadow-md hover:brightness-110 transition-all">
            Try Free
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="font-headline text-3xl md:text-4xl font-extrabold text-cv-primary mb-4">
            Your coder does the coding.<br />ClaimVex catches what they miss.
          </h1>
          <p className="text-cv-on-surface-variant text-lg max-w-2xl mx-auto">
            We&apos;re not a coding tool. We&apos;re a validation engine. Enter your codes, get instant pass/fail results from 5 CMS-backed rule modules.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="rounded-2xl border border-cv-outline-variant/20 overflow-hidden shadow-sm mb-12">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cv-surface-container-low border-b border-cv-outline-variant/20">
                <th className="text-left px-5 py-4 font-bold text-cv-on-surface-variant text-xs uppercase tracking-wider">Feature</th>
                <th className="text-center px-4 py-4 font-bold text-cv-primary text-xs uppercase tracking-wider">ClaimVex<br /><span className="text-cv-secondary font-normal normal-case">$99/mo</span></th>
                <th className="text-center px-4 py-4 font-bold text-cv-on-surface-variant text-xs uppercase tracking-wider">Enterprise Tools<br /><span className="font-normal normal-case text-cv-on-surface-variant/70">$50K+/year</span></th>
                <th className="text-center px-4 py-4 font-bold text-cv-on-surface-variant text-xs uppercase tracking-wider">Generic AI<br /><span className="font-normal normal-case text-cv-on-surface-variant/70">ChatGPT etc.</span></th>
              </tr>
            </thead>
            <tbody>
              {COMPARISONS.map((row, i) => (
                <tr key={row.feature} className={`border-b border-cv-outline-variant/10 ${i % 2 === 0 ? "bg-cv-surface-container-lowest" : "bg-cv-surface"}`}>
                  <td className="px-5 py-3 text-sm text-cv-on-surface">{row.feature}</td>
                  <td className="px-4 py-3 text-center"><Check yes={row.claimvex} /></td>
                  <td className="px-4 py-3 text-center"><Check yes={row.enterprise} /></td>
                  <td className="px-4 py-3 text-center"><Check yes={row.generic} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Key Differentiators */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: "speed", title: "No Implementation", desc: "Sign up, paste codes, get results. No IT project, no EHR integration, no 6-month rollout." },
            { icon: "verified", title: "CMS-Backed Rules", desc: "Every rule traces to NCCI edit files, MUE values, or AMA CPT guidelines. Not AI guesswork." },
            { icon: "savings", title: "$99/month", desc: "Enterprise tools cost $50K+/year. ClaimVex delivers the same validation for orthopedic practices at 1/40th the cost." },
          ].map((d) => (
            <div key={d.title} className="rounded-xl border border-cv-outline-variant/20 bg-cv-surface-container-lowest p-6">
              <MaterialIcon name={d.icon} className="text-cv-secondary text-2xl mb-3 block" />
              <h3 className="font-bold text-cv-on-surface mb-2">{d.title}</h3>
              <p className="text-sm text-cv-on-surface-variant leading-relaxed">{d.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            to="/signup"
            className="inline-block bg-medical-gradient text-cv-on-primary px-10 py-4 text-base font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
          >
            Start Free Trial
          </Link>
          <p className="mt-3 text-sm text-cv-on-surface-variant">30-day free trial. No credit card required.</p>
        </div>
      </main>
    </div>
  );
}
