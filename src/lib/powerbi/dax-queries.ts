// CEO KPI query definitions.
// Update these DAX expressions to match your Power BI semantic model.
// Use the MCP server's get_dataset_schema tool to inspect available measures.

export interface KPIQueryConfig {
  name: string;
  category: string;
  period: string;
  unit: string;
  dax: string;
}

export const CEO_KPI_QUERIES: KPIQueryConfig[] = [
  // --- Revenue ---
  {
    name: "Total Revenue MTD",
    category: "revenue",
    period: "MTD",
    unit: "$",
    dax: 'EVALUATE ROW("Value", [Total Revenue MTD])',
  },
  {
    name: "Total Revenue QTD",
    category: "revenue",
    period: "QTD",
    unit: "$",
    dax: 'EVALUATE ROW("Value", [Total Revenue QTD])',
  },
  {
    name: "Gross Margin %",
    category: "revenue",
    period: "MTD",
    unit: "%",
    dax: 'EVALUATE ROW("Value", [Gross Margin Pct])',
  },

  // --- Operations ---
  {
    name: "Units Shipped MTD",
    category: "operations",
    period: "MTD",
    unit: "#",
    dax: 'EVALUATE ROW("Value", [Units Shipped MTD])',
  },
  {
    name: "Order Fulfillment Rate",
    category: "operations",
    period: "MTD",
    unit: "%",
    dax: 'EVALUATE ROW("Value", [Order Fulfillment Rate])',
  },

  // --- Growth ---
  {
    name: "New Accounts",
    category: "growth",
    period: "MTD",
    unit: "#",
    dax: 'EVALUATE ROW("Value", [New Accounts MTD])',
  },
  {
    name: "YoY Revenue Growth",
    category: "growth",
    period: "YTD",
    unit: "%",
    dax: 'EVALUATE ROW("Value", [YoY Revenue Growth Pct])',
  },
];
