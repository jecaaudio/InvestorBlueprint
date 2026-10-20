# Isolated authenticated review preview

Tracking #88; candidate #95 remains unmerged. Real owner sign-in, profile save,
reload persistence, restoration of original preferences and admin navigation were
observed in the browser. The original production calculators remain on the older
assets, so those checks cannot certify the complete candidate UI.

This change adds a review copy under `review-291a788/` from the immutable candidate
`291a7888dd9e902c28379e0c579a3389bad9d783`. Root production files are assembled by
the existing allowlist, then the preview is added beneath a separate directory.
The existing exact-current-main Quality and stale-build gates remain in place.
All four candidate workflows must also be completed successfully for that SHA.

The preview keeps authenticated calculator wrappers. Its loader uses a separately
deployed `ib-review-tools` function with the existing verified-user/approved-profile
checks and the prepared Illinois HTML patch. The production `ib-protected-tools`
function is unchanged. Preview preferences use the same per-member RLS-protected
records; do not approve/suspend real users or alter credentials for QA.

No server source, docs, dependency files, credentials, provider keys or private
calculator HTML are copied into the public review directory. Review pages have
noindex,nofollow metadata. No paid provider or real valuation feed is enabled.

Validation: preview builder verifies the pinned SHA and wrapper contracts before
writing. Its tests check that production root bytes are preserved, sensitive
project/server directories are excluded, preview requests use the separate guarded
function, and unknown sources/public calculator HTML fail closed. Full root CI
must pass before merging this infrastructure change.

Rollback: revert this infrastructure commit and let the gated Pages deployment
remove the review path. Stop using the preview function; preserve production user
preferences and all original server source. Do not treat preview publication as a
release or a completion claim for the eight calculators/integrations.
