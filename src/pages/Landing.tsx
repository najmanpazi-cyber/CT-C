import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ClipboardCheck,
  Zap,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Brain,
  Copy,
} from "lucide-react";

const PRODUCT_NAME = "[PRODUCT NAME]";

const stats = [
  { value: "38%", label: "Orthopedic coding error rate", sublabel: "Highest of any specialty" },
  { value: "$125B", label: "Annual losses from billing errors", sublabel: "Across US healthcare" },
  { value: "30%", label: "National coder shortage", sublabel: "Driving up costs & delays" },
  { value: "11.8%", label: "Average claim denial rate", sublabel: "70% from coding errors" },
];

const steps = [
  {
    icon: FileText,
    step: "01",
    title: "Paste Your Clinical Notes",
    description:
      "Copy operative notes or encounter documentation directly into the input panel. Select laterality, patient type, setting, and time spent from the dropdowns.",
  },
  {
    icon: Brain,
    step: "02",
    title: "AI Analyzes in Seconds",
    description:
      "The AI reviews your documentation against orthopedic coding rules, NCCI bundling guidelines, and modifier requirements — returning results in 3–5 seconds.",
  },
  {
    icon: Copy,
    step: "03",
    title: "Verify & Copy to Your System",
    description:
      "Review the suggested CPT code, ICD-10 pairings, modifiers, and rationale. Check the verification box and copy formatted codes directly into your billing system.",
  },
];

const users = [
  {
    icon: ClipboardCheck,
    title: "Medical Coders",
    subtitle: "CPC / CCS Certified",
    description:
      "Process 40–80 encounters daily with complex laterality, bundling, and modifier requirements. Get an AI second opinion without slowing down your workflow.",
  },
  {
    icon: Zap,
    title: "Billing Staff",
    subtitle: "Office Managers & Billing Coordinators",
    description:
      "Reduce claim denials without deep coding expertise. Missing information alerts tell you exactly what documentation to request before submitting.",
  },
  {
    icon: ShieldCheck,
    title: "Solo Surgeons",
    subtitle: "Orthopedic Practitioners",
    description:
      "Code your own encounters without hiring a dedicated coder. Get accurate suggestions in seconds and spend more time on patients.",
  },
];

const whatItDoes = [
  "Primary CPT code with confidence scoring (High / Medium / Low)",
  "ICD-10 diagnosis codes with medical necessity justification",
  "Modifier recommendations (-LT, -RT, -25, -50, -59) with explanations",
  "Coding rationale — the 'why' behind every suggestion",
  "Missing information alerts before you submit",
  "NCCI bundling checks and claim-readiness indicator",
  "Alternative codes to consider",
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-[#111827]">

      {/* ── HEADER ── */}
      <header className="border-b border-[#E5E7EB] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-bold tracking-tight">{PRODUCT_NAME}</span>
            <Badge variant="secondary" className="text-xs font-medium">Beta</Badge>
          </div>
          <Button
            onClick={() => navigate("/app")}
            className="bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
            size="sm"
          >
            Open Tool <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="border-b border-[#E5E7EB] px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#2563EB]">
            Orthopedic Coding Assistant
          </p>
          <h1 className="mb-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Accurate CPT codes from your clinical notes.{" "}
            <span className="text-[#2563EB]">In seconds.</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-[#6B7280]">
            Paste your operative notes or encounter documentation and receive AI-generated CPT codes,
            ICD-10 pairings, modifier recommendations, and a clear rationale — all requiring human
            verification before use.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              onClick={() => navigate("/app")}
              size="lg"
              className="w-full bg-[#2563EB] text-white hover:bg-[#1d4ed8] sm:w-auto"
            >
              Try the Tool <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-sm text-[#6B7280]">
              Beta access · No account required
            </p>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.value} className="text-center">
                <p className="text-3xl font-bold text-[#2563EB]">{s.value}</p>
                <p className="mt-1 text-sm font-medium text-[#111827]">{s.label}</p>
                <p className="text-xs text-[#6B7280]">{s.sublabel}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="border-b border-[#E5E7EB] px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center text-2xl font-bold">How It Works</h2>
          <p className="mb-10 text-center text-sm text-[#6B7280]">
            Three steps. No integration required. Works with your existing billing system.
          </p>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="relative rounded-lg border border-[#E5E7EB] p-6">
                  <span className="absolute right-4 top-4 text-xs font-bold text-[#E5E7EB]">
                    {s.step}
                  </span>
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF6FF]">
                    <Icon className="h-5 w-5 text-[#2563EB]" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-[#6B7280]">{s.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── WHAT YOU GET ── */}
      <section className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-10 sm:grid-cols-2 sm:items-center">
            <div>
              <h2 className="mb-2 text-2xl font-bold">Every result includes</h2>
              <p className="mb-6 text-sm text-[#6B7280]">
                Not just a code — a complete coding package you can verify and submit with confidence.
              </p>
              <ul className="flex flex-col gap-3">
                {whatItDoes.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" />
                    <span className="text-sm text-[#111827]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-[#16A34A]" />
                <span className="text-xs font-semibold uppercase tracking-wide text-[#16A34A]">
                  Clean Claim Ready
                </span>
              </div>
              <div className="mb-3 border-b border-[#E5E7EB] pb-3">
                <p className="text-xs font-medium text-[#6B7280]">Primary CPT Code</p>
                <p className="font-mono text-2xl font-bold text-[#111827]">27447-RT</p>
                <p className="text-sm text-[#6B7280]">Total knee arthroplasty</p>
                <span className="mt-1 inline-block rounded-full bg-[#dcfce7] px-2 py-0.5 text-xs font-semibold text-[#16A34A]">
                  High Confidence
                </span>
              </div>
              <div className="mb-3 border-b border-[#E5E7EB] pb-3">
                <p className="text-xs font-medium text-[#6B7280]">ICD-10 Diagnosis</p>
                <p className="font-mono text-sm font-semibold text-[#111827]">M17.11</p>
                <p className="text-xs text-[#6B7280]">Primary osteoarthritis, right knee</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#6B7280]">Rationale</p>
                <p className="text-xs leading-relaxed text-[#6B7280]">
                  Documentation describes a total knee arthroplasty on the right knee with cemented
                  tricompartmental prosthesis. Laterality confirmed right (-RT). Severe OA with
                  failed conservative management establishes medical necessity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ── */}
      <section className="border-b border-[#E5E7EB] px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center text-2xl font-bold">Built for orthopedic practices</h2>
          <p className="mb-10 text-center text-sm text-[#6B7280]">
            1–20 providers. The segment enterprise AI tools don't serve.
          </p>
          <div className="grid gap-6 sm:grid-cols-3">
            {users.map((u) => {
              const Icon = u.icon;
              return (
                <div key={u.title} className="rounded-lg border border-[#E5E7EB] p-6">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF6FF]">
                    <Icon className="h-5 w-5 text-[#2563EB]" />
                  </div>
                  <h3 className="mb-0.5 text-base font-semibold">{u.title}</h3>
                  <p className="mb-3 text-xs text-[#6B7280]">{u.subtitle}</p>
                  <p className="text-sm leading-relaxed text-[#6B7280]">{u.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to cut coding errors?</h2>
          <p className="mb-8 text-[#6B7280]">
            Currently in closed beta with orthopedic practices. No account needed to try the tool.
          </p>
          <Button
            onClick={() => navigate("/app")}
            size="lg"
            className="bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
          >
            Open the Coding Tool <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#E5E7EB] bg-[#F9FAFB] px-6 py-6">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs text-[#6B7280]">
            {PRODUCT_NAME} provides coding suggestions only. All codes must be verified by qualified
            personnel before claim submission. This tool is not a substitute for certified medical
            coding expertise.
          </p>
          <p className="mt-2 text-xs text-[#6B7280]">
            © 2026 {PRODUCT_NAME} · Beta
          </p>
        </div>
      </footer>

    </div>
  );
}
