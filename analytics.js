/* Expertos Chile — instrumentación inicial
   Sin servicios externos ni envío de datos.
   La cola vive únicamente en la sesión de esta pestaña.
*/
(function () {
  "use strict";

  const STORAGE_KEY = "expertos_chile_eventos_v1";
  const MAX_EVENTS = 100;

  function readEvents() {
    try {
      const value = sessionStorage.getItem(STORAGE_KEY);
      const events = value ? JSON.parse(value) : [];
      return Array.isArray(events) ? events : [];
    } catch (_) {
      return [];
    }
  }

  function track(eventName, details) {
    const allowed = new Set([
      "page_view",
      "navigation_click",
      "case_view_click",
      "demo_open_click",
      "diagnostic_open_click",
      "talks_open_click",
      "services_open_click",
      "contact_click",
      "calendar_click"
    ]);

    if (!allowed.has(eventName)) return;

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
      // Si el almacenamiento está bloqueado, el sitio sigue funcionando.
    }

    window.dispatchEvent(
      new CustomEvent("expertos:event", { detail: event })
    );
  }

  function classifyLink(link) {
    const url = new URL(link.href, location.href);
    const file = url.pathname.split("/").pop().toLowerCase();
    const text = (link.innerText || link.getAttribute("aria-label") || "")
      .trim()
      .toLowerCase();

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

    // No registrar navegación hacia sitios externos, salvo contacto
    // o calendario, que se clasifican expresamente.
    const isExternal = url.origin !== location.origin;
    if (isExternal && url.hostname !== "wa.me" &&
        !url.hostname.includes("calendar.google.com")) return;

    track(classifyLink(link), {
      destination: url.pathname + url.search + url.hash,
      link_text: (link.innerText || link.getAttribute("aria-label") || "")
        .trim()
        .slice(0, 100)
    });
  });

  window.ExpertosAnalytics = {
    track: track,
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