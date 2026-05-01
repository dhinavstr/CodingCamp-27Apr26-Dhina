/* app.js */

/**
 * Loads transactions from localStorage.
 * @returns {Array} Parsed array of transactions, or [] on missing key or parse error.
 */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem('transactions');
    if (raw === null) {
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

/**
 * Saves transactions to localStorage.
 * On quota-exceeded error, displays a notice in #form-errors.
 * In-memory state is still updated regardless of storage errors.
 * @param {Array} txns - Array of transaction objects to persist.
 */
function saveToStorage(txns) {
  try {
    localStorage.setItem('transactions', JSON.stringify(txns));
  } catch (e) {
    if (
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    ) {
      const errEl = document.getElementById('form-errors');
      if (errEl) {
        errEl.textContent = 'Storage quota exceeded. Your data could not be saved.';
        errEl.style.display = 'block';
      }
    }
  }
}

/**
 * Validates the transaction form inputs.
 * @param {string} name - The item name value from the form.
 * @param {string} amount - The amount value from the form (as a string).
 * @param {string} category - The selected category value from the form.
 * @returns {string[]} Array of error message strings. Empty array means all inputs are valid.
 */
function validateForm(name, amount, category) {
  const errors = [];
  const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

  if (!name || name.trim() === '') {
    errors.push('Item name is required.');
  }

  const parsedAmount = parseFloat(amount);
  if (!amount || !isFinite(parsedAmount) || parsedAmount <= 0) {
    errors.push('Amount must be a positive number.');
  }

  if (!VALID_CATEGORIES.includes(category)) {
    errors.push('Category must be one of: Food, Transport, Fun.');
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Render Functions
// ---------------------------------------------------------------------------

/**
 * Renders the transaction list into #transaction-list.
 * Clears the list and re-populates it from the provided transactions array.
 * @param {Array} txns - Array of transaction objects.
 */
function renderTransactionList(txns) {
  const list = document.getElementById('transaction-list');
  list.innerHTML = '';

  txns.forEach(function (txn) {
    const li = document.createElement('li');
    li.className = 'transaction-item';

    const info = document.createElement('span');
    info.className = 'transaction-info';
    info.textContent = txn.name + ' — ' + txn.category;

    const amount = document.createElement('span');
    amount.className = 'transaction-amount';
    amount.textContent = '$' + txn.amount.toFixed(2);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.dataset.id = txn.id;
    deleteBtn.setAttribute('aria-label', 'Delete ' + txn.name);

    li.appendChild(info);
    li.appendChild(amount);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

/**
 * Renders the total balance into #total-balance.
 * Sums all transaction amounts and formats as "Total: $X.XX".
 * @param {Array} txns - Array of transaction objects.
 */
function renderTotalBalance(txns) {
  const total = txns.reduce(function (sum, t) {
    return sum + t.amount;
  }, 0);

  const balanceEl = document.getElementById('total-balance');
  balanceEl.textContent = 'Total: $' + total.toFixed(2);
}

// Category color map used by the pie chart
const CATEGORY_COLORS = {
  Food:      '#FF6384',
  Transport: '#36A2EB',
  Fun:       '#FFCE56'
};

/**
 * Renders a pie chart on #pie-chart canvas showing spending by category.
 * If txns is empty, hides the canvas and shows #chart-empty-msg instead.
 * Falls back to a text message if the Canvas API is unavailable.
 * @param {Array} txns - Array of transaction objects.
 */
function renderChart(txns) {
  const canvas = document.getElementById('pie-chart');
  const emptyMsg = document.getElementById('chart-empty-msg');

  // Handle empty state
  if (txns.length === 0) {
    canvas.hidden = true;
    emptyMsg.hidden = false;
    return;
  }

  // Check canvas support
  if (!canvas.getContext) {
    canvas.hidden = true;
    emptyMsg.textContent = 'Chart not supported in this browser.';
    emptyMsg.hidden = false;
    return;
  }

  canvas.hidden = false;
  emptyMsg.hidden = true;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Clear previous drawing
  ctx.clearRect(0, 0, width, height);

  // Aggregate amounts by category
  const categoryTotals = txns.reduce(function (acc, t) {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});

  // Compute grand total
  const grandTotal = Object.values(categoryTotals).reduce(function (sum, v) {
    return sum + v;
  }, 0);

  if (grandTotal === 0) {
    return;
  }

  // Draw pie segments
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 10;
  let startAngle = -Math.PI / 2; // Start from the top

  Object.keys(categoryTotals).forEach(function (category) {
    const amount = categoryTotals[category];
    if (amount <= 0) return;

    const sliceAngle = (amount / grandTotal) * 2 * Math.PI;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = CATEGORY_COLORS[category] || '#CCCCCC';
    ctx.fill();

    // Draw a subtle border between slices
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    startAngle += sliceAngle;
  });

  // Draw legend below the chart
  const legendX = 10;
  let legendY = height - (Object.keys(categoryTotals).length * 20) - 5;
  ctx.font = '13px sans-serif';

  Object.keys(categoryTotals).forEach(function (category) {
    const amount = categoryTotals[category];
    if (amount <= 0) return;

    const pct = ((amount / grandTotal) * 100).toFixed(1);

    // Color swatch
    ctx.fillStyle = CATEGORY_COLORS[category] || '#CCCCCC';
    ctx.fillRect(legendX, legendY - 12, 14, 14);

    // Label
    ctx.fillStyle = '#333333';
    ctx.fillText(category + ': $' + amount.toFixed(2) + ' (' + pct + '%)', legendX + 20, legendY);

    legendY += 20;
  });
}

/**
 * Calls all three render functions in sequence to fully update the UI.
 * @param {Array} txns - Array of transaction objects.
 */
function renderAll(txns) {
  renderTransactionList(txns);
  renderTotalBalance(txns);
  renderChart(txns);
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** Module-level transactions array — single source of truth. */
let transactions = [];

// ---------------------------------------------------------------------------
// Event Handlers
// ---------------------------------------------------------------------------

/**
 * 8.1 — Initialize state on DOMContentLoaded.
 * Loads persisted transactions from localStorage and renders the full UI.
 */
document.addEventListener('DOMContentLoaded', function () {
  transactions = loadFromStorage();
  renderAll(transactions);

  // ---------------------------------------------------------------------------
  // 8.2 — Handle form submission
  // ---------------------------------------------------------------------------
  const form = document.getElementById('transaction-form');
  const errEl = document.getElementById('form-errors');

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const name     = document.getElementById('item-name').value;
    const amount   = document.getElementById('item-amount').value;
    const category = document.getElementById('item-category').value;

    const errors = validateForm(name, amount, category);

    if (errors.length > 0) {
      // Display validation errors and bail out
      errEl.textContent = errors.join(' ');
      errEl.style.display = 'block';
      return;
    }

    // Clear any previous errors
    errEl.textContent = '';
    errEl.style.display = 'none';

    // Build the new transaction object
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Date.now().toString();

    const newTransaction = {
      id:       id,
      name:     name.trim(),
      amount:   parseFloat(amount),
      category: category
    };

    transactions.push(newTransaction);
    saveToStorage(transactions);
    renderAll(transactions);
    form.reset();
  });

  // ---------------------------------------------------------------------------
  // 8.3 — Handle delete via event delegation
  // ---------------------------------------------------------------------------
  const list = document.getElementById('transaction-list');

  list.addEventListener('click', function (event) {
    const targetId = event.target.dataset.id;
    if (!targetId) return; // Click was not on a delete button

    transactions = transactions.filter(function (t) {
      return t.id !== targetId;
    });

    saveToStorage(transactions);
    renderAll(transactions);
  });
});
