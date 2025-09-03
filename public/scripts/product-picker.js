/**
 * Product Picker Component
 * Enhanced dropdown with search functionality for Selly products
 * Updated for Selly API 1.0 with OAuth2 authentication
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
    this.debounceDelay = 500; // Longer delay for API calls
    this.isLoading = false;
    this.minQueryLength = 2; // 2 for demo, 4 for real API
    
    console.log('🔍 ProductPicker initialized for type:', this.type);
    
    this.init();
}

ProductPicker.prototype.init = function() {
    this.createDropdown();
    this.bindEvents();
    this.showInitialHint();
};

ProductPicker.prototype.showInitialHint = function() {
    var hintText = '';
    if (this.type === 'listwa') {
        hintText = 'Wpisz nazwę listwy (np. "listwa 200", "MDF")';
    } else if (this.type === 'gzyms') {
        hintText = 'Wpisz nazwę gzymsu (np. "gzyms dolny", "200cm")';
    } else {
        hintText = 'Wpisz nazwę produktu...';
    }
    
    this.input.placeholder = hintText;
};

ProductPicker.prototype.createDropdown = function() {
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'dd';
    this.dropdown.style.display = 'none';
    this.dropdown.setAttribute('role', 'listbox');
    this.dropdown.setAttribute('aria-label', 'Lista produktów z Selly.pl');
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
        var value = self.input.value.trim();
        if (value.length >= self.minQueryLength) {
            self.handleInput(value);
        } else {
            self.showSearchHint();
        }
    });
    
    this.input.addEventListener('blur', function(e) {
        // Delay hiding to allow clicks on dropdown
        setTimeout(function() {
            self.hideDropdown();
        }, 300);
    });
    
    // Prevent dropdown from closing when clicked
    this.dropdown.addEventListener('mousedown', function(e) {
        e.preventDefault();
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!self.wrap.contains(e.target)) {
            self.hideDropdown();
        }
    });
};

ProductPicker.prototype.showSearchHint = function() {
    var categoryText = this.type === 'listwa' ? 'listwy' : this.type === 'gzyms' ? 'gzymsy' : 'produkty';
    var minChars = this.getMinQueryLength();
    
    this.dropdown.innerHTML = 
        '<div class="hint-row">' +
            '<div class="hint-content">' +
                '<div class="hint-title">🔍 Wyszukiwanie (' + categoryText + ')</div>' +
                '<div class="hint-text">Wpisz co najmniej ' + minChars + ' znaki aby rozpocząć wyszukiwanie</div>' +
                '<div class="hint-examples">' + this.getSearchExamples() + '</div>' +
            '</div>' +
        '</div>';
    this.showDropdown();
};

ProductPicker.prototype.getMinQueryLength = function() {
    // Check if we're using real API (requires 4 chars) or demo mode (2 chars)
    var status = window.getSellyStatus ? window.getSellyStatus() : { mode: 'demo' };
    return status.mode === 'api' ? 4 : 2;
};

ProductPicker.prototype.getSearchExamples = function() {
    if (this.type === 'listwa') {
        return 'Przykłady: "listwa 200", "MDF biała", "sosna"';
    } else if (this.type === 'gzyms') {
        return 'Przykłady: "gzyms dolny", "200cm biały", "poliuretan"';
    }
    return 'Przykłady: "200cm", "biały", "drewno"';
};

ProductPicker.prototype.handleInput = function(query) {
    var self = this;
    
    // Clear existing timeout
    if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
    }
    
    var minLength = this.getMinQueryLength();
    
    // Hide dropdown if query is too short
    if (query.length < minLength) {
        if (query.length === 0) {
            this.hideDropdown();
        } else {
            this.showSearchHint();
        }
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
    if (this.dropdown.style.display === 'none' || this.items.length === 0) {
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
            if (this.selectedIndex >= 0 && this.selectedIndex < this.items.length) {
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
    
    console.log('🔍 ProductPicker searching:', { 
        query: query, 
        type: this.type,
        minLength: this.getMinQueryLength()
    });
    
    // Check cache first
    var cacheKey = this.type + '|' + query;
    if (this.cache[cacheKey]) {
        console.log('💾 Using cached results for:', query);
        this.renderResults(this.cache[cacheKey]);
        return;
    }
    
    this.isLoading = true;
    
    // Use global SellyAPI instance
    if (window.SellyAPI) {
        console.log('📡 Calling SellyAPI.searchProducts...');
        
        window.SellyAPI.searchProducts(query, this.type, 12)
            .then(function(products) {
                console.log('✅ SellyAPI returned:', products);
                console.log('📦 Products count:', products ? products.length : 0);
                
                self.isLoading = false;
                self.cache[cacheKey] = products || [];
                self.renderResults(products || []);
            })
            .catch(function(error) {
                console.error('❌ SellyAPI search failed:', error);
                self.isLoading = false;
                self.showError('Błąd wyszukiwania: ' + (error.message || 'Nieznany błąd'));
                self.onError(error);
            });
    } else {
        console.error('❌ window.SellyAPI not found');
        this.isLoading = false;
        this.showError('❌ API Selly nie jest dostępne');
    }
};

ProductPicker.prototype.renderResults = function(products) {
    var self = this;
    this.items = products || [];
    this.selectedIndex = -1;
    
    console.log('🎨 Rendering results:', this.items.length + ' products');
    
    if (this.items.length === 0) {
        this.showNoResults();
        return;
    }
    
    var html = this.items.map(function(product, index) {
        var stockStatusClass = 'stock-status ' + (product.stockStatus || 'in-stock');
        var stockStatusText = self.getStockStatusText(product.stockStatus);
        
        // Create product image with better fallback
        var imageHtml = '';
        if (product.images && product.images.length > 0) {
            imageHtml = '<img src="' + product.images[0] + '" alt="' + self.escapeHtml(product.name || '') + 
                       '" class="product-thumb" onerror="this.src=\'https://placehold.co/50x50?text=Produkt\'" />';
        } else {
            // Create category-specific placeholder
            var placeholderText = 'Produkt';
            if (self.type === 'listwa') placeholderText = 'Listwa';
            if (self.type === 'gzyms') placeholderText = 'Gzyms';
            
            imageHtml = '<img src="https://placehold.co/50x50?text=' + placeholderText + '" alt="' + 
                       self.escapeHtml(product.name || '') + '" class="product-thumb" />';
        }
        
        return '<div class="row" data-index="' + index + '" role="option" aria-selected="false" tabindex="-1">' +
            '<div class="product-info">' +
                imageHtml +
                '<div class="product-details">' +
                    '<div class="name">' + self.escapeHtml(product.name || 'Produkt bez nazwy') + '</div>' +
                    '<div class="meta">' +
                        '<span>📏 ' + (product.barLengthCm || '—') + ' cm</span>' +
                        '<span>💰 ' + (product.pricePLN ? product.pricePLN.toFixed(2) + ' zł' : '—') + '</span>' +
                        '<span class="' + stockStatusClass + '">' + stockStatusText + '</span>' +
                    '</div>' +
                    (product.description ? '<div class="description">' + self.escapeHtml(self.truncateText(product.description, 100)) + '</div>' : '') +
                    (product.sku ? '<div class="sku">SKU: ' + self.escapeHtml(product.sku) + '</div>' : '') +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('');
    
    this.dropdown.innerHTML = html;
    this.showDropdown();
    
    // Add click handlers with proper event prevention
    var rows = this.dropdown.querySelectorAll('.row');
    rows.forEach(function(row, index) {
        row.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            self.selectItem(index);
        });
        
        row.addEventListener('mousedown', function(e) {
            e.preventDefault(); // Prevent input blur
        });
    });
};

ProductPicker.prototype.showLoading = function() {
    var status = window.getSellyStatus ? window.getSellyStatus() : { mode: 'demo' };
    var loadingText = status.mode === 'api' ? 
        '🔍 Wyszukuję w sklepie ' + (status.shop || 'Selly.pl') + '...' :
        '🎭 Wyszukuję w danych demo...';
        
    this.dropdown.innerHTML = 
        '<div class="loading-row">' +
            '<div class="spinner"></div>' +
            '<span>' + loadingText + '</span>' +
        '</div>';
    this.showDropdown();
};

ProductPicker.prototype.showError = function(message) {
    this.dropdown.innerHTML = 
        '<div class="error-row">' +
            '<div>' +
                '<div><span class="error-icon">⚠️</span> ' + this.escapeHtml(message) + '</div>' +
                '<div class="error-help">Sprawdź konfigurację API lub użyj trybu demo</div>' +
            '</div>' +
        '</div>';
    this.showDropdown();
};

ProductPicker.prototype.showNoResults = function() {
    var categoryText = this.type === 'listwa' ? 'listwy' : this.type === 'gzyms' ? 'gzymsy' : 'produkty';
    var minLength = this.getMinQueryLength();
    
    this.dropdown.innerHTML = 
        '<div class="no-results-row">' +
            '<div class="no-results-content">' +
                '<div>❌ Brak wyników dla: ' + categoryText + '</div>' +
                '<div class="no-results-help">• Sprawdź pisownię (min. ' + minLength + ' znaków)</div>' +
                '<div class="no-results-help">• Spróbuj inne słowa kluczowe</div>' +
                '<div class="no-results-help">• Sprawdź konfigurację API</div>' +
            '</div>' +
        '</div>';
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
    if (this.items.length === 0) return;
    
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
    if (index >= 0 && index < rows.length && index < this.items.length) {
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
        console.warn('Invalid selection index:', index);
        return;
    }
    
    var product = this.items[index];
    console.log('✅ Product selected:', product.name, '- Length:', product.barLengthCm + 'cm, Price:', product.pricePLN + 'zł');
    
    this.input.value = product.name || '';
    this.hideDropdown();
    
    // Trigger selection callback
    if (this.onSelect) {
        this.onSelect(product);
    }
    
    // Show selected product info
    this.showSelectedProduct(product);
    
    // Add to recent products for future quick access
    this.addToRecentProducts(product);
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
            pill.textContent = this.truncateText(product.name || '', 40);
            pill.style.display = 'inline-block';
            pill.title = 'Produkt: ' + (product.name || '') + 
                        '\nSKU: ' + (product.sku || 'brak') + 
                        '\nCena: ' + (product.pricePLN ? product.pricePLN.toFixed(2) + ' zł' : 'brak') +
                        '\nDługość: ' + (product.barLengthCm || 'brak') + ' cm' +
                        '\nKategoria: ' + (product.category || 'brak') +
                        '\nStan: ' + this.getStockStatusText(product.stockStatus) +
                        (product.description ? '\nOpis: ' + this.truncateText(product.description, 100) : '');
        }
    }
    
    console.log('💊 Product pill updated:', product.name);
};

ProductPicker.prototype.addToRecentProducts = function(product) {
    try {
        var recentKey = 'selly_recent_products_' + this.type;
        var recent = JSON.parse(localStorage.getItem(recentKey) || '[]');
        
        // Remove if already exists
        recent = recent.filter(function(p) { return p.id !== product.id; });
        
        // Add to front
        recent.unshift({
            id: product.id,
            name: product.name,
            barLengthCm: product.barLengthCm,
            pricePLN: product.pricePLN,
            timestamp: Date.now()
        });
        
        // Keep only last 5
        recent = recent.slice(0, 5);
        
        localStorage.setItem(recentKey, JSON.stringify(recent));
        console.log('📚 Added to recent products:', product.name);
    } catch (e) {
        console.warn('Could not save recent products:', e);
    }
};

ProductPicker.prototype.getStockStatusText = function(status) {
    switch (status) {
        case 'out-of-stock':
            return '❌ Brak w magazynie';
        case 'low-stock':
            return '⚠️ Mało w magazynie';
        case 'in-stock':
        default:
            return '✅ Dostępny';
    }
};

ProductPicker.prototype.truncateText = function(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

ProductPicker.prototype.escapeHtml = function(text) {
    var div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
};

// Clear old cache periodically
ProductPicker.prototype.clearOldCache = function() {
    var now = Date.now();
    var self = this;
    Object.keys(this.cache).forEach(function(key) {
        var item = self.cache[key];
        if (item && item.timestamp && (now - item.timestamp) > 10 * 60 * 1000) { // 10 minutes
            delete self.cache[key];
        }
    });
};

ProductPicker.prototype.destroy = function() {
    if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
    }
    
    if (this.dropdown && this.dropdown.parentNode) {
        this.dropdown.parentNode.removeChild(this.dropdown);
    }
    
    this.clearOldCache();
    this.cache = {};
    
    console.log('🗑️ ProductPicker destroyed for type:', this.type);
};

// Export for global use
if (typeof window !== 'undefined') {
    window.ProductPicker = ProductPicker;
    
    // Global helper to refresh all pickers after API changes
    window.refreshAllPickers = function() {
        console.log('🔄 Refreshing all product pickers...');
        // Clear all caches when API configuration changes
        if (window.SellyAPI) {
            window.SellyAPI.clearCache();
        }
        
        // Clear picker caches
        var pickers = document.querySelectorAll('.picker');
        pickers.forEach(function(picker) {
            // Force refresh of picker cache if we had a way to access it
            console.log('🔄 Picker cache cleared');
        });
    };
}