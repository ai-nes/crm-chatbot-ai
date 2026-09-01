(function () {
  var script = document.currentScript;
  if (!script) return;

  var scriptUrl = new URL(script.src, window.location.href);
  var chatbotUrl =
    script.getAttribute("data-chatbot-url") ||
    new URL("/embed/chatbot/popover", scriptUrl.origin).href;
  var chatbotOrigin = new URL(chatbotUrl, window.location.href).origin;
  var iframe = document.createElement("iframe");

  iframe.id = script.getAttribute("data-iframe-id") || "crm-chatbot-popover";
  iframe.src = chatbotUrl;
  iframe.title = "CRM Chatbot";
  iframe.allow = "microphone";
  iframe.setAttribute("aria-label", "CRM Chatbot");
  iframe.setAttribute("scrolling", "no");
  iframe.style.position = "fixed";
  iframe.style.right = "12px";
  iframe.style.bottom = "12px";
  iframe.style.width = "88px";
  iframe.style.height = "88px";
  iframe.style.border = "0";
  iframe.style.background = "transparent";
  iframe.style.overflow = "hidden";
  iframe.style.zIndex = "2147483000";
  iframe.style.transition = "width 180ms ease, height 180ms ease";
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    iframe.style.transition = "none";
  }

  function setOpenSize() {
    iframe.style.right = "12px";
    iframe.style.bottom = "12px";
    iframe.style.width = Math.min(420, window.innerWidth - 24) + "px";
    iframe.style.height = Math.min(700, window.innerHeight - 24) + "px";
  }

  function setExpandedSize() {
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "100vw";
    iframe.style.height = "100vh";
  }

  function setClosedSize() {
    iframe.style.right = "12px";
    iframe.style.bottom = "12px";
    iframe.style.width = "88px";
    iframe.style.height = "88px";
  }

  function handleMessage(event) {
    if (
      event.origin !== chatbotOrigin ||
      event.source !== iframe.contentWindow ||
      !event.data ||
      event.data.type !== "crm-chatbot:popover-state"
    ) {
      return;
    }

    if (!event.data.open) setClosedSize();
    else if (event.data.expanded) setExpandedSize();
    else setOpenSize();
  }

  window.addEventListener("message", handleMessage);
  window.addEventListener("resize", function () {
    if (iframe.style.width === "100vw") setExpandedSize();
    else if (iframe.style.width !== "88px") setOpenSize();
  });
  document.body.appendChild(iframe);
})();
