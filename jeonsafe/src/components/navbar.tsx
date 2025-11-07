import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Bars3Icon, XMarkIcon,UserCircleIcon  } from "@heroicons/react/24/outline";
import AuthBubble from "./AuthBubble";
import SideDrawer from "./SideDrawer";
import ChatBubble from "./ChatBubble";
import { useAuth } from "../stores/useAuth"; 
import { useUI } from "../stores/ui";

/*
import ChatBubble from "./ChatBubble";
<ChatBubble open={menuOpen} onClose={() => { setMenuOpen(false);}}/>

SideDrawer를 위해 빼둠-> 로그인 구현 후 로그인 여부에 따라 렌더링 되게
*/
const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { isAuthed } = useAuth();
  const { chatOpen, openChat, closeChat } = useUI(); 

  const handleMenuClick = () => {
    if (!isAuthed) {
      openChat();
      return;
    }
    setMenuOpen((v) => !v);
};

  return (
    <div className="flex h-screen">
      <aside className={"bg-[#E9ECEF] w-[60px] h-screen flex flex-col items-center"}>
        
        <button onClick={handleMenuClick} className="p-3 mt-8">
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

          //샘플임
          preItems={[
            { id: "1", title: "2025.09.01. 16:34:10" },
            { id: "2", title: "2025.09.12. 13:22:11" },
            { id: "3", title: "우리딸 전셋집 구하기" },
          ]}
          postItems={[
            { id: "a", title: "2025.10.01. 14:11:00" },
            { id: "b", title: "전세사기 피해 상담 기록" },
          ]}
        />
      }

    </div>
  );
}

export default Navbar;