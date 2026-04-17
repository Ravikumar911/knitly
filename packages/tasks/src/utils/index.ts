export * from "./emailStorage";
export * from "./gws-errors";

export function buildMerchantBasedGmailSearchQuery() {
  return "from:(swiggy.in OR swiggy.com) newer_than:180d";
}
