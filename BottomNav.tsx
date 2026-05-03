import {
  LayoutDashboard,
  Dumbbell,
  Calendar,
  Users,
  Bot,
} from "lucide-react";
import { useLocation } from "wouter";

const navItems = [
  { icon: LayoutDashboard, label: "대시보드", path: "/dashboard" },
  { icon: Dumbbell, label: "운동", path: "/workouts" },
  { icon: Calendar, label: "대회", path: "/races" },
  { icon: Users, label: "소셜", path: "/social" },
  { icon: Bot, label: "AI코치", path: "/ai-coach" },
];

export default function BottomNav() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border lg:hidden">
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive =
            location === item.path ||
            (item.path !== "/dashboard" && location.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-all ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`relative p-1.5 rounded-xl transition-all ${
                  isActive ? "bg-primary/10" : ""
                }`}
              >
                <item.icon
                  className={`w-5 h-5 transition-all ${
                    isActive ? "stroke-[2.5]" : "stroke-[1.5]"
                  }`}
                />
                {isActive && (
                  <div
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: "var(--cyan)" }}
                  />
                )}
              </div>
              <span
                className={`text-[10px] font-medium leading-none ${
                  isActive ? "font-bold" : ""
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      {/* Safe area for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
