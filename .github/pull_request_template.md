## PR Type

- [ ] Feature
- [ ] Fix
- [ ] Docs
- [ ] Refactor / Chore
- [ ] Test-only

## Summary

Describe the change in 2-5 bullets.

- 

## Why

What problem, gap, or capability change does this PR address?

## Hermes-Centered Impact

Explain the product impact in Hermes terms.

- Does this add or change a first-class capability family?
- Does it harden a contract, approval, completion, or execution boundary?
- Does it reduce host/gateway drift?

## Scope

Check every layer touched by this PR.

- [ ] Contracts
- [ ] Gateway prompt/routing
- [ ] Structured-body normalization
- [ ] Gateway writeback / execution control
- [ ] Shared client
- [ ] Excel host
- [ ] Google Sheets host
- [ ] Docs only

## Host Behavior

State the host support result clearly.

| Surface | Excel | Google Sheets |
| --- | --- | --- |
| Preview |  |  |
| Execute |  |  |
| Unsupported / fail-closed notes |  |  |

## Testing

List exact commands you ran.

```bash
# focused
```

```bash
# full
```

Results:

- 

## Screenshots or Demo Notes

If the PR changes visible behavior, add screenshots, preview text, or a short demo note.

## Risks

Call out any remaining caveat, partial parity, preview-only behavior, or rollout concern.

## Checklist

- [ ] The change is capability-first, not a one-off prompt patch
- [ ] Unsupported hosts fail closed or remain preview-only clearly
- [ ] Approval/completion semantics are still exact-safe
- [ ] Relevant tests were added or updated
- [ ] `README.md` / docs were updated if user-facing behavior changed
