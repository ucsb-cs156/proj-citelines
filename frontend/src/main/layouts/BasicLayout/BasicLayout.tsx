import { useEffect, type ReactNode } from "react";
import AppNavbar from "main/components/Nav/AppNavbar";
import Footer from "main/components/Nav/Footer";
import { useCurrentUser, useLogout } from "main/utils/currentUser";
import { useSystemInfo } from "main/utils/systemInfo";

interface BasicLayoutProps {
  children: ReactNode;
  // When true (the Scaffold Canvas pages), the viewport is pinned so the
  // React Flow canvas handles all pan/zoom itself: a class is added to
  // <body> that index.css uses to disable page scrolling. Every other page
  // scrolls normally.
  lockScroll?: boolean;
}

export default function BasicLayout({
  children,
  lockScroll = false,
}: BasicLayoutProps) {
  const doLogout = useLogout().mutate;
  const currentUser = useCurrentUser();
  const { data: systemInfo } = useSystemInfo();

  useEffect(() => {
    if (!lockScroll) return;
    document.body.classList.add("scaffold-canvas-active");
    return () => document.body.classList.remove("scaffold-canvas-active");
  }, [lockScroll]);

  return (
    <div className="BasicLayout" data-testid="BasicLayout">
      <AppNavbar
        doLogout={doLogout}
        currentUser={currentUser}
        systemInfo={systemInfo}
      />
      <main className="main-content" data-testid="BasicLayout-main-content">
        {children}
      </main>
      <Footer />
    </div>
  );
}
