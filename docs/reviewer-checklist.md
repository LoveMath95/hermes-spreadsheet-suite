# Reviewer Checklist

Use this checklist while reviewing the hackathon demo.

## Architecture and source isolation

- [ ] Hermes core source was not edited in this repo.
- [ ] New capability lives outside Hermes core in the gateway, contracts, hosts, or `extensions/`.

## Remote execution proof

- [ ] Requests are sent to the gateway and then processed remotely by Hermes.
- [ ] Each assistant response visibly shows `requestId`.
- [ ] Each assistant response visibly shows `hermesRunId`.
- [ ] Each assistant response visibly shows a compact proof/status line.
- [ ] Public trace events are visible without exposing prompts or hidden reasoning.

## MVP flow 1

- [ ] A live spreadsheet selection can be explained or summarized.
- [ ] The UI shows a single `Thinking...` placeholder before the final answer.
- [ ] The final response replaces the placeholder in the same conversation flow.

## MVP flow 2

- [ ] The UI accepts only image attachments for the MVP.
- [ ] An attached screenshot/image shows a thumbnail chip before send.
- [ ] Hermes returns a preview before any write-back.
- [ ] The preview renders `headers` separately above `values` for `sheet_import_plan`.
- [ ] The UI shows the full final `targetRange`, not just an anchor cell.
- [ ] Write-back requires explicit user confirmation.

## Demo/reviewer-safe behavior

- [ ] Demo mode is explicitly labeled as demo in warnings and metadata.
- [ ] Reviewer-safe unavailable mode does not fabricate extracted content.
- [ ] Reviewer-safe unavailable mode does not show a fake import plan.

## Privacy and safety

- [ ] No chain-of-thought is shown.
- [ ] No internal prompts are shown.
- [ ] No secrets or tokens are shown.
- [ ] No raw stack traces are shown in the main UI.
