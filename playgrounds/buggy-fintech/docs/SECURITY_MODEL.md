# Security Model (Expected)

- Refunds must be tenant-scoped and owner-scoped.
- Webhooks must be verified before mutating state.
- Daily limits must reject zero and negative values.
- Role checks alone are not sufficient for high-risk actions.
