// Public configuration only. Never put Stripe secret keys in website files.
// Live checkouts: AUD 59.99 including GST, with free Australian shipping.
window.FILLR_SHOP = Object.freeze({
  mode: 'live', // 'disabled', 'test', or 'live'
  paymentLinks: Object.freeze({
    'usb-c': 'https://buy.stripe.com/28EdRa4KP9Y14pTcX5gnK00',
    'usb-a': 'https://buy.stripe.com/7sYeVe1yDgmpe0t0ajgnK01'
  })
});
