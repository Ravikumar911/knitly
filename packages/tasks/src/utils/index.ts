export * from "./emailStorage";

export function buildMerchantBasedGmailSearchQuery() {
  return "from:(swiggy.in OR swiggy.com) newer_than:180d";
}
