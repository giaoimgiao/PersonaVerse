
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Settings, UserCircle, BotMessageSquare, Users } from 'lucide-react'; // Added Users icon
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { href: '/', label: '角色', icon: Home },
  { href: '/community', label: '社区', icon: Users }, // Added Community link
  { href: '/settings', label: '设置', icon: Settings },
  { href: '/profile', label: '我的', icon: UserCircle },
];

export default function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-card border-r border-border p-4 space-y-4">
      <div className="flex items-center space-x-2 mb-8">
        <BotMessageSquare className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-primary">角色宇宙</h1>
      </div>
      <TooltipProvider>
        <nav className="flex-grow space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Tooltip key={item.label} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      isActive ? "text-primary font-semibold" : "text-foreground hover:bg-muted"
                    )}
                    asChild
                  >
                    <Link href={item.href}>
                      <item.icon className="h-5 w-5 mr-3" />
                      {item.label}
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" align="center">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </TooltipProvider>
      <div className="mt-auto text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} 角色宇宙
      </div>
    </aside>
  );
}
