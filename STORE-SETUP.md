# Fillr store setup

The static shop remains compatible with the existing GitHub Pages site. Live Stripe Payment Links are connected and accept real payments. No API keys or server are needed for this initial, manually fulfilled store.

## Approved catalogue

| Item | Connection | One-off price |
| --- | --- | --- |
| Fillr Bluetooth Auto Trip Tracker | USB-C | A$59.99 |
| Fillr Bluetooth Auto Trip Tracker | USB-A | A$59.99 |

Australia only. Free shipping for purchases strictly over A$20. Each available item qualifies by itself, so each checkout link must offer A$0 Australian shipping. Shipping for orders of A$20 or less has not been specified; resolve this before adding lower-priced products or discounts. This first version sells one tracker per checkout, with no mixed-variant cart.

The store includes the owner's studio and in-car images for each cable variant, with a gallery that follows the selected variant. The owner supplied the iPhone compatibility, automatic start/stop, day/time scheduling and in-app update details used in the product description. Dispatch estimates and stock counts are pending; do not invent these details.

## Connect Stripe in a sandbox first

1. Create the business's Stripe account at https://dashboard.stripe.com/register. Enter business, identity and banking details directly in Stripe, never in chat or the repository.
2. In Stripe's testing environment, create two distinctly named products: `Fillr Bluetooth Auto Trip Tracker — USB-C` and `Fillr Bluetooth Auto Trip Tracker — USB-A`. Give each a one-time AUD 59.99 price. Separate products ensure the connector type appears in checkout and payment details.
3. Create one Payment Link for each product with quantity fixed at one. Require a shipping address, restrict shipping countries to Australia, and attach a free shipping rate of AUD 0.00. Do not enable adjustable quantities, optional items, or promotional codes in this first version.
4. Use Stripe's hosted confirmation after payment. Do not treat a return-page visit as proof of payment. Set customer support details and receipt settings in Stripe.
5. Put the two public `https://buy.stripe.com/test_…` links into `assets/shop-config.js`, mapped to the matching connector. Change `mode` to `test`. These links are public checkout URLs, not secret keys.
6. Test both variants end to end: correct product/connector, quantity 1, AUD 59.99, Australian addresses only, free shipping, success and declined-payment paths. Confirm the successful test payment and shipping details in the Stripe Dashboard. Confirm the shop clearly labels checkout as a test.

The website validates link format and test/live mode, but cannot verify a link's Stripe product, price, shipping rules or ownership. Verify those in Stripe before enabling checkout. The price displayed on the website is informational; Stripe's configured price is authoritative.

## Live setup — 10 September 2026

The owner confirmed Australian GST registration, A$59.99 inclusive of GST, and dispatch from stock held in Australia. Stripe's Australia registration is configured for immediate collection at 10%, using General - Tangible Goods. The owner approved Stripe Tax Basic's 0.5% transaction fee in addition to payment processing fees.

Both live links have automatic tax enabled, tax included in the price, fixed quantity one, billing and shipping addresses collected, Australia-only delivery and free shipping. Promotions and adjustable quantities are disabled. GST is A$5.45 within the A$59.99 total. No live charge was placed during verification.

- USB-C: https://buy.stripe.com/28EdRa4KP9Y14pTcX5gnK00
- USB-A: https://buy.stripe.com/7sYeVe1yDgmpe0t0ajgnK01
- Shared live shipping rate: `shr_1UDdM7KVcESInf5Y3uJwKzO1`
- Australia tax registration: `taxreg_1UDvW5KVcESInf5YWGzwuhca`

## Ongoing operations

- Add actual stock, product details/photos, dispatch information, returns process and store terms/privacy information as supplied by the owner. Existing app policies have not been rewritten as store policies.
- Keep GST included in the advertised A$59.99 total. Recheck Stripe settings when changing prices, products, discounts or shipping regions.
- Stripe Tax calculates and collects GST; filing remains the owner's responsibility. No automatic filing partner or plan upgrade was purchased.
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

These historical test links were verified in Stripe: one tracker per payment, AUD 59.99, no quantity adjustment or promotions, billing/shipping addresses collected, Australia as the only delivery country, AUD 0 shipping, automatic tax collection off. They are no longer used by the public store.

- USB-C: https://buy.stripe.com/test_28EdRa4KP9Y14pTcX5gnK00
- USB-A: https://buy.stripe.com/test_7sYeVe1yDgmpe0t0ajgnK01
- Shared test shipping rate: `shr_1UDd2kKVcESInf5Y8OU57aMJ`
