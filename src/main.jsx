import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("SW registrato:", reg.scope))
      .catch((err) => console.error("SW errore:", err));
  });
}
document.addEventListener("focusout", () => {
  setTimeout(() => {
    const vv = window.visualViewport;
    if (vv && vv.offsetTop > 0 && !document.activeElement?.matches("input,textarea,select")) {
      window.scrollBy(0, -vv.offsetTop);
    }
  }, 250);
});