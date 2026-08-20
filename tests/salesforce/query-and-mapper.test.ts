import { SF_FIELDS } from "@/salesforce/fields";
import {
  mapApiOpportunity,
  mapSalesforceOpportunity,
  SalesforceMappingError,
} from "@/salesforce/mapper";
import {
  buildOpportunitySoql,
  buildSoqlSelect,
  DEFAULT_OPPORTUNITY_API_FIELDS,
  getConfiguredOpportunityApiFields,
  SalesforceFieldConfigurationError,
} from "@/salesforce/query";
import { PHASE_ONE_SOURCE_DIMENSIONS } from "@/salesforce/mapper";
import type { SalesforceOpportunityRecord } from "@/types";
import { describe, expect, it } from "vitest";

describe("SOQL builders", () => {
  it("centralizes the opportunity query and escapes filter values", () => {
    const query = buildOpportunitySoql({
      filters: {
        stages: ["Closed Won", "x' OR Name != ''"],
        closeDateStart: "2025-02-01",
        createdDateEnd: "2025-04-30",
      },
    });

    expect(query).toContain("FROM Opportunity");
    expect(query).toContain(
      "StageName IN ('Closed Won', 'x\\' OR Name != \\'\\'')",
    );
    expect(query).toContain("CloseDate >= 2025-02-01");
    expect(query).toContain("CreatedDate <= 2025-04-30T23:59:59.999Z");
    expect(query).toContain("ORDER BY CloseDate DESC NULLS LAST");
    expect(query).not.toContain("Product_Line__c");
    expect(query).not.toContain("Region__c");
  });

  it("validates deploy-time API field overrides before they reach SOQL", () => {
    const fieldMap = getConfiguredOpportunityApiFields(
      JSON.stringify({
        presalesStage: "Verified_Presales_Stage__c",
        productLine: "Product_Line__c",
        region: "Region__c",
      }),
    );
    const query = buildOpportunitySoql({ fieldMap });

    expect(query).toContain("Verified_Presales_Stage__c");
    expect(query).toContain("Product_Line__c");
    expect(query).toContain("Region__c");
    expect(() =>
      getConfiguredOpportunityApiFields(
        JSON.stringify({ stage: "StageName FROM User" }),
      ),
    ).toThrow(SalesforceFieldConfigurationError);
    expect(() =>
      getConfiguredOpportunityApiFields(JSON.stringify({ madeUpField: "Id" })),
    ).toThrow(SalesforceFieldConfigurationError);
  });

  it("rejects identifiers and empty set conditions that could create raw SOQL", () => {
    expect(() =>
      buildSoqlSelect({ object: "Opportunity; DELETE", fields: ["Id"] }),
    ).toThrow("Invalid SOQL identifier");
    expect(() =>
      buildSoqlSelect({
        object: "Opportunity",
        fields: ["Id"],
        where: [{ field: "StageName", operator: "IN", values: [] }],
      }),
    ).toThrow("cannot be empty");
  });
});

describe("Salesforce opportunity mapping", () => {
  it("normalizes label-keyed fixture records without amount substitution", () => {
    const record: SalesforceOpportunityRecord = {
      [SF_FIELDS.id]: "006-example",
      [SF_FIELDS.name]: "Example opportunity",
      [SF_FIELDS.stage]: "Closed Won",
      [SF_FIELDS.dealSize]: "1,250",
      [SF_FIELDS.netBuArr]: 1000,
      [SF_FIELDS.ownerName]: { Name: "AE Example" },
      [SF_FIELDS.productLine]: "Okta",
      [SF_FIELDS.region]: "UKI",
    };

    const result = mapSalesforceOpportunity(record);

    expect(result).toMatchObject({
      id: "006-example",
      name: "Example opportunity",
      dealSize: 1250,
      netBuArr: 1000,
      ownerName: "AE Example",
      productLine: "Okta",
      region: "UKI",
    });
    expect(result.splitAmount).toBeNull();
  });

  it("maps relationship paths from live API records", () => {
    const result = mapApiOpportunity(
      {
        Id: "006-live",
        Name: "Live opportunity",
        StageName: "Prospecting",
        Owner: { Name: "Live Owner" },
      },
      DEFAULT_OPPORTUNITY_API_FIELDS,
      PHASE_ONE_SOURCE_DIMENSIONS,
    );

    expect(result.ownerName).toBe("Live Owner");
    expect(result.id).toBe("006-live");
    expect(Object.values(DEFAULT_OPPORTUNITY_API_FIELDS)).toContain(
      "Owner.Name",
    );
  });

  it("rejects a missing configured dimension instead of applying a fallback", () => {
    const fieldMap = getConfiguredOpportunityApiFields(
      JSON.stringify({ productLine: "Product_Line__c" }),
    );

    expect(() =>
      mapApiOpportunity(
        { Id: "006-live", Name: "Missing product dimension" },
        fieldMap,
        PHASE_ONE_SOURCE_DIMENSIONS,
      ),
    ).toThrow(SalesforceMappingError);
  });

  it("rejects a label-keyed row with blank dimensions", () => {
    expect(() =>
      mapSalesforceOpportunity({
        [SF_FIELDS.id]: "006-example",
        [SF_FIELDS.name]: "Missing dimensions",
      }),
    ).toThrow(SalesforceMappingError);
  });

  it("fails safely rather than silently coercing unknown dimensions", () => {
    const record: SalesforceOpportunityRecord = {
      [SF_FIELDS.id]: "006-example",
      [SF_FIELDS.name]: "Example opportunity",
      [SF_FIELDS.productLine]: "Unexpected secret dimension",
    };

    let thrown: unknown;
    try {
      mapSalesforceOpportunity(record);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(SalesforceMappingError);
    expect((thrown as Error).message).not.toContain(
      "Unexpected secret dimension",
    );
  });
});
