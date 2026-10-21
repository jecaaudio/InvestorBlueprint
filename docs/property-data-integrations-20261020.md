# Property sources and guarded integration — 20 October 2026

## Status and release boundary

Prepared backend: `supabase/functions/ib-property-data`. It is **not deployed or
connected to the UI**. No provider key or account was created; no billable requests
were made. Provider integration remains disabled until owner setup and live QA.

The handler requires confirmed Supabase Auth and a current approved member profile,
then a durable PostgreSQL reservation BEFORE each upstream call. API keys remain
in server environment only; input cannot override upstream URLs. Responses whitelist
fields and omit owner contact data. Auth headers and provider bodies are not logged.
Errors are redacted. No retries or quota refunds: failures may be billable.

Database budget is disabled with zero calls by default. Explicit actual subscription
period boundaries and remaining free allowance must be verified by the owner. No
automatic renewal. A row lock serializes all reservations across isolates/regions.
Cache is persistent, serves approved members only, and is disabled until retention
rights are confirmed. Expired/disabled budget blocks cached responses as well.

**Cost guarantee scope:** at most the configured reserved attempts through this
proxy. Use a dedicated key/account allocation, account for all prior usage, and do
not reuse its key elsewhere. Requests through other clients, dashboard playground,
or other keys on the same subscription also consume provider allowance and cannot
be prevented by this proxy. Configure a conservative remaining allowance (maximum
50); do not infer it from a calendar month or reset counters blindly.

## Source matrix

| Source | Useful data | Current access assessment | Integration decision |
|---|---|---|---|
| RentCast | Property records, provider value/rent estimates and listing comps | Developer plan includes 50 requests; overages billable | Backend prepared; requires dedicated key, billing-period/allowance verification, license/retention review, live QA |
| Zillow Zestimate API | Current provider valuations | Commercial access request and TOS; approval not assumed | Request packet below; no submission or credentials yet |
| Zillow Public Records / Bridge | Parcel, assessment and transactional county data | Separate access request | Ask specifically for transaction data and display/export rights |
| Zillow Research | Aggregate ZHVI/ZORI and regional market series | Downloadable research data with applicable terms | Regional context; never house-level sold comps |
| LOJIC OpenDataPVA layer 1 | Parcel polygons, PARCELID, PIN, LRSN | Public ArcGIS REST metadata inspected | Parcel enrichment only; layer does not supply price/date of closed sales |
| Jefferson County PVA | Assessments, historical transfers/products depending on requested dataset | Public records request and potential product fees | Request commercial redistribution/API/price/refresh terms; do not buy without approval |
| Jefferson County Clerk | Recorded deeds and land records | Obtain official licensed/public-record workflow | Recorded consideration requires transfer-type/arms-length validation |
| MLS / RESO Web API | Licensed listing and closed-sale fields | MLS grants license and credentials; RESO is a standard, not a data supplier | Broker/MLS approval and sold-data/export rights required |
| Redfin Data Center | Regional housing-market aggregates | Official downloadable datasets and terms | Research context; not permission to scrape listing pages |
| Realtor.com Research | Market aggregates/downloads | Research URL redirected to region-unavailable in this research session | License and current access remain unverified; no scraping API assumed |
| ATTOM | Property/transaction/AVM data products | Official developer trial and commercial products | Existing adapter is scaffold only; licensed endpoints/key and test fixtures required |

### Critical distinction: RentCast AVM comps are listings

Official valuation documentation describes comparables as sale/rental **listings**;
`price` means listed price and `Inactive` does not certify a closed sale. The prepared
handler returns `listingComparables`, leaves `verifiedSoldComparables` empty, labels
the estimate as a current listing-based provider AVM with `postRehab=false`, and
does not invent statistical confidence, property attributes, condition or adjustments.
An AVM and Zillow Zestimate are not substitutes for a post-rehab valuation supported
by verified closed comparables. Nulls stay unknown, never fabricated zero/defaults.

## Zillow access request packet (prepared, NOT submitted)

Official page has Request Access form and instructs requesting access via its help
button; documentation points to Bridge. Fields: Name, Email, Phone, Company, app
description, intended API use and Website. Static success/error strings in page HTML
are not evidence of an actual submitted/approved request.

- App: InvestorBlueprint.
- Website: https://jecaaudio.github.io/InvestorBlueprint/
- Company/contact/email/phone: owner to confirm for external application; do not
  publish private account details in this repository.
- Description: “InvestorBlueprint is an investment analysis platform for property
  acquisition, rental cash flow, financing and seller proceeds. Access requires
  registration and owner approval. We request licensed valuation data with source
  attribution and timestamps, displayed separately from user assumptions.”
- Intended use: “Display current Zestimate/rent estimates as provider context, not
  certified appraisals or post-rehab ARV. Please confirm eligibility, pricing, quotas,
  branding, storage/cache limits, PDF/export permissions, commercial use, and whether
  Bridge Public Records transactions/verified closed-sale data are separately licensed.”
- Owner action: verify contact/legal entity and accept provider terms if acceptable.
  No approval, fee, or contract acceptance has been inferred or executed.

## Activation and rollback

1. Confirm license, dedicated RentCast key, actual billing dates and remaining free
   allowance. Store key only as `RENTCAST_API_KEY` in Edge secrets.
2. Review/apply the guarded-property-data migration; default remains disabled/zero.
3. Deploy the function with JWT gateway validation and `PROPERTY_DATA_ENABLED=false`.
   Verify anon/forged/pending/rejected/suspended denied and approved user works.
4. Owner configures a conservative budget and retention (cache_seconds=0 unless
   allowed), enables backend flag, then tests one controlled live query and checks
   provider dashboard usage. No UI publication until live provenance QA passes.
5. Rollback: disable database budget and backend flag first; remove function or revert
   its deployment. Keep usage counters/history when reverting code. Never reset
   reserved attempts merely to make testing pass.

## Primary sources checked

- https://developers.rentcast.io/reference/billing-and-pricing
- https://developers.rentcast.io/reference/property-valuation
- https://developers.rentcast.io/reference/value-estimate
- https://developers.rentcast.io/reference/security
- https://www.zillowgroup.com/developers/api/zestimate/zestimates-api/
- https://www.zillowgroup.com/developers/api/public-data/public-records-api/
- https://www.zillow.com/research/data/
- https://gis.lojic.org/maps/rest/services/LojicSolutions/OpenDataPVA/MapServer/1?f=pjson
- https://www.lojic.org/services/digital-data/requesting-digital-products
- https://jeffersonpva.ky.gov/forms-tools/request-for-public-records/
- https://www.reso.org/reso-web-api/
- https://www.redfin.com/news/data-center/
- https://www.realtor.com/research/data/ (region redirect observed)
- https://api.developer.attomdata.com/docs
