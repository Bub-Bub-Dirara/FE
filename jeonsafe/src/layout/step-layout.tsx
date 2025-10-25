import { Outlet } from "react-router-dom";
import NavbarStep from "../components/navbar_step";

export default function StepLayout() {
  return (
    <div>
      <NavbarStep />
      <Outlet />
    </div>
  );
}