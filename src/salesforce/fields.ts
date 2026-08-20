/**
 * Salesforce field labels used by the dashboard.
 *
 * The org's custom-field API names still need to be verified by an admin. These
 * labels are intentionally kept in one browser-safe module so no data or UI
 * module needs to repeat a raw Salesforce field string.
 */
export const SF_FIELDS = {
  id: "Id",
  stage: "Stage",
  presalesStage: "Presales Stage",
  leadSalesEngineer: "Lead Sales Engineer",
  dealSize: "Deal Size",
  netBuArr: "Net BU ARR",
  splitAmount: "Split Amount",
  ownerName: "Owner",
  type: "Type",
  closeDate: "Close Date",
  createdDate: "Created Date",
  businessDrivers: "Business Drivers",
  whyDoAnything: "Why Do Anything?",
  npiUseCase: "NPI Use Case",
  name: "Opportunity Name",
  splitOwnerSalesSegment: "Split Owner - User Sales Segment",
  ownerGeoSegment: "Owner Geo-Seg",
  technicalWinDate: "Technical Win Date",
  lastActivityDate: "Last Activity Date",
  lastStageChangeDate: "Last Stage Change Date",
  productLine: "Product Line",
  region: "Region",
} as const;

export type SalesforceOpportunityFieldName =
  (typeof SF_FIELDS)[keyof typeof SF_FIELDS];

export const SALESFORCE_OPPORTUNITY_FIELDS = Object.freeze(
  Object.values(SF_FIELDS),
) as readonly SalesforceOpportunityFieldName[];
