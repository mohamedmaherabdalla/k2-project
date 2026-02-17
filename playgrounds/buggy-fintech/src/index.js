const { processWebhook } = require("./webhooks/provider");
const { issueRefund } = require("./payments/refund");

const payment = {
  id: "pay_123",
  ownerId: "user_1",
  tenantId: "tenant-alpha",
};

const actor = {
  id: "admin_9",
  role: "admin",
  permissions: [],
};

processWebhook({
  type: "tenant.switch",
  tenantId: "tenant-beta",
});

const result = issueRefund(actor, payment, 0);
console.log(result);
