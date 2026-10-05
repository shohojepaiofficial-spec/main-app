// Renders the launch posts (1080x1350, Instagram/Facebook feed size) from
// posts.json with headless Chrome. Usage, from this folder:
//   node render.mjs
// Product photos: put the image file in ./photos and set "photo": "photos/x.jpg".
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(join(here, "posts.json"), "utf8"));
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const LOGO = pathToFileURL(resolve(here, "../../frontend/public/logo-icon.png")).href;
const fileUrl = (p) => pathToFileURL(resolve(here, p)).href;

const css = `
html,body{margin:0;width:1080px;height:1350px;overflow:hidden}
*{box-sizing:border-box}
body{font-family:'Hind Siliguri','Nirmala UI',sans-serif;color:#1e241f;background:#fdfbf5;position:relative}
.green{background:linear-gradient(150deg,#0f7a41 0%,#15914f 60%,#1fa860 100%);color:#fff}
.en{font-family:'Poppins',sans-serif}
.brand{position:absolute;left:64px;top:56px;display:flex;align-items:center;gap:16px}
.brand .chip{width:76px;height:76px;border-radius:18px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(0,0,0,.08)}
.brand img{width:62px}
.brand b{font-family:'Poppins',sans-serif;font-size:34px;font-weight:700}
.brand b span{color:#15914f}
.green .brand b span{color:#c9f5d9}
.foot{position:absolute;left:0;right:0;bottom:0;height:120px;display:flex;align-items:center;justify-content:center;gap:16px;font-family:'Poppins',sans-serif;font-weight:600;font-size:34px;background:#15914f;color:#fff}
.green .foot{background:rgba(0,0,0,.18)}
.kicker{display:inline-block;padding:10px 28px 6px;border-radius:999px;background:#e3f4ea;color:#0f7a41;font-weight:700;font-size:34px}
.green .kicker{background:rgba(255,255,255,.18);color:#fff}
h1{margin:0;font-weight:700;line-height:1.15}
.center{position:absolute;left:64px;right:64px;top:190px;bottom:150px;display:flex;flex-direction:column;justify-content:center}
.ring{position:absolute;border-radius:50%;border:3px solid rgba(255,255,255,.10)}
`;

const page = (body, cls = "") => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@500;600;700&family=Poppins:wght@600;700&display=block" rel="stylesheet">
<style>${css}</style></head><body class="${cls}">
<div class="brand"><div class="chip"><img src="${LOGO}"></div><b>Shohoje <span>Pai</span></b></div>
${body}
<div class="foot">🛒 অর্ডার করুন: <span class="en">shohojepai.com</span></div>
</body></html>`;

const rings = `<div class="ring" style="width:700px;height:700px;right:-300px;top:-250px"></div>
<div class="ring" style="width:520px;height:520px;left:-260px;bottom:40px"></div>`;

const product = (p, i) =>
  page(`
<div style="position:absolute;left:64px;right:64px;top:170px;height:760px;border-radius:36px;overflow:hidden;background:#fff;box-shadow:0 14px 40px rgba(0,0,0,.08);display:flex;align-items:center;justify-content:center">
  ${p.photo && existsSync(resolve(here, p.photo))
    ? `<img src="${fileUrl(p.photo)}" style="width:100%;height:100%;object-fit:cover">`
    : `<div style="font-size:44px;color:#9aa59c;text-align:center">📷<br>পণ্যের ছবি ${"১২৩"[i] ?? i + 1}</div>`}
  <div style="position:absolute;left:28px;top:28px" class="kicker">✨ নতুন</div>
</div>
<div style="position:absolute;left:64px;right:64px;top:960px">
  <h1 style="font-size:58px">${p.name}</h1>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:18px">
    <div style="font-size:64px;font-weight:700;color:#15914f">${p.price}</div>
    <div class="kicker" style="font-size:30px">💵 ক্যাশ অন ডেলিভারি</div>
  </div>
</div>`);

const posts = {
  "01-teaser": page(`${rings}
<div class="center" style="align-items:center;text-align:center">
  <div class="kicker">🚀 শুভ সূচনা</div>
  <h1 style="font-size:132px;margin-top:40px">আসছে<br>সোমবার!</h1>
  <div style="font-size:48px;font-weight:600;margin-top:28px">${cfg.launchDate}</div>
  <div style="font-size:42px;margin-top:56px;opacity:.95">সহজে অর্ডার করুন, ঘরে বসে বুঝে নিন</div>
</div>`, "green"),

  ...Object.fromEntries(cfg.products.map((p, i) => [`0${i + 2}-product-${i + 1}`, product(p, i)])),

  "05-how-to-order": page(`
<div class="center">
  <div class="kicker" style="align-self:flex-start">কীভাবে অর্ডার করবেন?</div>
  <h1 style="font-size:84px;margin:28px 0 56px">মাত্র ৩টি ধাপে</h1>
  ${[
    ["১", "পণ্য বেছে নিন", "shohojepai.com-এ গিয়ে পছন্দের পণ্যটি দেখুন"],
    ["২", "অর্ডার করুন", "কার্টে যোগ করে নাম, ফোন ও ঠিকানা দিন"],
    ["৩", "হাতে পেয়ে টাকা দিন", "ডেলিভারির সময় ক্যাশে পেমেন্ট করুন"],
  ].map(([n, t, d]) => `
  <div style="display:flex;gap:32px;align-items:center;margin-bottom:40px">
    <div style="flex:none;width:120px;height:120px;border-radius:30px;background:#15914f;color:#fff;font-size:68px;font-weight:700;display:flex;align-items:center;justify-content:center">${n}</div>
    <div><div style="font-size:52px;font-weight:700">${t}</div><div style="font-size:36px;color:#5b665d">${d}</div></div>
  </div>`).join("")}
</div>`),

  "06-delivery": page(`${rings}
<div class="center">
  <div class="kicker" style="align-self:flex-start">🚚 ডেলিভারি চার্জ</div>
  <h1 style="font-size:84px;margin:28px 0 48px">সারা বাংলাদেশে<br>হোম ডেলিভারি</h1>
  ${[["সিলেট", "৳৬০"], ["ঢাকা", "৳১১০"], ["অন্যান্য জেলা", "৳১২০"]].map(([a, p]) => `
  <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.3);border-radius:28px;padding:26px 44px 20px;margin-bottom:22px;font-size:54px;font-weight:700">
    <span>${a}</span><span>${p}</span></div>`).join("")}
  <div style="font-size:32px;margin-top:22px;opacity:.9">০.৫ কেজি পর্যন্ত। ওজন ও এলাকা অনুযায়ী সঠিক চার্জ চেকআউটে দেখানো হয়।</div>
</div>`, "green"),

  "07-cash-on-delivery": page(`
<div class="center" style="align-items:center;text-align:center">
  <div style="font-size:200px;line-height:1">💵</div>
  <h1 style="font-size:116px;margin-top:36px;color:#15914f">আগে পণ্য,<br>পরে টাকা</h1>
  <div style="font-size:46px;font-weight:600;margin-top:40px">পণ্য হাতে পেয়ে তারপর টাকা দিন</div>
  <div style="font-size:38px;color:#5b665d;margin-top:14px">কোনো অগ্রিম পেমেন্ট নেই</div>
</div>`),

  "08-returns": page(`
<div class="center">
  <div class="kicker" style="align-self:flex-start">🔄 নিশ্চিন্তে কিনুন</div>
  <h1 style="font-size:120px;margin:32px 0 10px;color:#15914f">৭ দিনের</h1>
  <h1 style="font-size:76px;margin-bottom:50px">সহজ রিটার্ন ও এক্সচেঞ্জ</h1>
  ${["ডেলিভারির ৭ দিনের মধ্যে", "অব্যবহৃত ও আসল প্যাকেজিংয়ে থাকলে", "সাইজ বা রঙ বদলাতে চাইলে এক্সচেঞ্জ"].map((t) => `
  <div style="display:flex;gap:22px;align-items:center;font-size:42px;margin-bottom:22px">
    <span style="flex:none;width:58px;height:58px;border-radius:50%;background:#15914f;color:#fff;display:flex;align-items:center;justify-content:center;font-size:34px">✓</span>${t}</div>`).join("")}
</div>`),

  "09-launch-offer": page(`${rings}
<div class="center" style="align-items:center;text-align:center">
  <div class="kicker">🎉 লঞ্চ অফার</div>
  <h1 style="font-size:170px;margin-top:30px">${cfg.offer.discount}</h1>
  <div style="font-size:44px;margin-top:10px">সব পণ্যে, ${cfg.offer.until}</div>
  <div style="margin-top:56px;font-size:36px">চেকআউটে কোড দিন</div>
  <div class="en" style="margin-top:14px;padding:18px 56px;border:4px dashed #fff;border-radius:24px;font-size:76px;font-weight:700;letter-spacing:4px">${cfg.offer.code}</div>
</div>`, "green"),
};

const out = join(here, "posts");
const build = join(here, "src", "build");
mkdirSync(out, { recursive: true });
mkdirSync(build, { recursive: true });
const profile = join(tmpdir(), "shohojepai-render-chrome");

for (const [name, html] of Object.entries(posts)) {
  const htmlPath = join(build, `${name}.html`);
  writeFileSync(htmlPath, html);
  execFileSync(CHROME, [
    "--headless=new", `--user-data-dir=${profile}`, "--disable-gpu", "--hide-scrollbars",
    "--force-device-scale-factor=1", "--allow-file-access-from-files", "--virtual-time-budget=8000",
    "--window-size=1080,1350", `--screenshot=${join(out, `${name}.png`)}`, pathToFileURL(htmlPath).href,
  ], { stdio: "ignore" });
  console.log("rendered", name);
}
