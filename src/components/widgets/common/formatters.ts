export function formatCurrency(amount: number, symbol = '$'): string {
  const isNeg = amount < 0;
  const abs = Math.abs(amount);
  const formatted = abs >= 1000 
    ? abs.toLocaleString('en-US', { maximumFractionDigits: 0 }) 
    : abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${isNeg ? '-' : ''}${symbol}${formatted}`;
}

export function formatCompactCurrency(amount: number, symbol = '$'): string {
  const isNeg = amount < 0;
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${isNeg ? '-' : ''}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${isNeg ? '-' : ''}${symbol}${(abs / 1_000).toFixed(1)}k`;
  return `${isNeg ? '-' : ''}${symbol}${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

