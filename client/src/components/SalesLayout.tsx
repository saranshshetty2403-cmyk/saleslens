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
  Mic,
  Plus,
  Settings,
  TrendingUp,
  Video,
} from "lucide-react";
import { useState } from "react";
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
    group: "Intelligence",
    items: [
      { label: "Analysis", icon: Activity, path: "/analysis" },
      { label: "SPICED Reports", icon: TrendingUp, path: "/spiced" },
      { label: "MEDDPICC Reports", icon: BarChart3, path: "/meddpicc" },
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
  const [location] = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-sidebar transition-all duration-300 shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 shrink-0">
            <Mic className="w-4 h-4 text-primary" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">SalesLens</p>
              <p className="text-xs text-muted-foreground truncate">AI Sales Intelligence</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
          {navItems.map((group) => (
            <div key={group.group}>
              {!collapsed && (
                <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {group.group}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = location === item.path;
                  return (
                    <li key={item.path}>
                      <Link href={item.path}>
                        <span
                          className={cn(
                            "flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium transition-all cursor-pointer",
                            isActive
                              ? "bg-primary/15 text-primary border border-primary/20"
                              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                            collapsed && "justify-center px-2"
                          )}
                          title={collapsed ? item.label : undefined}
                        >
                          <item.icon
                            className={cn(
                              "shrink-0",
                              collapsed ? "w-5 h-5" : "w-4 h-4",
                              isActive ? "text-primary" : "text-muted-foreground"
                            )}
                          />
                          {!collapsed && <span className="truncate">{item.label}</span>}
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
                "flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all cursor-pointer",
                collapsed && "justify-center"
              )}
              title={collapsed ? "Settings" : undefined}
            >
              <Settings className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
              {!collapsed && <span>Settings</span>}
            </span>
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all w-full",
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
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
