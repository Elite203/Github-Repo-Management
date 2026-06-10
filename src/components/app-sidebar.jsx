import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, FolderInput, GitBranch, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, } from "@/components/ui/sidebar";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
const items = [
    { title: "Repositories", url: "/dashboard", icon: LayoutDashboard },
    { title: "Transfer", url: "/dashboard/transfer", icon: FolderInput },
    { title: "Activity", url: "/dashboard/activity", icon: Activity },
    { title: "Settings", url: "/dashboard/settings", icon: Settings },
];
export function AppSidebar() {
    const { state } = useSidebar();
    const collapsed = state === "collapsed";
    const pathname = useRouterState({ select: (s) => s.location.pathname });
    const { user, signOut } = useGithubAuth();
    return (<Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md gradient-primary text-primary-foreground">
            <GitBranch className="h-4 w-4"/>
          </div>
          {!collapsed && (<div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">RepoCtrl</span>
              <span className="text-[10px] text-muted-foreground">Repo Manager</span>
            </div>)}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
            const active = pathname === item.url;
            return (<SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4"/>
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>);
        })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {user && (<div className="flex items-center gap-2 px-2 py-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar_url} alt={user.login}/>
              <AvatarFallback>{user.login.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            {!collapsed && (<div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-medium">{user.name || user.login}</span>
                <span className="truncate text-[10px] text-muted-foreground">@{user.login}</span>
              </div>)}
            {!collapsed && (<Button variant="ghost" size="icon" className="h-7 w-7" onClick={signOut} aria-label="Sign out">
                <LogOut className="h-3.5 w-3.5"/>
              </Button>)}
          </div>)}
      </SidebarFooter>
    </Sidebar>);
}
