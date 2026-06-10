import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import { ThemeProvider } from "@/hooks/use-theme";
import { GithubAuthProvider } from "@/hooks/use-github-auth";
import { Toaster } from "@/components/ui/sonner";

import { NotFoundComponent, ErrorComponent } from "./routes/__root";
import { Index } from "./routes/index";
import { AuthPage } from "./routes/auth";
import { DashboardLayout } from "./routes/dashboard";
import { RepositoriesPage } from "./routes/dashboard.index";
import { SettingsPage } from "./routes/dashboard.settings";
import { ActivityPage } from "./routes/dashboard.activity";
import { TransferPage } from "./routes/dashboard.transfer";

function AppRoot() {
  return (
    <ThemeProvider>
      <GithubAuthProvider>
        <Outlet />
        <Toaster richColors position="top-right" />
      </GithubAuthProvider>
    </ThemeProvider>
  );
}

const rootRoute = createRootRoute({
  component: AppRoot,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Index,
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth",
  component: AuthPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardLayout,
});

const dashboardIndexRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "/",
  component: RepositoriesPage,
});

const dashboardSettingsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "settings",
  component: SettingsPage,
});

const dashboardActivityRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "activity",
  component: ActivityPage,
});

const dashboardTransferRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "transfer",
  component: TransferPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  authRoute,
  dashboardRoute.addChildren([
    dashboardIndexRoute,
    dashboardSettingsRoute,
    dashboardActivityRoute,
    dashboardTransferRoute,
  ]),
]);

export const queryClient = new QueryClient();

export const getRouter = () =>
  createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });
