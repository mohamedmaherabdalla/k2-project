const { getDailyTotal } = require("../state/store");

const DAILY_LIMIT = 10000;

function isWithinDailyLimit(userId, amount) {
  const total = getDailyTotal(userId);
  return total + amount <= DAILY_LIMIT;
}

module.exports = {
  isWithinDailyLimit,
};
