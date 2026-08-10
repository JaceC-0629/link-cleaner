const URL_SAFE = "A-Za-z0-9\\-._~:/?#\\[\\]@!$&'()*+,;=%~";
const DECOY_PHRASES = [
  "防度娘",
  "防屏蔽",
  "防吞",
  "防封",
  "防HX",
  "防和谐",
  "屏蔽",
  "和谐",
  "去掉",
  "删掉",
  "去除",
  "空格"
];
const COMMON_TLDS = [
  "com",
  "cn",
  "net",
  "org",
  "edu",
  "gov",
  "io",
  "me",
  "co",
  "cc",
  "tv",
  "xyz",
  "top",
  "vip",
  "club",
  "site",
  "online",
  "app",
  "wang"
];

export function cleanLink(raw, customWords = []) {
  if (!raw) return "";

  let s = String(raw);
  s = decodeEntities(s);
  s = s.replace(/【[^】]*】/g, "");
  s = s.replace(/（[^）]*）/g, "");
  s = s.normalize("NFKC");
  s = s.replace(/[\u200B-\u200D\uFEFF\u2060\u00A0\s]+/g, "");

  for (const word of customWords) {
    const w = String(word).replace(/\s+/g, "").trim();
    if (w) s = s.split(w).join("");
  }

  for (const phrase of DECOY_PHRASES) {
    s = s.replace(new RegExp(phrase, "gi"), "");
  }
  s = s.replace(/[删防吞拦屏蔽]/g, "");
  s = s.replace(/\(\)|\[\]|\{\}|<>/g, "");
  s = s.replace(/\p{Extended_Pictographic}/gu, "");
  s = s.replace(
    /(^|[^A-Za-z])(hxxps?|htxps?):\/\//gi,
    (_, pre, scheme) =>
      pre + (/^(?:hxxps|htxps)$/i.test(scheme) ? "https://" : "http://")
  );
  s = s.replace(
    /(^|[^\x21-\x7E])\/\/(?=[A-Za-z0-9.-]+(?:\/|$))/gi,
    "$1https://"
  );

  s = s.replace(/三打不留|三个达不溜|三达不溜|三不溜/g, "www");
  s = s.replace(/盘(?=\.baidu(?:\.|$))/gi, "pan");
  s = s.replace(/(?:百度|摆渡)(?=\.(?:com|cn|net|org|io|me))/gi, "baidu");
  s = s.replace(/度盘/g, "pan.baidu.com");
  s = s.replace(/(?<=[A-Za-z0-9])(?:康母|抗母|考姆)(?=[A-Za-z0-9.]|$)/gi, "com");
  s = s.replace(/点(?:康母|抗母|考姆)/g, ".com");
  s = s.replace(/(?<=[A-Za-z0-9])(?:内特)(?=[A-Za-z0-9.]|$)/gi, "net");
  s = s.replace(/点内特/g, ".net");
  s = s.replace(/(?<=[A-Za-z0-9])(?:欧阿吉)(?=[A-Za-z0-9.]|$)/gi, "org");
  s = s.replace(/点欧阿吉/g, ".org");
  s = s.replace(/(?<=[A-Za-z0-9])(?:西恩)(?=[A-Za-z0-9.]|$)/gi, "cn");
  s = s.replace(/点西恩/g, ".cn");
  s = s.replace(/(?<=[A-Za-z0-9])点(?=[A-Za-z0-9])/g, ".");
  s = s.replace(/(?<=[A-Za-z0-9])dot(?=[A-Za-z0-9])/gi, ".");
  s = s.replace(/^#(?=[A-Za-z0-9.-]+(?::[0-9]+)?\/)/i, "http://");
  s = restoreMissingDots(s);

  let url = extractUrl(s);
  if (!url && /https?|www\.|(?:\.[a-z]{2,})/i.test(s)) {
    const asciiOnly = s.replace(/[^\x21-\x7E]+/g, "");
    url = extractUrl(asciiOnly);
  }
  const result = url || s;
  return /^https?:\/\//i.test(result) && !hasValidHost(result) ? "" : result;
}

function extractUrl(text) {
  let m = text.match(new RegExp("https?://[" + URL_SAFE + "]+", "i"));
  if (m) {
    const url = trimUrl(m[0]);
    if (hasValidHost(url)) return url;
  }

  m = text.match(new RegExp("www\\.[" + URL_SAFE + "]+", "i"));
  if (m) {
    const url = trimUrl(m[0]);
    if (hasValidHost(url)) return "https://" + url;
  }

  m = text.match(
    new RegExp(
      "[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?" +
        "(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+" +
        "(?::[0-9]+)?(?:[/?#][" + URL_SAFE + "]*)?",
      "i"
    )
  );
  if (m) {
    const url = trimUrl(m[0]);
    if (hasValidHost(url)) return "https://" + url;
  }

  return null;
}

function hasValidHost(url) {
  const m = url.match(/^[a-z]+:\/\/([^/?#]*)/i);
  if (m) {
    const host = m[1];
    if (
      !host ||
      host.startsWith(".") ||
      host.endsWith(".") ||
      host.includes("..")
    ) {
      return false;
    }
    return (
      host.includes(".") ||
      /^localhost(:\d+)?$/i.test(host) ||
      /^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(host)
    );
  }
  return (
    /^www\.[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/i.test(url) ||
    /\.[a-z]{2,}/i.test(url)
  );
}

function restoreMissingDots(s) {
  let out = s.replace(/www(?=[A-Za-z])/gi, "www.");
  const tlds = COMMON_TLDS.join("|");
  out = out.replace(
    new RegExp("([A-Za-z0-9])(" + tlds + ")(?=/|[?#]|$)", "gi"),
    "$1.$2"
  );
  return out;
}

function decodeEntities(s) {
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  s = s.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
  s = s.replace(/&colon;/gi, ":");
  s = s.replace(/&sol;/gi, "/");
  s = s.replace(/&period;/gi, ".");
  s = s.replace(/&amp;/gi, "&");
  s = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  return s;
}

function trimUrl(url) {
  return url
    .replace(/#\.[a-zA-Z0-9]{1,8}$/, "")
    .replace(/#$/, "")
    .replace(/[.,;:!?)\]}>"'》]+$/, "");
}
