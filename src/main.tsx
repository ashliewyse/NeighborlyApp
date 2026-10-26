
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { InstallAppProvider } from "./app/components/InstallApp";
import { AppRouter } from "./app/AppRouter";
import { AuthProvider } from "./app/auth/AuthProvider";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <InstallAppProvider><AppRouter /></InstallAppProvider>
    </AuthProvider>
  </BrowserRouter>,
);
