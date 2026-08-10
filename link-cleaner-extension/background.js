import { cleanLink } from "./cleaner.js";

const MENU_ID = "clean-link";
const COPY_ID = "clean-link-copy";
const OPEN_ID = "clean-link-open";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    const parentId = chrome.contextMenus.create({
      id: MENU_ID,
      title: "净化链接",
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: COPY_ID,
      parentId,
      title: "复制到剪贴板",
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: OPEN_ID,
      parentId,
      title: "在新标签页打开",
      contexts: ["selection"]
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  handleClean(info, tab);
});

async function handleClean(info, tab) {
  const cleaned = await cleanWithCustom(info.selectionText || "");
  if (!cleaned) return;

  if (info.menuItemId === COPY_ID) {
    if (tab && tab.id != null) {
      copyAndNotify(tab.id, cleaned);
    } else {
      navigator.clipboard?.writeText(cleaned).catch(() => {});
    }
  } else if (info.menuItemId === OPEN_ID) {
    openCleaned(cleaned);
  }
}

async function cleanWithCustom(raw) {
  const data = await chrome.storage.local.get("customWords");
  const customWords = Array.isArray(data.customWords) ? data.customWords : [];
  return cleanLink(raw, customWords);
}

async function openCleaned(text) {
  const looksLikeUrl =
    /^https?:\/\//i.test(text) || /^[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
  if (!looksLikeUrl) return;

  try {
    await chrome.tabs.create({ url: text });
  } catch (err) {
    console.error("clean-link open failed", err);
  }
}

async function copyAndNotify(tabId, text) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: copyInPageAndToast,
      args: [text]
    });
  } catch (err) {
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(text);
    } catch (copyErr) {
      console.error("clean-link copy failed", copyErr);
    }
  }
}

function copyInPageAndToast(text) {
  const showToast = (message) => {
    const old = document.getElementById("clean-link-toast");
    if (old) old.remove();

    const shown = message.length > 100 ? message.slice(0, 100) + "…" : message;
    const el = document.createElement("div");
    el.id = "clean-link-toast";

    const badge = document.createElement("span");
    badge.textContent = "✓";

    const label = document.createElement("span");
    label.textContent = shown;

    el.append(badge, label);
    Object.assign(el.style, {
      position: "fixed",
      top: "20px",
      left: "50%",
      transform: "translate(-50%, -8px)",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      maxWidth: "min(82vw, 600px)",
      padding: "10px 14px 10px 10px",
      background: "rgba(15, 23, 42, 0.95)",
      color: "#f8fafc",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      borderRadius: "10px",
      font: "13px/1.5 system-ui, sans-serif",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.28)",
      wordBreak: "break-all",
      pointerEvents: "none",
      zIndex: "2147483647",
      opacity: "0"
    });
    Object.assign(badge.style, {
      flex: "0 0 auto",
      width: "20px",
      height: "20px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "50%",
      background: "#22c55e",
      color: "#fff",
      fontSize: "12px",
      fontWeight: "700"
    });
    Object.assign(label.style, { minWidth: "0" });

    (document.body || document.documentElement).appendChild(el);
    el.animate(
      [
        { opacity: 0, transform: "translate(-50%, -8px)" },
        { opacity: 1, transform: "translate(-50%, 0)" }
      ],
      { duration: 180, easing: "ease-out", fill: "forwards" }
    );
    setTimeout(() => el.remove(), 3000);
  };

  const fallbackCopy = () => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    (document.body || document.documentElement).appendChild(ta);
    ta.focus();
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (err) {
      ok = false;
    }
    ta.remove();
    if (ok) showToast("已复制：" + text);
  };

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(
      () => showToast("已复制：" + text),
      fallbackCopy
    );
  } else {
    fallbackCopy();
  }
}
