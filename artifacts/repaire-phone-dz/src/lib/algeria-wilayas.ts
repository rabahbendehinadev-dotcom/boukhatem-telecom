/**
 * Canonical list of all 58 Algerian wilayas with regional shipping tier defaults.
 * Used by both the checkout page and the admin shipping-rates page.
 */

export interface AlgeriaWilaya {
  code: string;     // zero-padded, e.g. "01", "16"
  name: string;
  /** Default pricing tier label */
  tier: 'close' | 'major' | 'north' | 'south' | 'deep_south';
}

export const ALGERIA_WILAYAS: AlgeriaWilaya[] = [
  { code: '01', name: 'Adrar',                tier: 'deep_south' },
  { code: '02', name: 'Chlef',                tier: 'north'      },
  { code: '03', name: 'Laghouat',             tier: 'south'      },
  { code: '04', name: 'Oum El Bouaghi',       tier: 'north'      },
  { code: '05', name: 'Batna',                tier: 'north'      },
  { code: '06', name: 'Béjaïa',              tier: 'major'      },
  { code: '07', name: 'Biskra',               tier: 'south'      },
  { code: '08', name: 'Béchar',              tier: 'deep_south' },
  { code: '09', name: 'Blida',                tier: 'close'      },
  { code: '10', name: 'Bouira',               tier: 'north'      },
  { code: '11', name: 'Tamanrasset',          tier: 'south'      },
  { code: '12', name: 'Tébessa',             tier: 'north'      },
  { code: '13', name: 'Tlemcen',              tier: 'major'      },
  { code: '14', name: 'Tiaret',               tier: 'north'      },
  { code: '15', name: 'Tizi Ouzou',           tier: 'major'      },
  { code: '16', name: 'Alger',                tier: 'close'      },
  { code: '17', name: 'Djelfa',               tier: 'south'      },
  { code: '18', name: 'Jijel',                tier: 'north'      },
  { code: '19', name: 'Sétif',               tier: 'major'      },
  { code: '20', name: 'Saïda',               tier: 'north'      },
  { code: '21', name: 'Skikda',               tier: 'major'      },
  { code: '22', name: 'Sidi Bel Abbès',      tier: 'major'      },
  { code: '23', name: 'Annaba',               tier: 'major'      },
  { code: '24', name: 'Guelma',               tier: 'north'      },
  { code: '25', name: 'Constantine',          tier: 'major'      },
  { code: '26', name: 'Médéa',              tier: 'north'      },
  { code: '27', name: 'Mostaganem',           tier: 'north'      },
  { code: '28', name: "M'Sila",              tier: 'south'      },
  { code: '29', name: 'Mascara',              tier: 'north'      },
  { code: '30', name: 'Ouargla',              tier: 'south'      },
  { code: '31', name: 'Oran',                 tier: 'major'      },
  { code: '32', name: 'El Bayadh',            tier: 'south'      },
  { code: '33', name: 'Illizi',               tier: 'south'      },
  { code: '34', name: 'Bordj Bou Arréridj',  tier: 'north'      },
  { code: '35', name: 'Boumerdès',           tier: 'close'      },
  { code: '36', name: 'El Tarf',              tier: 'north'      },
  { code: '37', name: 'Tindouf',              tier: 'south'      },
  { code: '38', name: 'Tissemsilt',           tier: 'north'      },
  { code: '39', name: 'El Oued',              tier: 'south'      },
  { code: '40', name: 'Khenchela',            tier: 'south'      },
  { code: '41', name: 'Souk Ahras',           tier: 'north'      },
  { code: '42', name: 'Tipaza',               tier: 'close'      },
  { code: '43', name: 'Mila',                 tier: 'north'      },
  { code: '44', name: 'Aïn Defla',           tier: 'north'      },
  { code: '45', name: 'Naâma',               tier: 'north'      },
  { code: '46', name: 'Aïn Témouchent',      tier: 'north'      },
  { code: '47', name: 'Ghardaïa',            tier: 'south'      },
  { code: '48', name: 'Relizane',             tier: 'north'      },
  { code: '49', name: 'Timimoun',             tier: 'deep_south' },
  { code: '50', name: 'Bordj Badji Mokhtar', tier: 'deep_south' },
  { code: '51', name: 'Ouled Djellal',        tier: 'deep_south' },
  { code: '52', name: 'Béni Abbès',          tier: 'deep_south' },
  { code: '53', name: 'In Salah',             tier: 'deep_south' },
  { code: '54', name: 'In Guezzam',           tier: 'deep_south' },
  { code: '55', name: 'Touggourt',            tier: 'deep_south' },
  { code: '56', name: 'Djanet',               tier: 'deep_south' },
  { code: '57', name: "El M'Ghair",           tier: 'deep_south' },
  { code: '58', name: 'El Meniaa',            tier: 'deep_south' },
];

/** Lookup map: code → wilaya */
export const WILAYA_BY_CODE = Object.fromEntries(
  ALGERIA_WILAYAS.map(w => [w.code, w])
);

/**
 * Parse wilaya code from strings like "16 - Alger" or "16".
 * Returns zero-padded 2-digit code or null.
 */
export function parseWilayaCode(input: string): string | null {
  if (!input) return null;
  const m = input.match(/^(\d{1,2})/);
  if (!m) return null;
  return m[1].padStart(2, '0');
}

/** Default shipping prices by tier (in DA) */
export const TIER_DEFAULTS = {
  close:      { home: 500,  desk: 350,  min: 1, max: 2 },
  major:      { home: 600,  desk: 400,  min: 1, max: 2 },
  north:      { home: 650,  desk: 450,  min: 2, max: 3 },
  south:      { home: 800,  desk: 600,  min: 3, max: 5 },
  deep_south: { home: 1000, desk: 750,  min: 4, max: 7 },
} as const;
