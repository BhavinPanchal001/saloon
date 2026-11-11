const Decimal = require('decimal.js');
function calculateRedemption({ requested = 0, available = 0, pointValue = 1, minimum = 10, maxPercent = 50, netSales = 0 }) {
  const value = new Decimal(pointValue);
  if (!value.isFinite() || value.lte(0)) return { points: 0, discount: 0 };
  const balance = Math.max(0, Math.floor(Number(available) || 0));
  const cap = Decimal.max(0, new Decimal(netSales)).times(Decimal.min(100, Decimal.max(0, new Decimal(maxPercent)))).div(100);
  const points = Math.min(Math.max(0, Math.floor(Number(requested) || 0)), balance, cap.div(value).floor().toNumber());
  if (balance < Number(minimum) || points < Number(minimum)) return { points: 0, discount: 0 };
  return { points, discount: Number(value.times(points).toFixed(2)) };
}
module.exports = { calculateRedemption };
