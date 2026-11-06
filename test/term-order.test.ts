import { test } from "node:test";
import assert from "node:assert/strict";
import { filterClaimsByQuery, orderTermsSelectedFirst } from "../src/ui/term-order";

const terms = ["housing", "sensor", "coupling", "switch"];

test("no promoted term keeps the original order and indexes", () => {
  assert.deepEqual(orderTermsSelectedFirst(terms, null).map((entry) => entry.originalIndex), [0, 1, 2, 3]);
});

test("promoted term moves first while others keep relative order and original indexes", () => {
  const ordered = orderTermsSelectedFirst(terms, 2);
  assert.deepEqual(ordered.map((entry) => entry.term), ["coupling", "housing", "sensor", "switch"]);
  assert.deepEqual(ordered.map((entry) => entry.originalIndex), [2, 0, 1, 3]);
});

test("out of range promotion is ignored", () => {
  assert.deepEqual(orderTermsSelectedFirst(terms, 9).map((entry) => entry.originalIndex), [0, 1, 2, 3]);
});

test("input array is never mutated", () => {
  const original = [...terms];
  orderTermsSelectedFirst(terms, 3);
  assert.deepEqual(terms, original);
});

test("claim filter matches numbers and text", () => {
  const claims = [
    { number: 1, text: "An apparatus comprising a housing" },
    { number: 12, text: "The apparatus of claim 1, wherein the coupling" },
    { number: 2, text: "A method of sensing" },
  ];
  assert.deepEqual(filterClaimsByQuery(claims, "1").map((claim) => claim.number), [1, 12]);
  assert.deepEqual(filterClaimsByQuery(claims, "claim 2").map((claim) => claim.number), [2]);
  assert.deepEqual(filterClaimsByQuery(claims, "COUPLING").map((claim) => claim.number), [12]);
  assert.equal(filterClaimsByQuery(claims, "  ").length, 3);
});
