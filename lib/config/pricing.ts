export const PRICING_CONFIG = {
  displayOriginalPrice: true,
  basicOriginalCny: 9.9,
  advancedAddonOriginalCny: 6.9,
  bundleOriginalCny: 14.9,
  testModeZeroPrice: true
} as const;

export function getDisplayPriceCents(productType: "basic" | "advanced"): number {
  if (PRICING_CONFIG.testModeZeroPrice) return 0;
  return productType === "basic"
    ? Math.round(PRICING_CONFIG.basicOriginalCny * 100)
    : Math.round(PRICING_CONFIG.advancedAddonOriginalCny * 100);
}
