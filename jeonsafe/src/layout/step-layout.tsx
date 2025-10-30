import { Outlet } from "react-router-dom";
import NavbarStep from "../components/navbar_step";

export default function StepLayout() {
  return (
    <div>
      <div className="sticky top-0 w-full">
        <NavbarStep />
      </div>
      <Outlet />
    </div>
  );
}