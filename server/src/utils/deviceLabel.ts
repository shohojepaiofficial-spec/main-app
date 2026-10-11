// A rough, dependency-free reading of a User-Agent string, good enough for
// "Chrome on Windows" in the active-sessions list and sign-in alerts. Order
// matters: Edge/Opera/Samsung/Facebook in-app all also claim to be Chrome.
const BROWSERS: [RegExp, string][] = [
  [/FBAN|FBAV|FB_IAB/, "Facebook app"], [/Instagram/, "Instagram app"],
  [/Edg(e|A|iOS)?\//, "Edge"], [/OPR\/|Opera/, "Opera"], [/SamsungBrowser/, "Samsung Internet"],
  [/Firefox|FxiOS/, "Firefox"], [/Chrome|CriOS/, "Chrome"], [/Safari/, "Safari"],
];
const SYSTEMS: [RegExp, string][] = [
  [/Android/, "Android"], [/iPhone|iPad|iPod/, "iOS"], [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"], [/CrOS/, "ChromeOS"], [/Linux/, "Linux"],
];

export function describeDevice(userAgent?: string | null) {
  const ua = userAgent ?? "";
  return {
    browser: BROWSERS.find(([pattern]) => pattern.test(ua))?.[1] ?? null,
    os: SYSTEMS.find(([pattern]) => pattern.test(ua))?.[1] ?? null,
    mobile: /Mobi|Android|iPhone|iPad/.test(ua),
  };
}

export function deviceText(userAgent?: string | null) {
  const { browser, os } = describeDevice(userAgent);
  return [browser ?? "Unknown browser", os].filter(Boolean).join(" on ");
}
