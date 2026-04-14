import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  LayoutDashboard,
  Mail,
  Menu,
  Mic,
  Plus,
  Presentation,
  Settings,
  Shield,
  Swords,
  TrendingUp,
  Users,
  Video,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

const navItems = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/" },
      { label: "Meetings", icon: Video, path: "/meetings" },
      { label: "New Meeting", icon: Plus, path: "/meetings/new" },
    ],
  },
  {
    group: "AI Analysis",
    items: [
      { label: "Analyze Transcript", icon: Wand2, path: "/analyze" },
      { label: "SPICED Reports", icon: TrendingUp, path: "/spiced" },
      { label: "MEDDPICC Reports", icon: BarChart3, path: "/meddpicc" },
      { label: "AI Analysis", icon: Activity, path: "/analysis" },
    ],
  },
  {
    group: "Sales Tools",
    items: [
      { label: "Email Generator", icon: Mail, path: "/email" },
      { label: "Prospect Queue", icon: Users, path: "/prospects" },
      { label: "Deck Generator", icon: Presentation, path: "/deck" },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { label: "Battlecards", icon: Swords, path: "/battlecards" },
      { label: "Objection Library", icon: Shield, path: "/objections" },
    ],
  },
  {
    group: "Workflow",
    items: [
      { label: "Action Items", icon: CheckSquare, path: "/actions" },
      { label: "Deal Timeline", icon: GitBranch, path: "/timeline" },
      { label: "Notes", icon: BookOpen, path: "/notes" },
    ],
  },
];

type SalesLayoutProps = {
  children: React.ReactNode;
};

export default function SalesLayout({ children }: SalesLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Close mobile drawer on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 shrink-0">
          <Mic className="w-4 h-4 text-primary" />
        </div>
        {(!collapsed || isMobile) && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">SalesLens</p>
            <p className="text-xs text-muted-foreground truncate">AI Sales Intelligence</p>
          </div>
        )}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {navItems.map((group) => (
          <div key={group.group}>
            {(!collapsed || isMobile) && (
              <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.group}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.path === "/"
                    ? location === "/"
                    : location.startsWith(item.path);
                return (
                  <li key={item.path}>
                    <Link href={item.path}>
                      <span
                        className={cn(
                          "flex items-center gap-3 px-2 py-2.5 rounded-md text-sm font-medium transition-all cursor-pointer",
                          isActive
                            ? "bg-primary/15 text-primary border border-primary/20"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                          collapsed && !isMobile && "justify-center px-2"
                        )}
                        title={collapsed && !isMobile ? item.label : undefined}
                      >
                        <item.icon
                          className={cn(
                            "shrink-0",
                            collapsed && !isMobile ? "w-5 h-5" : "w-4 h-4",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        {(!collapsed || isMobile) && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        <Link href="/settings">
          <span
            className={cn(
              "flex items-center gap-3 px-2 py-2.5 rounded-md text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all cursor-pointer",
              collapsed && !isMobile && "justify-center"
            )}
            title={collapsed && !isMobile ? "Settings" : undefined}
          >
            <Settings className={cn("shrink-0", collapsed && !isMobile ? "w-5 h-5" : "w-4 h-4")} />
            {(!collapsed || isMobile) && <span>Settings</span>}
          </span>
        </Link>
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex items-center gap-3 px-2 py-2.5 rounded-md text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all w-full",
              collapsed && "justify-center"
            )}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        )}
        {/* Privacy badge */}
        {(!collapsed || isMobile) && (
          <div className="mx-2 mt-2 px-2 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-[10px] text-emerald-400 font-medium text-center">
              🔒 All data stays local
            </p>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-sidebar transition-all duration-300 shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer panel ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-sidebar border-r border-border transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent isMobile />
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex md:hidden items-center gap-3 px-4 py-3 border-b border-border bg-sidebar shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/20 border border-primary/30">
              <Mic className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">SalesLens</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto min-w-0 pb-safe">
          {children}
        </main>
      </div>
    </div>
  );
}
