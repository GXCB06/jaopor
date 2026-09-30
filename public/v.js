/* JaoPor visitor counter — https://jaopor.vercel.app
   No cookies, no personal data: one anonymous beacon per page load. */
(function () {
  try {
    var s = document.currentScript;
    var p = s && s.getAttribute("data-project");
    if (!p || navigator.webdriver) return;
    if (document.visibilityState === "prerender") return;
    var url = new URL("/api/collect", s.src).toString();
    var body = JSON.stringify({ p: p });
    if (navigator.sendBeacon) navigator.sendBeacon(url, body);
    else
      fetch(url, {
        method: "POST",
        body: body,
        keepalive: true,
        mode: "no-cors",
      });
  } catch {
    // Never break the host page.
  }
})();
