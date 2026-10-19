# InvestorBlueprint — verified calculator audit and remaining limitations

Updated 2026-10-19. Passing arithmetic tests does not certify property values, lender quotes or closing tax rates.

| Calculator | Verified in main | Still requires checking |
| --- | --- | --- |
| Flip | Earnest money treated as purchase credit, not additional acquisition expense; interest/points based on financed principal. Automated numeric checks cover cash deals, explicit/derived loans, break-even, sensitivity, equity and ROI. | Actual draw schedule, capital allocation, closing statements and lender-specific fees |
| Rental Cash Flow | Vacancy-adjusted monthly and annual cash flow example | Mortgage service and reserve budgeting are not automatically included in the simplified model |
| Rent Calculator | Target gross yield after occupancy, annual income, and net after specified expenses | Model net yield separately if that is the investment goal |
| ARV Estimator | Arithmetic average of three comps and screening MAO heuristic | No sqft, date, quality and condition adjustments; not a certified CMA |
| Hard Money | Principal, points and simple annual interest example | Draw timing, compounding and actual lender fees |
| ROI Search | Explicitly simulated opportunity list | Not actual property listings or live ROI data |
| Automated ARV | Demo separated from live worker; report export supports language and notes | Provider must be configured and live-source comparables validated |
| Seller Net | Printable detail/summary, document language, analyst notes and explanation | State/county recording fees, taxes, exemptions and payoff allocation need title/authority verification |

## Access and member account
- Each approved member can use the normal profile route; approved administrators also have an administrative link.
- Member preferences use Supabase RLS restricted to each authenticated member.
- Calculator delivery is gated through Supabase; confirm unauthorized, pending, and approved sessions end to end.
- The repository and prior Git history remain public, not a source-code secrecy boundary.

## Release gates for further improvements
1. Do not change finance formulas without before/after fixtures and deterministic tests.
2. Distinguish earnest deposit, purchase, loan draws, fees, net profit, tax and equity denominator.
3. Validate seller closing rules against authoritative local sources, with jurisdiction and date.
4. Do not pass off demo ARV as real valuation.
5. Test login, account, admin return, and reports on iPhone Safari and desktop.
6. Keep Supabase JECA on Free unless the user expressly approves a different plan.
