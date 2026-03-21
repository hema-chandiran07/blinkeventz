import { BadRequestException } from '@nestjs/common';
import { getMinHoursForExpressByArea } from './express.rules';

describe('ExpressRules', () => {
  describe('getMinHoursForExpressByArea', () => {
    describe('TIER_1 areas (1 hour minimum)', () => {
      const tier1Areas = [
        'Anna Nagar',
        'Nungambakkam',
        'T. Nagar',
        'Alwarpet',
        'Mylapore',
        'Adyar',
        'Besant Nagar',
        'Thiruvanmiyur',
        'ECR',
        'OMR Prime (Perungudi, Thoraipakkam, Sholinganallur)',
        'Velachery',
        'Kilpauk',
        'RA Puram',
        'Kotturpuram',
      ];

      tier1Areas.forEach((area) => {
        it(`should return 1 for TIER_1 area: ${area}`, () => {
          const result = getMinHoursForExpressByArea(area);
          expect(result).toBe(1);
        });
      });
    });

    describe('TIER_2 areas (1 hour minimum)', () => {
      const tier2Areas = [
        'Porur',
        'Mogappair',
        'Ambattur',
        'Medavakkam',
        'Madipakkam',
        'Pallikaranai',
        'Chromepet',
        'Tambaram',
        'Pallavaram',
        'OMR Secondary (Karapakkam, Semmancheri, Navalur)',
        'Koyambedu',
        'Iyyapanthangal',
        'Poonamallee',
        'Annanur',
        'Vanagaram',
      ];

      tier2Areas.forEach((area) => {
        it(`should return 1 for TIER_2 area: ${area}`, () => {
          const result = getMinHoursForExpressByArea(area);
          expect(result).toBe(1);
        });
      });
    });

    describe('TIER_3 areas (2 hours minimum)', () => {
      const tier3Areas = [
        'Avadi',
        'Ambattur OT',
        'Red Hills',
        'Perungalathur',
        'Vandalur',
        'Kelambakkam',
        'Guduvanchery',
        'Urapakkam',
        'Manivakkam',
        'Thirumullaivoyal',
        'Kolathur',
        'Perambur',
        'Villivakkam',
      ];

      tier3Areas.forEach((area) => {
        it(`should return 2 for TIER_3 area: ${area}`, () => {
          const result = getMinHoursForExpressByArea(area);
          expect(result).toBe(2);
        });
      });
    });

    describe('TIER_4 areas (2 hours minimum)', () => {
      const tier4Areas = [
        'Ennore outskirts (Ennore, Nettukupam, Manali, Athipattu, Minjur)',
        'Tiruvallur outskirts',
        'Sripeerumbudur',
        'Maraimalai Nagar',
        'Chengalpattu',
        'Oragadam',
        'Thirumazhisai',
        'Redhills outer belt',
        'Gummidipoondi',
      ];

      tier4Areas.forEach((area) => {
        it(`should return 2 for TIER_4 area: ${area}`, () => {
          const result = getMinHoursForExpressByArea(area);
          expect(result).toBe(2);
        });
      });
    });

    describe('error cases', () => {
      it('should throw BadRequestException for unknown area', () => {
        expect(() => getMinHoursForExpressByArea('Unknown Area')).toThrow(
          BadRequestException,
        );
      });

      it('should throw BadRequestException for empty area', () => {
        expect(() => getMinHoursForExpressByArea('')).toThrow(
          BadRequestException,
        );
      });

      it('should throw BadRequestException for area not in tier map', () => {
        expect(() => getMinHoursForExpressByArea('Fake City')).toThrow(
          BadRequestException,
        );
      });

      it('should throw the correct error message', () => {
        try {
          getMinHoursForExpressByArea('Unknown Area');
          fail('Expected BadRequestException to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect(error.message).toBe('Express is not available in this area');
        }
      });
    });
  });
});
