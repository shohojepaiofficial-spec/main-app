import { describe, it, expect } from "vitest";
import { findPathaoCity, findPathaoZone, spellingSkeleton } from "./pathaoLocationMatch";

// Names copied from Pathao's live city/zone lists (2026-09-30), including
// their stray trailing spaces.
const zones = (...names: string[]) => names.map((name, i) => ({ id: i + 1, name }));

describe("findPathaoCity", () => {
  const cities = zones("Barisal", "B. Baria", "Chittagong", "Cumilla", "Cox's Bazar", "Gopalgonj ", "Sylhet");

  it("matches the same name, ignoring case and punctuation", () => {
    expect(findPathaoCity(cities, "Sylhet")?.name).toBe("Sylhet");
    expect(findPathaoCity(cities, "Coxsbazar")?.name).toBe("Cox's Bazar");
  });

  it("maps official new district names to Pathao's older ones", () => {
    expect(findPathaoCity(cities, "Chattogram")?.name).toBe("Chittagong");
    expect(findPathaoCity(cities, "Brahmanbaria")?.name).toBe("B. Baria");
    expect(findPathaoCity(cities, "Comilla")?.name).toBe("Cumilla");
    expect(findPathaoCity(cities, "Gopalganj")?.name).toBe("Gopalgonj ");
  });

  it("returns nothing for an unknown or blank district", () => {
    expect(findPathaoCity(cities, "Atlantis")).toBeUndefined();
    expect(findPathaoCity(cities, "  ")).toBeUndefined();
  });
});

describe("findPathaoZone", () => {
  it("prefers an exact name", () => {
    const barisal = zones("Babuganj", "Bakergonj", "Barisal Sadar");
    expect(findPathaoZone(barisal, "Babuganj")?.name).toBe("Babuganj");
  });

  it("matches alternative spellings of the same place", () => {
    const barisal = zones("Agailzhara", "Babuganj", "Bakergonj", "Gauronodi", "Mahendiganj");
    expect(findPathaoZone(barisal, "Bakerganj")?.name).toBe("Bakergonj");
    expect(findPathaoZone(barisal, "Agailjhara")?.name).toBe("Agailzhara");
    expect(findPathaoZone(barisal, "Gournadi")?.name).toBe("Gauronodi");
    expect(findPathaoZone(zones("Jessore Sadar", "Sarsa", "Chaugachha"), "Sharsha")?.name).toBe("Sarsa");
  });

  it("sends a Sadar upazila to the district's Sadar zone", () => {
    const lakshmipur = zones("Lakshimpur Sadar", "Ramgoti", "Raipur");
    expect(findPathaoZone(lakshmipur, "Lakshmipur Sadar")?.name).toBe("Lakshimpur Sadar");
  });

  it("matches a zone whose name contains the upazila", () => {
    expect(findPathaoZone(zones("Kushtia Sadar", "Kushtia-Mirpur"), "Mirpur")?.name).toBe("Kushtia-Mirpur");
  });

  it("allows a one-letter slip only when a single zone is that close", () => {
    expect(findPathaoZone(zones("Obhoynagar", "Keshabpur"), "Abhaynagar")?.name).toBe("Obhoynagar");
    // "Ramnagar" and "Rajnagat" are both one letter from "Rajnagar" — ambiguous, so no guess.
    expect(findPathaoZone(zones("Ramnagar", "Rajnagat"), "Rajnagar")).toBeUndefined();
  });

  it("returns nothing when no zone is close", () => {
    expect(findPathaoZone(zones("Bandarban Sadar", "Thanchi"), "Ruma")).toBeUndefined();
  });
});

describe("spellingSkeleton", () => {
  it("folds common transliteration variants together", () => {
    expect(spellingSkeleton("Bakergonj")).toBe(spellingSkeleton("Bakerganj"));
    expect(spellingSkeleton("Chaugachha")).toBe(spellingSkeleton("Chougachha"));
    expect(spellingSkeleton("Fulchhari")).toBe(spellingSkeleton("Phulchari"));
  });
});
