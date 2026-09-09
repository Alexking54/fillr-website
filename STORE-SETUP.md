# Fillr store setup

The static shop remains compatible with the existing GitHub Pages site. Stripe test Payment Links are connected; checkout is explicitly in test mode. No live checkout links have been created. No API keys or server are needed for this initial, manually fulfilled store.

## Approved catalogue

| Item | Connection | One-off price |
| --- | --- | --- |
| Fillr Bluetooth Auto Trip Tracker | USB-C | A$59.99 |
| Fillr Bluetooth Auto Trip Tracker | USB-A | A$59.99 |

Australia only. Free shipping for purchases strictly over A$20. Each available item qualifies by itself, so each checkout link must offer A$0 Australian shipping. Shipping for orders of A$20 or less has not been specified; resolve this before adding lower-priced products or discounts. This first version sells one tracker per checkout, with no mixed-variant cart.

Photos, detailed descriptions, compatibility, dispatch estimates and stock counts are pending. Do not invent these details. The draft intentionally has no simulated product photograph.

## Connect Stripe in a sandbox first

1. Create the business's Stripe account at https://dashboard.stripe.com/register. Enter business, identity and banking details directly in Stripe, never in chat or the repository.
2. In Stripe's testing environment, create two distinctly named products: `Fillr Bluetooth Auto Trip Tracker — USB-C` and `Fillr Bluetooth Auto Trip Tracker — USB-A`. Give each a one-time AUD 59.99 price. Separate products ensure the connector type appears in checkout and payment details.
3. Create one Payment Link for each product with quantity fixed at one. Require a shipping address, restrict shipping countries to Australia, and attach a free shipping rate of AUD 0.00. Do not enable adjustable quantities, optional items, or promotional codes in this first version.
4. Use Stripe's hosted confirmation after payment. Do not treat a return-page visit as proof of payment. Set customer support details and receipt settings in Stripe.
5. Put the two public `https://buy.stripe.com/test_…` links into `assets/shop-config.js`, mapped to the matching connector. Change `mode` to `test`. These links are public checkout URLs, not secret keys.
6. Test both variants end to end: correct product/connector, quantity 1, AUD 59.99, Australian addresses only, free shipping, success and declined-payment paths. Confirm the successful test payment and shipping details in the Stripe Dashboard. Confirm the shop clearly labels checkout as a test.

The website validates link format and test/live mode, but cannot verify a link's Stripe product, price, shipping rules or ownership. Verify those in Stripe before enabling checkout. The price displayed on the website is informational; Stripe's configured price is authoritative.

## Before real orders

- Complete Stripe account activation. Confirm actual stock, product details/photos, dispatch information, returns process and store terms/privacy information with the owner. Existing app policies have not been rewritten as store policies.
- Confirm the intended treatment of tax with the owner before configuring it. Do not silently add tax above the advertised A$59.99 total or claim GST is included without confirmation.
- Create corresponding live products and Payment Links with the same verified settings. Replace both test URLs, then explicitly set `mode` to `live` only when ready to launch.
- Verify live checkout details for both variants before publishing. Do not place a real charge without authorization.
- For every order, check successful payment in Stripe, connector type and shipping address before dispatch. Track fulfilment and shipment tracking separately; this draft does not implement inventory, shipping labels, an order-status dashboard or fulfilment automation. Configure payment notifications and customer receipts in Stripe.

Keep checkout disabled with `mode: 'disabled'` whenever necessary. To stop sales already accessible via shared Payment Links, also deactivate those links in Stripe; hiding a website button does not disable a public checkout link.

## Files and preview

- `store.html`: catalogue, variant selection and order summary; add real images and approved copy in `.product-details`.
- `assets/shop.css`: responsive styling extending the existing Fillr theme.
- `assets/shop-config.js`: public links and explicit checkout mode.
- `assets/shop.js`: connector selection and guarded redirect to Stripe.
- `index.html`: Store navigation link.

There is no build step or dependency installation. Serve the website locally with `python3 -m http.server 8765 --bind 127.0.0.1` and visit `/store.html`. Publish using the existing GitHub Pages workflow when approved.

## Stripe references

- https://docs.stripe.com/payment-links/create
- https://docs.stripe.com/payment-links/customize
- https://docs.stripe.com/checkout/fulfillment

## Connected testing environment — 9 September 2026

Both links are verified in Stripe: one tracker per payment, AUD 59.99, no quantity adjustment or promotions, billing/shipping addresses collected, Australia as the only delivery country, AUD 0 shipping, automatic tax collection off. Tax treatment must be confirmed before live setup.

- USB-C: https://buy.stripe.com/test_28EdRa4KP9Y14pTcX5gnK00
- USB-A: https://buy.stripe.com/test_7sYeVe1yDgmpe0t0ajgnK01
- Shared test shipping rate: `shr_1UDd2kKVcESInf5Y8OU57aMJ`
