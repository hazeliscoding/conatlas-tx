import { describe, expect, it } from 'vitest';
import { REGIONS, type Edition } from '@conatlas/core';
import {
  andList,
  cityPages,
  editionSummary,
  placeDescription,
  postalAddress,
  regionHref,
  slug,
  type Listing,
} from '../src/lib/data.ts';

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

describe('andList', () => {
  it('joins names the way the site writes them', () => {
    expect(andList([])).toBe('');
    expect(andList(['A'])).toBe('A');
    expect(andList(['A', 'B'])).toBe('A and B');
    expect(andList(['A', 'B', 'C'])).toBe('A, B and C');
    expect(andList(['A', 'B', 'C', 'D', 'E'], 3)).toBe('A, B, C and 2 more');
    expect(andList(['A', 'B', 'C', 'D', 'E'], 4)).toBe('A, B, C, D and 1 more');
  });
});

describe('place pages', () => {
  it('keep their published region URLs', () => {
    expect(REGIONS.map(regionHref)).toEqual([
      '/regions/north-texas/',
      '/regions/central-texas/',
      '/regions/gulf-coast/',
      '/regions/south-texas/',
      '/regions/west-texas/',
    ]);
    expect(slug('College Station')).toBe('college-station');
    expect(slug('Peñitas')).toBe('penitas');
  });

  const listing = (title: string, city: string, awaitingNext = false) =>
    ({ title, city, awaitingNext }) as unknown as Listing;

  it('give a city a page once it has three upcoming conventions', () => {
    const pages = cityPages([
      listing('A 2027', 'Houston'),
      listing('B 2027', 'Houston'),
      listing('C 2027', 'Houston'),
      listing('D 2027', 'Austin'),
      listing('E 2027', 'Austin'),
      listing('F 2026', 'Austin', true),
    ]);
    expect([...pages]).toEqual([['Houston', '/cities/houston/']]);
  });

  it('describe a place only from its listings', () => {
    const three = [listing('A 2027', 'X'), listing('B 2027', 'X'), listing('C 2027', 'X')];
    expect(placeDescription('Houston', three)).toBe(
      'We list 3 upcoming Houston anime conventions: A 2027, B 2027 and C 2027. Checked against official sources.',
    );
    expect(placeDescription('South Texas', [three[0]!, listing('Old 2026', 'X', true)])).toBe(
      'We list 1 upcoming South Texas anime convention: A 2027. Checked against official sources.',
    );
    expect(placeDescription('Gulf Coast', [...three, listing('D 2027', 'X')])).toContain(
      'A 2027, B 2027, C 2027 and 1 more.',
    );
    expect(placeDescription('West Texas', [listing('Old 2026', 'X', true)])).toBe(
      "We don't list an upcoming West Texas anime convention yet. Conventions appear here once a maintainer confirms them against an official source.",
    );
  });
});

describe('editionSummary', () => {
  const edition = (fields: Partial<Edition>) =>
    ({
      edition: '2027',
      city: 'Houston',
      status: 'confirmed',
      start_date: '2027-03-05',
      end_date: '2027-03-07',
      venue: { name: 'Hall A' },
      last_verified_at: '2026-10-12',
      ...fields,
    }) as Edition;
  const con = { name: 'Some Con' };
  const checked = 'ConAtlas TX checked these details against official sources on Oct 12, 2026.';

  it('says what, where and when for an upcoming edition, and who runs it when known', () => {
    expect(editionSummary(edition({}), con, '2026-10-13')).toBe(
      `Some Con 2027 is an anime convention in Houston, Texas, on Mar 5–7, 2027, at Hall A. ${checked}`,
    );
    expect(editionSummary(edition({}), { ...con, organizer: 'Org LLC' }, '2026-10-13')).toContain(
      "at Hall A. It's run by Org LLC. ConAtlas",
    );
  });

  it('describes past, cancelled, postponed and undated editions as they are', () => {
    expect(editionSummary(edition({ status: 'completed' }), con, '2027-04-01')).toBe(
      `Some Con 2027 was an anime convention in Houston, Texas, held Mar 5–7, 2027, at Hall A. ${checked}`,
    );
    expect(editionSummary(edition({ status: 'cancelled' }), con, '2026-10-13')).toBe(
      `Some Con 2027, an anime convention in Houston, Texas, planned for Mar 5–7, 2027, at Hall A, was cancelled. ${checked}`,
    );
    expect(editionSummary(edition({ status: 'postponed' }), con, '2026-10-13')).toBe(
      `Some Con 2027, an anime convention in Houston, Texas, is postponed, and new dates haven't been announced. ${checked}`,
    );
    expect(
      editionSummary(
        edition({ status: 'dates_tba', start_date: undefined, end_date: undefined }),
        con,
        '2026-10-13',
      ),
    ).toBe(
      `Some Con 2027 is an anime convention in Houston, Texas. Its dates haven't been announced yet; the venue is Hall A. ${checked}`,
    );
  });
});
