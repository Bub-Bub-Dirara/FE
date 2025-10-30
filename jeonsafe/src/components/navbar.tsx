import { Bars3Icon, XMarkIcon, UserCircleIcon } from "@heroicons/react/24/outline";

type Props = {
  isMenuOpen?: boolean;
  onHamburgerClick?: () => void;
  onAuthClick?: () => void;
};

const Navbar = ({ isMenuOpen = false, onHamburgerClick, onAuthClick }: Props) => {
  return (
    <aside className="fixed inset-y-0 left-0 w-[60px] bg-[#E9ECEF] flex flex-col items-center z-50">
      <button onClick={onHamburgerClick} className="p-3 mt-8" aria-label="메뉴">
        {isMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
      </button>

      <button onClick={onAuthClick} className="p-3 mt-auto mb-8" aria-label="로그인">
        <UserCircleIcon className="w-6 h-6" />
      </button>
    </aside>
  );
};

export default Navbar;
