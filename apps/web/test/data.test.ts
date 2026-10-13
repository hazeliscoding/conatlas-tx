import { describe, expect, it } from 'vitest';
import { postalAddress } from '../src/lib/data.ts';

const at = (address: string | undefined, city: string) =>
  postalAddress({ city, venue: address === undefined ? undefined : { name: 'Venue', address } });
const cityLevel = (city: string) => ({
  '@type': 'PostalAddress',
  addressLocality: city,
  addressRegion: 'TX',
  addressCountry: 'US',
});

describe('postalAddress', () => {
  it('splits a plain street address into street and ZIP', () => {
    expect(at('3401 S I-35 Frontage Rd, Austin, TX 78741', 'Austin')).toEqual({
      ...cityLevel('Austin'),
      streetAddress: '3401 S I-35 Frontage Rd',
      postalCode: '78741',
    });
    expect(at('4545 W. John Carpenter Freeway, Irving, Texas 75063', 'Irving')).toMatchObject({
      streetAddress: '4545 W. John Carpenter Freeway',
      postalCode: '75063',
    });
  });

  it('stays at city level when the address could be split wrong', () => {
    for (const address of [
      undefined,
      '123 Main St, Suite 100, Austin, TX 78701',
      'Fair Park, Dallas, TX 75210',
      '1 Main St, Austin, TX 78701-1234',
      '1 Main St, Austin TX 78701',
      '1 Main St, Austin, TX, USA, 78701',
    ]) {
      expect(at(address, 'Austin'), String(address)).toEqual(cityLevel('Austin'));
    }
    // The address names another city than the edition's.
    expect(at('1201 Houston St, Fort Worth, TX 76102', 'Dallas')).toEqual(cityLevel('Dallas'));
  });
});
