'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ListChecks, LogOut, Mail, Wand2 } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth, useUser } from '@/firebase';
import { ThemeToggle } from '@/components/theme-toggle';
import { Separator } from './ui/separator';

export default function MainNav() {
  const pathname = usePathname();
  const auth = useAuth();
  const { user } = useUser();

  if (!user) {
    return null;
  }

  return (
    <Sidebar collapsible="icon">
        <SidebarRail />
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="font-semibold text-lg">My App</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/">
              <SidebarMenuButton isActive={pathname === '/'} tooltip="Home">
                <Home />
                <span>Home</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/todo">
              <SidebarMenuButton isActive={pathname === '/todo'} tooltip="Todo">
                <ListChecks />
                <span>Todo</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/contact">
              <SidebarMenuButton isActive={pathname === '/contact'} tooltip="Contact">
                <Mail />
                <span>Contact</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/nano-and-display">
              <SidebarMenuButton isActive={pathname === '/nano-and-display'} tooltip="Transform">
                <Wand2 />
                <span>Transform</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between">
            <ThemeToggle />
            <Separator orientation='vertical' className="h-6" />
            <Button variant="ghost" onClick={() => auth.signOut()}>
                <LogOut />
                <span>Sign Out</span>
            </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
