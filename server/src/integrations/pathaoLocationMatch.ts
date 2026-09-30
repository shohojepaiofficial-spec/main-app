// Pure name matching from our zila/upazila names (frontend/src/lib/
// bangladeshGeo.ts) to Pathao's own city/zone lists — no API calls, so it's
// unit-testable (see pathaoLocationMatch.test.ts). pathao.ts's
// matchPathaoLocation fetches the lists and calls these.
//
// The two datasets spell the same places differently: official new names vs
// Pathao's older ones (Chattogram/Chittagong), and free-form English
// transliterations of Bangla (Bakerganj/Bakergonj, Agailjhara/Agailzhara,
// Sharsha/Sarsa). Measured against Pathao's live list on 2026-09-30: exact
// matching found 288 of 494 upazilas and 53 of 64 zilas; this finds 472 and
// all 64. The rest fall back to the flat per-product fee, as before.

export interface NamedLocation {
  id: number;
  name: string;
}

// Our zila name -> Pathao's city name, both passed through baseName. Only
// the ones that differ by more than spelling noise (checked against Pathao's
// full city list).
const ZILA_TO_PATHAO_CITY: Record<string, string> = {
  bogura: "bogra",
  brahmanbaria: "bbaria",
  chattogram: "chittagong",
  comilla: "cumilla",
  gopalganj: "gopalgonj",
  jhalakathi: "jhalokathi",
  jhenaidah: "jhenidah",
  khagrachhari: "khagrachari",
  munshiganj: "munsiganj",
  narsingdi: "narshingdi",
  netrokona: "netrakona",
};

const ADMIN_WORDS = /\b(district|sadar|upazila|upozila|thana|pourashava|paurashava|powrosova|municipality)\b/g;

// Lowercase letters only, with administrative words ("Sadar", "Thana"...)
// dropped: "Cox's Bazar Sadar" -> "coxsbazar".
export function baseName(name: string): string {
  return name.toLowerCase().replace(ADMIN_WORDS, "").replace(/[^a-z]/g, "");
}

// A consonant skeleton that folds common alternative English spellings of
// the same Bangla sound together: gonj/ganj, chh/ch, zh/jh, z/j, sh/s, ph/f,
// y/i, dropped h, then all vowels after the first letter and doubled
// letters. "Bakergonj" and "Bakerganj" both become "bkrgnj".
export function spellingSkeleton(name: string): string {
  const s = baseName(name)
    .replace(/gonj/g, "ganj")
    .replace(/chh/g, "ch")
    .replace(/zh/g, "jh")
    .replace(/z/g, "j")
    .replace(/sh/g, "s")
    .replace(/ph/g, "f")
    .replace(/x/g, "ks")
    .replace(/w/g, "o")
    .replace(/y/g, "i")
    .replace(/h/g, "");
  if (!s) return "";
  return s[0] + s.slice(1).replace(/[aeiou]/g, "").replace(/(.)\1+/g, "$1");
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

export function findPathaoCity<T extends NamedLocation>(cities: T[], zila: string): T | undefined {
  const ours = baseName(zila);
  if (!ours) return undefined;
  const target = ZILA_TO_PATHAO_CITY[ours] ?? ours;
  return (
    cities.find((c) => baseName(c.name) === target) ??
    cities.find((c) => spellingSkeleton(c.name) === spellingSkeleton(target))
  );
}

// Tries progressively looser rules, stopping at the first hit: exact name,
// same spelling skeleton, a "Sadar" zone for a "Sadar" upazila, one name
// containing the other ("Mirpur" in "Kushtia-Mirpur"), then a skeleton one
// letter off — the last only when exactly one zone qualifies, so it never
// picks between two lookalikes. Every candidate is already inside the right
// city, so even a loose hit prices roughly the same as the exact zone would.
export function findPathaoZone<T extends NamedLocation>(zones: T[], upazila: string): T | undefined {
  const base = baseName(upazila);
  const skeleton = spellingSkeleton(upazila);
  const isSadar = /\bsadar\b/i.test(upazila);

  if (base) {
    const exact = zones.find((z) => baseName(z.name) === base);
    if (exact) return exact;
  }
  if (skeleton) {
    const sameSkeleton = zones.find((z) => spellingSkeleton(z.name) === skeleton);
    if (sameSkeleton) return sameSkeleton;
  }
  if (isSadar) {
    const sadarZone = zones.find((z) => /\bsadar\b/i.test(z.name));
    if (sadarZone) return sadarZone;
  }
  if (base.length >= 4) {
    const contains = zones.find((z) => {
      const zoneBase = baseName(z.name);
      return zoneBase.length >= 4 && (zoneBase.includes(base) || base.includes(zoneBase));
    });
    if (contains) return contains;
  }
  if (skeleton.length >= 4) {
    const near = zones.filter((z) => editDistance(skeleton, spellingSkeleton(z.name)) <= 1);
    if (near.length === 1) return near[0];
  }
  return undefined;
}
