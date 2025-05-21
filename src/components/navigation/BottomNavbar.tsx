
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Settings, UserCircle, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: '角色', icon: Home },
  { href: '/community', label: '社区', icon: Users }, // Added Community link
  { href: '/settings', label: '设置', icon: Settings },
  { href: '/profile', label: '我的', icon: UserCircle },
];

export default function BottomNavbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-md md:hidden">
      <div className="container mx-auto flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-md transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-6 w-6 mb-1", isActive ? "text-primary fill-primary/20" : "")} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
