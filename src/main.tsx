import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
<<<<<<< HEAD

// Register service worker for PWA installability (non-intrusive)
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/sw.js').catch(() => {});
	});
}
=======
>>>>>>> origin/main
