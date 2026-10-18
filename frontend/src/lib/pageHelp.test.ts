import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { helpForPath } from "./pageHelp";

// Every dashboard page gets an "About this page" panel. A new page under
// app/(protected) without help text fails here.
const PROTECTED = path.join(__dirname, "..", "app", "(protected)");
const NO_HELP = ["/checkout", "/checkout/bkash-result", "/admin/orders/[id]/print"];

function pageRoutes(dir: string, base = ""): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return pageRoutes(path.join(dir, entry.name), `${base}/${entry.name}`);
    return entry.name === "page.tsx" ? [base] : [];
  });
}

describe("page help", () => {
  it("covers every dashboard page", () => {
    const missing = pageRoutes(PROTECTED).filter((route) => !NO_HELP.includes(route) && !helpForPath(route, false));
    expect(missing).toEqual([]);
  });

  it("finds the order detail help for a real order id", () => {
    expect(helpForPath("/orders/665f1f77bcf86cd7994a1b2c", false)?.i18n).toBe("help.orderDetail");
    expect(helpForPath("/admin/orders/665f1f77bcf86cd7994a1b2c", true)?.title).toBe("Order details");
  });

  it("shows staff help on the dashboard for staff and customer help otherwise", () => {
    expect(helpForPath("/dashboard", true)?.i18n).toBeUndefined();
    expect(helpForPath("/dashboard", false)?.i18n).toBe("help.dashboard");
  });
});
