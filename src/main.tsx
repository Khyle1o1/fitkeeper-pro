import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Set system timezone to Manila for all date operations
const OFFICIAL_TIMEZONE = 'Asia/Manila';

// Override Date.prototype methods to use Manila timezone
const originalToLocaleString = Date.prototype.toLocaleString;
const originalToLocaleDateString = Date.prototype.toLocaleDateString;
const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;

Date.prototype.toLocaleString = function(locales?: any, options?: any) {
  return originalToLocaleString.call(this, locales, { ...options, timeZone: OFFICIAL_TIMEZONE });
};

Date.prototype.toLocaleDateString = function(locales?: any, options?: any) {
  return originalToLocaleDateString.call(this, locales, { ...options, timeZone: OFFICIAL_TIMEZONE });
};

Date.prototype.toLocaleTimeString = function(locales?: any, options?: any) {
  return originalToLocaleTimeString.call(this, locales, { ...options, timeZone: OFFICIAL_TIMEZONE });
};

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA (only in production builds and if supported)
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch(() => {
        // no-op
      });
  });
}