import test from 'node:test';
import assert from 'node:assert/strict';
import { detectExpiredNotice, evaluateTenderNotice } from '../js/tenders/services/tender-relevance-service.js';
import {
  fixtureFlockungsmittelHigh,
  fixtureKlaeranlageHigh,
  fixturePumpeMedium,
  fixtureIrrelevant,
  fixtureUnknownExecutionRegion
} from './fixtures/tender-notice-fixtures.js';

test('scores highly relevant flocculant tender as HIGH', () => {
  const result = evaluateTenderNotice(fixtureFlockungsmittelHigh);
  assert.equal(result.relevanceLevel, 'HIGH');
  assert.ok(result.score >= 75);
  assert.ok(result.matchReasons.length > 0);
});

test('scores plant optimization tender as HIGH', () => {
  const result = evaluateTenderNotice(fixtureKlaeranlageHigh);
  assert.equal(result.relevanceLevel, 'HIGH');
});

test('pump tender is typically medium relevance', () => {
  const result = evaluateTenderNotice(fixturePumpeMedium);
  assert.ok(result.score >= 25);
  assert.ok(result.relevanceLevel === 'MEDIUM' || result.relevanceLevel === 'LOW');
});

test('irrelevant tender is downgraded by negative terms', () => {
  const result = evaluateTenderNotice(fixtureIrrelevant);
  assert.equal(result.relevanceLevel, 'IRRELEVANT');
  assert.ok(result.score <= 24);
});

test('cpv match increases score', () => {
  const noCpv = evaluateTenderNotice({ ...fixtureFlockungsmittelHigh, mainCpvCode: '00000000', additionalCpvCodes: [] });
  const withCpv = evaluateTenderNotice(fixtureFlockungsmittelHigh);
  assert.ok(withCpv.score > noCpv.score);
});

test('title keywords weigh stronger than description keywords', () => {
  const titleHeavy = evaluateTenderNotice({
    ...fixturePumpeMedium,
    title: 'TESTDATEN: Klaeranlage Faellmittel Dosierstation',
    description: 'TESTDATEN: neutraler Text ohne tieferen Bezug'
  });
  const descriptionHeavy = evaluateTenderNotice({
    ...fixturePumpeMedium,
    title: 'TESTDATEN: Allgemeine Leistungen',
    description: 'TESTDATEN: Klaeranlage Faellmittel Dosierstation Polymer Schlammentwaesserung'
  });
  assert.ok(titleHeavy.score >= descriptionHeavy.score);
});

test('unknown execution region is not auto-excluded', () => {
  const result = evaluateTenderNotice(fixtureUnknownExecutionRegion);
  assert.notEqual(result.relevanceLevel, 'IRRELEVANT');
  assert.equal(result.regionMatched, null);
});

test('expired detection works', () => {
  const expired = detectExpiredNotice({ submissionDeadline: '2020-01-01T00:00:00.000Z' });
  const active = detectExpiredNotice({ submissionDeadline: '2099-01-01T00:00:00.000Z' });
  assert.equal(expired, true);
  assert.equal(active, false);
});
