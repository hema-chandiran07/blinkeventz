import { BadRequestException } from '@nestjs/common';
import {
  AREA_TIER_MAP,
  EXPRESS_MIN_HOURS_BY_TIER,
  AreaTier,
} from './express.constants';

export function getMinHoursForExpressByArea(area: string): number {
  const tier = AREA_TIER_MAP[area];

  if (!tier) {
    throw new BadRequestException(
      'Express is not available in this area',
    );
  }

  return EXPRESS_MIN_HOURS_BY_TIER[tier];
}
