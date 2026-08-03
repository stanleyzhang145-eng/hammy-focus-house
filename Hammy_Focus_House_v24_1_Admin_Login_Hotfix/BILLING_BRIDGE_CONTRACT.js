// premium.js expects a native bridge with this shape.
window.HammyBilling = {
  purchase: async ({ productId }) => ({ verified: false, cancelled: false }),
  restore: async ({ productId }) => ({ verified: false })
};

// Return verified:true only after StoreKit or Google Play verifies the purchase.
// Never unlock Premium merely because a button was pressed.
