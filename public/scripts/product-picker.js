/**
 * Product Picker Component
 * Enhanced dropdown with search functionality for Selly products
 */

function ProductPicker(inputElement, options) {
    var self = this;
    
    this.input = inputElement;
    this.type = options.type || '';
    this.onSelect = options.onSelect;
    this.onError = options.onError || function(error) { console.error('ProductPicker error:', error); };
    
    this.wrap = inputElement.closest('.picker');
    this.dropdown = null;
    this.selectedIndex = -1;
    this.items = [];
    this.cache = {};
    this.searchTimeout = null;
    this.debounceDelay = 300;
    this.isLoading = false;
    this.minQueryLength = 2;
    
    this.init();
}

ProductPicker.prototype.init = function() {
    this.createDropdown();
    this.bindEvents();
};

ProductPicker.prototype.createDropdown = function() {
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'dd';
    this.dropdown.style.display = 'none';
    this.dropdown.setAttribute('role', 'listbox');
    this.dropdown.setAttribute('aria-label', 'Lista produktów');
    this.wrap.appendChild(this.dropdown);
};

ProductPicker.prototype.bindEvents = function() {
    var self = this;
    
    // Input events
    this.input.addEventListener('input', function(e) {
        self.handleInput(e.target.value.trim());
    });
    
    this.input.addEventListener('keydown', function(e) {
        self.handleKeydown(e);
    });
    
    this.input.addEventListener('focus', function(e) {
        if (self.input.value.length >= self.minQueryLength) {
            self.handleInput(self.input.value.trim());
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!self.wrap.contains(e.target)) {
            self.hideDropdown();
        }
    });
    
    // Dropdown events
    this.dropdown.addEventListener('click', function(e) {
        var row = e.target.closest('.row');
        if (row) {
            var index = parseInt(row.dataset.index);
            self.selectItem(index);
        }
    });
    
    this.dropdown.addEventListener('mouseover', function(e) {
        var row = e.target.closest('.row');
        if (row) {
            var index = parseInt(row.dataset.index);
            self.highlightItem(index);
        }
    });
};

ProductPicker.prototype.handleInput = function(query) {
    var self = this;
    
    // Clear existing timeout
    if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
    }
    
    // Hide dropdown if query is too short
    if (query.length < this.minQueryLength) {
        this.hideDropdown();
        return;
    }
    
    // Set loading state
    this.showLoading();
    
    // Debounce the search
    this.searchTimeout = setTimeout(function() {
        self.searchProducts(query);
    }, this.debounceDelay);
};

ProductPicker.prototype.handleKeydown = function(e) {
    if (this.dropdown.style.display === 'none') {
        return;
    }
    
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            this.moveSelection(1);
            break;
        case 'ArrowUp':
            e.preventDefault();
            this.moveSelection(-1);
            break;
        case 'Enter':
            e.preventDefault();
            if (this.selectedIndex >= 0) {
                this.selectItem(this.selectedIndex);
            }
            break;
        case 'Escape':
            e.preventDefault();
            this.hideDropdown();
            this.input.blur();
            break;
        case 'Tab':
            this.hideDropdown();
            break;
    }
};

ProductPicker.prototype.searchProducts = function(query) {
    var self = this;
    
    // Check cache first
    var cacheKey = this.type + '|' + query;
    if (this.cache[cacheKey]) {
        this.renderResults(this.cache[cacheKey]);
        return;
    }
    
    this.isLoading = true;
    
    // Use global SellyAPI instance
    if (window.SellyAPI) {
        window.SellyAPI.searchProducts(query, this.type, 10)
            .then(function(products) {
                self.isLoading = false;
                self.cache[cacheKey] = products;
                self.renderResults(products);
            })
            .catch(function(error) {
                self.isLoading = false;
                self.showError('Błąd wyszukiwania produktów');
                self.onError(error);
            });
    } else {
        this.isLoading = false;
        this.showError('API Selly niedostępne');
    }
};

ProductPicker.prototype.renderResults = function(products) {
    this.items = products || [];
    this.selectedIndex = -1;
    
    if (this.items.length === 0) {
        this.showNoResults();
        return;
    }
    
    var html = this.items.map(function(product, index) {
        var stockStatusClass = 'stock-status ' + (product.stockStatus || 'in-stock');
        var stockStatusText = self.getStockStatusText(product.stockStatus);
        var imageHtml = product.images && product.images.length > 0 ? 
            '<img src="' + product.images[0] + '" alt="' + (product.name || '') + '" class="product-thumb" onerror="this.style.display=\'none\'" />' : '';
        
        return '<div class="row" data-index="' + index + '" role="option" aria-selected="false" tabindex="-1">' +
            '<div class="product-info">' +
                imageHtml +
                '<div class="product-details">' +
                    '<div class="name">' + self.escapeHtml(product.name || 'Produkt bez nazwy') + '</div>' +
                    '<div class="meta">' +
                        '<span>Długość: ' + (product.barLengthCm || '—') + ' cm</span>' +
                        '<span>Cena: ' + (product.pricePLN ? product.pricePLN.toFixed(2) + ' zł' : '—') + '</span>' +
                        '<span class="' + stockStatusClass + '">' + stockStatusText + '</span>' +
                    '</div>' +
                    (product.description ? '<div class="description">' + self.escapeHtml(product.description.substring(0, 100)) + '</div>' : '') +
                '</div>' +
            '</div>' +
        '</div>';
    });
    
    this.dropdown.innerHTML = html.join('');
    this.showDropdown();
    
    var self = this;
};

ProductPicker.prototype.showLoading = function() {
    this.dropdown.innerHTML = '<div class="loading-row"><div class="spinner"></div><span>Wyszukiwanie...</span></div>';
    this.showDropdown();
};

ProductPicker.prototype.showError = function(message) {
    this.dropdown.innerHTML = '<div class="error-row"><span class="error-icon">⚠️</span><span>' + this.escapeHtml(message) + '</span></div>';
    this.showDropdown();
};

ProductPicker.prototype.showNoResults = function() {
    this.dropdown.innerHTML = '<div class="no-results-row"><span>Brak wyników dla tego wyszukiwania</span></div>';
    this.showDropdown();
};

ProductPicker.prototype.showDropdown = function() {
    this.dropdown.style.display = 'block';
    this.dropdown.setAttribute('aria-expanded', 'true');
};

ProductPicker.prototype.hideDropdown = function() {
    this.dropdown.style.display = 'none';
    this.dropdown.setAttribute('aria-expanded', 'false');
    this.selectedIndex = -1;
};

ProductPicker.prototype.moveSelection = function(direction) {
    var newIndex = this.selectedIndex + direction;
    
    if (newIndex < 0) {
        newIndex = this.items.length - 1;
    } else if (newIndex >= this.items.length) {
        newIndex = 0;
    }
    
    this.highlightItem(newIndex);
};

ProductPicker.prototype.highlightItem = function(index) {
    // Remove previous highlight
    var rows = this.dropdown.querySelectorAll('.row');
    rows.forEach(function(row) {
        row.setAttribute('aria-selected', 'false');
        row.classList.remove('highlighted');
    });
    
    // Add new highlight
    if (index >= 0 && index < rows.length) {
        this.selectedIndex = index;
        rows[index].setAttribute('aria-selected', 'true');
        rows[index].classList.add('highlighted');
        
        // Scroll into view if needed
        rows[index].scrollIntoView({
            block: 'nearest',
            behavior: 'smooth'
        });
    }
};

ProductPicker.prototype.selectItem = function(index) {
    if (index < 0 || index >= this.items.length) {
        return;
    }
    
    var product = this.items[index];
    this.input.value = product.name || '';
    this.hideDropdown();
    
    // Trigger selection callback
    if (this.onSelect) {
        this.onSelect(product);
    }
    
    // Show selected product info
    this.showSelectedProduct(product);
};

ProductPicker.prototype.showSelectedProduct = function(product) {
    // Find pill element to show product name
    var card = this.input.closest('.card');
    if (!card) return;
    
    var pillSelector;
    if (this.input.classList.contains('pickListwa')) {
        pillSelector = '.prodNameL';
    } else if (this.input.classList.contains('pickGd')) {
        pillSelector = '.prodNameGd';
    } else if (this.input.classList.contains('pickGu')) {
        pillSelector = '.prodNameGu';
    }
    
    if (pillSelector) {
        var pill = card.querySelector(pillSelector);
        if (pill) {
            pill.textContent = product.name || '';
            pill.style.display = 'inline-block';
            pill.title = 'Produkt: ' + (product.name || '') + 
                        '\nSKU: ' + (product.sku || '') + 
                        '\nCena: ' + (product.pricePLN ? product.pricePLN.toFixed(2) + ' zł' : '—') +
                        '\nDługość: ' + (product.barLengthCm || '—') + ' cm' +
                        '\nStan: ' + this.getStockStatusText(product.stockStatus);
        }
    }
};

ProductPicker.prototype.getStockStatusText = function(status) {
    switch (status) {
        case 'out-of-stock':
            return 'Brak w magazynie';
        case 'low-stock':
            return 'Mało w magazynie';
        case 'in-stock':
        default:
            return 'Dostępny';
    }
};

ProductPicker.prototype.escapeHtml = function(text) {
    var div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
};

// Clear cache periodically
ProductPicker.prototype.clearOldCache = function() {
    // This could be enhanced to include timestamp-based cleanup
    this.cache = {};
};

ProductPicker.prototype.destroy = function() {
    if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
    }
    
    if (this.dropdown && this.dropdown.parentNode) {
        this.dropdown.parentNode.removeChild(this.dropdown);
    }
    
    this.cache = {};
};

// Export for global use
if (typeof window !== 'undefined') {
    window.ProductPicker = ProductPicker;
}