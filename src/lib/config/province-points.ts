// Design.md §5 ProvinceBadge: where each province sits on the hand-simplified Thailand map
// (ThailandMap, viewBox 84 × 150). Each point is the provincial capital's longitude / latitude
// (rounded, public geography), projected the way the map was drawn: x = (lon − 97.35) × 10,
// y = (20.46 − lat) × 10. A few are nudged so the dot stays inside its region's simplified
// outline (province-points.test.ts checks every one).

/** [longitude, latitude] of the provincial capital. */
const LON_LAT: Record<string, readonly [number, number]> = {
  // north
  "chiang-mai": [98.98, 18.79],
  "chiang-rai": [99.83, 19.91],
  lampang: [99.49, 18.29],
  lamphun: [99.01, 18.58],
  "mae-hong-son": [97.97, 19.3],
  nan: [100.77, 18.78],
  phayao: [99.9, 19.17],
  phrae: [100.14, 18.14],
  uttaradit: [100.1, 17.62],
  // northeast
  "amnat-charoen": [104.63, 15.86],
  "bueng-kan": [103.65, 18.36],
  buriram: [103.1, 14.99],
  chaiyaphum: [102.03, 15.81],
  kalasin: [103.51, 16.43],
  "khon-kaen": [102.83, 16.43],
  loei: [101.72, 17.49],
  "maha-sarakham": [103.3, 16.18],
  mukdahan: [104.72, 16.54],
  "nakhon-phanom": [104.78, 17.4],
  "nakhon-ratchasima": [102.1, 14.97],
  "nong-bua-lamphu": [102.44, 17.2],
  "nong-khai": [102.74, 17.88],
  "roi-et": [103.65, 16.05],
  "sakon-nakhon": [104.15, 17.16],
  sisaket: [104.32, 15.12],
  surin: [103.49, 14.88],
  "ubon-ratchathani": [104.86, 15.24],
  "udon-thani": [102.79, 17.41],
  yasothon: [104.15, 15.79],
  // central
  bangkok: [100.5, 13.75],
  "ang-thong": [100.45, 14.59],
  "phra-nakhon-si-ayutthaya": [100.57, 14.35],
  "chai-nat": [100.13, 15.19],
  "kamphaeng-phet": [99.52, 16.48],
  lopburi: [100.65, 14.8],
  "nakhon-nayok": [101.21, 14.2],
  "nakhon-pathom": [100.06, 13.82],
  "nakhon-sawan": [100.12, 15.7],
  nonthaburi: [100.52, 13.86],
  "pathum-thani": [100.53, 14.02],
  phetchabun: [101.16, 16.42],
  phichit: [100.35, 16.44],
  phitsanulok: [100.26, 16.82],
  "samut-prakan": [100.6, 13.6],
  "samut-sakhon": [100.27, 13.55],
  "samut-songkhram": [100.0, 13.41],
  saraburi: [100.91, 14.53],
  "sing-buri": [100.4, 14.89],
  sukhothai: [99.82, 17.01],
  "suphan-buri": [100.12, 14.47],
  "uthai-thani": [100.02, 15.38],
  // east
  chachoengsao: [101.08, 13.69],
  chanthaburi: [102.1, 12.61],
  chonburi: [100.98, 13.36],
  prachinburi: [101.37, 14.05],
  rayong: [101.28, 12.68],
  "sa-kaeo": [102.07, 13.82],
  trat: [102.52, 12.24],
  // west
  kanchanaburi: [99.53, 14.02],
  phetchaburi: [99.94, 13.11],
  "prachuap-khiri-khan": [99.8, 11.81],
  ratchaburi: [99.81, 13.54],
  tak: [99.13, 16.88],
  // south
  chumphon: [99.18, 10.49],
  krabi: [98.91, 8.09],
  "nakhon-si-thammarat": [99.96, 8.43],
  narathiwat: [101.82, 6.43],
  pattani: [101.25, 6.87],
  "phang-nga": [98.53, 8.45],
  phatthalung: [100.08, 7.62],
  phuket: [98.39, 7.88],
  ranong: [98.64, 9.96],
  satun: [100.07, 6.62],
  songkhla: [100.6, 7.2],
  "surat-thani": [99.33, 9.14],
  trang: [99.61, 7.56],
  yala: [101.28, 6.54],
};

/** Map-space nudges (x, y) for capitals that fall just outside the simplified outline. */
const NUDGE: Record<string, readonly [number, number]> = {
  "bueng-kan": [0, 1.5],
  "nong-khai": [0, 1.2],
  "samut-songkhram": [1.5, -0.5],
  pattani: [0, 1.5],
  // An island off the coast: the dot goes on the nearby mainland.
  phuket: [2.6, -4.8],
  ranong: [1.5, 0],
};

/** The province's point on the ThailandMap viewBox, or null for an unknown slug. */
export function provincePoint(slug: string): { x: number; y: number } | null {
  const ll = LON_LAT[slug];
  if (!ll) return null;
  const [dx, dy] = NUDGE[slug] ?? [0, 0];
  return {
    x: Math.round(((ll[0] - 97.35) * 10 + dx) * 10) / 10,
    y: Math.round(((20.46 - ll[1]) * 10 + dy) * 10) / 10,
  };
}

export const PROVINCE_POINT_SLUGS = Object.keys(LON_LAT);
