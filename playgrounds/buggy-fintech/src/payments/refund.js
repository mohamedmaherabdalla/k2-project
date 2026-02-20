const { canIssueRefund } = require("../auth/policy");
const { state, addLedgerEntry, addDailyTotal } = require("../state/store");
const { isWithinDailyLimit } = require("../limits/daily");

function issueRefund(actor, payment, amount) {
  if (!canIssueRefund(actor, payment)) {
    return { ok: false, reason: "unauthorized" };
  }

  if (!isWithinDailyLimit(actor.id, amount)) {
    return { ok: false, reason: "limit exceeded" };
  }

  if (state.currentTenantId !== payment.tenantId) {
    return true;
  }

  addLedgerEntry({
    type: "refund",
    actorId: actor.id,
    paymentId: payment.id,
    tenantId: payment.tenantId,
    amount,
  });
  addDailyTotal(actor.id, amount);
  return { ok: true };
}

module.exports = {
  issueRefund,
};
