import { describe, expect, it } from "vitest";
import { detectInAppBrowser, isAndroid, toChromeIntentUrl } from "./inAppBrowser";

const UA = {
  facebookAndroid:
    "Mozilla/5.0 (Linux; Android 13; SM-A145F Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.127 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.47.109;]",
  facebookIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/475.0.0.37.106;FBBV/123;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBCR/;FBID/phone;FBLC/en_US;FBOP/80]",
  messengerAndroid:
    "Mozilla/5.0 (Linux; Android 12; Redmi Note 11; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.0.0 Mobile Safari/537.36 [FB_IAB/Orca-Android;FBAV/470.0.0.40.98;]",
  messengerIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/460.0.0.36.109;]",
  instagramAndroid:
    "Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.0.0 Mobile Safari/537.36 Instagram 345.0.0.48.95 Android",
  instagramIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 345.0.0.32.97 (iPhone14,5; iOS 17_5; en_US)",
  otherWebView:
    "Mozilla/5.0 (Linux; Android 11; RMX2001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
  safariIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  chromeDesktop:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
};

describe("detectInAppBrowser", () => {
  it("detects Facebook's in-app browser", () => {
    expect(detectInAppBrowser(UA.facebookAndroid)).toBe("facebook");
    expect(detectInAppBrowser(UA.facebookIos)).toBe("facebook");
  });

  it("tells Messenger apart from Facebook", () => {
    expect(detectInAppBrowser(UA.messengerAndroid)).toBe("messenger");
    expect(detectInAppBrowser(UA.messengerIos)).toBe("messenger");
  });

  it("detects Instagram's in-app browser", () => {
    expect(detectInAppBrowser(UA.instagramAndroid)).toBe("instagram");
    expect(detectInAppBrowser(UA.instagramIos)).toBe("instagram");
  });

  it("flags any other Android WebView", () => {
    expect(detectInAppBrowser(UA.otherWebView)).toBe("other");
  });

  it("leaves real browsers alone", () => {
    expect(detectInAppBrowser(UA.chromeAndroid)).toBeNull();
    expect(detectInAppBrowser(UA.safariIos)).toBeNull();
    expect(detectInAppBrowser(UA.chromeDesktop)).toBeNull();
  });
});

describe("isAndroid", () => {
  it("distinguishes Android from iOS", () => {
    expect(isAndroid(UA.facebookAndroid)).toBe(true);
    expect(isAndroid(UA.facebookIos)).toBe(false);
  });
});

describe("toChromeIntentUrl", () => {
  it("keeps the path and query, drops the hash", () => {
    expect(toChromeIntentUrl("https://shohojepai.com/shop/abc?promo=LAUNCH10#top")).toBe(
      "intent://shohojepai.com/shop/abc?promo=LAUNCH10#Intent;scheme=https;package=com.android.chrome;end"
    );
  });
});
