import { useEffect } from "react";
import Navbar from "../components/navbar";
import { useAuth } from "../stores/useAuth";

const RootLayout = () => {
  const { initializeFromStorage, fetchMe } = useAuth();

  useEffect(() => {
    initializeFromStorage();
    fetchMe();
  }, [initializeFromStorage, fetchMe]);

  return <Navbar />;
};

export default RootLayout;
