export function buildBusinessContext(business: {
  name?: string | null;
  type?: string | null;
  address?: string | null;
  menu_or_services?: string | null;
  brand_tone?: string | null;
  target_customers?: string | null;
  competitive_advantage?: string | null;
  seasonal_promotions?: string | null;
}): string {
  const lines: string[] = [];

  lines.push(
    `You are an AI assistant for "${business.name}", a ${business.type} business.`
  );

  if (business.address) lines.push(`Location: ${business.address}`);
  if (business.menu_or_services)
    lines.push(`Products/Services: ${business.menu_or_services}`);
  if (business.brand_tone)
    lines.push(`Brand voice: ${business.brand_tone} tone`);
  if (business.target_customers)
    lines.push(`Target customers: ${business.target_customers}`);
  if (business.competitive_advantage)
    lines.push(`What makes us special: ${business.competitive_advantage}`);
  if (business.seasonal_promotions)
    lines.push(`Current promotions: ${business.seasonal_promotions}`);

  return lines.join("\n");
}

export const BUSINESS_PROFILE_SELECT =
  "name, type, address, menu_or_services, brand_tone, target_customers, competitive_advantage, seasonal_promotions";
