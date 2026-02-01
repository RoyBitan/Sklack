import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./src/styles/index.css";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";
import "./src/lib/sentry"; // Initialize Sentry
import { GlobalErrorBoundary } from "./src/shared/components/ErrorBoundary/GlobalErrorBoundary";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>,
);

// Register service worker for PWA capabilities
serviceWorkerRegistration.register();
