# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Expenses module for tracking business operating costs (salary, rent, utilities, fuel, and more). Staff and owner can create expenses; owner sees totals by category with monthly filtering. Full CRUD with same day edit permission for staff. (see spec 0002)
- Order profitability report showing gross margin per order. Displays revenue, cost, profit, margin percentage, and variance between estimated and actual cost. Filter by month, customer, or order number. Summary panel shows totals for the filtered set. Expandable rows reveal the cost breakdown by materials, electricity, and labor. Owner only. (see spec 0003)
- Customer filter on the costing orders endpoint for profitability analysis by customer.
- Summary aggregation on the costing orders endpoint returning totals across all filtered orders, not just the current page.
- `isEstimated` and `variance` fields on order cost summaries to distinguish estimated from actual costs.
- `GET /customers/with-orders` endpoint returning customers that have at least one confirmed order, for filter dropdowns.
