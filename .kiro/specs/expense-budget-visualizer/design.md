# Design Document

## Expense & Budget Visualizer

---

## Overview

The Expense & Budget Visualizer is a single-page, client-side web application built with HTML, CSS, and Vanilla JavaScript. It allows users to record expense transactions, view a running total balance, browse a scrollable transaction history, and visualize spending by category through a pie chart drawn on an HTML `<canvas>` element.

All data is stored in the browser's `localStorage` API. There is no backend, no build step, and no external dependencies. The entire application ships as three files: `index.html`, `css/style.css`, and `js/app.js`.

### Key Design Decisions

- **No frameworks** — keeps the bundle size at zero and removes any dependency management overhead. Vanilla DOM APIs are sufficient for this scope.
- **Canvas-based pie chart** — drawn with the 2D Canvas API rather than an SVG or third-party chart library, keeping the dependency count at zero while giving full rendering control.
- **Single JS module** — all logic lives in `js/app.js`. Functions are organized by concern (storage, state, rendering, events) rather than split into multiple files, satisfying the one-file constraint.
- **Immutable transaction IDs** — each transaction is assigned a `crypto.randomUUID()` (or a timestamp-based fallback) at creation time so delete operations are O(1) array filter calls keyed by ID.

---

## Architecture

The application follows a simple **unidirectional data flow**:

```
User Action
    │
    ▼
Event Handler (in app.js)
    │
    ├─► Mutate State (in-memory array)
    │
    ├─► Persist State (localStorage)
    │
    └─► Re-render UI
            ├─► renderTransactionList()
            ├─► renderTotalBalance()
            └─► renderChart()
```

There is no virtual DOM or reactive framework. Every mutation triggers a full re-render of the three UI regions. Because the dataset is small (personal expense tracking), this is fast enough to meet the 100 ms update requirement.

### File Structure

```
CodingCamp-27Apr26-Dhina/
├── index.html          ← Single HTML page
├── css/
│   └── style.css       ← All styles (one file)
└── js/
    └── app.js          ← All logic (one file)
```

---

## Components and Interfaces

### 1. HTML Structure (`index.html`)

```
<body>
  <header>
    <h1>Expense & Budget Visualizer</h1>
    <div id="total-balance">Total: $0.00</div>
  </header>

  <main>
    <section id="form-section">
      <form id="transaction-form">
        <input  id="item-name"   type="text"   placeholder="Item name" />
        <input  id="item-amount" type="number" placeholder="Amount"    />
        <select id="item-category">
          <option value="">Select category</option>
          <option value="Food">Food</option>
          <option value="Transport">Transport</option>
          <option value="Fun">Fun</option>
        </select>
        <button type="submit">Add Transaction</button>
        <div id="form-errors" aria-live="polite"></div>
      </form>
    </section>

    <section id="list-section">
      <h2>Transactions</h2>
      <ul id="transaction-list"></ul>
    </section>

    <section id="chart-section">
      <h2>Spending by Category</h2>
      <canvas id="pie-chart" width="300" height="300"></canvas>
      <p id="chart-empty-msg" hidden>No transactions yet.</p>
    </section>
  </main>
</body>
```

### 2. CSS Layout (`css/style.css`)

- **Layout**: CSS Grid or Flexbox for the main three-column (or stacked on narrow viewports) layout.
- **Transaction list**: `overflow-y: auto; max-height: 400px` on `#transaction-list` to enable scrolling when items overflow.
- **Typography**: System font stack, clear size hierarchy (h1 > h2 > body).
- **Form errors**: Red inline text beneath the form, hidden by default, shown via `display: block`.
- **Delete button**: Styled as a small icon button aligned to the right of each list item.

### 3. JavaScript Module (`js/app.js`)

The file is organized into four logical sections:

#### 3.1 State

```js
// In-memory representation of all transactions
let transactions = [];  // Array<Transaction>
```

`Transaction` shape:
```js
{
  id:       string,   // crypto.randomUUID() or Date.now().toString()
  name:     string,   // item name
  amount:   number,   // positive float
  category: string    // "Food" | "Transport" | "Fun"
}
```

#### 3.2 Storage Functions

| Function | Signature | Description |
|---|---|---|
| `loadFromStorage()` | `() → Transaction[]` | Reads `localStorage.getItem('transactions')`, parses JSON, returns array (or `[]` on miss/error) |
| `saveToStorage(txns)` | `(Transaction[]) → void` | Serializes array to JSON and writes to `localStorage.setItem('transactions', ...)` |

#### 3.3 Validation Function

| Function | Signature | Description |
|---|---|---|
| `validateForm(name, amount, category)` | `(string, string, string) → string[]` | Returns an array of error message strings. Empty array means valid. Checks: name non-empty, amount is a finite positive number, category is one of the three valid values. |

#### 3.4 Render Functions

| Function | Description |
|---|---|
| `renderTransactionList(txns)` | Clears `#transaction-list`, then appends one `<li>` per transaction containing name, amount, category, and a delete `<button data-id="...">`. |
| `renderTotalBalance(txns)` | Computes `txns.reduce((sum, t) => sum + t.amount, 0)` and updates `#total-balance` text. |
| `renderChart(txns)` | Draws a pie chart on `#pie-chart` canvas. If `txns` is empty, hides canvas and shows `#chart-empty-msg`. Otherwise shows canvas, hides message, and draws segments. |
| `renderAll(txns)` | Calls all three render functions in sequence. |

#### 3.5 Pie Chart Drawing

`renderChart` uses the Canvas 2D API:

```
1. Clear canvas
2. If no transactions → show empty message, return
3. Aggregate amounts by category:
   { Food: number, Transport: number, Fun: number }
4. Compute total
5. For each category with amount > 0:
   a. Compute slice angle = (amount / total) * 2π
   b. Draw arc from currentAngle to currentAngle + sliceAngle
   c. Fill with category color
   d. Advance currentAngle
6. Optionally draw a legend below the canvas
```

Category color map:
```js
const CATEGORY_COLORS = {
  Food:      '#FF6384',
  Transport: '#36A2EB',
  Fun:       '#FFCE56'
};
```

#### 3.6 Event Handlers

| Event | Handler Logic |
|---|---|
| `DOMContentLoaded` | `transactions = loadFromStorage(); renderAll(transactions);` |
| `#transaction-form` submit | Validate → show errors or add transaction → save → renderAll |
| `#transaction-list` click (delegated) | If `event.target` has `data-id` → filter out that ID → save → renderAll |

Event delegation is used for delete buttons so that re-rendering the list does not require re-attaching listeners.

---

## Data Models

### Transaction Object

```js
/**
 * @typedef {Object} Transaction
 * @property {string} id         - Unique identifier (UUID or timestamp string)
 * @property {string} name       - Item name (non-empty string)
 * @property {number} amount     - Positive finite number
 * @property {string} category   - One of: "Food" | "Transport" | "Fun"
 */
```

### LocalStorage Schema

- **Key**: `"transactions"`
- **Value**: JSON-serialized `Transaction[]`
- **Example**: `[{"id":"abc123","name":"Lunch","amount":12.5,"category":"Food"}]`
- **On parse error or missing key**: defaults to `[]`

### Derived State (computed, never stored)

| Derived Value | Computation |
|---|---|
| `totalBalance` | `transactions.reduce((s, t) => s + t.amount, 0)` |
| `categoryTotals` | `transactions.reduce((acc, t) => { acc[t.category] = (acc[t.category] \|\| 0) + t.amount; return acc; }, {})` |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid Transaction Appears in List

*For any* valid transaction (non-empty name, positive numeric amount, valid category), after it is added to the application state, the rendered transaction list should contain exactly one entry for that transaction displaying its name, amount, and category.

**Validates: Requirements 1.2, 2.1**

---

### Property 2: Transaction Persistence Round-Trip

*For any* valid transaction, after it is added and `saveToStorage` is called, calling `loadFromStorage` should return a collection that contains a transaction with the same `id`, `name`, `amount`, and `category`.

**Validates: Requirements 1.3, 6.1**

---

### Property 3: Invalid Input Is Rejected

*For any* form submission where at least one field is empty or the amount is non-positive or non-numeric, `validateForm` should return a non-empty array of error messages and no transaction should be added to the state.

**Validates: Requirements 1.4, 1.5**

---

### Property 4: Form Resets After Successful Add

*For any* valid transaction submission, after the transaction is successfully added, all form input fields (name, amount, category) should be empty or reset to their default values.

**Validates: Requirements 1.6**

---

### Property 5: Delete Removes Transaction from List

*For any* transaction list containing at least one transaction, after the delete action is triggered for a specific transaction ID, the rendered list should no longer contain an entry with that ID.

**Validates: Requirements 3.1, 3.2**

---

### Property 6: Delete Removes Transaction from Storage

*For any* transaction that exists in LocalStorage, after the delete action is triggered for that transaction's ID and `saveToStorage` is called, calling `loadFromStorage` should return a collection that does not contain any transaction with that ID.

**Validates: Requirements 3.3, 6.2**

---

### Property 7: Total Balance Equals Sum of All Amounts

*For any* collection of transactions (including the empty collection), the value displayed in `#total-balance` should equal the arithmetic sum of all transaction amounts in that collection (and `$0.00` for an empty collection).

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

---

### Property 8: Chart Data Reflects Category Distribution

*For any* non-empty collection of transactions, the chart data computed by `renderChart` should contain exactly one segment per distinct category present in the collection, and each segment's proportional size should equal that category's total amount divided by the overall total amount.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

---

### Property 9: Full State Restored on Load

*For any* collection of transactions written to LocalStorage, initializing the application (simulating `DOMContentLoaded`) should result in the transaction list, total balance, and chart all reflecting that exact collection — no transactions missing, no extra transactions added.

**Validates: Requirements 2.3, 6.3**

---

## Error Handling

| Scenario | Handling Strategy |
|---|---|
| `localStorage` read returns `null` | `loadFromStorage` returns `[]`; app starts with empty state |
| `localStorage` contains malformed JSON | `try/catch` in `loadFromStorage` returns `[]`; app starts with empty state |
| `localStorage.setItem` throws (storage quota exceeded) | `try/catch` in `saveToStorage`; display a brief error notice to the user; in-memory state is still updated |
| Form submitted with empty fields | `validateForm` returns error strings; displayed in `#form-errors`; no state mutation |
| Form submitted with invalid amount | `validateForm` returns error string; displayed in `#form-errors`; no state mutation |
| Delete triggered for unknown ID | `Array.filter` produces no change; `saveToStorage` and `renderAll` still called (idempotent) |
| Canvas not supported | Wrap canvas operations in `if (canvas.getContext)` check; show a text fallback |



