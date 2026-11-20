/** Match a finalized write to the records read back afterwards. No network. */

const REVIEW_OUTCOMES = new Set(["supports", "does_not_support", "insufficient_evidence", "uncertain"]);

function lines(value) {
  return String(value ?? "")
    .replaceAll("\t", " ")
    .replaceAll("\r", "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function storedText(value) {
  return String(value ?? "").replaceAll("\t", " ").replaceAll("\r", "").trim();
}

function findCampaign(campaigns, id) {
  return campaigns.find((campaign) => campaign.id === id) ?? null;
}

function findMilestone(campaign, id) {
  return campaign?.milestones?.find((milestone) => milestone.id === id) ?? null;
}

function fail(reason) {
  return { ok: false, reason, record: null };
}

function pass(reason, record) {
  return { ok: true, reason, record };
}

/**
 * @param {{ functionName?: string, args?: unknown[], returnText?: string, campaigns?: any[] }} [input]
 */
export function matchWriteReadBack({ functionName, args = [], returnText = "", campaigns = [] } = {}) {
  const returned = String(returnText ?? "").replace(/^"|"$/g, "");
  const list = Array.isArray(campaigns) ? campaigns : [];
  if (functionName === "create_campaign") {
    const title = storedText(args[0]);
    const campaign = list.find((item) => item.id === returned);
    if (!returned || !campaign || storedText(campaign.title) !== title) {
      return fail("create_campaign return was not read back");
    }
    return pass(`read-back ${campaign.id} / ${campaign.title} / ${campaign.status}`, { campaign });
  }
  if (functionName === "add_milestone") {
    const campaign = findCampaign(list, args[0]);
    const milestone = findMilestone(campaign, returned);
    const expected = lines(args[2]);
    if (!returned || !milestone || storedText(milestone.title) !== storedText(args[1])) {
      return fail("add_milestone return was not read back");
    }
    if (expected.join("\n") !== (milestone.criteria ?? []).join("\n") || milestone.status !== "collecting") {
      return fail("add_milestone read-back does not match the submitted milestone");
    }
    return pass(`read-back ${milestone.id} / ${milestone.status}`, { campaign, milestone });
  }
  if (functionName === "update_criteria") {
    const campaign = findCampaign(list, args[0]);
    const milestone = findMilestone(campaign, args[1]);
    const expected = lines(args[2]);
    if (!milestone || milestone.status !== "collecting" || (milestone.evidence ?? []).length !== 0) {
      return fail("update_criteria read-back is not a collecting milestone without evidence");
    }
    if (expected.join("\n") !== (milestone.criteria ?? []).join("\n")) return fail("update_criteria was not read back");
    return pass(`read-back ${milestone.id} / criteria ${expected.length}`, { campaign, milestone });
  }
  if (functionName === "close_campaign") {
    const campaign = findCampaign(list, args[0]);
    if (!campaign || campaign.status !== "closed") return fail("close_campaign was not read back");
    return pass(`read-back ${campaign.id} / closed`, { campaign });
  }
  if (functionName === "submit_evidence") {
    const campaign = findCampaign(list, args[0]);
    const milestone = findMilestone(campaign, args[1]);
    const evidence = milestone?.evidence?.find((item) => item.id === returned);
    if (!returned || !evidence) return fail("submit_evidence return was not read back");
    if (evidence.sourceKind !== args[2] || storedText(evidence.locator) !== storedText(args[3]) || storedText(evidence.excerpt) !== storedText(args[4])) {
      return fail("submit_evidence read-back does not match the submission");
    }
    return pass(`read-back ${evidence.id} / ${evidence.sourceKind}`, { campaign, milestone, evidence });
  }
  if (functionName === "lock_milestone") {
    const campaign = findCampaign(list, args[0]);
    const milestone = findMilestone(campaign, args[1]);
    if (!milestone || milestone.status !== "locked" || (milestone.evidence ?? []).length === 0) {
      return fail("lock_milestone was not read back");
    }
    return pass(`read-back ${milestone.id} / locked`, { campaign, milestone });
  }
  if (functionName === "request_review") {
    const campaign = findCampaign(list, args[0]);
    const milestone = findMilestone(campaign, args[1]);
    const review = milestone?.reviews?.find((item) => item.id === returned);
    if (!returned || !review || milestone.status !== "reviewed" || milestone.activeReviewId !== returned) {
      return fail("request_review return was not read back");
    }
    if (!REVIEW_OUTCOMES.has(review.outcome) || !review.claimScope) return fail("request_review read-back has no policy outcome");
    return pass(`read-back ${review.id} / ${review.outcome}`, { campaign, milestone, review });
  }
  if (functionName === "reopen_milestone") {
    const campaign = findCampaign(list, args[0]);
    const milestone = findMilestone(campaign, args[1]);
    const superseded = milestone?.reviews?.some((item) => item.superseded);
    if (!milestone || milestone.status !== "collecting" || milestone.activeReviewId || !superseded) {
      return fail("reopen_milestone was not read back");
    }
    return pass(`read-back ${milestone.id} / collecting`, { campaign, milestone });
  }
  return fail("this call has no read-back check");
}
