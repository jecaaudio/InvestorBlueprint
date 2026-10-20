# Verified Pages publication — 20 October 2026

Tracking #88. Existing Pages workflow deployed on every main push, independently of
Quality, so a future failing change could publish before tests finished.

Changed trigger to completed Quality runs on main. Gate independently checks current
main SHA, trusted repository, push event, successful Quality and its exact candidate
SHA. Manual dispatch must pass the same checks. PR/fork, stale, missing, canceled,
failed and in-progress runs are denied. Latest failed rerun overrides earlier success.
Main is checked again before artifact publication.

Generated `/build-info.json` records the checked commit and build timestamp so the
published version can be verified externally. This contains no credentials/user data.

Six policy regressions plus baseline site tests pass. Actions must pass on the exact
candidate before merging; then verify Quality precedes deployment and published
build-info matches main. No calculator/user-data changes. Rollback: revert workflow
commit after review; emergency deployment must still use a previously verified tree.

Official references consulted:
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run
- https://docs.github.com/en/rest/actions/workflow-runs#list-workflow-runs-for-a-workflow
