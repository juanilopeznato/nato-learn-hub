import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { loadSentryIfConfigured } from "@/lib/sentry-loader";

loadSentryIfConfigured();

createRoot(document.getElementById("root")!).render(<App />);
