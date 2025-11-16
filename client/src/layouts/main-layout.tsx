import SidebarNavigation from "@/components/sidebar-navigation";
import { ReactNode } from "react";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden md:flex">
        <SidebarNavigation />
      </div>
      <div className="flex-1 flex flex-col">
        <main className="flex-1 py-6 px-4">
          {children}
        </main>
        <footer className="bg-neutral-900 py-4">
          <div className="container mx-auto px-4">
            <div className="flex flex-col sm:flex-row justify-between items-center text-sm">
              <div className="mb-2 sm:mb-0 flex items-center">
                <span className="text-white font-bold">SulongEdukasyon</span>
                <span className="ml-2 text-white text-opacity-70">© {new Date().getFullYear()}</span>
              </div>
              <div className="flex space-x-4">
                <a href="#" className="text-white text-opacity-70 hover:text-opacity-100 text-sm">Help</a>
                <a href="#" className="text-white text-opacity-70 hover:text-opacity-100 text-sm">About</a>
                <a href="#" className="text-white text-opacity-70 hover:text-opacity-100 text-sm">Privacy</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
