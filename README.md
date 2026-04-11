# POS MVP Starter Code

This is a simple full-stack POS starter based on the flow we discussed:

- PIN login
- category/product management
- POS sales screen
- cart
- hold order
- cash payment
- basic daily sales report
- staff management

## Stack

- Frontend: React + Vite
- Backend: Express
- Database: SQLite via better-sqlite3

## Run locally

### 1) Backend

```bash
cd backend
npm install
npm run seed
npm run dev
```

Backend runs on `http://localhost:4000`

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## Demo login

- Manager PIN: `1234`
- Staff PIN: `1111`

## Notes

This is an MVP starter, not a production-ready POS.

### Included
- simple cash checkout
- held orders
- basic CRUD for staff, categories, products
- sales summary

### Not included yet
- card terminal integration
- receipt printer driver integration
- barcode scanner support
- inventory deduction
- refunds and voids workflow
- advanced permissions
- kitchen workflow
- tables/dine-in
- offline sync

## Suggested next steps

1. Add edit/delete forms for categories and products.
2. Add receipt template with store information.
3. Add role-based route protection.
4. Add refunds and end-shift balancing.
5. Replace SQLite with PostgreSQL for production.
