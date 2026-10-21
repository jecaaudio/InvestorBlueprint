#!/usr/bin/env bash
# Disposable CI database only; never run on production.
set -euo pipefail
if [[ "${PGHOST:-}" != 'localhost' || "${PGDATABASE:-}" != 'postgres' ]]; then
  echo 'Requires disposable localhost CI database' >&2
  exit 1
fi
psql -v ON_ERROR_STOP=1 -c "update private.property_provider_budget set enabled=true, max_requests=7, reserved_requests=0, cache_seconds=0, period_start=now()-interval '1 hour', period_end=now()+interval '1 hour';" >/dev/null
ib_results=$(mktemp)
trap 'rm -f "$ib_results"' EXIT
export ib_results
seq 1 40 | xargs -P 8 -I '{}' bash -c 'psql -Atq -v ON_ERROR_STOP=1 -c "set role service_role; select public.ib_claim_property_request(repeat('\''a'\'',64))->>'\''status'\'';" >> "$ib_results"'
python3 - "$ib_results" <<'PY'
import sys
from collections import Counter
counts=Counter(open(sys.argv[1]).read().splitlines())
assert counts == {'reserved':7,'exhausted':33}, counts
print('PASS: 40 concurrent attempts, exactly 7 durable reservations, 33 denied')
PY
