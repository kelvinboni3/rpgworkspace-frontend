import { Dices, Lock, LogOut, Monitor, Moon, ScrollText, Sun } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { paths } from "@/routes/paths";
import { authStore } from "@/store/auth-store";
import { cn } from "@/utils/cn";

const THEME_CYCLE = ["light", "dark", "system"] as const;
const THEME_ICON = { light: Sun, dark: Moon, system: Monitor } as const;

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = THEME_ICON[theme];

  const handleClick = () => {
    const nextIndex = (THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length;
    setTheme(THEME_CYCLE[nextIndex]);
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleClick} aria-label="Alternar tema">
      <Icon className="size-4" />
    </Button>
  );
}

function UserMenu() {
  const navigate = useNavigate();
  const user = authStore.getUser();

  const handleLogout = () => {
    authStore.clearSession();
    navigate(paths.login, { replace: true });
  };

  const initials = user?.name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") ?? "?";

  return (
    <div className="flex items-center gap-3">
      <div className="hidden items-center gap-2 sm:flex">
        <div className="bg-primary/15 text-primary flex size-8 items-center justify-center rounded-full text-xs font-semibold">
          {initials}
        </div>
        <span className="text-sm font-medium">{user?.name ?? "Aventureiro"}</span>
      </div>
      <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair">
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}

function NavLinks() {
  return (
    <nav className="flex items-center gap-1">
      <NavLink
        to={paths.characters}
        aria-label="Personagens"
        className={({ isActive }) =>
          cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3",
            isActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground",
          )
        }
      >
        <ScrollText className="size-4" />
        <span className="hidden sm:inline">Personagens</span>
      </NavLink>
      <NavLink
        to={paths.gmArea}
        aria-label="Mestre"
        className={({ isActive }) =>
          cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium opacity-60 transition-colors sm:px-3",
            isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
          )
        }
      >
        <Lock className="size-3.5" />
        <span className="hidden sm:inline">Mestre</span>
      </NavLink>
    </nav>
  );
}

export function AppLayout() {
  return (
    <div className="hub-backdrop flex min-h-screen w-full flex-col">
      <header className="border-border/60 bg-background/60 sticky top-0 z-10 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                <Dices className="size-5" />
              </div>
              <span className="font-display hidden text-lg font-semibold sm:inline">RPG Workspace</span>
            </div>
            <NavLinks />
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
