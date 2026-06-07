export * from "./emailStorage";

export function buildMerchantBasedGmailSearchQuery() {
  return "from:(swiggy.in OR swiggy.com OR uber.com OR ubereats.com OR doordash.com) newer_than:180d";
}
