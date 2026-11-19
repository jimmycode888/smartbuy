const currencies = new Map([
  ['HKD', 'HKD'], ['HK$', 'HKD'], ['港币', 'HKD'], ['港元', 'HKD'],
  ['USD', 'USD'], ['US$', 'USD'], ['美元', 'USD'],
  ['CNY', 'CNY'], ['RMB', 'CNY'], ['人民币', 'CNY'],
]);
const currency = String.raw`(?:\b(?:HKD|USD|CNY|RMB)\b|(?:HK|US)\$|港币|港元|美元|人民币)`;
const amount = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?`;
const price = String.raw`(?:(?<prefix>${currency})\s*)?(?<amount>${amount})(?:\s*(?<suffix>${currency}|元))?`;
const endOfAmount = String.raw`(?![\d]|\.\d|,\s*\d|\s*(?:[-–—~～/至到]|\b(?:to|or)\b)\s*(?:${currency}\s*)?\d|\s*(?:${currency}|克|小时|grams?\b|hours?\b|g\b|\b(?:EUR|GBP|JPY|AUD|CAD|SGD)\b))`;
const explicitBudget = new RegExp(String.raw`(?:\b(?:budget|budet|bugdet)(?:\s+(?:limit|cap))?\b\s*(?:(?:is|to|of|up to|under)\b\s*)?|(?:预算|预算上限|改为|上限)\s*(?:是|到|为)?)\s*[:：=]?\s*${price}${endOfAmount}`, 'i');
const shortBudget = new RegExp(String.raw`^\s*(?:under\s+|up to\s+|最多\s*)?${price}\s*(?:以内|以下)?\s*[.!。！]?\s*$`, 'i');

export function parseBudget(text, state) {
  const input = text.normalize('NFKC');
  const match = explicitBudget.exec(input) || (state.budget == null ? shortBudget.exec(input) : null);
  if (!match) return {};
  const { amount: value, prefix, suffix } = match.groups;
  const first = currencies.get(prefix?.toUpperCase());
  const last = currencies.get(suffix?.toUpperCase());
  if (first && last && first !== last) return {};
  const budget = Number(value.replaceAll(',', ''));
  if (!Number.isFinite(budget) || budget > 100000) return {};
  const unit = first || last;
  return unit ? { budget, currency: unit } : { budget };
}
