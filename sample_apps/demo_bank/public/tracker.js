// Mock analytics tracker for hackathon demo.
// Buffers events and posts them to the configured endpoint; failures are silent.
(function () {
  var script = document.currentScript;
  var endpoint = (script && script.getAttribute("data-endpoint")) || "http://localhost:3000/collect";
  var siteId = (script && script.getAttribute("data-site-id")) || "unknown";

  function send(name, properties) {
    var payload = {
      site_id: siteId,
      name: name,
      properties: properties || {},
      ts: Date.now(),
      url: location.pathname,
    };
    try {
      // eslint-disable-next-line no-console
      console.log("[analytics]", name, payload.properties);
    } catch (e) {}
    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon(endpoint, blob);
        return;
      }
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
        mode: "no-cors",
      }).catch(function () {});
    } catch (e) {}
  }

  window.analytics = {
    track: function (name, properties) {
      send(name, properties);
    },
  };

  // Auto-capture clicks on any element with data-track
  document.addEventListener(
    "click",
    function (e) {
      var el = e.target;
      while (el && el !== document.body) {
        if (el.getAttribute && el.getAttribute("data-track")) {
          send("button_click", {
            screen_name: (window.__analytics_screen || location.pathname),
            button_label: el.getAttribute("data-track"),
          });
          return;
        }
        el = el.parentNode;
      }
    },
    true
  );

  // Flow abandonment on unload
  window.addEventListener("beforeunload", function () {
    var flow = window.__analytics_active_flow;
    if (flow && flow.name) {
      send("flow_abandoned", { flow_name: flow.name, last_step: flow.step });
    }
  });
})();