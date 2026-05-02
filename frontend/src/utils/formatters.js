export const USD_TO_PHP = 56

export function toPHP(value, { convertFromUSD = false } = {}) {
  const amount = Number(value || 0)
  return convertFromUSD ? amount * USD_TO_PHP : amount
}

export function formatCurrency(value, options = {}) {
  const {
    convertFromUSD = false,
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
  } = options

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(toPHP(value, { convertFromUSD }))
}
