import { useNavigate } from "react-router-dom";

function MaterialIcon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="bg-cv-surface font-body text-cv-on-surface antialiased">
      {/* TopNavBar */}
      <nav className="bg-cv-surface-bright/90 backdrop-blur-md fixed top-0 left-0 right-0 z-50 border-b border-cv-outline-variant/30">
        <div className="flex justify-between items-center w-full px-6 lg:px-8 py-4 max-w-7xl mx-auto">
          <div className="text-2xl font-extrabold tracking-tight text-cv-primary">ClaimVex</div>
          <div className="hidden md:flex gap-8 items-center">
            <a className="text-cv-primary border-b-2 border-cv-secondary pb-1 text-sm font-bold tracking-wide" href="#features">Features</a>
            <a className="text-cv-on-surface-variant hover:text-cv-primary transition-colors text-sm font-semibold tracking-wide" href="#solutions">Solutions</a>
            <a className="text-cv-on-surface-variant hover:text-cv-primary transition-colors text-sm font-semibold tracking-wide" href="#how-it-works">How It Works</a>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/login")}
              className="px-5 py-2 text-sm font-bold text-cv-primary hover:bg-cv-surface-container-low transition-all rounded-lg"
            >
              Login
            </button>
            <a
              href="mailto:pazi@claimvex.com?subject=ClaimVex%20Demo%20Request"
              className="bg-medical-gradient text-cv-on-primary px-6 py-2.5 text-sm font-bold rounded-lg shadow-sm hover:shadow-md hover:brightness-110 transition-all active:scale-95"
            >
              Request Demo
            </a>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-32 pb-20 md:pt-48 md:pb-32 bg-cv-surface-container-lowest">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
            <div className="z-10 text-center lg:text-left">
              <h1 className="font-headline text-4xl md:text-6xl font-extrabold text-cv-primary leading-tight mb-6">
                Catch Coding Errors <br className="hidden md:block" />Before They Become Denials
              </h1>
              <p className="text-cv-on-surface-variant text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto lg:mx-0">
                Stop <strong>revenue leakage</strong>, eliminate <strong>denied claims</strong>, and reclaim <strong>hours lost to manual code review</strong> with AI-powered validation that scans for CPT errors and documentation gaps before you hit submit.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                <a
                  href="mailto:pazi@claimvex.com?subject=ClaimVex%20Demo%20Request"
                  className="bg-medical-gradient text-cv-on-primary px-8 py-4 text-base font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                >
                  Request Demo
                </a>
                <button
                  onClick={() => navigate("/signup")}
                  className="bg-cv-surface-container-high text-cv-primary px-8 py-4 text-base font-bold rounded-xl hover:bg-cv-surface-container-highest transition-all border border-cv-outline-variant/20"
                >
                  Try Free
                </button>
              </div>
            </div>

            {/* Hero Mockup */}
            <div className="relative group max-w-xl mx-auto lg:max-w-none">
              <div className="absolute inset-0 bg-cv-secondary/5 rounded-3xl -rotate-2 transform group-hover:rotate-0 transition-transform duration-700" />
              <div className="relative bg-cv-surface-container-lowest p-6 md:p-8 rounded-3xl shadow-2xl border border-cv-outline-variant/20">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-cv-error animate-pulse" />
                    <span className="text-xs font-bold text-cv-on-surface uppercase tracking-widest">Active Audit Scan</span>
                  </div>
                  <div className="text-cv-secondary text-xs font-bold bg-cv-secondary-container/50 px-3 py-1 rounded-full border border-cv-secondary/20">98.2% Accuracy</div>
                </div>
                <div className="space-y-6">
                  <div className="h-2 w-full bg-cv-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-cv-secondary w-[85%] rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-cv-surface-container-low rounded-2xl border-l-4 border-cv-secondary">
                      <div className="text-[10px] text-cv-on-surface-variant font-bold uppercase tracking-wider mb-1">Valid Records</div>
                      <div className="text-2xl font-extrabold text-cv-primary">1,429</div>
                    </div>
                    <div className="p-4 bg-cv-error-container/10 rounded-2xl border-l-4 border-cv-error">
                      <div className="text-[10px] text-cv-on-surface-variant font-bold uppercase tracking-wider mb-1">Alerts Flagged</div>
                      <div className="text-2xl font-extrabold text-cv-error">12</div>
                    </div>
                  </div>
                  <div className="p-5 bg-cv-surface-container-high/40 rounded-2xl flex items-center gap-4 border border-cv-outline-variant/10">
                    <div className="w-10 h-10 bg-cv-primary/10 rounded-lg flex items-center justify-center">
                      <MaterialIcon name="clinical_notes" className="text-cv-primary" />
                    </div>
                    <div className="text-sm">
                      <div className="font-bold text-cv-primary">CPT 99214 Detected</div>
                      <div className="text-cv-on-surface-variant font-medium">Checking modifier compatibility...</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Background Elements */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-cv-secondary/5 rounded-full blur-3xl -z-10" />
          <div className="absolute top-1/2 -left-24 w-72 h-72 bg-cv-primary/5 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cv-outline-variant/30 to-transparent" />
        </section>

        {/* Metrics Bar */}
        <section className="bg-cv-primary py-16">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
              <div className="flex flex-col items-center">
                <div className="text-5xl font-headline font-extrabold text-cv-secondary-fixed mb-2 tracking-tight">24%</div>
                <div className="text-cv-primary-fixed text-sm font-bold uppercase tracking-widest opacity-80">Denial Reduction</div>
              </div>
              <div className="flex flex-col items-center md:border-x border-white/10 px-4">
                <div className="text-5xl font-headline font-extrabold text-cv-secondary-fixed mb-2 tracking-tight">4.2m</div>
                <div className="text-cv-primary-fixed text-sm font-bold uppercase tracking-widest opacity-80">Rules Checked</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-5xl font-headline font-extrabold text-cv-secondary-fixed mb-2 tracking-tight">90%</div>
                <div className="text-cv-primary-fixed text-sm font-bold uppercase tracking-widest opacity-80">Time Saved per Review</div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Validation Modules */}
        <section className="py-24 md:py-32 bg-cv-surface-container-lowest" id="features">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center md:text-left mb-16 md:mb-20">
              <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-cv-primary mb-4">Core Validation Modules</h2>
              <p className="text-cv-on-surface-variant max-w-2xl text-lg font-medium">Enterprise-grade medical code auditing powered by clinical-grade AI.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: "inventory_2", title: "CPT Bundling Detection", desc: "Identify NCCI and payer bundling edits in real-time to prevent unbundling denials." },
                { icon: "settings_suggest", title: "Modifier 59/X Validation", desc: "Precision logic for distinct procedural services ensuring correct reimbursement outcomes." },
                { icon: "rule", title: "MUE Limit Checks", desc: "Alert for medically unlikely units of service based on standard clinical thresholds." },
                { icon: "history", title: "Global Period Rules", desc: "Automatic detection of procedures performed within surgical global windows for accuracy." },
                { icon: "fact_check", title: "Documentation Support", desc: "Assess clinical support and documentation requirements for billed codes instantly." },
                { icon: "compare_arrows", title: "PTP Pair Analysis", desc: "Deep scans for Procedure-to-Procedure edits and conflicting code combinations." },
              ].map((f) => (
                <div key={f.title} className="bg-cv-surface p-8 rounded-2xl hover:shadow-2xl hover:-translate-y-1 transition-all group border border-cv-outline-variant/20">
                  <div className="w-14 h-14 bg-cv-primary-container/20 rounded-xl flex items-center justify-center mb-6 text-cv-primary group-hover:bg-cv-primary group-hover:text-cv-on-primary transition-colors">
                    <MaterialIcon name={f.icon} className="!text-3xl" />
                  </div>
                  <h3 className="font-headline font-extrabold text-xl mb-3 text-cv-primary">{f.title}</h3>
                  <p className="text-cv-on-surface-variant text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24 md:py-32 bg-cv-surface-container-high/30" id="how-it-works">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-cv-primary mb-6">How It Works</h2>
              <div className="w-20 h-1.5 bg-cv-secondary mx-auto rounded-full" />
            </div>
            <div className="grid md:grid-cols-3 gap-12 lg:gap-20 relative">
              <div className="relative text-center group">
                <div className="w-24 h-24 bg-cv-surface-container-lowest rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl border border-cv-outline-variant/10 group-hover:border-cv-secondary transition-all">
                  <MaterialIcon name="upload_file" className="text-4xl text-cv-primary" />
                </div>
                <h3 className="font-headline font-extrabold text-xl mb-4 text-cv-primary uppercase tracking-tight">1. Upload Codes</h3>
                <p className="text-cv-on-surface-variant text-base leading-relaxed">Securely import claims data via API or direct file upload into the ClaimVex engine.</p>
              </div>
              <div className="relative text-center group">
                <div className="w-24 h-24 bg-cv-secondary rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl border-4 border-cv-secondary-container/30 group-hover:scale-110 transition-all">
                  <MaterialIcon name="vitals" className="text-4xl text-cv-on-secondary" />
                </div>
                <h3 className="font-headline font-extrabold text-xl mb-4 text-cv-primary uppercase tracking-tight">2. Validate Instantly</h3>
                <p className="text-cv-on-surface-variant text-base leading-relaxed">Our AI engine runs thousands of rules per second against your specific payer contracts.</p>
              </div>
              <div className="relative text-center group">
                <div className="w-24 h-24 bg-cv-surface-container-lowest rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl border border-cv-outline-variant/10 group-hover:border-cv-secondary transition-all">
                  <MaterialIcon name="task_alt" className="text-4xl text-cv-primary" />
                </div>
                <h3 className="font-headline font-extrabold text-xl mb-4 text-cv-primary uppercase tracking-tight">3. Submit Clean Claims</h3>
                <p className="text-cv-on-surface-variant text-base leading-relaxed">Download scrubbed reports or push clean data directly to your billing clearinghouse.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Stakeholders */}
        <section className="py-24 md:py-32 bg-cv-surface" id="solutions">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-cv-primary mb-4">Clinical Precision for Every Stakeholder</h2>
            </div>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="p-8 md:p-10 bg-cv-surface-container-lowest rounded-3xl border border-cv-outline-variant/30 flex flex-col hover:shadow-lg transition-shadow">
                <h3 className="font-headline font-extrabold text-xl text-cv-primary mb-6">Medical Billing Companies</h3>
                <ul className="space-y-5 text-cv-on-surface-variant flex-grow">
                  {["Enhance productivity with automated auditing.", "Build client trust through error-free submissions.", "Scale operations without adding head count."].map((t) => (
                    <li key={t} className="flex items-start gap-4">
                      <MaterialIcon name="check_circle" className="text-cv-secondary text-xl" />
                      <span className="text-sm font-medium">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-8 md:p-10 bg-cv-primary text-cv-on-primary rounded-3xl shadow-2xl transform lg:-translate-y-4 flex flex-col border border-cv-primary-container">
                <h3 className="font-headline font-extrabold text-xl mb-6">Revenue Cycle Teams</h3>
                <ul className="space-y-5 flex-grow">
                  {["Streamline complex coding workflows.", "Maximize revenue integrity and capture.", "Eliminate manual auditing bottlenecks."].map((t) => (
                    <li key={t} className="flex items-start gap-4">
                      <MaterialIcon name="check_circle" className="text-cv-secondary-fixed text-xl" />
                      <span className="text-sm font-medium opacity-90">{t}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 pt-6 border-t border-white/10">
                  <span className="text-xs font-bold uppercase tracking-widest text-cv-secondary-fixed">Most Popular Solution</span>
                </div>
              </div>

              <div className="p-8 md:p-10 bg-cv-surface-container-lowest rounded-3xl border border-cv-outline-variant/30 flex flex-col hover:shadow-lg transition-shadow">
                <h3 className="font-headline font-extrabold text-xl text-cv-primary mb-6">Healthcare Organizations</h3>
                <ul className="space-y-5 text-cv-on-surface-variant flex-grow">
                  {["Reduce overall administrative burden.", "Minimize compliance and audit risks.", "Improve physician satisfaction scores."].map((t) => (
                    <li key={t} className="flex items-start gap-4">
                      <MaterialIcon name="check_circle" className="text-cv-secondary text-xl" />
                      <span className="text-sm font-medium">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 md:py-32 relative overflow-hidden bg-cv-surface-container-lowest">
          <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center relative z-10">
            <div className="bg-cv-primary p-10 md:p-20 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute -top-1/2 -left-1/4 w-full h-full border-[60px] border-cv-on-primary rounded-full" />
                <div className="absolute -bottom-1/2 -right-1/4 w-full h-full border-[60px] border-cv-on-primary rounded-full" />
              </div>
              <h2 className="font-headline text-3xl md:text-5xl font-extrabold text-cv-on-primary mb-6 leading-tight relative">
                Stop Revenue Leakage <br />Before It Starts
              </h2>
              <p className="text-cv-primary-fixed text-lg md:text-xl mb-10 max-w-2xl mx-auto font-medium opacity-90 relative">
                Join leading healthcare institutions using ClaimVex to achieve clinical precision in every claim.
              </p>
              <a
                href="mailto:pazi@claimvex.com?subject=ClaimVex%20Demo%20Request"
                className="inline-block bg-cv-secondary-container text-cv-primary px-10 py-5 text-lg font-extrabold rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg hover:bg-white relative"
              >
                Request a Demo Now
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-cv-surface-container-high/50 border-t border-cv-outline-variant/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 lg:gap-8 mb-16">
            <div className="col-span-2 lg:col-span-1">
              <span className="text-2xl font-extrabold text-cv-primary mb-6 block">ClaimVex</span>
              <p className="text-cv-on-surface-variant text-sm leading-relaxed mb-6">
                Clinical precision in data. The industry standard for automated claim auditing and validation.
              </p>
              <div className="flex gap-4">
                <a className="text-cv-on-surface-variant hover:text-cv-primary transition-colors" href="#">
                  <MaterialIcon name="share" />
                </a>
                <a className="text-cv-on-surface-variant hover:text-cv-primary transition-colors" href="#">
                  <MaterialIcon name="alternate_email" />
                </a>
              </div>
            </div>
            {[
              { heading: "Product", links: ["Features", "Solutions", "Integration", "Pricing"] },
              { heading: "Company", links: ["About Us", "Careers", "Trust Center", "Privacy"] },
              { heading: "Resources", links: ["Documentation", "API Reference", "Blog", "Support"] },
              { heading: "Contact", links: ["Sales", "Support", "Partnerships"] },
            ].map((col) => (
              <div key={col.heading}>
                <h4 className="font-headline text-base font-extrabold text-cv-primary mb-6 uppercase tracking-wider">{col.heading}</h4>
                <ul className="flex flex-col gap-3">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a className="text-cv-on-surface-variant hover:text-cv-secondary transition-all text-sm font-medium" href="#">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-cv-outline-variant/20 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-cv-on-surface-variant text-xs font-medium">&copy; 2026 ClaimVex. All rights reserved. Clinical Precision in Data.</p>
            <div className="flex gap-6">
              <a className="text-cv-on-surface-variant hover:text-cv-primary text-xs font-bold transition-all" href="#">Terms of Service</a>
              <a className="text-cv-on-surface-variant hover:text-cv-primary text-xs font-bold transition-all" href="#">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
