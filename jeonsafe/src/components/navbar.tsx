import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Bars3Icon, XMarkIcon,UserCircleIcon  } from "@heroicons/react/24/outline";
import AuthBubble from "./AuthBubble";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  return (
    <div className="flex h-screen">
      <aside className={"bg-[#E9ECEF] w-[60px] h-screen flex flex-col items-center"}>
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-3 mt-8">
          {menuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
        </button>
        <button onClick={() => setAuthOpen(!authOpen)} className="p-3 mt-auto mb-8">
          <UserCircleIcon className="w-6 h-6" />
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <AuthBubble open={authOpen} onClose={() => setAuthOpen(false)} anchor="bottom-left" />
    </div>
  );
}

export default Navbar;