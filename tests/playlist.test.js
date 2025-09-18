import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMixingZones } from '../src/calculation.js';
import {
  parsePlaylistInput,
  scoreTracks,
  filterPlaylistEntries,
  buildPlaylistCsv,
  createDefaultFilters,
} from '../src/playlist.js';

function buildTrack(rowNumber, title, artist, bpm, bpmRaw = bpm === null ? '' : String(bpm)) {
  return { rowNumber, title, artist, bpm, bpmRaw };
}

describe('parsePlaylistInput', () => {
  it('parses CSV content with quoted values and decimals', () => {
    const input = ['Title,Artist,BPM', '"Track One","DJ Example",128', 'Track Two,Artist B,130.5'].join('\n');
    const result = parsePlaylistInput(input);

    assert.deepEqual(result.errors, []);
    assert.equal(result.tracks.length, 2);
    assert.equal(result.tracks[0].title, 'Track One');
    assert.equal(result.tracks[0].artist, 'DJ Example');
    assert.equal(result.tracks[0].bpm, 128);
    assert.equal(result.tracks[0].rowNumber, 2);
    assert.equal(result.tracks[1].bpm, 130.5);
  });

  it('detects alternative headers and semicolon delimiters', () => {
    const input = ['Track Title;Artists;Tempo', 'Edge Case;DJ Alias;131'].join('\n');
    const result = parsePlaylistInput(input);

    assert.deepEqual(result.errors, []);
    assert.equal(result.tracks.length, 1);
    assert.equal(result.tracks[0].title, 'Edge Case');
    assert.equal(result.tracks[0].artist, 'DJ Alias');
    assert.equal(result.tracks[0].bpm, 131);
  });
});

describe('scoreTracks', () => {
  const anchor = 133;
  const greenPct = 6;
  const yellowPct = 8;
  const zones = calculateMixingZones(anchor, greenPct, yellowPct);
  const context = { anchor, greenPct, yellowPct, mixingZones: zones };

  it('classifies tracks into yes, edge, no, and invalid buckets', () => {
    const tracks = [
      buildTrack(2, 'Anchor', 'DJ A', 133),
      buildTrack(3, 'Caution', 'DJ B', 122),
      buildTrack(4, 'Outside', 'DJ C', 150),
      buildTrack(5, 'Unknown', 'DJ D', null, ''),
    ];

    const { entries, counts } = scoreTracks(tracks, context);

    assert.equal(entries.length, 4);
    assert.deepEqual(
      entries.map((entry) => entry.status),
      ['yes', 'edge', 'no', 'invalid'],
    );
    assert.equal(counts.yes, 1);
    assert.equal(counts.edge, 1);
    assert.equal(counts.no, 1);
    assert.equal(counts.invalid, 1);

    const yesEntry = entries[0];
    assert.equal(yesEntry.fitsLabel, 'Yes');
    assert.equal(yesEntry.zoneLabel, 'Green');
    assert.equal(yesEntry.deltaBpmLabel, '0 BPM');
    assert.equal(yesEntry.note, 'Within ±6% window — Matches anchor BPM');

    const edgeEntry = entries[1];
    assert.equal(edgeEntry.fitsLabel, 'Edge');
    assert.equal(edgeEntry.zoneLabel, 'Yellow');
    assert.ok(edgeEntry.note.startsWith('Within caution window (±8%)'));

    const noEntry = entries[2];
    assert.equal(noEntry.fitsLabel, 'No');
    assert.equal(noEntry.zoneLabel, 'Red');
    assert.ok(noEntry.note.startsWith('Outside ±8% window'));

    const invalidEntry = entries[3];
    assert.equal(invalidEntry.fitsLabel, '—');
    assert.equal(invalidEntry.zoneLabel, '—');
    assert.equal(invalidEntry.note, 'Missing or invalid BPM');
  });

  it('filters playlist entries based on export toggles', () => {
    const tracks = [
      buildTrack(2, 'Anchor', 'DJ A', 133),
      buildTrack(3, 'Caution', 'DJ B', 122),
      buildTrack(4, 'Outside', 'DJ C', 150),
      buildTrack(5, 'Unknown', 'DJ D', null, ''),
    ];

    const { entries } = scoreTracks(tracks, context);
    const filters = createDefaultFilters();

    let { included, excluded } = filterPlaylistEntries(entries, filters);
    assert.equal(included.length, 2);
    assert.equal(excluded.length, 2);
    assert.ok(included.every((entry) => entry.status === 'yes' || entry.status === 'edge'));

    filters.no = true;
    ({ included, excluded } = filterPlaylistEntries(entries, filters));
    assert.equal(included.length, 3);
    assert.equal(excluded.length, 1);
    assert.ok(excluded.every((entry) => entry.status === 'invalid'));
  });

  it('serialises filtered entries into a Rekordbox friendly CSV', () => {
    const tracks = [
      buildTrack(2, 'Anchor', 'DJ A', 133),
      buildTrack(3, 'Caution', 'DJ B', 122),
      buildTrack(4, 'Outside', 'DJ C', 150),
    ];

    const { entries } = scoreTracks(tracks, context);
    const filters = createDefaultFilters();
    const { included } = filterPlaylistEntries(entries, filters);
    const csv = buildPlaylistCsv(included, anchor);

    const expected = [
      'Title,Artist,BPM,Fits,Zone,Delta (BPM),Delta (%),Notes,Anchor BPM',
      'Anchor,DJ A,133,Yes,Green,0 BPM,0 %,Within ±6% window — Matches anchor BPM,133 BPM',
      'Caution,DJ B,122,Edge,Yellow,-11 BPM,-8.27 %,Within caution window (±8%) — -11 BPM (-8.27 % slower),133 BPM',
    ].join('\r\n');

    assert.equal(csv, expected);
  });
});
