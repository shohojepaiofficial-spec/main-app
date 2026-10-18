import { describe, expect, it } from "vitest";
import { buildRoleChangeEmails } from "./roleChangeEmail";

const changer = { name: "Rahim", email: "rahim@example.com" };
const holder = { name: "Karim <b>", email: "karim@example.com" };
const at = new Date("2026-10-19T10:00:00Z");

describe("buildRoleChangeEmails", () => {
  it("emails both the role holder and the changer", () => {
    const [toHolder, toChanger] = buildRoleChangeEmails({ changer, holder, from: "coadmin", to: "admin", at });
    expect(toHolder.to).toBe("karim@example.com");
    expect(toHolder.subject).toContain("Admin");
    expect(toHolder.text).toContain("from Co-admin to Admin by Rahim (rahim@example.com)");
    expect(toChanger.to).toBe("rahim@example.com");
    expect(toChanger.text).toContain("You changed the role of Karim <b> (karim@example.com) from Co-admin to Admin");
  });

  it("escapes names in the HTML", () => {
    const [toHolder] = buildRoleChangeEmails({ changer, holder, from: "user", to: "coadmin", at });
    expect(toHolder.html).toContain("Karim &lt;b&gt;");
    expect(toHolder.html).not.toContain("<b>");
  });

  it("tells a demoted user they lost dashboard access", () => {
    const [toHolder] = buildRoleChangeEmails({ changer, holder, from: "admin", to: "user", at });
    expect(toHolder.text).toContain("no longer have access");
  });
});
