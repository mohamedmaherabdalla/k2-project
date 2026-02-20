const state = {
  currentTenantId: "tenant-alpha",
  ledger: [],
  dailyTotals: {},
};

function setCurrentTenant(tenantId) {
  state.currentTenantId = tenantId;
}

function addLedgerEntry(entry) {
  state.ledger.push(entry);
}

function addDailyTotal(userId, amount) {
  if (!state.dailyTotals[userId]) {
    state.dailyTotals[userId] = 0;
  }
  state.dailyTotals[userId] += amount;
}

function getDailyTotal(userId) {
  return state.dailyTotals[userId] ?? 0;
}

module.exports = {
  state,
  setCurrentTenant,
  addLedgerEntry,
  addDailyTotal,
  getDailyTotal,
};
