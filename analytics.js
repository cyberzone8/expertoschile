
/* Expertos Chile — eventos de navegación y embudo.
   Sin envío a servidores ni proveedores externos.
   No incluir nombres, teléfonos ni respuestas del cuestionario.
*/
(function () {
  "use strict";

  const STORAGE_KEY = "expertos_chile_eventos_v1";
  const MAX_EVENTS = 100;

  const ALLOWED_EVENTS = new Set([
    "page_view",
    "navigation_click",
    "case_view_click",
    "demo_open_click",
    "diagnostic_open_click",
    "diagnostic_start",
    "diagnostic_complete",
    "talks_open_click",
    "services_open_click",
    "contact_click",
    "meeting_request",
    "calendar_click",
    "questionnaire_restart"
  ]);

  function readEvents() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch (_) {
      return [];
    }
  }

  function track(eventName, details) {
    if (!ALLOWED_EVENTS.has(eventName)) return;

    const event = {
      event: eventName,
      page: location.pathname.split("/").pop() || "index.html",
      timestamp: new Date().toISOString(),
      details: details || {}
    };

    const events = readEvents();
    events.push(event);

    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(events.slice(-MAX_EVENTS))
      );
    } catch (_) {
      // El sitio sigue funcionando si el almacenamiento está bloqueado.
    }

    window.dispatchEvent(
      new CustomEvent("expertos:event", { detail: event })
    );
  }

  function classifyLink(link) {
    const url = new URL(link.href, location.href);
    const file = url.pathname.split("/").pop().toLowerCase();

    if (url.hostname === "wa.me") return "contact_click";
    if (url.hostname.includes("calendar.google.com")) return "calendar_click";
    if (file === "diagnostico.html") return "diagnostic_open_click";
    if (file === "expertos-chile-demo.html") return "demo_open_click";
    if (file === "casos.html") return "case_view_click";
    if (file === "charlas.html") return "talks_open_click";
    if (file === "productos.html") return "services_open_click";

    return "navigation_click";
  }

  document.addEventListener("click", function (event) {
    const link = event.target.closest("a");
    if (!link || !link.href) return;

    const url = new URL(link.href, location.href);
    const isExternal = url.origin !== location.origin;

    if (
      isExternal &&
      url.hostname !== "wa.me" &&
      !url.hostname.includes("calendar.google.com")
    ) return;

    track(classifyLink(link), {
      destination: url.pathname + url.search + url.hash,
      link_text: (
        link.innerText ||
        link.getAttribute("aria-label") ||
        ""
      ).trim().slice(0, 100)
    });
  });

  window.ExpertosAnalytics = {
    track,
    getEvents: readEvents,
    clearEvents: function () {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch (_) {}
    }
  };

  track("page_view", {
    ref: new URLSearchParams(location.search).get("ref") || null
  });
})();
