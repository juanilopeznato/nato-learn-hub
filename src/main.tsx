import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { loadSentryIfConfigured } from "@/lib/sentry-loader";
import { startVersionWatcher } from "@/lib/version-watcher";

loadSentryIfConfigured();
void startVersionWatcher();

createRoot(document.getElementById("root")!).render(<App />);
