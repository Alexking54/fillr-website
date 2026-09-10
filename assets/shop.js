(() => {
  'use strict';
  const form = document.getElementById('purchase-form');
  const button = document.getElementById('checkout-button');
  const status = document.getElementById('checkout-status');
  const selectedVariant = document.getElementById('selected-variant');
  const labels = { 'usb-c': 'USB-C', 'usb-a': 'USB-A' };
  const photos = {
    'usb-c': { studio: '02-fillr-usb-c-to-usb-c.png', car: '04-fillr-connected-car-usb-c.png' },
    'usb-a': { studio: '01-fillr-usb-c-to-usb-a.png', car: '03-fillr-connected-car-usb-a.png' }
  };
  const productImage = document.getElementById('product-image');
  const imageCaption = document.getElementById('product-image-caption');
  const thumbnails = document.querySelectorAll('.gallery-thumbnail');
  let photoView = 'studio';

  function updateGallery(variant) {
    if (!Object.hasOwn(photos, variant)) return;
    const label = labels[variant];
    productImage.src = `assets/products/${photos[variant][photoView]}`;
    productImage.alt = photoView === 'studio'
      ? `Fillr Bluetooth tracker with a USB-C to ${label} cable, studio view`
      : `Fillr Bluetooth tracker connected to a vehicle’s ${label} port`;
    imageCaption.textContent = `${label} · ${photoView === 'studio' ? 'Studio view' : 'In your car'}`;
    thumbnails.forEach((thumbnail) => {
      const view = thumbnail.dataset.view;
      thumbnail.querySelector('img').src = `assets/products/${photos[variant][view]}`;
      thumbnail.setAttribute('aria-pressed', String(view === photoView));
      thumbnail.setAttribute('aria-label', `Show ${label} ${view === 'studio' ? 'studio' : 'in-car'} photo`);
    });
  }

  thumbnails.forEach((thumbnail) => thumbnail.addEventListener('click', () => {
    photoView = thumbnail.dataset.view;
    updateGallery(selection());
  }));
  document.getElementById('year').textContent = new Date().getFullYear();

  function checkoutURL(variant) {
    const config = window.FILLR_SHOP;
    if (!Object.hasOwn(labels, variant) || !config || !['test', 'live'].includes(config.mode)) return null;
    try {
      const url = new URL(config.paymentLinks?.[variant]);
      if (url.protocol !== 'https:' || url.hostname !== 'buy.stripe.com' || url.port || url.username || url.password) return null;
      if (!/^\/(?:test_)?[a-zA-Z0-9]+$/.test(url.pathname) || url.search || url.hash) return null;
      if (url.pathname.startsWith('/test_') !== (config.mode === 'test')) return null;
      return url.href;
    } catch {
      return null;
    }
  }

  function selection() {
    return form.querySelector('input[name="variant"]:checked')?.value;
  }

  function update() {
    const variant = selection();
    updateGallery(variant);
    selectedVariant.textContent = labels[variant] || 'Select a connection';
    const url = checkoutURL(variant);
    button.disabled = !url;
    if (!url) {
      button.textContent = 'Coming soon';
      status.textContent = 'Online ordering opens soon.';
    } else if (window.FILLR_SHOP.mode === 'test') {
      button.textContent = 'Try test checkout';
      status.textContent = 'Test checkout only. No real payment or order will be placed.';
    } else {
      button.textContent = 'Checkout · A$59.99';
      status.textContent = 'Secure checkout with Stripe.';
    }
  }

  form.addEventListener('change', update);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const url = checkoutURL(selection());
    if (url) window.location.assign(url);
    else update();
  });
  window.addEventListener('pageshow', update);
  update();
})();
