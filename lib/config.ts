export const appConfig = {
  productName: 'Lodestar CV',
  checkoutAmountCents: Number(process.env.CHECKOUT_AMOUNT_CENTS || 197),
  checkoutCurrency: process.env.CHECKOUT_CURRENCY || 'usd',
  fallbackOrigin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
};

export function getOrigin(req: Request) {
  const origin = req.headers.get('origin');
  return origin || appConfig.fallbackOrigin;
}
