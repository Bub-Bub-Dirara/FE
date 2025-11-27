import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Bars3Icon, XMarkIcon,UserCircleIcon  } from "@heroicons/react/24/outline";
import AuthBubble from "./AuthBubble";
import SideDrawer from "./SideDrawer";
import ChatBubble from "./ChatBubble";
import { useAuth } from "../stores/useAuth"; 
import { useUI } from "../stores/ui";
import { AiOutlineHome } from "react-icons/ai";
import { useEffect } from "react";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { isAuthed } = useAuth();
  const { chatOpen, openChat, closeChat } = useUI(); 

  const navigate = useNavigate();
  const location = useLocation();
  const handleMenuClick = () => {
    if (!isAuthed) {
      openChat();
      return;
    }
    setMenuOpen((v) => !v);
  };

  useEffect(() => {
    const flag = sessionStorage.getItem("openDrawerOnHome");
    if (flag === "1") {
      setMenuOpen(true);
      sessionStorage.removeItem("openDrawerOnHome");
    }
  }, [location.pathname]);

  return (
    <div className="flex h-screen">
      <aside className={"bg-[#E9ECEF] w-[60px] h-screen flex flex-col items-center"}>
        <button
          onClick={() => navigate("/")}
          className="p-3 mt-8"
        >
          <AiOutlineHome className="w-6 h-6" />
        </button>

        <button onClick={handleMenuClick} className="p-3">
          {menuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}

        </button>
        <button onClick={() => setAuthOpen(!authOpen)} className="p-3 mt-auto mb-8">
          <UserCircleIcon className="w-6 h-6" />
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <AuthBubble open={authOpen} onClose={() => setAuthOpen(false)}/>
      <ChatBubble
        open={chatOpen}
        onClose={closeChat}
        onLoginClick={() => {
          closeChat();
          setAuthOpen(true);
        }}
      />

      {isAuthed &&
        <SideDrawer
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          width={320}
          offsetLeftPx={60}
        />
      }

    </div>
  );
}

export default Navbar;