// Spec §4.2: all 77 provinces (76 + Bangkok) in the official 6-region grouping.
// Slugs must match the `public.provinces` rows seeded by the migration (config.test.ts checks it).

export const REGIONS = [
  "north",
  "northeast",
  "central",
  "east",
  "west",
  "south",
] as const;
export type Region = (typeof REGIONS)[number];

export type RegionDef = {
  slug: Region;
  nameTh: string;
  nameEn: string;
  /**
   * CSS variable holding the region's display colour (globals.css `--region-*`). Colours were
   * validated for every pair of bordering regions in both themes (Design.md §2); always show the
   * region name next to the colour.
   */
  color: string;
};

export const REGION_LIST = [
  {
    slug: "north",
    nameTh: "ภาคเหนือ",
    nameEn: "North",
    color: "var(--region-north)",
  },
  {
    slug: "northeast",
    nameTh: "ภาคตะวันออกเฉียงเหนือ",
    nameEn: "Northeast",
    color: "var(--region-northeast)",
  },
  {
    slug: "central",
    nameTh: "ภาคกลาง",
    nameEn: "Central",
    color: "var(--region-central)",
  },
  {
    slug: "east",
    nameTh: "ภาคตะวันออก",
    nameEn: "East",
    color: "var(--region-east)",
  },
  {
    slug: "west",
    nameTh: "ภาคตะวันตก",
    nameEn: "West",
    color: "var(--region-west)",
  },
  {
    slug: "south",
    nameTh: "ภาคใต้",
    nameEn: "South",
    color: "var(--region-south)",
  },
] as const satisfies readonly RegionDef[];

export type ProvinceDef = {
  slug: string;
  nameTh: string;
  nameEn: string;
  region: Region;
  /** Approximate centre: the capital city (Phase 8 avatar pins, nearest-province lookup). */
  lat: number;
  lng: number;
};

export const PROVINCE_LIST = [
  // North (9)
  {
    slug: "chiang-mai",
    nameTh: "เชียงใหม่",
    nameEn: "Chiang Mai",
    region: "north",
    lat: 18.79,
    lng: 98.98,
  },
  {
    slug: "chiang-rai",
    nameTh: "เชียงราย",
    nameEn: "Chiang Rai",
    region: "north",
    lat: 19.91,
    lng: 99.83,
  },
  {
    slug: "lampang",
    nameTh: "ลำปาง",
    nameEn: "Lampang",
    region: "north",
    lat: 18.29,
    lng: 99.49,
  },
  {
    slug: "lamphun",
    nameTh: "ลำพูน",
    nameEn: "Lamphun",
    region: "north",
    lat: 18.58,
    lng: 99.01,
  },
  {
    slug: "mae-hong-son",
    nameTh: "แม่ฮ่องสอน",
    nameEn: "Mae Hong Son",
    region: "north",
    lat: 19.3,
    lng: 97.97,
  },
  {
    slug: "nan",
    nameTh: "น่าน",
    nameEn: "Nan",
    region: "north",
    lat: 18.78,
    lng: 100.78,
  },
  {
    slug: "phayao",
    nameTh: "พะเยา",
    nameEn: "Phayao",
    region: "north",
    lat: 19.17,
    lng: 99.9,
  },
  {
    slug: "phrae",
    nameTh: "แพร่",
    nameEn: "Phrae",
    region: "north",
    lat: 18.14,
    lng: 100.14,
  },
  {
    slug: "uttaradit",
    nameTh: "อุตรดิตถ์",
    nameEn: "Uttaradit",
    region: "north",
    lat: 17.62,
    lng: 100.1,
  },
  // Northeast (20)
  {
    slug: "amnat-charoen",
    nameTh: "อำนาจเจริญ",
    nameEn: "Amnat Charoen",
    region: "northeast",
    lat: 15.86,
    lng: 104.63,
  },
  {
    slug: "bueng-kan",
    nameTh: "บึงกาฬ",
    nameEn: "Bueng Kan",
    region: "northeast",
    lat: 18.36,
    lng: 103.65,
  },
  {
    slug: "buriram",
    nameTh: "บุรีรัมย์",
    nameEn: "Buriram",
    region: "northeast",
    lat: 14.99,
    lng: 103.1,
  },
  {
    slug: "chaiyaphum",
    nameTh: "ชัยภูมิ",
    nameEn: "Chaiyaphum",
    region: "northeast",
    lat: 15.81,
    lng: 102.03,
  },
  {
    slug: "kalasin",
    nameTh: "กาฬสินธุ์",
    nameEn: "Kalasin",
    region: "northeast",
    lat: 16.43,
    lng: 103.51,
  },
  {
    slug: "khon-kaen",
    nameTh: "ขอนแก่น",
    nameEn: "Khon Kaen",
    region: "northeast",
    lat: 16.44,
    lng: 102.84,
  },
  {
    slug: "loei",
    nameTh: "เลย",
    nameEn: "Loei",
    region: "northeast",
    lat: 17.49,
    lng: 101.72,
  },
  {
    slug: "maha-sarakham",
    nameTh: "มหาสารคาม",
    nameEn: "Maha Sarakham",
    region: "northeast",
    lat: 16.18,
    lng: 103.3,
  },
  {
    slug: "mukdahan",
    nameTh: "มุกดาหาร",
    nameEn: "Mukdahan",
    region: "northeast",
    lat: 16.54,
    lng: 104.72,
  },
  {
    slug: "nakhon-phanom",
    nameTh: "นครพนม",
    nameEn: "Nakhon Phanom",
    region: "northeast",
    lat: 17.39,
    lng: 104.78,
  },
  {
    slug: "nakhon-ratchasima",
    nameTh: "นครราชสีมา",
    nameEn: "Nakhon Ratchasima",
    region: "northeast",
    lat: 14.97,
    lng: 102.1,
  },
  {
    slug: "nong-bua-lamphu",
    nameTh: "หนองบัวลำภู",
    nameEn: "Nong Bua Lamphu",
    region: "northeast",
    lat: 17.2,
    lng: 102.44,
  },
  {
    slug: "nong-khai",
    nameTh: "หนองคาย",
    nameEn: "Nong Khai",
    region: "northeast",
    lat: 17.88,
    lng: 102.74,
  },
  {
    slug: "roi-et",
    nameTh: "ร้อยเอ็ด",
    nameEn: "Roi Et",
    region: "northeast",
    lat: 16.05,
    lng: 103.65,
  },
  {
    slug: "sakon-nakhon",
    nameTh: "สกลนคร",
    nameEn: "Sakon Nakhon",
    region: "northeast",
    lat: 17.16,
    lng: 104.15,
  },
  {
    slug: "sisaket",
    nameTh: "ศรีสะเกษ",
    nameEn: "Sisaket",
    region: "northeast",
    lat: 15.12,
    lng: 104.32,
  },
  {
    slug: "surin",
    nameTh: "สุรินทร์",
    nameEn: "Surin",
    region: "northeast",
    lat: 14.88,
    lng: 103.49,
  },
  {
    slug: "ubon-ratchathani",
    nameTh: "อุบลราชธานี",
    nameEn: "Ubon Ratchathani",
    region: "northeast",
    lat: 15.24,
    lng: 104.85,
  },
  {
    slug: "udon-thani",
    nameTh: "อุดรธานี",
    nameEn: "Udon Thani",
    region: "northeast",
    lat: 17.41,
    lng: 102.79,
  },
  {
    slug: "yasothon",
    nameTh: "ยโสธร",
    nameEn: "Yasothon",
    region: "northeast",
    lat: 15.79,
    lng: 104.15,
  },
  // Central (22, incl. Bangkok)
  {
    slug: "bangkok",
    nameTh: "กรุงเทพมหานคร",
    nameEn: "Bangkok",
    region: "central",
    lat: 13.76,
    lng: 100.5,
  },
  {
    slug: "ang-thong",
    nameTh: "อ่างทอง",
    nameEn: "Ang Thong",
    region: "central",
    lat: 14.59,
    lng: 100.46,
  },
  {
    slug: "phra-nakhon-si-ayutthaya",
    nameTh: "พระนครศรีอยุธยา",
    nameEn: "Phra Nakhon Si Ayutthaya",
    region: "central",
    lat: 14.35,
    lng: 100.57,
  },
  {
    slug: "chai-nat",
    nameTh: "ชัยนาท",
    nameEn: "Chai Nat",
    region: "central",
    lat: 15.19,
    lng: 100.13,
  },
  {
    slug: "kamphaeng-phet",
    nameTh: "กำแพงเพชร",
    nameEn: "Kamphaeng Phet",
    region: "central",
    lat: 16.48,
    lng: 99.52,
  },
  {
    slug: "lopburi",
    nameTh: "ลพบุรี",
    nameEn: "Lopburi",
    region: "central",
    lat: 14.8,
    lng: 100.65,
  },
  {
    slug: "nakhon-nayok",
    nameTh: "นครนายก",
    nameEn: "Nakhon Nayok",
    region: "central",
    lat: 14.2,
    lng: 101.21,
  },
  {
    slug: "nakhon-pathom",
    nameTh: "นครปฐม",
    nameEn: "Nakhon Pathom",
    region: "central",
    lat: 13.82,
    lng: 100.06,
  },
  {
    slug: "nakhon-sawan",
    nameTh: "นครสวรรค์",
    nameEn: "Nakhon Sawan",
    region: "central",
    lat: 15.7,
    lng: 100.14,
  },
  {
    slug: "nonthaburi",
    nameTh: "นนทบุรี",
    nameEn: "Nonthaburi",
    region: "central",
    lat: 13.86,
    lng: 100.52,
  },
  {
    slug: "pathum-thani",
    nameTh: "ปทุมธานี",
    nameEn: "Pathum Thani",
    region: "central",
    lat: 14.02,
    lng: 100.53,
  },
  {
    slug: "phetchabun",
    nameTh: "เพชรบูรณ์",
    nameEn: "Phetchabun",
    region: "central",
    lat: 16.42,
    lng: 101.16,
  },
  {
    slug: "phichit",
    nameTh: "พิจิตร",
    nameEn: "Phichit",
    region: "central",
    lat: 16.44,
    lng: 100.35,
  },
  {
    slug: "phitsanulok",
    nameTh: "พิษณุโลก",
    nameEn: "Phitsanulok",
    region: "central",
    lat: 16.82,
    lng: 100.26,
  },
  {
    slug: "samut-prakan",
    nameTh: "สมุทรปราการ",
    nameEn: "Samut Prakan",
    region: "central",
    lat: 13.6,
    lng: 100.6,
  },
  {
    slug: "samut-sakhon",
    nameTh: "สมุทรสาคร",
    nameEn: "Samut Sakhon",
    region: "central",
    lat: 13.55,
    lng: 100.27,
  },
  {
    slug: "samut-songkhram",
    nameTh: "สมุทรสงคราม",
    nameEn: "Samut Songkhram",
    region: "central",
    lat: 13.41,
    lng: 100.0,
  },
  {
    slug: "saraburi",
    nameTh: "สระบุรี",
    nameEn: "Saraburi",
    region: "central",
    lat: 14.53,
    lng: 100.91,
  },
  {
    slug: "sing-buri",
    nameTh: "สิงห์บุรี",
    nameEn: "Sing Buri",
    region: "central",
    lat: 14.89,
    lng: 100.4,
  },
  {
    slug: "sukhothai",
    nameTh: "สุโขทัย",
    nameEn: "Sukhothai",
    region: "central",
    lat: 17.01,
    lng: 99.82,
  },
  {
    slug: "suphan-buri",
    nameTh: "สุพรรณบุรี",
    nameEn: "Suphan Buri",
    region: "central",
    lat: 14.47,
    lng: 100.12,
  },
  {
    slug: "uthai-thani",
    nameTh: "อุทัยธานี",
    nameEn: "Uthai Thani",
    region: "central",
    lat: 15.38,
    lng: 100.03,
  },
  // East (7)
  {
    slug: "chachoengsao",
    nameTh: "ฉะเชิงเทรา",
    nameEn: "Chachoengsao",
    region: "east",
    lat: 13.69,
    lng: 101.07,
  },
  {
    slug: "chanthaburi",
    nameTh: "จันทบุรี",
    nameEn: "Chanthaburi",
    region: "east",
    lat: 12.61,
    lng: 102.1,
  },
  {
    slug: "chonburi",
    nameTh: "ชลบุรี",
    nameEn: "Chonburi",
    region: "east",
    lat: 13.36,
    lng: 100.98,
  },
  {
    slug: "prachinburi",
    nameTh: "ปราจีนบุรี",
    nameEn: "Prachinburi",
    region: "east",
    lat: 14.05,
    lng: 101.37,
  },
  {
    slug: "rayong",
    nameTh: "ระยอง",
    nameEn: "Rayong",
    region: "east",
    lat: 12.68,
    lng: 101.28,
  },
  {
    slug: "sa-kaeo",
    nameTh: "สระแก้ว",
    nameEn: "Sa Kaeo",
    region: "east",
    lat: 13.81,
    lng: 102.07,
  },
  {
    slug: "trat",
    nameTh: "ตราด",
    nameEn: "Trat",
    region: "east",
    lat: 12.24,
    lng: 102.52,
  },
  // West (5)
  {
    slug: "kanchanaburi",
    nameTh: "กาญจนบุรี",
    nameEn: "Kanchanaburi",
    region: "west",
    lat: 14.02,
    lng: 99.53,
  },
  {
    slug: "phetchaburi",
    nameTh: "เพชรบุรี",
    nameEn: "Phetchaburi",
    region: "west",
    lat: 13.11,
    lng: 99.94,
  },
  {
    slug: "prachuap-khiri-khan",
    nameTh: "ประจวบคีรีขันธ์",
    nameEn: "Prachuap Khiri Khan",
    region: "west",
    lat: 11.81,
    lng: 99.8,
  },
  {
    slug: "ratchaburi",
    nameTh: "ราชบุรี",
    nameEn: "Ratchaburi",
    region: "west",
    lat: 13.54,
    lng: 99.82,
  },
  {
    slug: "tak",
    nameTh: "ตาก",
    nameEn: "Tak",
    region: "west",
    lat: 16.88,
    lng: 99.13,
  },
  // South (14)
  {
    slug: "chumphon",
    nameTh: "ชุมพร",
    nameEn: "Chumphon",
    region: "south",
    lat: 10.49,
    lng: 99.18,
  },
  {
    slug: "krabi",
    nameTh: "กระบี่",
    nameEn: "Krabi",
    region: "south",
    lat: 8.09,
    lng: 98.91,
  },
  {
    slug: "nakhon-si-thammarat",
    nameTh: "นครศรีธรรมราช",
    nameEn: "Nakhon Si Thammarat",
    region: "south",
    lat: 8.43,
    lng: 99.96,
  },
  {
    slug: "narathiwat",
    nameTh: "นราธิวาส",
    nameEn: "Narathiwat",
    region: "south",
    lat: 6.43,
    lng: 101.82,
  },
  {
    slug: "pattani",
    nameTh: "ปัตตานี",
    nameEn: "Pattani",
    region: "south",
    lat: 6.87,
    lng: 101.25,
  },
  {
    slug: "phang-nga",
    nameTh: "พังงา",
    nameEn: "Phang Nga",
    region: "south",
    lat: 8.45,
    lng: 98.53,
  },
  {
    slug: "phatthalung",
    nameTh: "พัทลุง",
    nameEn: "Phatthalung",
    region: "south",
    lat: 7.62,
    lng: 100.08,
  },
  {
    slug: "phuket",
    nameTh: "ภูเก็ต",
    nameEn: "Phuket",
    region: "south",
    lat: 7.88,
    lng: 98.39,
  },
  {
    slug: "ranong",
    nameTh: "ระนอง",
    nameEn: "Ranong",
    region: "south",
    lat: 9.96,
    lng: 98.64,
  },
  {
    slug: "satun",
    nameTh: "สตูล",
    nameEn: "Satun",
    region: "south",
    lat: 6.62,
    lng: 100.07,
  },
  {
    slug: "songkhla",
    nameTh: "สงขลา",
    nameEn: "Songkhla",
    region: "south",
    lat: 7.19,
    lng: 100.6,
  },
  {
    slug: "surat-thani",
    nameTh: "สุราษฎร์ธานี",
    nameEn: "Surat Thani",
    region: "south",
    lat: 9.14,
    lng: 99.33,
  },
  {
    slug: "trang",
    nameTh: "ตรัง",
    nameEn: "Trang",
    region: "south",
    lat: 7.56,
    lng: 99.61,
  },
  {
    slug: "yala",
    nameTh: "ยะลา",
    nameEn: "Yala",
    region: "south",
    lat: 6.54,
    lng: 101.28,
  },
] as const satisfies readonly ProvinceDef[];

export type Province = (typeof PROVINCE_LIST)[number]["slug"];

const BY_SLUG = new Map<string, ProvinceDef>(
  PROVINCE_LIST.map((p) => [p.slug, p]),
);

export function isProvince(v: unknown): v is Province {
  return typeof v === "string" && BY_SLUG.has(v);
}

export function getProvince(
  slug: string | null | undefined,
): ProvinceDef | undefined {
  return slug ? BY_SLUG.get(slug) : undefined;
}

export function getRegion(slug: Region): RegionDef {
  return REGION_LIST.find((r) => r.slug === slug)!;
}

/**
 * Best-effort match of free-text location ("มุกดาหาร, ไทย", "จ.เชียงใหม่", "Chiang Mai") to a
 * province slug. Used by the back-fill report and to pre-fill forms; null when unsure.
 */
export function matchProvince(
  text: string | null | undefined,
): Province | null {
  if (!text) return null;
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/^(จังหวัด|จ\.)\s*/u, "")
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, "");
  const parts = text
    .split(/[,/·|]/)
    .map(norm)
    .filter(Boolean);
  if (
    ["กทม", "กรุงเทพ", "กรุงเทพฯ", "bkk"].some((a) => parts.includes(norm(a)))
  )
    return "bangkok";
  for (const p of PROVINCE_LIST) {
    const names = [norm(p.nameTh), norm(p.nameEn), norm(p.slug)];
    if (parts.some((x) => names.includes(x))) return p.slug;
  }
  return null;
}
