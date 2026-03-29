import type React from "react";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/top-bar";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-screen overflow-hidden bg-transparent">
      <div className="draglayer absolute inset-x-0 top-0 z-10 h-6" />
      <div className="flex h-full overflow-hidden bg-transparent px-3 pb-3 pt-6">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/50 bg-background/75 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] ring-1 ring-black/5 backdrop-blur-xl">
          <TopBar />
          <main className="flex-1 overflow-auto p-6 sm:p-7">{children}</main>
        </div>
      </div>
    </div>
  );
}
