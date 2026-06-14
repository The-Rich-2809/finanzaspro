/* ==========================================================================
   FinanzasPro SPA Client Logic - Bootstrap 5 & Monthly Breakdown Edition
   ========================================================================== */

// --- 1. CONFIGURATION & STATE MOCK DATABASE ---
const API_URL = '/api/gastos';

// Emoji por categoría (para badges, leyenda y otros adornos visuales)
const CATEGORY_EMOJI = {
    Comida: '🍔',
    Servicios: '💡',
    Entretenimiento: '🎮',
    Transporte: '🚗',
    Otros: '📦'
};
const emojiFor = (cat) => CATEGORY_EMOJI[cat] || '📦';

// Simulated DB stored in LocalStorage for out-of-the-box local interactivity
const mockDB = {
    getExpenses() {
        const data = localStorage.getItem('finanzaspro_expenses_bs');
        return data ? JSON.parse(data) : [];
    },
    saveExpenses(expenses) {
        localStorage.setItem('finanzaspro_expenses_bs', JSON.stringify(expenses));
    }
};

// --- 2. API REQUEST LAYER (FETCH WITH LOCAL FALLBACK) ---
async function apiFetch(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP Error Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.warn(`[API Fallback] Error en fetch: "${error.message}". Usando LocalStorage como respaldo.`);
        return null; // Signals the app layer to use local mock database
    }
}

class ExpenseService {
    static async getExpenses() {
        const data = await apiFetch(API_URL);
        if (data) return data;
        return mockDB.getExpenses();
    }

    static async addExpense(expense) {
        const data = await apiFetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expense)
        });
        if (data) return data;

        // Fallback Logic
        const expenses = mockDB.getExpenses();
        const newExpense = { id: Date.now(), ...expense };
        expenses.unshift(newExpense);
        mockDB.saveExpenses(expenses);
        return newExpense;
    }

    static async deleteExpense(id) {
        const data = await apiFetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
        if (data) return data;

        // Fallback Logic
        let expenses = mockDB.getExpenses();
        expenses = expenses.filter(exp => exp.id !== id);
        mockDB.saveExpenses(expenses);
        return { success: true, id };
    }
}

// --- 3. APPLICATION CONTROLLER ---
class App {
    constructor() {
        this.expenses = [];
        
        // Dom Cache
        this.dom = {
            tabs: document.querySelectorAll('.nav-tab'),
            sections: document.querySelectorAll('.spa-section'),
            
            // Dashboard values
            valTotalSpent: document.getElementById('val-total-spent'),
            valMonthSpent: document.getElementById('val-month-spent'),
            valAvgSpent: document.getElementById('val-avg-spent'),
            
            // Container for monthly spending progress bars
            monthlyBreakdownContainer: document.getElementById('monthly-breakdown-container'),
            
            // Chart elements
            chartSvg: document.getElementById('donut-chart-svg'),
            chartPct: document.getElementById('chart-pct'),
            chartLegend: document.getElementById('chart-legend-container'),
            
            // Form elements
            form: document.getElementById('expense-form'),
            inputConcept: document.getElementById('expense-concept'),
            inputAmount: document.getElementById('expense-amount'),
            inputCategory: document.getElementById('expense-category'),
            inputDate: document.getElementById('expense-date'),
            btnClearForm: document.getElementById('btn-clear-form'),
            
            // Filters & Table
            filterSearch: document.getElementById('filter-search'),
            filterCategory: document.getElementById('filter-category'),
            tableBody: document.getElementById('expenses-table-body'),
            tableEmpty: document.getElementById('table-empty'),
            
            // Toasts
            toastContainer: document.getElementById('toast-container')
        };

        this.init();
    }

    async init() {
        this.setupNavigation();
        this.setupEventListeners();
        this.setDefaultDate();
        await this.loadData();
        
        // Render initial view
        this.updateUI();
        
        // Initialize Lucide Icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // Navigation setup supporting top nav (desktop) and bottom nav (mobile)
    setupNavigation() {
        this.dom.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.dataset.target;
                this.switchSection(targetId);
            });
        });
    }

    switchSection(sectionId) {
        // Sync active state on all navigation tab items (Desktop + Mobile)
        this.dom.tabs.forEach(t => {
            if (t.dataset.target === sectionId) {
                t.classList.add('active'); // Desktop style
                t.classList.add('active-mobile-tab'); // Mobile style
            } else {
                t.classList.remove('active');
                t.classList.remove('active-mobile-tab');
            }
        });

        // Toggle SPA sections
        this.dom.sections.forEach(sec => {
            if (sec.id === sectionId) {
                sec.classList.add('active');
            } else {
                sec.classList.remove('active');
            }
        });
        
        // Re-draw Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // Smoothly scroll to top
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    // Set today as default date in form input
    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        if (this.dom.inputDate) {
            this.dom.inputDate.value = today;
        }
    }

    // Setup user interaction event listeners
    setupEventListeners() {
        // Form submission & validation
        if (this.dom.form) {
            this.dom.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        if (this.dom.btnClearForm) {
            this.dom.btnClearForm.addEventListener('click', () => this.clearForm());
        }

        // Filters in History
        if (this.dom.filterSearch) {
            this.dom.filterSearch.addEventListener('input', () => this.renderHistoryTable());
        }
        if (this.dom.filterCategory) {
            this.dom.filterCategory.addEventListener('change', () => this.renderHistoryTable());
        }
    }

    // Load data from ExpenseService (API / localStorage)
    async loadData() {
        try {
            this.expenses = await ExpenseService.getExpenses();
        } catch (error) {
            console.error('Error cargando los datos iniciales:', error);
            this.showToast('Error al conectar con la base de datos.', 'danger');
        }
    }

    // Write all updates to the DOM
    updateUI() {
        this.calculateMetrics();
        this.renderMonthlyBreakdown();
        this.renderDonutChart();
        this.renderHistoryTable();
    }

    // Calculate overall totals, current month totals, and averages
    calculateMetrics() {
        if (this.expenses.length === 0) {
            if (this.dom.valTotalSpent) this.dom.valTotalSpent.textContent = this.formatCurrency(0);
            if (this.dom.valMonthSpent) this.dom.valMonthSpent.textContent = this.formatCurrency(0);
            if (this.dom.valAvgSpent) this.dom.valAvgSpent.textContent = this.formatCurrency(0);
            return;
        }

        // 1. Total spent (all-time)
        const totalSpent = this.expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        
        // 2. Spent in current calendar month (June 2026 based on mock/system date)
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-indexed

        const currentMonthSpent = this.expenses.reduce((sum, exp) => {
            const expDate = new Date(exp.date + 'T00:00:00');
            if (expDate.getFullYear() === currentYear && expDate.getMonth() === currentMonth) {
                return sum + parseFloat(exp.amount);
            }
            return sum;
        }, 0);

        // 3. Average spent per month
        // Group by month keys first
        const monthGroups = {};
        this.expenses.forEach(exp => {
            const monthKey = exp.date.substring(0, 7); // "YYYY-MM"
            monthGroups[monthKey] = (monthGroups[monthKey] || 0) + parseFloat(exp.amount);
        });
        const totalMonths = Object.keys(monthGroups).length || 1;
        const avgSpent = totalSpent / totalMonths;

        // Update DOM
        if (this.dom.valTotalSpent) this.dom.valTotalSpent.textContent = this.formatCurrency(totalSpent);
        if (this.dom.valMonthSpent) this.dom.valMonthSpent.textContent = this.formatCurrency(currentMonthSpent);
        if (this.dom.valAvgSpent) this.dom.valAvgSpent.textContent = this.formatCurrency(avgSpent);
    }

    // Group and render month-by-month spending bars
    renderMonthlyBreakdown() {
        const container = this.dom.monthlyBreakdownContainer;
        if (!container) return;

        container.innerHTML = '';

        if (this.expenses.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5 text-secondary">
                    <i data-lucide="folder-open" class="d-block mx-auto mb-2 opacity-50" style="width: 40px; height: 40px;"></i>
                    <span>📭 Aún no hay datos históricos mensuales.</span>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        // Group by Month
        const monthlyData = {};
        this.expenses.forEach(exp => {
            const dateObj = new Date(exp.date + 'T00:00:00');
            const monthLabel = dateObj.toLocaleString('es-MX', { month: 'long', year: 'numeric' });
            const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
            
            const sortKey = exp.date.substring(0, 7); // "YYYY-MM"

            if (!monthlyData[sortKey]) {
                monthlyData[sortKey] = {
                    label: capitalizedMonth,
                    total: 0
                };
            }
            monthlyData[sortKey].total += parseFloat(exp.amount);
        });

        // Get sorted list of months descending (newest first)
        const sortedMonths = Object.keys(monthlyData)
            .sort((a, b) => b.localeCompare(a))
            .map(key => ({
                key,
                label: monthlyData[key].label,
                total: monthlyData[key].total
            }));

        // Find max monthly spending to scale progress bars
        const maxSpent = Math.max(...sortedMonths.map(m => m.total), 1);

        sortedMonths.forEach(m => {
            const pctOfMax = Math.round((m.total / maxSpent) * 100);
            
            const itemDiv = document.createElement('div');
            itemDiv.className = 'mb-2';
            itemDiv.innerHTML = `
                <div class="d-flex justify-content-between mb-1">
                    <span class="monthly-bar-label">${m.label}</span>
                    <span class="monthly-bar-value">${this.formatCurrency(m.total)}</span>
                </div>
                <div class="progress" style="height: 10px;">
                    <div class="progress-bar progress-bar-custom" role="progressbar" style="width: ${pctOfMax}%" aria-valuenow="${pctOfMax}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            `;
            container.appendChild(itemDiv);
        });
    }

    // Render SVG Category Distribution Chart
    renderDonutChart() {
        const svg = this.dom.chartSvg;
        const legend = this.dom.chartLegend;
        const pctLabel = this.dom.chartPct;

        if (!svg || !legend) return;

        svg.innerHTML = '';
        legend.innerHTML = '';

        const categories = ['Comida', 'Servicios', 'Entretenimiento', 'Transporte', 'Otros'];
        const colors = {
            Comida: 'var(--cat-comida)',
            Servicios: 'var(--cat-servicios)',
            Entretenimiento: 'var(--cat-entretenimiento)',
            Transporte: 'var(--cat-transporte)',
            Otros: 'var(--cat-otros)'
        };

        const categoryTotals = {};
        categories.forEach(c => categoryTotals[c] = 0);
        
        let totalSpent = 0;
        this.expenses.forEach(exp => {
            if (categoryTotals[exp.category] !== undefined) {
                categoryTotals[exp.category] += parseFloat(exp.amount);
                totalSpent += parseFloat(exp.amount);
            }
        });

        if (totalSpent === 0) {
            svg.innerHTML = '<circle class="donut-bg" cx="100" cy="100" r="70"></circle>';
            if (pctLabel) pctLabel.textContent = '0%';
            legend.innerHTML = '<div class="text-secondary small text-center">📊 Sin gastos registrados</div>';
            return;
        }

        // Base circle
        const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bgCircle.setAttribute('class', 'donut-bg');
        bgCircle.setAttribute('cx', '100');
        bgCircle.setAttribute('cy', '100');
        bgCircle.setAttribute('r', '70');
        svg.appendChild(bgCircle);

        const radius = 70;
        const circumference = 2 * Math.PI * radius; // ~439.82
        let accumulatedPercent = 0;

        const sortedCats = categories
            .map(cat => ({ name: cat, total: categoryTotals[cat], color: colors[cat] }))
            .filter(item => item.total > 0)
            .sort((a, b) => b.total - a.total);

        sortedCats.forEach(item => {
            const percent = item.total / totalSpent;
            const strokeLength = percent * circumference;
            const strokeOffset = -accumulatedPercent * circumference;

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('class', 'donut-segment');
            circle.setAttribute('cx', '100');
            circle.setAttribute('cy', '100');
            circle.setAttribute('r', '70');
            circle.setAttribute('stroke', item.color);
            circle.setAttribute('stroke-dasharray', `${strokeLength} ${circumference}`);
            circle.setAttribute('stroke-dashoffset', strokeOffset.toString());
            svg.appendChild(circle);

            accumulatedPercent += percent;

            // Legend item
            const legendItem = document.createElement('div');
            legendItem.className = 'd-flex align-items-center justify-content-between text-secondary';
            legendItem.style.fontSize = '0.8rem';
            legendItem.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <span class="legend-color-pill" style="background-color: ${item.color}"></span>
                    <span>${emojiFor(item.name)} ${item.name}</span>
                </div>
                <span class="fw-semibold text-light">${this.formatCurrency(item.total)} (${Math.round(percent * 100)}%)</span>
            `;
            legend.appendChild(legendItem);
        });

        if (pctLabel) {
            pctLabel.textContent = this.formatCurrencyShort(totalSpent);
        }
    }

    // Render complete History table with filters
    renderHistoryTable() {
        const tbody = this.dom.tableBody;
        if (!tbody) return;

        tbody.innerHTML = '';

        const searchText = this.dom.filterSearch ? this.dom.filterSearch.value.toLowerCase().trim() : '';
        const selectedCategory = this.dom.filterCategory ? this.dom.filterCategory.value : 'Todos';

        const filtered = this.expenses.filter(exp => {
            const matchesSearch = exp.concept.toLowerCase().includes(searchText);
            const matchesCategory = selectedCategory === 'Todos' || exp.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });

        if (filtered.length === 0) {
            this.dom.tableEmpty.classList.remove('d-none');
            return;
        }

        this.dom.tableEmpty.classList.add('d-none');

        const categoryClasses = {
            Comida: 'badge-comida',
            Servicios: 'badge-servicios',
            Entretenimiento: 'badge-entretenimiento',
            Transporte: 'badge-transporte',
            Otros: 'badge-otros'
        };

        filtered.forEach(exp => {
            const tr = document.createElement('tr');
            const badgeClass = categoryClasses[exp.category] || 'badge-otros';

            tr.innerHTML = `
                <td class="ps-3 text-secondary" style="font-size: 0.85rem;">${this.formatDate(exp.date)}</td>
                <td><span class="fw-semibold text-light text-break">${this.escapeHTML(exp.concept)}</span></td>
                <td><span class="badge-custom ${badgeClass}">${emojiFor(exp.category)} ${exp.category}</span></td>
                <td class="text-end text-danger fw-semibold">-${this.formatCurrency(exp.amount)}</td>
                <td class="text-center">
                    <button class="btn-delete-item" data-id="${exp.id}" title="Eliminar gasto">
                        <i data-lucide="trash-2" style="width: 16px;"></i>
                    </button>
                </td>
            `;

            // Delete event
            tr.querySelector('.btn-delete-item').addEventListener('click', () => {
                this.handleDeleteExpense(exp.id, exp.concept);
            });

            tbody.appendChild(tr);
        });

        if (window.lucide) window.lucide.createIcons();
    }

    // Form submission processing
    async handleFormSubmit(e) {
        e.preventDefault();
        
        const form = this.dom.form;
        form.classList.add('was-validated');

        if (!this.validateForm()) {
            return;
        }

        const newExpenseData = {
            concept: this.dom.inputConcept.value.trim(),
            amount: parseFloat(this.dom.inputAmount.value),
            category: this.dom.inputCategory.value,
            date: this.dom.inputDate.value
        };

        this.setSubmitButtonLoading(true);

        try {
            const created = await ExpenseService.addExpense(newExpenseData);
            
            // Insert at the beginning of state array
            this.expenses.unshift(created);
            this.updateUI();
            this.clearForm();
            this.showToast('✅ Gasto guardado correctamente.', 'success');
            
            // Route back to dashboard
            setTimeout(() => {
                this.switchSection('dashboard');
            }, 600);

        } catch (error) {
            console.error('Error al guardar el gasto:', error);
            this.showToast('❌ Error de conexión. Intente más tarde.', 'danger');
        } finally {
            this.setSubmitButtonLoading(false);
        }
    }

    // Form validation
    validateForm() {
        let isValid = true;

        // Concept validation
        if (!this.dom.inputConcept.value.trim()) {
            this.dom.inputConcept.classList.add('is-invalid');
            isValid = false;
        } else {
            this.dom.inputConcept.classList.remove('is-invalid');
        }

        // Amount validation
        const amount = parseFloat(this.dom.inputAmount.value);
        if (isNaN(amount) || amount <= 0) {
            this.dom.inputAmount.classList.add('is-invalid');
            isValid = false;
        } else {
            this.dom.inputAmount.classList.remove('is-invalid');
        }

        // Category validation
        if (!this.dom.inputCategory.value) {
            this.dom.inputCategory.classList.add('is-invalid');
            isValid = false;
        } else {
            this.dom.inputCategory.classList.remove('is-invalid');
        }

        // Date validation
        if (!this.dom.inputDate.value) {
            this.dom.inputDate.classList.add('is-invalid');
            isValid = false;
        } else {
            this.dom.inputDate.classList.remove('is-invalid');
        }

        return isValid;
    }

    // Reset form elements
    clearForm() {
        this.dom.form.reset();
        this.setDefaultDate();
        this.dom.form.classList.remove('was-validated');
        
        this.dom.inputConcept.classList.remove('is-invalid');
        this.dom.inputAmount.classList.remove('is-invalid');
        this.dom.inputCategory.classList.remove('is-invalid');
        this.dom.inputDate.classList.remove('is-invalid');
    }

    // Expense deletion handler
    async handleDeleteExpense(id, concept) {
        if (!confirm(`¿Deseas eliminar el gasto "${concept}"?`)) {
            return;
        }

        try {
            const res = await ExpenseService.deleteExpense(id);
            if (res.success) {
                this.expenses = this.expenses.filter(exp => exp.id !== id);
                this.updateUI();
                this.showToast(`🗑️ Gasto "${concept}" eliminado.`, 'warning');
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
            this.showToast('❌ No se pudo eliminar el gasto.', 'danger');
        }
    }

    // Currency Formatting
    formatCurrency(value) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(value);
    }

    // Compressed currency format (e.g. $1.2k) for donut chart center label
    formatCurrencyShort(value) {
        if (value >= 1000) {
            return '$' + (value / 1000).toFixed(1) + 'k';
        }
        return this.formatCurrency(value).split('.')[0]; // no decimals for small amounts
    }

    formatDate(dateString) {
        const dateObj = new Date(dateString + 'T00:00:00');
        return new Intl.DateTimeFormat('es-MX', {
            day: '2-digit',
            month: 'short'
        }).format(dateObj);
    }

    escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    setSubmitButtonLoading(isLoading) {
        const btn = document.getElementById('btn-submit-expense');
        if (!btn) return;

        if (isLoading) {
            btn.disabled = true;
            btn.innerHTML = `<i data-lucide="loader-2" class="spin-animation me-1" style="width: 16px;"></i> Guardando...`;
        } else {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="plus" class="me-1" style="width: 16px;"></i> Guardar Gasto 💾`;
        }
        if (window.lucide) window.lucide.createIcons();
    }

    // Dynamic toast creation
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast-custom toast-custom-${type}`;
        
        let iconName = 'check-circle';
        if (type === 'danger') iconName = 'alert-octagon';
        if (type === 'warning') iconName = 'alert-triangle';

        toast.innerHTML = `
            <i data-lucide="${iconName}"></i>
            <span>${message}</span>
        `;

        this.dom.toastContainer.appendChild(toast);
        
        if (window.lucide) window.lucide.createIcons();

        // Auto remove toast after 3s
        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }, 3000);
    }
}

// Start App when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
