# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a single-page, client-side expense tracker using HTML, CSS, and Vanilla JavaScript. The app ships as three files: `index.html`, `css/style.css`, and `js/app.js`. All data is persisted in `localStorage`. The implementation follows a unidirectional data flow: user action → mutate state → persist → re-render.

## Tasks

- [x] 1. Scaffold project files
  - Create `index.html` at the project root with a valid HTML5 boilerplate (`<!DOCTYPE html>`, `<meta charset>`, `<meta name="viewport">`)
  - Add a `<link>` tag pointing to `css/style.css`
  - Add a `<script src="js/app.js" defer>` tag
  - Create `css/style.css` as an empty file
  - Create `js/app.js` as an empty file
  - _Requirements: 7.1, 7.3_

- [x] 2. Build the HTML structure
  - [x] 2.1 Add the `<header>` with app title and total balance display
    - Write `<header>` containing `<h1>Expense & Budget Visualizer</h1>` and `<div id="total-balance">Total: $0.00</div>`
    - _Requirements: 4.1_

  - [x] 2.2 Add the form section
    - Write `<section id="form-section">` containing `<form id="transaction-form">` with:
      - `<input id="item-name" type="text" placeholder="Item name" />`
      - `<input id="item-amount" type="number" placeholder="Amount" />`
      - `<select id="item-category">` with options: empty default, Food, Transport, Fun
      - `<button type="submit">Add Transaction</button>`
      - `<div id="form-errors" aria-live="polite"></div>`
    - _Requirements: 1.1_

  - [x] 2.3 Add the transaction list section
    - Write `<section id="list-section">` containing `<h2>Transactions</h2>` and `<ul id="transaction-list"></ul>`
    - _Requirements: 2.1_

  - [x] 2.4 Add the chart section
    - Write `<section id="chart-section">` containing `<h2>Spending by Category</h2>`, `<canvas id="pie-chart" width="300" height="300"></canvas>`, and `<p id="chart-empty-msg" hidden>No transactions yet.</p>`
    - _Requirements: 5.1, 5.5_

- [x] 3. Write CSS styles
  - [x] 3.1 Set up base styles and typography
    - Apply a system font stack to `body`
    - Establish a clear size hierarchy: `h1` > `h2` > body text
    - Set `box-sizing: border-box` globally and a neutral background/text color
    - _Requirements: 7.4_

  - [x] 3.2 Style the header
    - Style `header` to display the title and total balance side-by-side or stacked
    - Make `#total-balance` visually prominent (larger font, bold)
    - _Requirements: 4.1, 7.4_

  - [x] 3.3 Style the main layout
    - Use CSS Grid or Flexbox on `main` to arrange the three sections (form, list, chart)
    - On narrow viewports, stack sections vertically
    - _Requirements: 7.1, 7.4_

  - [x] 3.4 Style the form and error display
    - Space form fields and button with consistent margins/padding
    - Style `#form-errors` with red text, hidden by default (`display: none`), shown as `display: block` when errors are present
    - _Requirements: 1.4, 1.5_

  - [x] 3.5 Style the transaction list
    - Set `overflow-y: auto` and `max-height: 400px` on `#transaction-list` to enable scrolling
    - Style each `<li>` to display name, amount, and category in a readable row
    - Style the delete button as a small icon-style button aligned to the right of each list item
    - _Requirements: 2.2, 3.1_

  - [x] 3.6 Style the chart section
    - Center the `<canvas>` element within its section
    - Style `#chart-empty-msg` to be visually distinct (muted color, centered)
    - _Requirements: 5.5_

- [x] 4. Implement storage functions in `js/app.js`
  - [x] 4.1 Implement `loadFromStorage()`
    - Read `localStorage.getItem('transactions')`
    - Wrap in `try/catch`: on missing key return `[]`, on JSON parse error return `[]`
    - Return the parsed `Transaction[]` array
    - _Requirements: 6.3, 2.3_

  - [x] 4.2 Implement `saveToStorage(txns)`
    - Serialize `txns` to JSON and call `localStorage.setItem('transactions', ...)`
    - Wrap in `try/catch`: on quota-exceeded error, display a brief error notice to the user; in-memory state is still updated
    - _Requirements: 6.1, 6.2_

- [x] 5. Implement `validateForm(name, amount, category)`
  - Accept three string arguments: `name`, `amount`, `category`
  - Return an array of error message strings (empty array = valid)
  - Check: `name` is non-empty after trimming
  - Check: `amount` parses to a finite positive number
  - Check: `category` is one of `"Food"`, `"Transport"`, `"Fun"`
  - _Requirements: 1.4, 1.5_

- [x] 6. Implement render functions in `js/app.js`
  - [x] 6.1 Implement `renderTransactionList(txns)`
    - Clear `#transaction-list` (set `innerHTML = ''`)
    - For each transaction in `txns`, append a `<li>` containing: item name, formatted amount, category label, and a `<button data-id="{id}">Delete</button>`
    - _Requirements: 2.1, 3.1_

  - [x] 6.2 Implement `renderTotalBalance(txns)`
    - Compute `txns.reduce((sum, t) => sum + t.amount, 0)`
    - Update `#total-balance` text content to display the result formatted as `Total: $X.XX`
    - Display `$0.00` when `txns` is empty
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 6.3 Implement `renderChart(txns)`
    - If `txns` is empty: hide `#pie-chart`, show `#chart-empty-msg`, return
    - Otherwise: show `#pie-chart`, hide `#chart-empty-msg`
    - Check canvas support with `if (canvas.getContext)` before drawing; show text fallback if unsupported
    - Aggregate amounts by category, compute total, draw pie segments using Canvas 2D API (see task 7)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 6.4 Implement `renderAll(txns)`
    - Call `renderTransactionList(txns)`, `renderTotalBalance(txns)`, and `renderChart(txns)` in sequence
    - _Requirements: 4.2, 4.3, 5.2, 5.3_

- [x] 7. Implement pie chart drawing logic inside `renderChart`
  - Define the color map: `const CATEGORY_COLORS = { Food: '#FF6384', Transport: '#36A2EB', Fun: '#FFCE56' }`
  - Get the 2D context: `const ctx = canvas.getContext('2d')`
  - Clear the canvas with `ctx.clearRect(0, 0, canvas.width, canvas.height)`
  - Aggregate amounts by category using `reduce` to produce `{ Food: number, Transport: number, Fun: number }`
  - Compute the grand total of all amounts
  - Iterate over each category that has `amount > 0`:
    - Compute `sliceAngle = (amount / total) * 2 * Math.PI`
    - Draw arc: `ctx.beginPath()`, `ctx.moveTo(cx, cy)`, `ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle)`, `ctx.closePath()`
    - Fill with `CATEGORY_COLORS[category]`
    - Advance `startAngle += sliceAngle`
  - Optionally draw a text legend below or beside the canvas listing each category and its color
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 8. Implement event handlers in `js/app.js`
  - [x] 8.1 Initialize state on `DOMContentLoaded`
    - Declare `let transactions = []` at module scope
    - Add a `DOMContentLoaded` listener that sets `transactions = loadFromStorage()` then calls `renderAll(transactions)`
    - _Requirements: 2.3, 4.4, 5.4, 6.3_

  - [x] 8.2 Handle form submission
    - Add a `submit` listener on `#transaction-form`
    - Call `event.preventDefault()`
    - Read values from `#item-name`, `#item-amount`, `#item-category`
    - Call `validateForm(name, amount, category)`
    - If errors: display them in `#form-errors` (set `textContent` and `display: block`), return early
    - If valid: clear `#form-errors`, create a new `Transaction` object with `id` from `crypto.randomUUID()` (fallback: `Date.now().toString()`), push to `transactions`, call `saveToStorage(transactions)`, call `renderAll(transactions)`, reset the form with `form.reset()`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 8.3 Handle delete via event delegation
    - Add a `click` listener on `#transaction-list`
    - Check `if (event.target.dataset.id)` to confirm a delete button was clicked
    - Filter: `transactions = transactions.filter(t => t.id !== event.target.dataset.id)`
    - Call `saveToStorage(transactions)` then `renderAll(transactions)`
    - _Requirements: 3.2, 3.3_

- [x] 9. Implement error handling and edge cases
  - Ensure `loadFromStorage` handles `null` (missing key) and malformed JSON via `try/catch`, returning `[]` in both cases
  - Ensure `saveToStorage` catches `QuotaExceededError` and surfaces a user-visible notice (e.g., update `#form-errors` text) without crashing
  - Ensure `renderChart` wraps canvas operations in `if (canvas.getContext)` and shows a text fallback (`#chart-empty-msg` or a new message) when the Canvas API is unavailable
  - Ensure delete with an unknown ID is idempotent: `Array.filter` produces no change, `saveToStorage` and `renderAll` are still called
  - _Requirements: 6.1, 6.2, 6.3, 5.5_

- [ ] 10. Final checkpoint — wire everything together and verify
  - Confirm `index.html` links `css/style.css` and `js/app.js` correctly
  - Confirm `js/app.js` declares state, storage functions, validation, render functions, and event handlers in the correct order so no function is called before it is defined
  - Manually trace through the add-transaction flow: form submit → validate → create transaction → save → renderAll → form reset
  - Manually trace through the delete flow: click delete button → filter → save → renderAll
  - Manually trace through the load flow: DOMContentLoaded → loadFromStorage → renderAll
  - Ensure all three files (`index.html`, `css/style.css`, `js/app.js`) are present and the app opens correctly in a browser without a server
  - _Requirements: 7.1, 7.2, 7.3_

## Notes

- All implementation lives in exactly three files: `index.html`, `css/style.css`, `js/app.js`
- No frameworks, no build tools, no external dependencies
- Tasks build incrementally — each step integrates with the previous ones
- Task 10 is the final wiring checkpoint to confirm end-to-end correctness before delivery
