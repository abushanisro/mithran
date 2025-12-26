'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Package,
  LogOut,
  Cog,
  FileSpreadsheet,
} from 'lucide-react';
import { NavLink } from '@/components/common/nav-link';
import { useAuth } from '@/lib/providers/auth';
import { CollapsibleNavItem } from '@/components/layout/CollapsibleNavItem';
import { useProjects } from '@/lib/api/hooks/useProjects';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const databaseItems = [
  { title: 'Raw Materials', url: '/database/materials', icon: Package },
  { title: 'Vendors', url: '/database/vendors', icon: Users },
];

// Costing items removed - features will be added later

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, loading } = useAuth();

  const isActive = (path: string) => {
    if (!pathname) return false;
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  // Fetch projects (top 5 recent) - only when authenticated
  const { data: projectsData } = useProjects({ limit: 5 }, { enabled: !!user && !loading });
  const projects = projectsData?.projects || [];

  const userInitials = (user as any)?.fullName
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30">
              <Cog className="h-5 w-5 text-primary animate-pulse-subtle" />
            </div>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg text-sidebar-foreground tracking-tight">Mithran</h2>
              <p className="text-xs text-sidebar-foreground/50">Cost Modeling Platform</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <Separator className="bg-sidebar-border/50" />

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[11px] uppercase tracking-widest font-medium px-3 mb-2">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard - Regular Link */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/')}>
                  <NavLink
                    to="/"
                    end
                    className={`sidebar-item group ${isActive('/') && pathname === '/' ? 'sidebar-item-active' : ''}`}
                    activeClassName="sidebar-item-active"
                  >
                    <LayoutDashboard className={`h-4 w-4 shrink-0 transition-colors ${isActive('/') && pathname === '/' ? 'text-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'}`} />
                    {!collapsed && <span className="text-sm">Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Projects - Collapsible */}
              <SidebarMenuItem>
                <CollapsibleNavItem
                  title="Projects"
                  icon={FolderKanban}
                  baseUrl="/projects"
                  collapsed={collapsed}
                  items={projects.map((p) => ({
                    id: p.id,
                    title: p.name,
                    url: `/projects/${p.id}`,
                  }))}
                  additionalItems={[
                    {
                      title: 'BOM Management',
                      url: '/bom',
                      icon: FileSpreadsheet,
                    },
                  ]}
                  onAddClick={() => router.push('/projects?new=true')}
                  addLabel="New Project"
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[11px] uppercase tracking-widest font-medium px-3 mb-2">
            Database
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {databaseItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      className={`sidebar-item group ${isActive(item.url) ? 'sidebar-item-active' : ''}`}
                      activeClassName="sidebar-item-active"
                    >
                      <item.icon className={`h-4 w-4 shrink-0 transition-colors ${isActive(item.url) ? 'text-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'}`} />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0 border border-sidebar-border">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {(user as any)?.fullName || 'User'}
              </p>
              <p className="text-xs text-sidebar-foreground/50 truncate">
                {user?.email}
              </p>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 shrink-0"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
