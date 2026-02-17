function canIssueRefund(actor, payment) {
  if (actor.role === "admin") return true;
  return actor.id === payment.ownerId;
}

function canSettlePayout(actor) {
  if (actor.role === "admin") return true;
  return actor.permissions.includes("settle:payout");
}

module.exports = {
  canIssueRefund,
  canSettlePayout,
};
