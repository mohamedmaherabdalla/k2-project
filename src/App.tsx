import { Shield, ArrowRight, CheckCircle, Zap, Rocket, Code2, FileCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { LabSimulator } from "./components/LabSimulator";

type ViewMode = "landing" | "lab";

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("landing");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "lab") {
      setViewMode("lab");
    }
  }, []);

  const enterLab = () => {
    setViewMode("lab");
    const url = new URL(window.location.href);
    url.searchParams.set("view", "lab");
    window.history.replaceState({}, "", url.toString());
  };

  const returnToLanding = () => {
    setViewMode("landing");
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    window.history.replaceState({}, "", url.toString());
  };

  if (viewMode === "lab") {
    return <LabSimulator onBack={returnToLanding} />;
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans antialiased">
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-lg border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#F97316]" />
            <span className="text-xl font-bold text-[#111827] tracking-tight">Invariant</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={enterLab}
              className="px-5 py-2 bg-[#111827] text-white rounded-xl text-sm font-medium hover:bg-[#1f2937] transition inline-flex items-center gap-2"
            >
              Run Invariant <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-24">
        <section className="max-w-5xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 mb-8">
            <span className="w-2 h-2 bg-[#F97316] rounded-full animate-pulse"></span>
            <span className="text-sm font-medium text-gray-700">Now in Public Beta</span>
          </div>

          <h1 className="text-7xl font-bold text-[#111827] tracking-tight leading-[1.1] mb-6">
            We generate the tests
            <br />
            you forgot to write.
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12 leading-relaxed">
            Enterprise-grade logic security that catches critical bugs before production. Click Run
            Invariant to enter the live VS Code simulator experience.
          </p>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={enterLab}
              className="px-8 py-4 bg-[#111827] text-white rounded-2xl text-base font-semibold hover:bg-[#1f2937] transition flex items-center gap-2"
            >
              Run Invariant <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="https://github.com/mohamedmaherabdalla/k2-project"
              target="_blank"
              rel="noreferrer"
              className="px-8 py-4 bg-white text-[#111827] rounded-2xl text-base font-semibold border-2 border-gray-300 hover:border-[#111827] transition"
            >
              View GitHub
            </a>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-3xl p-12 border border-gray-200 hover:border-gray-300 transition">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h3 className="text-3xl font-bold text-[#111827] mb-4 tracking-tight">
                    Business Logic vs Syntax
                  </h3>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    Traditional tools catch syntax errors. Invariant catches the billion-dollar
                    logic flaws.
                  </p>
                </div>
                <Code2 className="w-12 h-12 text-[#F97316]" />
              </div>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">❌</span>
                  </div>
                  <div>
                    <div className="font-semibold text-[#111827] mb-1">Syntax Checkers</div>
                    <div className="text-gray-600 text-sm">
                      Find typos, missing semicolons, type mismatches
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#111827] mb-1">Invariant</div>
                    <div className="text-gray-600 text-sm">
                      Finds payment race conditions, auth bypasses, state corruption
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl p-10 border border-gray-200 hover:border-gray-300 transition">
              <div className="w-14 h-14 rounded-2xl bg-[#F97316] flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-[#111827] mb-3 tracking-tight">Zero Config</h3>
              <p className="text-gray-600 leading-relaxed">
                Point Invariant at your repo. No annotations, no DSLs, no rewrites.
              </p>
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl p-10 border border-gray-200 hover:border-gray-300 transition">
              <div className="w-14 h-14 rounded-2xl bg-[#111827] flex items-center justify-center mb-6">
                <Rocket className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-[#111827] mb-3 tracking-tight">CI/CD Ready</h3>
              <p className="text-gray-600 leading-relaxed">
                Runs in GitHub Actions, GitLab CI, Jenkins. Get security reports on every PR.
              </p>
            </div>

            <div className="md:col-span-2 bg-gradient-to-br from-[#F97316]/5 to-white rounded-3xl p-10 border border-[#F97316]/20 hover:border-[#F97316]/40 transition">
              <div className="w-14 h-14 rounded-2xl bg-[#F97316] flex items-center justify-center mb-6">
                <FileCheck className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-[#111827] mb-3 tracking-tight">
                Production-Grade Coverage
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Every edge case, every race condition, every security boundary.
              </p>
              <div className="flex items-center gap-8 text-center">
                <div>
                  <div className="text-4xl font-bold text-[#111827]">10,000+</div>
                  <div className="text-sm text-gray-600 mt-1">Tests Generated</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-[#111827]">99.8%</div>
                  <div className="text-sm text-gray-600 mt-1">Logic Coverage</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-[#111827]">&lt;2min</div>
                  <div className="text-sm text-gray-600 mt-1">Analysis Time</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
