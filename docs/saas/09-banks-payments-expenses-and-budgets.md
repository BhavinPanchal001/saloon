# 09 · Banks, payments, expenses and budgets

Read [the execution contract](README.md) first. Prerequisites: 03.

## Current implementation

Transfers touch two bank accounts; payments link to POs or bills. Budget summaries exist in both expense and budget controllers.

[banks.js](../../backend/src/routes/banks.js) · [payments.js](../../backend/src/routes/payments.js) · [expenses.js](../../backend/src/routes/expenses.js) · [budgets.js](../../backend/src/routes/budgets.js) · [bankController.js](../../backend/src/controllers/bankController.js) · [paymentController.js](../../backend/src/controllers/paymentController.js) · [expenseController.js](../../backend/src/controllers/expenseController.js) · [budgetController.js](../../backend/src/controllers/budgetController.js)

## Additional entry points

[BankListPage.tsx](../../src/modules/bank/pages/BankListPage.tsx) · [BudgetsPage.jsx](../../src/pages/expenses/BudgetsPage.jsx) · [ExpenseAddPage.jsx](../../src/pages/expenses/ExpenseAddPage.jsx) · [bankStore.ts](../../src/stores/bankStore.ts)

## Implementation sequence

1. Scope default-bank selection, transaction history, deposits and transfers.
2. Check both ends of every transfer.
3. Scope split payment details and linked documents; coordinate customer settlement with 06 and PO links with 07.
4. Scope monthly budget and history by organization and outlet in both controller paths.

## Acceptance scenario

Set different defaults, transfer between own banks, reject a foreign destination atomically, reconcile split payments, and verify monthly spend independently.

## Existing route inventory

`GET /api/banks` `GET /api/banks/active` `POST /api/banks/transfer` `GET /api/banks/:id` `POST /api/banks` `PUT /api/banks/:id` `DELETE /api/banks/:id` `PATCH /api/banks/:id/set-default` `GET /api/banks/:id/transactions` `POST /api/banks/:id/deposit` `POST /api/banks/:id/withdraw`

`GET /api/payments` `GET /api/payments/:id` `POST /api/payments` `PATCH /api/payments/:id/status` `DELETE /api/payments/:id`

`GET /api/expenses` `POST /api/expenses` `DELETE /api/expenses/:id` `GET /api/expenses/budget-summary` `POST /api/expenses/monthly-budget` `GET /api/expenses/budget-history`

`GET /api/budgets/summary` `GET /api/budgets/history` `GET /api/budgets/months` `POST /api/budgets`
