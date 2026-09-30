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
};

export const PROVINCE_LIST = [
  // North (9)
  {
    slug: "chiang-mai",
    nameTh: "เชียงใหม่",
    nameEn: "Chiang Mai",
    region: "north",
  },
  {
    slug: "chiang-rai",
    nameTh: "เชียงราย",
    nameEn: "Chiang Rai",
    region: "north",
  },
  { slug: "lampang", nameTh: "ลำปาง", nameEn: "Lampang", region: "north" },
  { slug: "lamphun", nameTh: "ลำพูน", nameEn: "Lamphun", region: "north" },
  {
    slug: "mae-hong-son",
    nameTh: "แม่ฮ่องสอน",
    nameEn: "Mae Hong Son",
    region: "north",
  },
  { slug: "nan", nameTh: "น่าน", nameEn: "Nan", region: "north" },
  { slug: "phayao", nameTh: "พะเยา", nameEn: "Phayao", region: "north" },
  { slug: "phrae", nameTh: "แพร่", nameEn: "Phrae", region: "north" },
  {
    slug: "uttaradit",
    nameTh: "อุตรดิตถ์",
    nameEn: "Uttaradit",
    region: "north",
  },
  // Northeast (20)
  {
    slug: "amnat-charoen",
    nameTh: "อำนาจเจริญ",
    nameEn: "Amnat Charoen",
    region: "northeast",
  },
  {
    slug: "bueng-kan",
    nameTh: "บึงกาฬ",
    nameEn: "Bueng Kan",
    region: "northeast",
  },
  {
    slug: "buriram",
    nameTh: "บุรีรัมย์",
    nameEn: "Buriram",
    region: "northeast",
  },
  {
    slug: "chaiyaphum",
    nameTh: "ชัยภูมิ",
    nameEn: "Chaiyaphum",
    region: "northeast",
  },
  {
    slug: "kalasin",
    nameTh: "กาฬสินธุ์",
    nameEn: "Kalasin",
    region: "northeast",
  },
  {
    slug: "khon-kaen",
    nameTh: "ขอนแก่น",
    nameEn: "Khon Kaen",
    region: "northeast",
  },
  { slug: "loei", nameTh: "เลย", nameEn: "Loei", region: "northeast" },
  {
    slug: "maha-sarakham",
    nameTh: "มหาสารคาม",
    nameEn: "Maha Sarakham",
    region: "northeast",
  },
  {
    slug: "mukdahan",
    nameTh: "มุกดาหาร",
    nameEn: "Mukdahan",
    region: "northeast",
  },
  {
    slug: "nakhon-phanom",
    nameTh: "นครพนม",
    nameEn: "Nakhon Phanom",
    region: "northeast",
  },
  {
    slug: "nakhon-ratchasima",
    nameTh: "นครราชสีมา",
    nameEn: "Nakhon Ratchasima",
    region: "northeast",
  },
  {
    slug: "nong-bua-lamphu",
    nameTh: "หนองบัวลำภู",
    nameEn: "Nong Bua Lamphu",
    region: "northeast",
  },
  {
    slug: "nong-khai",
    nameTh: "หนองคาย",
    nameEn: "Nong Khai",
    region: "northeast",
  },
  { slug: "roi-et", nameTh: "ร้อยเอ็ด", nameEn: "Roi Et", region: "northeast" },
  {
    slug: "sakon-nakhon",
    nameTh: "สกลนคร",
    nameEn: "Sakon Nakhon",
    region: "northeast",
  },
  {
    slug: "sisaket",
    nameTh: "ศรีสะเกษ",
    nameEn: "Sisaket",
    region: "northeast",
  },
  { slug: "surin", nameTh: "สุรินทร์", nameEn: "Surin", region: "northeast" },
  {
    slug: "ubon-ratchathani",
    nameTh: "อุบลราชธานี",
    nameEn: "Ubon Ratchathani",
    region: "northeast",
  },
  {
    slug: "udon-thani",
    nameTh: "อุดรธานี",
    nameEn: "Udon Thani",
    region: "northeast",
  },
  {
    slug: "yasothon",
    nameTh: "ยโสธร",
    nameEn: "Yasothon",
    region: "northeast",
  },
  // Central (22, incl. Bangkok)
  {
    slug: "bangkok",
    nameTh: "กรุงเทพมหานคร",
    nameEn: "Bangkok",
    region: "central",
  },
  {
    slug: "ang-thong",
    nameTh: "อ่างทอง",
    nameEn: "Ang Thong",
    region: "central",
  },
  {
    slug: "phra-nakhon-si-ayutthaya",
    nameTh: "พระนครศรีอยุธยา",
    nameEn: "Phra Nakhon Si Ayutthaya",
    region: "central",
  },
  { slug: "chai-nat", nameTh: "ชัยนาท", nameEn: "Chai Nat", region: "central" },
  {
    slug: "kamphaeng-phet",
    nameTh: "กำแพงเพชร",
    nameEn: "Kamphaeng Phet",
    region: "central",
  },
  { slug: "lopburi", nameTh: "ลพบุรี", nameEn: "Lopburi", region: "central" },
  {
    slug: "nakhon-nayok",
    nameTh: "นครนายก",
    nameEn: "Nakhon Nayok",
    region: "central",
  },
  {
    slug: "nakhon-pathom",
    nameTh: "นครปฐม",
    nameEn: "Nakhon Pathom",
    region: "central",
  },
  {
    slug: "nakhon-sawan",
    nameTh: "นครสวรรค์",
    nameEn: "Nakhon Sawan",
    region: "central",
  },
  {
    slug: "nonthaburi",
    nameTh: "นนทบุรี",
    nameEn: "Nonthaburi",
    region: "central",
  },
  {
    slug: "pathum-thani",
    nameTh: "ปทุมธานี",
    nameEn: "Pathum Thani",
    region: "central",
  },
  {
    slug: "phetchabun",
    nameTh: "เพชรบูรณ์",
    nameEn: "Phetchabun",
    region: "central",
  },
  { slug: "phichit", nameTh: "พิจิตร", nameEn: "Phichit", region: "central" },
  {
    slug: "phitsanulok",
    nameTh: "พิษณุโลก",
    nameEn: "Phitsanulok",
    region: "central",
  },
  {
    slug: "samut-prakan",
    nameTh: "สมุทรปราการ",
    nameEn: "Samut Prakan",
    region: "central",
  },
  {
    slug: "samut-sakhon",
    nameTh: "สมุทรสาคร",
    nameEn: "Samut Sakhon",
    region: "central",
  },
  {
    slug: "samut-songkhram",
    nameTh: "สมุทรสงคราม",
    nameEn: "Samut Songkhram",
    region: "central",
  },
  {
    slug: "saraburi",
    nameTh: "สระบุรี",
    nameEn: "Saraburi",
    region: "central",
  },
  {
    slug: "sing-buri",
    nameTh: "สิงห์บุรี",
    nameEn: "Sing Buri",
    region: "central",
  },
  {
    slug: "sukhothai",
    nameTh: "สุโขทัย",
    nameEn: "Sukhothai",
    region: "central",
  },
  {
    slug: "suphan-buri",
    nameTh: "สุพรรณบุรี",
    nameEn: "Suphan Buri",
    region: "central",
  },
  {
    slug: "uthai-thani",
    nameTh: "อุทัยธานี",
    nameEn: "Uthai Thani",
    region: "central",
  },
  // East (7)
  {
    slug: "chachoengsao",
    nameTh: "ฉะเชิงเทรา",
    nameEn: "Chachoengsao",
    region: "east",
  },
  {
    slug: "chanthaburi",
    nameTh: "จันทบุรี",
    nameEn: "Chanthaburi",
    region: "east",
  },
  { slug: "chonburi", nameTh: "ชลบุรี", nameEn: "Chonburi", region: "east" },
  {
    slug: "prachinburi",
    nameTh: "ปราจีนบุรี",
    nameEn: "Prachinburi",
    region: "east",
  },
  { slug: "rayong", nameTh: "ระยอง", nameEn: "Rayong", region: "east" },
  { slug: "sa-kaeo", nameTh: "สระแก้ว", nameEn: "Sa Kaeo", region: "east" },
  { slug: "trat", nameTh: "ตราด", nameEn: "Trat", region: "east" },
  // West (5)
  {
    slug: "kanchanaburi",
    nameTh: "กาญจนบุรี",
    nameEn: "Kanchanaburi",
    region: "west",
  },
  {
    slug: "phetchaburi",
    nameTh: "เพชรบุรี",
    nameEn: "Phetchaburi",
    region: "west",
  },
  {
    slug: "prachuap-khiri-khan",
    nameTh: "ประจวบคีรีขันธ์",
    nameEn: "Prachuap Khiri Khan",
    region: "west",
  },
  {
    slug: "ratchaburi",
    nameTh: "ราชบุรี",
    nameEn: "Ratchaburi",
    region: "west",
  },
  { slug: "tak", nameTh: "ตาก", nameEn: "Tak", region: "west" },
  // South (14)
  { slug: "chumphon", nameTh: "ชุมพร", nameEn: "Chumphon", region: "south" },
  { slug: "krabi", nameTh: "กระบี่", nameEn: "Krabi", region: "south" },
  {
    slug: "nakhon-si-thammarat",
    nameTh: "นครศรีธรรมราช",
    nameEn: "Nakhon Si Thammarat",
    region: "south",
  },
  {
    slug: "narathiwat",
    nameTh: "นราธิวาส",
    nameEn: "Narathiwat",
    region: "south",
  },
  { slug: "pattani", nameTh: "ปัตตานี", nameEn: "Pattani", region: "south" },
  { slug: "phang-nga", nameTh: "พังงา", nameEn: "Phang Nga", region: "south" },
  {
    slug: "phatthalung",
    nameTh: "พัทลุง",
    nameEn: "Phatthalung",
    region: "south",
  },
  { slug: "phuket", nameTh: "ภูเก็ต", nameEn: "Phuket", region: "south" },
  { slug: "ranong", nameTh: "ระนอง", nameEn: "Ranong", region: "south" },
  { slug: "satun", nameTh: "สตูล", nameEn: "Satun", region: "south" },
  { slug: "songkhla", nameTh: "สงขลา", nameEn: "Songkhla", region: "south" },
  {
    slug: "surat-thani",
    nameTh: "สุราษฎร์ธานี",
    nameEn: "Surat Thani",
    region: "south",
  },
  { slug: "trang", nameTh: "ตรัง", nameEn: "Trang", region: "south" },
  { slug: "yala", nameTh: "ยะลา", nameEn: "Yala", region: "south" },
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
