// src/layouts/root-layout.tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/navbar";
import SideDrawer from "../components/SideDrawer";
import ChatBubble from "../components/ChatBubble";
import AuthBubble from "../components/AuthBubble";

const DRAWER_WIDTH = 320;

const RootLayout = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <Navbar
        isMenuOpen={drawerOpen}
        onHamburgerClick={() => {
          const next = !drawerOpen;
          setDrawerOpen(next);
          setShowTip(next);
        }}
        onAuthClick={() => setAuthOpen(true)}
      />

      <SideDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setShowTip(false);
        }}
        width={DRAWER_WIDTH}
        preItems={[
          { id: "1", title: "2025.09.01. 16:34:10" },
          { id: "2", title: "2025.09.12. 13:22:11" },
          { id: "3", title: "송파구 법원아파트 계약서 확인" },
        ]}
        postItems={[{ id: "a", title: "2025.09.15. 15:02:12" }]}
      />

      {drawerOpen && showTip && (
        <ChatBubble
          open
          onClose={() => setShowTip(false)}
          anchor="sidebar-top"
          offsetLeftPx={DRAWER_WIDTH}
        />
      )}

      {authOpen && (
        <AuthBubble open onClose={() => setAuthOpen(false)} anchor="bottom-left" />
      )}

      <main className="pl-[60px]">
        <Outlet />
      </main>
    </>
  );
};

export default RootLayout;
