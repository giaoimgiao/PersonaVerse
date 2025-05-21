"use client";

import React from 'react';
import BottomNavbar from '@/components/navigation/BottomNavbar';
import DesktopSidebar from '@/components/navigation/DesktopSidebar';

export default function AppClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <DesktopSidebar />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex-grow p-4 md:p-8">
         {children}
        </div>
        {/* Spacer for bottom navbar on mobile */}
        <div className="h-16 md:hidden flex-shrink-0" /> 
      </main>
      <BottomNavbar />
    </div>
  );
}
