import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const savedTheme = localStorage.getItem("theme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
if (themeColorMeta) themeColorMeta.setAttribute("content", savedTheme === "dark" ? "#0a0a0a" : "#f5f5f0");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
