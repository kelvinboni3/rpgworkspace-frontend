import { Outlet } from "react-router";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex min-h-screen w-full max-w-7xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
