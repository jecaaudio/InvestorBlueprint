# InvestorBlueprint — calculator integrity audit (in progress)

Date: 2026-10-19. This document lists only findings confirmed by inspecting source. **It does not certify every formula or state/county tax rule.**

| Calculator | Findings and next acceptance tests | Risk | Status |
| --- | --- | --- | --- |
| Flip (multi-field tool) | `earnestDeposit` currently increases acquisition on top of full purchase price; normally a credit toward purchase, so this may double count it. For hard money, interest uses full purchase price rather than financed principal. Explicit manual loan amount currently combines with percentage loans using `Math.max`, which can produce an unexpected balance. Test earnest closing reconciliation, interest, principal, MAO, financing draws, scenario pricing and ROI denominator. | HIGH | Pending separate finance-model fix |
| Flip (detailed calculator) | `calcFlip` discounts interest on `loanAmount`, but the `downPayment` argument is not used in reported `roi`; distinguish return on cash vs total investment. Verify profit vs leveraged cash ROI before revising UI labels. | HIGH | Pending |
| Rental Cash Flow | Effective rent uses vacancy, expenses include property tax, insurance, maintenance, management; no explicit mortgage service or reserves in this simplified calculation. Ensure outputs do not claim post-debt cash flow. Test 0/100% vacancy, empty fields and year aggregation. | MEDIUM | Basic formula inspected |
| Rent Calculator | Suggested rent meets target **gross** yield after occupancy adjustment; `annualExpenses` affect net income but do not enter target-rent formula. Label correctly or offer net-yield target. Test 0 occupancy and cap yield. | MEDIUM | Basic formula inspected |
| ARV Estimator | Arithmetic average of three comp prices without adjustments for area/condition/date. Treat as basic estimate, not professional CMA. | HIGH | Pending methodology disclosure |
| Hard Money Analyzer | Simple interest on principal plus points; no draw timing or compounding. Verify assumptions and clearly label estimated (not lender quotes). | MEDIUM | Basic formula inspected |
| ROI Search | Six hardcoded fictional/simulated properties, **not real listings**. Preserve prominent DEMO label, no investment recommendations based on these. | HIGH | Source already calls results simulated |
| Automated ARV | Original site silently substituted demo when Worker URL missing and did not publish the fixture. Updated feature branch disables real valuation with missing worker, labels demo explicitly, and deploys fixture. Real worker/provider still needs configuration and real address testing. | HIGH | Fix staged, not yet deployed |
| Seller Net / Calculadora de venta | Calculation has many jurisdiction-specific assumptions and potential unverified local rates; requires fixture validation by state/county and sample title-company closing statements. New feature branch adds document-language control, method note and analyst notes without changing tax formulas. | HIGH | Export improvement staged; financial audit pending |

## Rules for promotion
- Do not change any formula silently without documented before/after and accepted numeric examples.
- Keep real-estate figures distinguished from fabricated demo data.
- Compare Flip purchase-price treatment, earnest/deposit cash application, debt drawn and interest accrual before making ROI claims.
- Test nonzero, zero, negative, missing, and boundary inputs where applicable.
- Seller Net requires an audit of legal sources and effective dates; never infer that every county rate is verified.
- For the profile release, protect member settings with RLS and test account/admin round trips on Safari and desktop.
- Supabase stays on JECA **Free** unless the user explicitly authorizes a paid plan.

## Next functional test matrix
1. Owner: log in → Mi perfil → save ES/EN language and detailed/summary → calculator → Mi perfil → Admin → Mi perfil.
2. Regular member approved: profile and tools available, admin shortcut invisible and direct admin URL denied.
3. Pending, rejected, suspended and signed-out: backend blocks calculator HTML even with direct URL.
4. Export seller settlement with same inputs for detailed vs summary and each language. Confirm notes escaped and correct totals.
5. Export ARV JSON/TXT and copied text in each language. Confirm **DEMO** when using fixture, never present demo as live property.
6. iPhone Safari (including private mode), desktop browsers, logout, token expiry, and password recovery.
