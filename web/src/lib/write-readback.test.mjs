import assert from "node:assert/strict";
import test from "node:test";

import { matchWriteReadBack } from "./write-readback.mjs";

function campaign(overrides = {}) {
  return {
    id: "c0007",
    title: "desk check",
    summary: "not a fundraiser",
    status: "open",
    organizer: "0xcd1dabf73cc80edee8ba664c34a5d636b6e407f9",
    milestones: [],
    ...overrides,
  };
}

function milestone(overrides = {}) {
  return {
    id: "m0004",
    title: "public sentence",
    status: "collecting",
    criteria: ["The page states the sentence."],
    evidence: [],
    reviews: [],
    activeReviewId: "",
    ...overrides,
  };
}

test("a returned milestone id is read back for any campaign id", () => {
  const tree = [campaign({ milestones: [milestone()] })];
  const matched = matchWriteReadBack({
    functionName: "add_milestone",
    args: ["c0007", "public sentence", "The page states the sentence."],
    returnText: "m0004",
    campaigns: tree,
  });
  assert.equal(matched.ok, true);
  assert.equal(matched.record.milestone.id, "m0004");
  const missing = matchWriteReadBack({
    functionName: "add_milestone",
    args: ["c0007", "public sentence", "The page states the sentence."],
    returnText: "",
    campaigns: tree,
  });
  assert.equal(missing.ok, false);
});

test("evidence and review follow their own returned ids", () => {
  const tree = [
    campaign({
      milestones: [
        milestone({
          status: "reviewed",
          activeReviewId: "r0002",
          evidence: [{ id: "e0009", sourceKind: "public_https", locator: "https://example.com/readme", excerpt: "The stored result does not move money." }],
          reviews: [{ id: "r0002", outcome: "uncertain", claimScope: "Not a finding of real-world fact", superseded: false }],
        }),
      ],
    }),
  ];
  assert.equal(
    matchWriteReadBack({
      functionName: "submit_evidence",
      args: ["c0007", "m0004", "public_https", "https://example.com/readme", "The stored result does not move money.", ""],
      returnText: "e0009",
      campaigns: tree,
    }).ok,
    true,
  );
  const review = matchWriteReadBack({
    functionName: "request_review",
    args: ["c0007", "m0004"],
    returnText: "r0002",
    campaigns: tree,
  });
  assert.equal(review.ok, true);
  assert.equal(review.record.review.outcome, "uncertain");
  assert.equal(
    matchWriteReadBack({
      functionName: "request_review",
      args: ["c0007", "m0004"],
      returnText: "r0002",
      campaigns: [campaign({ milestones: [milestone({ status: "locked", evidence: tree[0].milestones[0].evidence })] })],
    }).ok,
    false,
  );
});

test("lock and close are status reads, not a hardcoded record", () => {
  const locked = matchWriteReadBack({
    functionName: "lock_milestone",
    args: ["c0007", "m0004"],
    campaigns: [campaign({ milestones: [milestone({ status: "locked", evidence: [{ id: "e0009" }] })] })],
  });
  assert.equal(locked.ok, true);
  const closed = matchWriteReadBack({
    functionName: "close_campaign",
    args: ["c0008"],
    campaigns: [campaign({ id: "c0008", status: "closed" })],
  });
  assert.equal(closed.ok, true);
  assert.equal(matchWriteReadBack({ functionName: "close_campaign", args: ["c0007"], campaigns: [campaign()] }).ok, false);
});
