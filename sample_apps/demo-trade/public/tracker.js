// Schema-backed analytics tracker. Events are sent as typed top-level columns,
// never inside a generic `properties` JSON object.
(function () {
  var script = document.currentScript;
  var endpoint = (script && script.getAttribute("data-endpoint")) || "http://localhost:3000/collect";
  var siteId = (script && script.getAttribute("data-site-id")) || "unknown";
  var visitorKey = "analytics_visitor_id";
  var sessionKey = "analytics_session_id";

  function id() {
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }
  function stored(storage, key) {
    var value = storage.getItem(key);
    if (!value) { value = id(); storage.setItem(key, value); }
    return value;
  }
  function visitorId() { return localStorage.getItem(visitorKey); }
  function sessionId() { return stored(sessionStorage, sessionKey); }

  function send(event) {
    var payload = {
      site_id: siteId, name: event.name, screen_name: event.screen_name,
      flow_name: event.flow_name, step_number: event.step_number, step_name: event.step_name,
      item_type: event.item_type, item_id: event.item_id, item_label: event.item_label,
      element_label: event.element_label, url: location.pathname,
      visitor_id: visitorId(), session_id: sessionId(), ts: Date.now()
    };
    Object.keys(payload).forEach(function (key) { if (payload[key] === undefined || payload[key] === null) delete payload[key]; });
    try { navigator.sendBeacon ? navigator.sendBeacon(endpoint, new Blob([JSON.stringify(payload)], { type: "application/json" })) : fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive: true, mode: "no-cors" }).catch(function () {}); } catch (e) {}
  }

  window.analytics = {
    track: send,
    identify: function (userId) { if (userId) localStorage.setItem(visitorKey, userId); else localStorage.removeItem(visitorKey); }
  };

  document.addEventListener("click", function (e) {
    var el = e.target;
    while (el && el !== document.body) {
      if (el.getAttribute && el.getAttribute("data-track")) {
        send({ name: "button_click", screen_name: window.__analytics_screen || location.pathname, element_label: el.getAttribute("data-track") });
        return;
      }
      el = el.parentNode;
    }
  }, true);

  window.addEventListener("beforeunload", function () {
    var flow = window.__analytics_active_flow;
    if (flow && flow.name) send({ name: "flow_abandoned", flow_name: flow.name, step_number: flow.step });
  });
})();
