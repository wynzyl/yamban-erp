# Yamban Order, Inventory, Sales and Expense System — MVP Specification (v3)

> **v2 changes:** Heat Press added as its own production stage
> (Design → Printing → Heat Press → Sewing → Packaging) · materials are deducted when the stage that uses them
> starts, not when the order enters production · production jobs are per order item · design status lives in one
> place · cancellation returns only unused material (the rest is waste) · `order_items` quantity/subtotal derived
> from sizes · minutes-per-piece table added for electricity · materials get color, reorder level and moving-average
> cost · expense categories aligned with the 2026 books · example totals corrected · Save as Quotation vs Confirm Order
> · ADDTL orders can reuse the parent's approved design.
>
> **v3 changes:** material availability is checked while the order is being entered · confirmed orders reserve
> their materials so two orders can't count the same stock · shortages create a printable **Purchase Request**
> per supplier, rounded up to whole rolls/bottles · orders carry a material status (Complete / Short) and
> become ready for production automatically when the purchase is received.

## 1. MVP Goal

Build a simple paperless operating system for the shop covering:

- Customers
- Suppliers
- Sales / Orders
- Payments
- Inventory
- Design
- Printing / Sublimation
- Heat Press
- Sewing
- Packaging
- Expenses
- Order costing
- Basic reports

The system should replace paper forms and disconnected spreadsheets without becoming a full ERP.

The **Order** is the central operational record.

---

# 2. Core Business Workflow

```text
CUSTOMER
   |
   v
ORDER CREATED
   |
   +--> Optional Down Payment
   |
   v
DESIGN
   |
   v
PRINTING / SUBLIMATION
   |
   v
HEAT PRESS
   |
   v
SEWING
   |
   v
PACKAGING
   |
   v
READY
   |
   v
RELEASED
```

Not every order necessarily uses every production stage.

For example:

```text
Custom Jersey
    Design -> Printing -> Heat Press -> Sewing -> Packaging

Sublimation on a ready-made item (shirt, mug)
    Design -> Printing -> Heat Press -> Packaging

Plain sewing job
    Design -> Sewing -> Packaging

Ready-made item
    Packaging
```

The production stages attached to an order should therefore be configurable based on the product/order.

Heat Press always follows Printing: sublimation paper is useless without the press, so a product that uses Printing must also use Heat Press.

---

# 3. Order Creation and Design Trigger

When a customer places an order:

1. Capture or select the customer.
2. Create the order.
3. Add products and size quantities.
   The system immediately shows the materials required and whether stock is available (see Material Availability).
4. Set prices.
5. Set the due date.
6. Record an optional down payment if the customer provides one.
7. Save as **Quotation** (no production, no stock movement) or **Confirm Order**.
8. On confirmation, create the production workflow for each order item.
9. If an item's workflow includes DESIGN, create its **Design production job** — unless it is an ADDTL order
   reusing the parent order's approved design (see Orders).

### Important rule

A down payment is **optional**.

The system must not require payment before an order can be saved.

Example:

```text
Order Total:       ₱15,000
Down Payment:       ₱5,000
Balance:           ₱10,000
```

or:

```text
Order Total:       ₱15,000
Down Payment:           ₱0
Balance:           ₱15,000
```

Both are valid orders.

The shop can decide whether production/design is allowed based on its own business policy. The MVP should record the payment state, not hard-code a mandatory payment requirement.

---

# 4. Order Status

Keep the order lifecycle simple:

```text
QUOTATION
CONFIRMED
IN_PRODUCTION
READY
RELEASED
CANCELLED
```

Recommended behavior:

### QUOTATION

Customer inquiry or quotation.

- No inventory deduction.
- Material availability is shown, but nothing is reserved.
- No production required.
- No payment required.

### CONFIRMED

Customer has accepted the order.

- Order becomes an active job.
- Materials are **reserved** for the order (not yet deducted).
- If materials are short, the shortage goes on a Purchase Request.
- Optional down payment can be recorded.
- Production workflow can be created.

### IN_PRODUCTION

At least one production job has started.

Possible stages:

```text
DESIGN
PRINTING
HEAT_PRESS
SEWING
PACKAGING
```

Entering IN_PRODUCTION does **not** deduct stock by itself. Materials are deducted when the stage that uses
them starts (see Inventory Deduction Rule). Starting Design therefore takes nothing from inventory.

### READY

All production jobs of all order items are completed.

### RELEASED

Products have been handed to the customer.

### CANCELLED

Order is cancelled.

Material from stages that never started was never deducted, so nothing needs to be returned.
For material already consumed, the user enters how much is still usable: that quantity is returned
(RETURN) and the remainder is recorded as WASTE. Printed or cut fabric cannot go back on the roll.

---

# 5. Production Workflow

Production is represented as stages/jobs rather than separate complicated manufacturing systems.

Jobs belong to an **order item**, because each product in an order can have a different workflow
(a jersey needs Sewing, a sublimated shirt does not).

```text
production_jobs
---------------
id
order_id
order_item_id
stage
sequence
status
planned_quantity
completed_quantity
assigned_to nullable
started_at nullable
completed_at nullable
notes
```

Stages:

```text
DESIGN
PRINTING
HEAT_PRESS
SEWING
PACKAGING
```

Statuses:

```text
PENDING
IN_PROGRESS
COMPLETED
CANCELLED
```

`production_jobs.status` is the single source of truth for where an item is.
Design-specific detail (approval, revisions, files) is kept in `design_jobs`, linked one-to-one.

Sequencing rule: a job can start once the previous job of the same item has started, except that
PRINTING requires an **approved** design. This lets heat press begin on the first printed batch while
printing continues, without a scheduling engine.

Example:

```text
ORD-2026-00123 / Basketball Jersey (20 pcs)

DESIGN       COMPLETED
PRINTING     COMPLETED      20/20
HEAT_PRESS   COMPLETED      20/20
SEWING       IN_PROGRESS    14/20
PACKAGING    PENDING         0/20
```

The order is READY when every job of every item is COMPLETED (or CANCELLED).

---

# 6. Design Process

Design is a real production stage and must be included in the order workflow.

## Design starts from the customer order

The design job contains:

```text
Order
Customer
Product
Design requirements
Reference information
Assigned designer
Status
Design files
Customer approval
```

The design record extends the DESIGN production job (one-to-one). It does not repeat
the job's status, assignee or dates.

```text
design_jobs
-----------
id
production_job_id
approval_status
revision_count
requirements
reference_notes
customer_approved_at nullable
approved_by nullable
reused_from_design_job_id nullable   -- ADDTL orders reusing an approved design
```

Approval statuses:

```text
DRAFTING
FOR_APPROVAL
REVISION_REQUESTED
APPROVED
```

How the two statuses relate:

```text
production_job.status    design_job.approval_status
---------------------    --------------------------
PENDING                  DRAFTING
IN_PROGRESS              DRAFTING / FOR_APPROVAL / REVISION_REQUESTED
COMPLETED                APPROVED
```

The DESIGN job can only be completed when the design is APPROVED and a final file is marked.

---

# 7. Design Approval

For custom products, the design should normally go through:

```text
ORDER
  |
  v
DESIGN
  |
  v
FOR APPROVAL
  |
  +---- Revision requested
  |          |
  |          v
  |       DESIGN
  |
  v
APPROVED
  |
  v
PRINTING
```

The system should record the approval state and date.

The MVP does not need a customer portal.

The shop can simply upload/save the final design and mark it approved.

---

# 8. Design Files

For the MVP, keep file management simple.

A design can have:

```text
design_files
------------
id
design_job_id
file_name
file_path / storage_key
file_type
version
is_final
uploaded_at
```

Example:

```text
ORD-2026-00123
|
+-- Design v1
+-- Design v2
+-- Design v3
+-- Design FINAL
```

Only the final approved design should be used for production.

The system should preserve the design version associated with the order.

---

# 9. Design Is Not Automatically a Material Cost

Design itself does not need to consume inventory.

If the shop later wants to charge or cost design labor, add a design labor cost.

For MVP:

```text
Design
    |
    +--> Production time/status
    |
    +--> Optional labor cost later
```

Do not build a complicated design costing engine initially.

---

# 10. Printing / Sublimation

After design approval:

```text
APPROVED DESIGN
       |
       v
PRINTING
```

Printing consumes:

- Sublimation paper
- Ink
- Printer electricity

These materials are deducted when the PRINTING job starts.

Example:

```text
Printing ORD-2026-00123 / Basketball Jersey (20 pcs)

Paper: -24.0 m
Ink:   -300 ml
```

Track planned and printed quantity on the job.

---

# 11. Heat Press

The printed paper is transferred onto the fabric with the heat press.

```text
PRINTING
   |
   v
HEAT PRESS
```

Heat press consumes:

- Fabric (e.g. Polydex) — deducted when the HEAT_PRESS job starts
- Heat press electricity (the largest electricity user in the shop)

Track:

```text
planned_quantity
completed_quantity
actual_fabric_used nullable
completed_at
notes
```

`actual_fabric_used` is optional. When filled, the difference from the recipe is recorded as an
ADJUSTMENT (more used) or RETURN (less used) and shows how accurate the recipe yards are, so the
recipes can be corrected over time.

Example:

```text
Heat Press ORD-2026-00123 / Basketball Jersey (20 pcs)

Polydex White: -30.0 yd
```

---

# 12. Sewing

After heat press:

```text
HEAT PRESS (fabric printed and cut)
       |
       v
SEWING
```

MVP sewing tracking:

```text
production_jobs
---------------
stage = SEWING

planned_quantity
completed_quantity
assigned_worker
started_at
completed_at
notes
```

Example:

```text
Basketball Jersey

Planned:    20
Completed:  14
Remaining:   6
```

Sewing consumes thread/trims (if listed in the recipe) and sewing machine electricity.
Thread and trims are deducted when the SEWING job starts.

Labor costing can be added later.

---

# 13. Packaging

After sewing:

```text
SEWING COMPLETED
       |
       v
PACKAGING
```

Track:

```text
planned_quantity
packed_quantity
completed_at
notes
```

Packaging materials (bags, labels), if listed in the recipe, are deducted when the PACKAGING job starts.

When packaging is complete:

```text
ORDER -> READY
```

provided all required production stages are complete.

---

# 14. Production Stage Selection

Not every product needs every stage.

A product defines its default workflow:

```text
product_stages
--------------
id
product_id
stage
sequence
```

Examples:

```text
Basketball Jersey        DESIGN → PRINTING → HEAT_PRESS → SEWING → PACKAGING
Printed T-Shirt          DESIGN → PRINTING → HEAT_PRESS → PACKAGING
Sublimation Mug          DESIGN → PRINTING → HEAT_PRESS → PACKAGING
Plain Sewing Job         DESIGN → SEWING → PACKAGING
Ready-made Item          PACKAGING
```

Rule: PRINTING and HEAT_PRESS always go together.

When an order is confirmed, each item's default workflow is copied into `production_jobs`.
Changing a product's workflow later does not alter old orders.

---

# 15. Customers

```text
customers
---------
id
first_name
last_name
organization_id nullable
mobile
email
facebook
birthday
street_purok
barangay
municipality
province
notes
created_at
updated_at
```

Optional organization:

```text
organizations
-------------
id
name
type
```

Examples:

```text
San Jacinto NHS
Barangay Tamaro
Team Yatyat
```

---

# 16. Orders

```text
orders
------
id
order_number
customer_id
organization_id nullable
parent_order_id nullable
order_date
due_date
status
material_status   -- COMPLETE / SHORT (recomputed on every change and purchase)
subtotal          -- derived from order items
discount
total
notes
created_at
updated_at
```

`parent_order_id` allows additional orders to connect to the original order.

Example:

```text
ORD-2026-00123
    |
    +-- ORD-2026-00123-A1
    +-- ORD-2026-00123-A2
```

An ADDTL order can reuse the parent's approved design: its DESIGN job is created as COMPLETED with
`reused_from_design_job_id` set, so the designer does not redo work for a few extra pieces.

---

# 17. Order Items

```text
order_items
-----------
id
order_id
product_id
description
quantity          -- derived: SUM(order_item_sizes.quantity)
subtotal          -- derived: SUM(order_item_sizes.subtotal)
```

Prices live only on the size rows, because sizes can have different prices (2XL+).
Products without sizes (e.g. mugs) use a single `ONE SIZE` row.

Size breakdown:

```text
order_item_sizes
----------------
id
order_item_id
size
quantity
unit_price
subtotal
```

Example:

```text
Basketball Jersey

M       5
L      10
XL      3
2XL     2
```

---

# 18. Roster

Optional roster for jerseys:

```text
order_roster
------------
id
order_item_id
player_name
jersey_number
size
```

This allows the shop to print the production roster directly from the system.

---

# 19. Product Recipes

Each product/size has a default material recipe.

Example:

```text
Basketball Jersey / M

Material             Qty/pc     Used at stage
Sublimation Paper    1.20 m     PRINTING
Ink                 15.00 ml    PRINTING
Polydex              1.50 yd    HEAT_PRESS
```

Each recipe material records the stage where it is used. That stage decides when it is deducted.

Recipe tables:

```text
products
product_sizes
product_recipes
recipe_materials
```

The recipe is a default.

When an order is created, the recipe is copied into order-specific material requirements.

---

# 20. Order Materials

```text
order_materials
---------------
id
order_item_id
material_id
size
quantity_per_piece
total_quantity
unit
unit_cost
total_cost
stage                 -- copied from the recipe
consumed_at nullable  -- set when deducted; guards against double deduction
```

The order keeps its own copy.

Changing the product recipe later must never change an old order.

A material line can be edited (quantity per piece, or swapped material) until it is consumed. Lines of later stages stay editable even while earlier stages are running — e.g. sizes can still change during Design.

---

# 21. Inventory

Materials are stored in their actual operating unit.

Examples:

```text
Polydex             YARD
Ink                 ML
Sublimation Paper   METER
```

Material table:

```text
materials
---------
id
name
color nullable
category
unit
purchase_unit
purchase_quantity
default_supplier_id nullable   -- used when building Purchase Requests
reorder_level
stock_on_hand        -- cached from the ledger
average_unit_cost    -- moving average, updated on each purchase
active
```

Examples:

```text
Polydex White
unit = YARD
purchase_unit = ROLL
purchase_quantity = 78

Big Pix Ink
unit = ML
purchase_unit = BOTTLE
purchase_quantity = 1000
```

---

# 22. Inventory Transactions

Use an inventory ledger rather than manually changing stock.

```text
inventory_transactions
----------------------
id
material_id
transaction_type
quantity
unit_cost
supplier_id nullable
order_id nullable
reference
transaction_date
```

`quantity` is signed: positive adds stock, negative removes it.
Costing uses the **moving average** method: purchases update `average_unit_cost`; consumptions are
valued at the average at the time of consumption.

Transaction types:

```text
PURCHASE
ORDER_CONSUMPTION
RETURN
ADJUSTMENT
WASTE
```

Example:

```text
ORD-2026-00123

PRINTING started     Paper    -24 m
                     Ink     -300 ml
HEAT_PRESS started   Polydex  -30 yd
```

---

# 23. Inventory Deduction Rule

Stock moves when the stage that uses the material starts — not when the order changes status.

```text
QUOTATION             no deduction, no reservation (availability shown only)
CONFIRMED             no deduction — materials RESERVED
DESIGN started        no deduction (design uses no materials)
PRINTING started      paper, ink
HEAT_PRESS started    fabric
SEWING started        thread, trims (if in recipe)
PACKAGING started     bags, labels (if in recipe)
```

Each order material line is deducted once (`consumed_at`); starting a stage again never deducts twice.

If stock is insufficient when a stage starts, the system shows the shortage and does not start the stage.

If an order is cancelled:

```text
Lines not yet consumed      -> reservation released, nothing to return
Lines already consumed      -> user enters usable quantity
                               usable quantity  -> RETURN
                               the rest         -> WASTE
```

---

# 24. Material Availability and Reservation

The shop must know **when the order is taken** whether the materials are on hand — not days later
when printing starts.

## When the check runs

```text
Adding/changing items or sizes on an order   -> check shown live on the order screen
Confirming the order                          -> check + reserve
Receiving a purchase                          -> waiting orders re-checked automatically
Cancelling / editing an order                 -> reservation released / recalculated
```

## What "available" means

Stock on hand is not enough: other confirmed orders may already be counting on the same rolls.

```text
Reserved   = SUM of unconsumed order_material lines of CONFIRMED / IN_PRODUCTION orders
Free       = Stock on Hand − Reserved
Shortage   = Required − Free        (when positive)
```

Reservations are calculated from `order_materials` (lines with `consumed_at` empty). They are not
inventory transactions and do not change the ledger. When a stage starts and the line is consumed,
the reservation turns into the actual deduction.

## Example

```text
NEW ORDER — Basketball Jersey M × 20

Material             Required   On Hand   Reserved   Free     Status
Polydex White        30.0 yd    40.0 yd   25.0 yd    15.0 yd  SHORT 15.0 yd
Sublimation Paper    24.0 m     80.0 m     0.0 m     80.0 m   OK
Ink (Big Pix)        300 ml     2,600 ml   450 ml    2,150 ml OK
```

The order can still be saved and confirmed — a shortage never blocks a sale. The order gets
`material_status = SHORT` and the shortage goes on a Purchase Request.

## Who gets the stock when it is short

When several orders compete for the same material, free stock is allocated by **due date** (earliest
first), then by confirmation date. An urgent order confirmed later can therefore take priority over a
relaxed order confirmed earlier. The order screen shows which orders are holding the material.

## When the stage starts

Starting a stage still checks the actual stock on hand. If the material has not arrived, the stage
cannot start and the screen shows the open Purchase Request for it.

---

# 25. Purchase Requests

When confirmed orders are short of material, the system builds a **Purchase Request (PR)**: the list of
materials to buy, grouped by supplier, that can be printed and handed to whoever does the buying.

```text
purchase_requests
-----------------
id
pr_number            -- PR-2026-0001
supplier_id nullable
status               -- DRAFT, PRINTED, ORDERED, RECEIVED, CANCELLED
needed_by            -- earliest due date of the orders it serves
notes
created_at

purchase_request_lines
----------------------
id
purchase_request_id
material_id
shortage_quantity    -- in stock unit (e.g. 15.0 yd)
purchase_quantity    -- rounded up to purchase units (e.g. 1 roll = 78 yd)
estimated_unit_cost  -- current moving-average cost
estimated_total

purchase_request_line_orders
----------------------------
purchase_request_line_id
order_id
quantity             -- how much of the line this order needs
```

## Rules

- Shortages are rounded **up** to whole purchase units: short 15 yd of Polydex → buy 1 roll (78 yd).
- Optionally top up to the material's reorder level, so the next order isn't short again.
- One open PR per supplier: new shortages are added to the existing DRAFT instead of creating many PRs.
- A material with no default supplier goes on a PR with no supplier, to be assigned before printing.
- Receiving the purchase (Inventory → Purchases) is done **against the PR**, which creates the PURCHASE
  ledger entries, marks the PR RECEIVED, and re-checks every order waiting for that material.
  Orders whose shortage is covered switch to `material_status = COMPLETE`.

## Printed Purchase Request

```text
YAMBAN — PURCHASE REQUEST                      PR-2026-0007
Supplier: Andy Textile                         Date: 01 Oct 2026
                                               Needed by: 08 Oct 2026

Material            Short     Buy        Est. Cost    For Orders
Polydex White       15.0 yd   1 roll     ₱8,580.00    ORD-2026-00123, ORD-2026-00125
Polydex Black        6.5 yd   1 roll     ₱8,580.00    ORD-2026-00124
                                         ----------
                              TOTAL      ₱17,160.00

Prepared by: ________     Approved by: ________     Received by: ________
```

---

# 26. Suppliers

```text
suppliers
---------
id
name
contact_person
mobile
email
address
notes
```

Purchases create inventory transactions.

---

# 27. Payments

```text
payments
--------
id
order_id
payment_date
amount
payment_method
reference
notes
```

Methods:

```text
CASH
GCASH
BANK_TRANSFER
CHECK
```

Down payment is optional.

Example:

```text
Order Total       ₱25,000
Down Payment       ₱5,000
Balance            ₱20,000
```

Or:

```text
Order Total       ₱25,000
Down Payment           ₱0
Balance            ₱25,000
```

Multiple payments are allowed.

---

# 28. Order Costing

Direct order cost initially includes:

```text
Fabric
Ink
Sublimation Paper
Electricity
```

Later:

```text
Design Labor
Printing Labor
Sewing Labor
Packaging Labor
Other Direct Costs
```

Formula:

```text
Direct Cost =
Material Cost
+ Electricity
+ Direct Labor
+ Other Direct Costs
```

Gross margin:

```text
Gross Margin =
Order Total - Direct Cost
```

---

# 29. Electricity Cost

Machines:

```text
machines
--------
id
name
stage            -- PRINTING, HEAT_PRESS, SEWING ...
power_kw
active
```

Examples:

```text
Sublimation Printer    0.15 kW    PRINTING
Heat Press             6.00 kW    HEAT_PRESS
Sewing Machine         0.40 kW    SEWING
```

Minutes per piece, per product size:

```text
product_size_processes
----------------------
id
product_id
size
machine_id
minutes_per_piece
```

Like materials, these are copied onto the order item when the order is confirmed.

Electricity rates:

```text
electricity_rates
-----------------
id
rate_per_kwh
effective_date
```

Formula:

```text
kWh =
power_kw × minutes / 60 × quantity
```

Then:

```text
Electricity Cost =
kWh × electricity_rate
```

Past orders retain the electricity rate used at the time.

---

# 30. Expenses

General business expenses are separate from order material consumption.

```text
expenses
--------
id
expense_date
category
supplier_id nullable
amount
payment_method
description
order_id nullable
```

Categories can include:

```text
SALARY
GOVT_CONTRIBUTIONS     -- SSS, PhilHealth, Pag-IBIG (employer share and remittances)
RENT
UTILITIES              -- electricity, water, internet
FUEL
VEHICLE_MAINTENANCE
REPAIR_MAINTENANCE     -- machines (e.g. Juki mechanic)
PROFESSIONAL_FEES      -- bookkeeper
MEALS_SNACKS
OFFICE_SUPPLIES
SHIPPING
LOAN_PAYMENT           -- the shop's own loans
OTHER
```

Employee cash advances / loans are **not** expenses — they are money owed back to the shop and are
recovered through salary deductions. Track them outside expenses (payroll is out of MVP scope).

Material purchases should normally flow through inventory purchasing rather than being manually entered as a generic expense.

---

# 31. Order Profitability

Example:

```text
Basketball Jersey / M
Quantity: 20

Fabric                 ₱3,300.00
Sublimation Paper        ₱960.00
Ink                      ₱771.42
Electricity               ₱90.40
--------------------------------
Direct Cost            ₱5,121.82

Selling Price          ₱9,000.00
--------------------------------
Gross Margin           ₱3,878.18
```

Electricity breakdown: printer 0.20 kWh, heat press 4.00 kWh, sewing 3.33 kWh = 7.53 kWh × ₱12.

The exact numbers depend on the shop's actual material prices, recipes, machine power and electricity rate.

---

# 32. MVP Dashboard

Keep the dashboard small.

### Today

```text
Orders
Sales
Payments
Orders in Production
Orders Ready
```

### Production

```text
Design
Printing
Heat Press
Sewing
Packaging
Ready
```

### Inventory

```text
Low Stock Materials
Orders Waiting for Materials
Open Purchase Requests
```

### Finance

```text
Sales This Month
Payments Received
Outstanding Balance
Direct Production Cost
Gross Margin
Operating Expenses
```

---

# 33. Main Navigation

```text
DASHBOARD

SALES
  Orders
  Customers
  Payments

INVENTORY
  Materials
  Purchase Requests
  Purchases
  Suppliers

PRODUCTION
  Design
  Printing
  Heat Press
  Sewing
  Packaging

FINANCE
  Expenses
  Costing

REPORTS
  Sales
  Inventory
  Production
  Order Profitability
  Expenses
```

---

# 34. New Order Screen

The order-entry process should be fast.

```text
NEW ORDER

Customer
[ San Jacinto NHS                         ▼ ]

Contact Person
[ Juan Dela Cruz ]

Due Date
[ 15 Oct 2026 ]

--------------------------------------------

PRODUCT
[ Basketball Jersey                     ▼ ]

SIZE       QTY       PRICE
M           5        ₱450
L          10        ₱450
XL          3        ₱480
2XL         2        ₱500

[ Add Product ]

--------------------------------------------

MATERIALS                     REQUIRED     FREE        STATUS
Polydex White                 30.0 yd      15.0 yd     ⚠ SHORT 15.0 yd
Sublimation Paper             24.0 m       80.0 m      ✓
Ink (Big Pix)                 300 ml       2,150 ml    ✓

(updates live as sizes and quantities change)

--------------------------------------------

DOWN PAYMENT (OPTIONAL)

Amount
[ ₱5,000 ]

Method
[ GCash ▼ ]

--------------------------------------------

TOTAL       ₱9,190
PAID        ₱5,000
BALANCE     ₱4,190

[ SAVE AS QUOTATION ]     [ CONFIRM ORDER ]
```

(₱2,250 + ₱4,500 + ₱1,440 + ₱1,000 = ₱9,190.)

Save as Quotation stores the order only. Confirm Order also records the payment (if entered), reserves
the materials, creates the production jobs for each item, and — if anything is short — adds the shortage
to the supplier's Purchase Request and offers to print it.

---

# 35. Design Production Screen

After saving a custom order:

```text
ORDER #ORD-2026-00123

CUSTOMER
Juan Dela Cruz
San Jacinto NHS

PRODUCT
Basketball Jersey
20 pcs

DESIGN
Status: PENDING

[ START DESIGN ]
```

During design:

```text
DESIGN
Status: IN PROGRESS

Designer:
[ Select ]

Notes:
[ __________________________________ ]

Files:
[ Upload Design ]

[ SUBMIT FOR APPROVAL ]
```

Approval:

```text
DESIGN
Status: FOR APPROVAL

Version:
FINAL

[ APPROVE DESIGN ]
[ REQUEST REVISION ]
```

After approval:

```text
DESIGN ✓ APPROVED

[ COMPLETE DESIGN ]
```

The next required production stage becomes available.

---

# 36. Production Board

A simple Kanban-style board is sufficient.

```text
DESIGN       PRINTING     HEAT PRESS   SEWING       PACKAGING

ORD-00123    ORD-00120    ORD-00119    ORD-00118    ORD-00115
ORD-00125    ORD-00121    ORD-00120    ORD-00122
```

Each job can be moved through:

```text
PENDING
   ↓
IN_PROGRESS
   ↓
COMPLETED
```

Cards are per order item. Starting a card that consumes materials deducts them (or shows the shortage).

No complicated scheduling system is required.

---

# 37. MVP Development Order

Build in this order:

## Phase 1 — Master Data

- Customers
- Organizations
- Suppliers
- Products
- Sizes
- Materials
- Product recipes (materials per size) — needed by the availability check in Phase 2

## Phase 2 — Sales

- Orders
- Order items
- Size breakdown
- Roster
- Payments
- Optional down payment
- Material availability check and reservation

## Phase 3 — Design

- Design jobs
- Design status
- Design revisions
- Design approval
- Design files

## Phase 4 — Inventory

- Purchase Requests (build, print, receive against)
- Purchases
- Inventory ledger
- Order material snapshots
- Consumption
- Returns

## Phase 5 — Production

- Design
- Printing
- Heat Press
- Sewing
- Packaging
- Production board

## Phase 6 — Costing

- Fabric
- Ink
- Paper
- Electricity
- Order direct cost
- Gross margin

## Phase 7 — Expenses and Reports

- Expenses
- Sales reports
- Inventory reports
- Production reports
- Order profitability
- Monthly business summary

---

# 38. What NOT to Build in MVP

Do not build:

- General ledger
- Double-entry accounting
- Full payroll system
- Tax engine
- Customer portal
- Supplier portal
- Barcode infrastructure
- Multi-warehouse
- Multi-branch
- MRP
- Automated production scheduling
- Microservices
- Event sourcing
- AI forecasting
- Complex approval hierarchies

The objective is operational visibility and paperless transactions, not building another SAP.

---

# 39. Core MVP Principle

The system should answer these questions immediately:

### Customer

> Who ordered this?

### Sales

> What did they order and how much?

### Payment

> How much have they paid and how much remains?

### Design

> Has the artwork been created and approved?

### Production

> Where is the order right now?

### Inventory

> Do we have the materials for this order — and if not, what do we need to buy?
>
> What materials did this order consume?

### Costing

> How much did this order actually cost?

### Expenses

> Where is the shop's money going?

### Profitability

> What did this order contribute before general business expenses?

That is the purpose of the MVP.
