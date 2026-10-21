/* Paid plans. Leave enabled:false until Stripe is set up (docs/billing-setup.md).
 * Payment Links come from the Stripe dashboard; never put secret keys here. */
window.IB_BILLING=Object.freeze({
  enabled:false,
  trialDays:7,
  prices:{proMonthly:19,proYearly:190},
  links:{proMonthly:'',proYearly:''},
  customerPortal:''
});
