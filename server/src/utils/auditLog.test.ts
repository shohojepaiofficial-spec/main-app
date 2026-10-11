import { describe, expect, it } from "vitest";
import { buildAuditChanges } from "./auditLog";

describe("audit change snapshots", () => {
  it("records only changed product fields and redacts uploaded image URLs", () => {
    const changes = buildAuditChanges("product", "updated", {
      name: "Old name", price: 100, images: ["https://old-image"],
    }, {
      name: "New name", price: 100, images: ["https://new-image"],
    });

    expect(changes).toEqual([
      { field: "name", before: "Old name", after: "New name" },
      { field: "images", before: "1 image", after: "1 image" },
    ]);
    expect(JSON.stringify(changes)).not.toContain("https://");
  });

  it("does not record unchanged fields", () => {
    expect(buildAuditChanges("banner", "updated", { title: "Sale" }, { title: "Sale" })).toEqual([]);
  });

  it("records banner ordering changes without exposing image URLs", () => {
    const changes = buildAuditChanges("banner", "reordered", {
      order: 1, image: "https://private-image",
    }, {
      order: 2, image: "https://private-image",
    });
    expect(changes).toEqual([{ field: "order", before: 1, after: 2 }]);
    expect(JSON.stringify(changes)).not.toContain("https://");
  });
});
