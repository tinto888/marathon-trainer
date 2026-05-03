import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      const me = user as { onboardingCompleted?: boolean } | null;
      if (me && !me.onboardingCompleted) {
        setLocation("/onboarding");
      } else {
        setLocation("/dashboard");
      }
    }
  }, [loading, isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen blueprint-bg flex items-center justify-center">
        <div className="text-4xl animate-bounce">🏃</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen blueprint-bg relative overflow-hidden">
      {/* Geometric decorations */}
      <div className="absolute top-20 right-20 w-64 h-64 rounded-full border-2 opacity-10" style={{ borderColor: "var(--cyan)" }} />
      <div className="absolute top-32 right-32 w-40 h-40 rounded-full border opacity-10" style={{ borderColor: "var(--pink)" }} />
      <div className="absolute bottom-40 left-10 w-48 h-48 rounded-full border-2 opacity-10" style={{ borderColor: "var(--cyan)" }} />
      <div className="absolute top-1/2 left-1/4 w-2 h-2 rounded-full opacity-30" style={{ backgroundColor: "var(--cyan)" }} />
      <div className="absolute top-1/3 right-1/3 w-2 h-2 rounded-full opacity-30" style={{ backgroundColor: "var(--pink)" }} />

      {/* Formula decorations */}
      <div className="absolute top-16 left-16 mono-label opacity-20 text-xs">
        v = d/t · pace = 1/v
      </div>
      <div className="absolute bottom-32 right-24 mono-label opacity-20 text-xs">
        VO₂max = 15 × (HRmax/HRrest)
      </div>
      <div className="absolute top-1/2 right-12 mono-label opacity-15 text-xs rotate-90">
        f(x) = a·e^(bx)
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏃</span>
          <div>
            <span className="font-bold text-xl tracking-tight">Marathon Trainer</span>
            <div className="mono-label">AI-POWERED RUNNING COACH</div>
          </div>
        </div>
        <Button onClick={() => { window.location.href = getLoginUrl(); }} variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
          로그인
        </Button>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-8 text-center">
        <div className="mono-label mb-4">// MARATHON TRAINING SYSTEM v1.0</div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-6 max-w-4xl">
          데이터로 완성하는
          <br />
          <span style={{ color: "var(--cyan)" }}>마라톤</span> 훈련
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mb-10 leading-relaxed">
          AI 코치가 당신의 체력, 목표, 일정을 분석해 최적의 훈련 계획을 설계합니다.
          기록을 쌓고, 동료와 비교하며, 목표 대회를 정복하세요.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Button
            size="lg"
            className="text-base px-8 py-6 font-bold"
            onClick={() => { window.location.href = getLoginUrl(); }}
          >
            무료로 시작하기 →
          </Button>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl w-full">
          {[
            { icon: "🤖", label: "AI 훈련 계획", desc: "목표 기반 자동 생성" },
            { icon: "📊", label: "훈련 통계", desc: "주간/월간 시각화" },
            { icon: "🏆", label: "소셜 비교", desc: "리더보드 & 비교" },
            { icon: "📅", label: "대회 관리", desc: "D-day 카운트다운" },
            { icon: "💬", label: "AI 코치 채팅", desc: "실시간 맞춤 조언" },
            { icon: "🔔", label: "스마트 알림", desc: "훈련 루틴 유지" },
          ].map((f) => (
            <div key={f.label} className="blueprint-card p-4 text-left">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="font-semibold text-sm">{f.label}</div>
              <div className="mono-label mt-1">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
