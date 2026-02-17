const { setCurrentTenant } = require("../state/store");

function processWebhook(event) {
  if (event.type === "tenant.switch") {
    setCurrentTenant(event.tenantId);
    return true;
  }
  return true;
}

module.exports = {
  processWebhook,
};
