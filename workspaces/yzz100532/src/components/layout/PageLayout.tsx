import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  sidebarCollapsed?: boolean;
  showSidebar?: boolean;
  showTopBar?: boolean;
  rightPanel?: ReactNode;
  title?: string;
}

export function PageLayout({
  children,
  className,
  sidebarCollapsed = false,
  showSidebar = true,
  showTopBar = true,
  rightPanel,
  title,
}: PageLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-mine-blue">
      {showSidebar && <Sidebar defaultCollapsed={sidebarCollapsed} />}

      <div className="flex-1 flex flex-col overflow-hidden">
        {showTopBar && <TopBar title={title} />}

        <div className="flex-1 flex overflow-hidden">
          <main
            className={cn(
              "flex-1 overflow-auto p-6",
              "scrollbar-thin scrollbar-track-mine-blue-dark scrollbar-thumb-metal-gray",
              className
            )}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="h-full"
            >
              {children}
            </motion.div>
          </main>

          {rightPanel && (
            <aside className="w-80 border-l border-tech-cyan/20 bg-mine-blue-dark/50 overflow-auto">
              {rightPanel}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
