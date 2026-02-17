# Buggy Fintech Playground

This mini repo is intentionally vulnerable for testing Invariant's 5-agent audit pipeline.

## Intended logic flaws

- Cross-file authorization drift between policy checks and tenant state updates.
- Unsafe webhook-driven tenant mutation.
- Unconditional success paths.
- Admin shortcut bypasses without resource scoping.

## Quick use

```bash
cd /Users/mohamed.abdalla/Documents/Spiring26/Hackathons/K2/playgrounds/buggy-fintech
```

Open this folder in VS Code (Extension Development Host) and run Invariant audit.
