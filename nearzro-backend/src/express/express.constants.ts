import { ExpressPlanType } from "@prisma/client";

export enum AreaTier {
  TIER_1 = 'TIER_1',
  TIER_2 = 'TIER_2',
  TIER_3 = 'TIER_3',
  TIER_4 = 'TIER_4',
}



export const AREA_TIER_MAP: Record<string, AreaTier> = {
  // Tier 1
  'Anna Nagar': AreaTier.TIER_1,
  'Nungambakkam': AreaTier.TIER_1,
  'T. Nagar': AreaTier.TIER_1,
  'Alwarpet': AreaTier.TIER_1,
  'Mylapore': AreaTier.TIER_1,
  'Adyar': AreaTier.TIER_1,
  'Besant Nagar': AreaTier.TIER_1,
  'Thiruvanmiyur': AreaTier.TIER_1,
  'ECR': AreaTier.TIER_1,
  'OMR Prime (Perungudi, Thoraipakkam, Sholinganallur)': AreaTier.TIER_1,
  'Velachery': AreaTier.TIER_1,
  'Kilpauk': AreaTier.TIER_1,
  'RA Puram': AreaTier.TIER_1,
  'Kotturpuram': AreaTier.TIER_1,

  // Tier 2
  'Porur': AreaTier.TIER_2,
  'Mogappair': AreaTier.TIER_2,
  'Ambattur': AreaTier.TIER_2,
  'Medavakkam': AreaTier.TIER_2,
  'Madipakkam': AreaTier.TIER_2,
  'Pallikaranai': AreaTier.TIER_2,
  'Chromepet': AreaTier.TIER_2,
  'Tambaram': AreaTier.TIER_2,
  'Pallavaram': AreaTier.TIER_2,
  'OMR Secondary (Karapakkam, Semmancheri, Navalur)': AreaTier.TIER_2,
  'Koyambedu': AreaTier.TIER_2,
  'Iyyapanthangal': AreaTier.TIER_2,
  'Poonamallee': AreaTier.TIER_2,
  'Annanur': AreaTier.TIER_2,
  'Vanagaram': AreaTier.TIER_2,


  // Tier 3
  'Avadi': AreaTier.TIER_3,
  'Ambattur OT': AreaTier.TIER_3,
  'Red Hills': AreaTier.TIER_3,
  'Perungalathur': AreaTier.TIER_3,
  'Vandalur': AreaTier.TIER_3,
  'Kelambakkam': AreaTier.TIER_3,
  'Guduvanchery': AreaTier.TIER_3,
  'Urapakkam': AreaTier.TIER_3,
  'Manivakkam': AreaTier.TIER_3,
  'Thirumullaivoyal': AreaTier.TIER_3,
  'Kolathur': AreaTier.TIER_3,
  'Perambur': AreaTier.TIER_3,
  'Villivakkam': AreaTier.TIER_3,

  // Tier 4
  'Ennore outskirts (Ennore, Nettukupam, Manali, Athipattu, Minjur)': AreaTier.TIER_4,
  'Tiruvallur outskirts': AreaTier.TIER_4,
  'Sripeerumbudur': AreaTier.TIER_4,
  'Maraimalai Nagar': AreaTier.TIER_4,
  'Chengalpattu': AreaTier.TIER_4,
  'Oragadam': AreaTier.TIER_4,
  'Thirumazhisai': AreaTier.TIER_4,
  'Redhills outer belt': AreaTier.TIER_4,
  'Gummidipoondi': AreaTier.TIER_4,
};
/**
 * Minimum booking hours BEFORE event time
 */
export const EXPRESS_MIN_HOURS_BY_TIER: Record<AreaTier, number> = {
  [AreaTier.TIER_1]: 1, // city centre
  [AreaTier.TIER_2]: 1,
  [AreaTier.TIER_3]: 2,
  [AreaTier.TIER_4]: 2,
};
 
export const EXPRESS_PAID_ENABLED = false;

export const EXPRESS_BASE_FEE: Record<ExpressPlanType, number> = {
  FIXED: 50000,
  CUSTOMIZED: 80000,
};

export const EXPRESS_SLA_HOURS = 1;

