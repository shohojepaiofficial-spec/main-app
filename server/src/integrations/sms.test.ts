import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSmsBalance, isSmsConfigured, parseSmsBalance, sendSms, toBdMsisdn } from "./sms";

const env = { SMS_API_URL: "https://sms.example.com/sendtext", SMS_API_KEY: "key", SMS_SECRET_KEY: "secret", SMS_SENDER_ID: "MyShop" };
const reply = (body: string, status = 200) => vi.fn().mockResolvedValue(new Response(body, { status }));

beforeEach(() => { for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("toBdMsisdn", () => {
  it("normalizes every common way of writing a BD mobile number", () => {
    for (const phone of ["01712345678", "01712-345 678", "+8801712345678", "8801712345678", "1712345678"]) {
      expect(toBdMsisdn(phone)).toBe("8801712345678");
    }
  });
  it("rejects non-mobile and malformed numbers", () => {
    for (const phone of ["", "0121234567", "01212345678", "017123456789", "abc"]) expect(toBdMsisdn(phone)).toBeNull();
  });
});

describe("sendSms (REVE)", () => {
  it("is only configured once all four values are set", () => {
    expect(isSmsConfigured()).toBe(true);
    vi.stubEnv("SMS_SECRET_KEY", "");
    expect(isSmsConfigured()).toBe(false);
  });
  it("sends REVE's simple parameters and accepts Status 0", async () => {
    const fetch = reply('{"Status":"0","Text":"ACCEPTD","Message_ID":"444"}');
    vi.stubGlobal("fetch", fetch);
    await sendSms("01712345678", "Hello & bye");
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe(env.SMS_API_URL);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      apikey: "key", secretkey: "secret", callerID: "MyShop", toUser: "8801712345678", messageContent: "Hello & bye",
    });
  });
  it("throws on a rejected send even with HTTP 200, without leaking the secret", async () => {
    vi.stubGlobal("fetch", reply('{"Status":"1","Text":"Invalid credentials"}'));
    const err = await sendSms("01712345678", "x").catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("Invalid credentials");
    expect((err as Error).message).not.toContain("secret");
  });
  it("throws on HTTP errors, unreadable replies and invalid numbers", async () => {
    vi.stubGlobal("fetch", reply("down", 503));
    await expect(sendSms("01712345678", "x")).rejects.toThrow("503");
    vi.stubGlobal("fetch", reply("<html>"));
    await expect(sendSms("01712345678", "x")).rejects.toThrow("unreadable");
    await expect(sendSms("12345", "x")).rejects.toThrow("valid Bangladeshi");
  });
});

describe("SMS balance (REVE)", () => {
  it("reads a balance from plain text, HTML or JSON replies", () => {
    expect(parseSmsBalance("1,234.50")).toBe(1234.5);
    expect(parseSmsBalance("<html><body>Balance: 87 BDT</body></html>")).toBe(87);
    expect(parseSmsBalance('{"Status":"0","Balance":"42.75"}')).toBe(42.75);
    expect(parseSmsBalance("Invalid Account")).toBeNull();
  });
  it("calls the balance page with the client ID and rejects an unknown account", async () => {
    vi.stubEnv("SMS_CLIENT_ID", "c1");
    const fetch = reply("150");
    vi.stubGlobal("fetch", fetch);
    expect(await getSmsBalance()).toBe(150);
    expect(new URL(fetch.mock.calls[0][0]).searchParams.get("client")).toBe("c1");
    vi.stubGlobal("fetch", reply("Invalid Account"));
    await expect(getSmsBalance()).rejects.toThrow("Invalid Account");
  });
});
