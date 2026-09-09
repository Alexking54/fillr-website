// Public configuration only. Never put Stripe secret keys in website files.
// Test checkouts only. Review STORE-SETUP.md before enabling real payments.
window.FILLR_SHOP = Object.freeze({
  mode: 'test', // 'disabled', 'test', or 'live'
  paymentLinks: Object.freeze({
    'usb-c': 'https://buy.stripe.com/test_28EdRa4KP9Y14pTcX5gnK00',
    'usb-a': 'https://buy.stripe.com/test_7sYeVe1yDgmpe0t0ajgnK01'
  })
});
