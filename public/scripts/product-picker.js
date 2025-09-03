/**
 * Enhanced Product Picker with Autocomplete & Advanced Search
 * Podpowiedzi nazw produktów + zaawansowana wyszukiwarka
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
    this.suggestions = []; // Cache podpowiedzi
    this.cache = {};
    this.searchTimeout = null;
    this.suggestionTimeout = null;
    this.debounceDelay = 300;
    this.suggestionDelay = 100; // Szybsze dla autocomplete
    this.isLoading = false;
    this.minQueryLength = 2;
    this.selectedProduct = null;
    
    console.log('🚀 Enhanced ProductPicker for type:', this.type);
    
    this.init();
}

ProductPicker.prototype.init = function() {
    this.createDropdown();
    this.createAdvancedButton();
    this.bindEvents();
    this.loadProductSuggestions();
    this.updatePlaceholder();
};

// Załaduj nazwy produktów dla podpowiedzi
ProductPicker.prototype.loadProductSuggestions = function() {
    var self = this;
    
    if (!window.SellyAPI) return;
    
    console.log('📋 Loading suggestions for:', this.type);
    
    var searchTerms = this.type === 'listwa' ? 
        ['listwa', 'mdf', 'dąb'] : 
        this.type === 'gzyms' ? 
        ['gzyms', 'dolny', 'górny'] : 
        ['produkt'];
    
    searchTerms.forEach(function(term, index) {
        setTimeout(function() {
            window.SellyAPI.searchProducts(term, self.type, 30)
                .then(function(products) {
                    if (products && products.length > 0) {
                        var keywords = [];
                        products.forEach(function(product) {
                            keywords = keywords.concat(self.extractKeywords(product.name));
                        });
                        
                        // Usuń duplikaty
                        var unique = keywords.filter(function(item, pos) {
                            return keywords.indexOf(item) === pos && item.length > 2;
                        });
                        
                        self.suggestions = self.suggestions.concat(unique);
                        console.log('📝 Loaded', unique.length, 'suggestions for', term);
                    }
                })
                .catch(function(error) {
                    console.warn('Could not load suggestions:', error);
                });
        }, index * 200);
    });
};

// Wyciągnij słowa kluczowe z nazwy produktu
ProductPicker.prototype.extractKeywords = function(productName) {
    if (!productName) return [];
    
    var name = productName.toLowerCase();
    var keywords = [productName]; // Dodaj pełną nazwę
    
    // Materiały
    var materials = ['mdf', 'dąb', 'dab', 'sosna', 'wenge', 'poliuretan', 'drewno'];
    materials.forEach(function(mat) {
        if (name.indexOf(mat) !== -1) keywords.push(mat);
    });
    
    // Kolory
    var colors = ['biały', 'biała', 'czarny', 'czarna', 'szary', 'szara', 'złoty', 'naturalny'];
    colors.forEach(function(color) {
        if (name.indexOf(color) !== -1) keywords.push(color);
    });
    
    // Style
    var styles = ['klasyczny', 'nowoczesny', 'barokowy', 'minimalistyczny', 'ozdobny'];
    styles.forEach(function(style) {
        if (name.indexOf(style) !== -1) keywords.push(style);
    });
    
    // Wymiary
    var sizeMatch = name.match(/(\d+)\s*cm/g);
    if (sizeMatch) {
        keywords = keywords.concat(sizeMatch);
    }
    
    return keywords;
};

ProductPicker.prototype.updatePlaceholder = function() {
    var hint = this.type === 'listwa' ? 
        'Wpisz nazwę listwy (podpowiedzi automatyczne)...' :
        this.type === 'gzyms' ?
        'Wpisz nazwę gzymsu (podpowiedzi automatyczne)...' :
        'Wpisz nazwę produktu...';
    
    this.input.placeholder = hint;
};

ProductPicker.prototype.createDropdown = function() {
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'dd enhanced-picker-dd';
    this.dropdown.style.display = 'none';
    this.dropdown.setAttribute('role', 'listbox');
    this.wrap.appendChild(this.dropdown);
};

ProductPicker.prototype.createAdvancedButton = function() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-ghost btn-sm advanced-search-btn';
    btn.innerHTML = '🔍 Podobne';
    btn.title = 'Znajdź podobne produkty';
    btn.style.display = 'none';
    btn.style.marginLeft = '4px';
    btn.style.fontSize = '11px';
    btn.style.padding = '4px 8px';
    
    var self = this;
    btn.onclick = function(e) {
        e.preventDefault();
        self.openSimilarSearch();
    };
    
    this.wrap.appendChild(btn);
    this.advancedBtn = btn;
};

ProductPicker.prototype.bindEvents = function() {
    var self = this;
    
    this.input.addEventListener('input', function(e) {
        var value = e.target.value.trim();
        
        if (value.length === 0) {
            self.hideDropdown();
            self.hideAdvancedButton();
            return;
        }
        
        if (value.length >= self.getMinQueryLength()) {
            self.handleFullSearch(value);
        } else {
            self.showAutocomplete(value);
        }
    });
    
    this.input.addEventListener('keydown', function(e) {
        self.handleKeyboard(e);
    });
    
    this.input.addEventListener('focus', function(e) {
        var value = self.input.value.trim();
        if (value.length > 0) {
            if (value.length >= self.getMinQueryLength()) {
                self.handleFullSearch(value);
            } else {
                self.showAutocomplete(value);
            }
        } else {
            self.showStartHint();
        }
    });
    
    this.input.addEventListener('blur', function(e) {
        setTimeout(function() {
            self.hideDropdown();
        }, 200);
    });
    
    this.dropdown.addEventListener('mousedown', function(e) {
        e.preventDefault();
    });
};

// Pokaż podpowiedzi autocomplete
ProductPicker.prototype.showAutocomplete = function(query) {
    var self = this;
    
    clearTimeout(this.suggestionTimeout);
    
    this.suggestionTimeout = setTimeout(function() {
        if (self.suggestions.length === 0) {
            self.showStartHint();
            return;
        }
        
        var matches = self.suggestions.filter(function(suggestion) {
            return suggestion.toLowerCase().indexOf(query.toLowerCase()) !== -1;
        }).slice(0, 6);
        
        if (matches.length > 0) {
            self.renderAutocomplete(matches, query);
        } else {
            self.showStartHint();
        }
    }, this.suggestionDelay);
};

// Renderuj podpowiedzi autocomplete
ProductPicker.prototype.renderAutocomplete = function(matches, query) {
    var self = this;
    var categoryText = this.type === 'listwa' ? 'listwy' : this.type === 'gzyms' ? 'gzymsy' : 'produkty';
    
    var html = '<div class="autocomplete-section">' +
        '<div class="autocomplete-header">💡 Podpowiedzi (' + categoryText + '):</div>';
    
    html += matches.map(function(match, index) {
        var highlighted = self.highlightQuery(match, query);
        return '<div class="autocomplete-item" data-suggestion="' + index + '">' +
            '<span class="suggestion-icon">📝</span>' +
            '<span class="suggestion-text">' + highlighted + '</span>' +
            '<span class="suggestion-hint">↵ Enter</span>' +
        '</div>';
    }).join('');
    
    html += '<div class="autocomplete-footer">Wybierz podpowiedź lub kontynuuj wpisywanie</div>' +
            '</div>';
    
    this.dropdown.innerHTML = html;
    this.showDropdown();
    
    // Bind autocomplete clicks
    matches.forEach(function(match, index) {
        var item = self.dropdown.querySelector('[data-suggestion="' + index + '"]');
        if (item) {
            item.addEventListener('click', function() {
                self.input.value = match;
                self.handleFullSearch(match);
            });
        }
    });
};

// Highlight query w tekście
ProductPicker.prototype.highlightQuery = function(text, query) {
    if (!query) return this.escapeHtml(text);
    
    var escaped = this.escapeHtml(text);
    var regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return escaped.replace(regex, '<mark>$1</mark>');
};

// Pełne wyszukiwanie produktów
ProductPicker.prototype.handleFullSearch = function(query) {
    var self = this;
    
    clearTimeout(this.searchTimeout);
    
    this.searchTimeout = setTimeout(function() {
        self.searchProducts(query);
    }, this.debounceDelay);
};

ProductPicker.prototype.searchProducts = function(query) {
    var self = this;
    
    var cacheKey = this.type + '|' + query;
    if (this.cache[cacheKey]) {
        this.renderResults(this.cache[cacheKey]);
        return;
    }
    
    this.showLoading();
    
    if (window.SellyAPI) {
        window.SellyAPI.searchProducts(query, this.type, 12)
            .then(function(products) {
                self.cache[cacheKey] = products || [];
                self.renderResults(products || []);
            })
            .catch(function(error) {
                self.showError('Błąd wyszukiwania: ' + error.message);
            });
    } else {
        this.showError('API niedostępne');
    }
};

// Renderuj wyniki wyszukiwania
ProductPicker.prototype.renderResults = function(products) {
    var self = this;
    this.items = products || [];
    
    if (this.items.length === 0) {
        this.showNoResults();
        return;
    }
    
    var html = '<div class="results-header">📦 Znaleziono produktów: ' + this.items.length + '</div>';
    
    html += this.items.map(function(product, index) {
        return '<div class="product-row" data-index="' + index + '">' +
            '<div class="product-thumb">' +
                '<img src="https://placehold.co/45x45?text=' + (self.type === 'listwa' ? 'L' : 'G') + '" alt="produkt" />' +
            '</div>' +
            '<div class="product-info">' +
                '<div class="product-name">' + self.escapeHtml(product.name) + '</div>' +
                '<div class="product-meta">' +
                    '<span>📏 ' + (product.barLengthCm || '—') + ' cm</span>' +
                    '<span>💰 ' + (product.pricePLN || 0).toFixed(2) + ' zł</span>' +
                    '<span class="stock ' + (product.stockStatus || 'in-stock') + '">' + 
                    self.getStockText(product.stockStatus) + '</span>' +
                '</div>' +
                (product.sku ? '<div class="product-sku">SKU: ' + self.escapeHtml(product.sku) + '</div>' : '') +
            '</div>' +
            '<div class="product-actions">' +
                '<button type="button" class="select-btn" data-index="' + index + '">✓ Wybierz</button>' +
                '<button type="button" class="similar-btn" data-index="' + index + '">🔍 Podobne</button>' +
            '</div>' +
        '</div>';
    }).join('');
    
    this.dropdown.innerHTML = html;
    this.showDropdown();
    
    // Bind actions
    var selectBtns = this.dropdown.querySelectorAll('.select-btn');
    var similarBtns = this.dropdown.querySelectorAll('.similar-btn');
    
    selectBtns.forEach(function(btn) {
        btn.onclick = function(e) {
            e.preventDefault();
            var idx = parseInt(this.dataset.index);
            self.selectProduct(idx);
        };
    });
    
    similarBtns.forEach(function(btn) {
        btn.onclick = function(e) {
            e.preventDefault();
            var idx = parseInt(this.dataset.index);
            self.showSimilarProducts(idx);
        };
    });
    
    // Row clicks
    var rows = this.dropdown.querySelectorAll('.product-row');
    rows.forEach(function(row, index) {
        row.onclick = function(e) {
            if (!e.target.classList.contains('select-btn') && !e.target.classList.contains('similar-btn')) {
                self.selectProduct(index);
            }
        };
    });
};

// Wybierz produkt
ProductPicker.prototype.selectProduct = function(index) {
    if (index < 0 || index >= this.items.length) return;
    
    var product = this.items[index];
    console.log('✅ Selected:', product.name);
    
    this.input.value = product.name;
    this.selectedProduct = product;
    this.hideDropdown();
    
    // Pokaż przycisk zaawansowanej wyszukiwarki
    this.showAdvancedButton();
    
    // Update form fields
    if (this.onSelect) {
        this.onSelect(product);
    }
    
    this.updateProductPill(product);
};

// Pokaż podobne produkty
ProductPicker.prototype.showSimilarProducts = function(index) {
    if (index < 0 || index >= this.items.length) return;
    
    var baseProduct = this.items[index];
    console.log('🔍 Searching similar to:', baseProduct.name);
    
    this.showLoading('Szukam podobnych produktów...');
    
    var keywords = this.extractSimilarKeywords(baseProduct);
    var searchTerm = keywords.join(' ');
    
    var self = this;
    if (window.SellyAPI) {
        window.SellyAPI.searchProducts(searchTerm, this.type, 20)
            .then(function(products) {
                var similar = products.filter(function(p) {
                    return p.id !== baseProduct.id;
                }).sort(function(a, b) {
                    // Sort by price similarity
                    var aDiff = Math.abs(a.pricePLN - baseProduct.pricePLN);
                    var bDiff = Math.abs(b.pricePLN - baseProduct.pricePLN);
                    return aDiff - bDiff;
                });
                
                self.renderSimilarResults(similar, baseProduct);
            })
            .catch(function(error) {
                self.showError('Błąd wyszukiwania podobnych');
            });
    }
};

// Wyciągnij słowa dla wyszukiwania podobnych
ProductPicker.prototype.extractSimilarKeywords = function(product) {
    var name = product.name.toLowerCase();
    var keywords = [];
    
    // Materiał
    if (name.indexOf('mdf') !== -1) keywords.push('mdf');
    if (name.indexOf('dąb') !== -1 || name.indexOf('dab') !== -1) keywords.push('dąb');
    if (name.indexOf('sosna') !== -1) keywords.push('sosna');
    if (name.indexOf('wenge') !== -1) keywords.push('wenge');
    if (name.indexOf('poliuretan') !== -1) keywords.push('poliuretan');
    
    // Styl
    if (name.indexOf('klasyczny') !== -1) keywords.push('klasyczny');
    if (name.indexOf('nowoczesny') !== -1) keywords.push('nowoczesny');
    if (name.indexOf('barokowy') !== -1) keywords.push('barokowy');
    
    // Kolor
    if (name.indexOf('biały') !== -1 || name.indexOf('biała') !== -1) keywords.push('biały');
    if (name.indexOf('szary') !== -1 || name.indexOf('szara') !== -1) keywords.push('szary');
    
    // Typ jako fallback
    if (keywords.length === 0) {
        keywords.push(this.type);
    }
    
    return keywords;
};

// Renderuj podobne produkty
ProductPicker.prototype.renderSimilarResults = function(products, baseProduct) {
    var self = this;
    this.items = products || [];
    
    var html = '<div class="similar-section">' +
        '<div class="similar-header">' +
            '🔍 Podobne do: <strong>' + this.escapeHtml(baseProduct.name) + '</strong>' +
            '<button type="button" class="back-to-results">← Powrót</button>' +
        '</div>' +
        '<div class="base-product">' +
            'Bazowy: ' + baseProduct.barLengthCm + 'cm, ' + baseProduct.pricePLN.toFixed(2) + ' zł' +
        '</div>';
    
    if (this.items.length === 0) {
        html += '<div class="no-similar">Brak podobnych produktów</div>';
    } else {
        html += this.items.slice(0, 6).map(function(product, index) {
            var priceDiff = product.pricePLN - baseProduct.pricePLN;
            var diffText = priceDiff === 0 ? 'ta sama cena' :
                          priceDiff > 0 ? '+' + priceDiff.toFixed(2) + ' zł' :
                          priceDiff.toFixed(2) + ' zł';
            var diffClass = priceDiff < 0 ? 'cheaper' : priceDiff > 0 ? 'expensive' : 'same';
            
            return '<div class="similar-product" data-index="' + index + '">' +
                '<div class="similar-info">' +
                    '<div class="similar-name">' + self.escapeHtml(product.name) + '</div>' +
                    '<div class="similar-stats">' +
                        '<span>📏 ' + product.barLengthCm + 'cm</span>' +
                        '<span class="price-diff ' + diffClass + '">💰 ' + product.pricePLN.toFixed(2) + ' zł (' + diffText + ')</span>' +
                        '<span class="stock ' + (product.stockStatus || 'in-stock') + '">' + self.getStockText(product.stockStatus) + '</span>' +
                    '</div>' +
                '</div>' +
                '<button type="button" class="select-similar" data-index="' + index + '">✓ Wybierz</button>' +
            '</div>';
        }).join('');
    }
    
    html += '</div>';
    
    this.dropdown.innerHTML = html;
    this.showDropdown();
    
    // Bind events
    var backBtn = this.dropdown.querySelector('.back-to-results');
    if (backBtn) {
        backBtn.onclick = function() {
            self.handleFullSearch(self.input.value);
        };
    }
    
    var selectBtns = this.dropdown.querySelectorAll('.select-similar');
    selectBtns.forEach(function(btn) {
        btn.onclick = function() {
            var idx = parseInt(this.dataset.index);
            if (self.items[idx]) {
                self.selectProductDirectly(self.items[idx]);
            }
        };
    });
};

// Otwórz zaawansowaną wyszukiwarkę
ProductPicker.prototype.openSimilarSearch = function() {
    if (!this.selectedProduct) return;
    
    console.log('🔍 Opening advanced search for:', this.selectedProduct.name);
    
    var modal = this.createAdvancedModal();
    document.body.appendChild(modal);
};

// Utwórz modal zaawansowanej wyszukiwarki
ProductPicker.prototype.createAdvancedModal = function() {
    var self = this;
    var product = this.selectedProduct;
    
    var modal = document.createElement('div');
    modal.className = 'advanced-modal-overlay';
    modal.innerHTML = 
        '<div class="advanced-modal">' +
            '<div class="modal-header">' +
                '<h3>🔍 Zaawansowana wyszukiwarka</h3>' +
                '<button class="modal-close">✕</button>' +
            '</div>' +
            '<div class="modal-content">' +
                '<div class="current-selection">' +
                    '<strong>Aktualnie wybrane:</strong><br>' +
                    product.name + ' (' + product.barLengthCm + 'cm, ' + product.pricePLN.toFixed(2) + ' zł)' +
                '</div>' +
                '<div class="search-options">' +
                    '<h4>Znajdź produkty podobne pod względem:</h4>' +
                    '<div class="option-group">' +
                        '<button type="button" class="option-btn" data-search="material">🔧 Materiał</button>' +
                        '<button type="button" class="option-btn" data-search="size">📏 Podobny rozmiar (±20cm)</button>' +
                        '<button type="button" class="option-btn" data-search="price">💰 Podobna cena (±20%)</button>' +
                        '<button type="button" class="option-btn" data-search="style">🎨 Styl/kolor</button>' +
                        '<button type="button" class="option-btn" data-search="all">🔍 Wszystko podobne</button>' +
                    '</div>' +
                '</div>' +
                '<div class="custom-search">' +
                    '<h4>Lub wyszukaj custom:</h4>' +
                    '<div class="custom-inputs">' +
                        '<input type="text" class="custom-query" placeholder="Wpisz własne słowa kluczowe...">' +
                        '<button type="button" class="custom-search-btn">Szukaj</button>' +
                    '</div>' +
                '</div>' +
                '<div class="search-results-area" id="modalResults"></div>' +
            '</div>' +
        '</div>';
    
    // Bind modal events
    var closeBtn = modal.querySelector('.modal-close');
    closeBtn.onclick = function() {
        document.body.removeChild(modal);
    };
    
    modal.onclick = function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
    
    var optionBtns = modal.querySelectorAll('.option-btn');
    optionBtns.forEach(function(btn) {
        btn.onclick = function() {
            var searchType = this.dataset.search;
            self.executeAdvancedSearch(modal, searchType, product);
        };
    });
    
    var customBtn = modal.querySelector('.custom-search-btn');
    var customInput = modal.querySelector('.custom-query');
    
    customBtn.onclick = function() {
        var query = customInput.value.trim();
        if (query) {
            self.executeCustomSearch(modal, query);
        }
    };
    
    customInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            customBtn.click();
        }
    });
    
    return modal;
};

// Wykonaj zaawansowane wyszukiwanie
ProductPicker.prototype.executeAdvancedSearch = function(modal, searchType, baseProduct) {
    var self = this;
    var searchTerm = '';
    
    switch (searchType) {
        case 'material':
            var materials = this.extractSimilarKeywords(baseProduct).filter(function(k) {
                return ['mdf', 'dąb', 'sosna', 'wenge', 'poliuretan'].indexOf(k) !== -1;
            });
            searchTerm = materials.length > 0 ? materials[0] : this.type;
            break;
            
        case 'size':
            var length = baseProduct.barLengthCm;
            searchTerm = Math.round(length / 50) * 50 + 'cm'; // Round to nearest 50cm
            break;
            
        case 'price':
            var price = baseProduct.pricePLN;
            if (price < 50) searchTerm = 'tani';
            else if (price < 100) searchTerm = this.type;
            else searchTerm = 'premium';
            break;
            
        case 'style':
            var styles = this.extractSimilarKeywords(baseProduct).filter(function(k) {
                return ['klasyczny', 'nowoczesny', 'barokowy', 'biały', 'szary'].indexOf(k) !== -1;
            });
            searchTerm = styles.length > 0 ? styles[0] : this.type;
            break;
            
        default:
            searchTerm = this.type;
    }
    
    console.log('🔍 Advanced search:', searchType, 'term:', searchTerm);
    
    this.showModalLoading(modal, 'Wyszukuję ' + searchType + '...');
    
    window.SellyAPI.searchProducts(searchTerm, this.type, 25)
        .then(function(products) {
            var filtered = self.filterAdvancedResults(products, baseProduct, searchType);
            self.renderModalResults(modal, filtered, baseProduct, searchType);
        })
        .catch(function(error) {
            self.showModalError(modal, 'Błąd wyszukiwania: ' + error.message);
        });
};

// Wykonaj custom search
ProductPicker.prototype.executeCustomSearch = function(modal, query) {
    var self = this;
    
    console.log('🔍 Custom search:', query);
    
    this.showModalLoading(modal, 'Wyszukuję "' + query + '"...');
    
    window.SellyAPI.searchProducts(query, this.type, 25)
        .then(function(products) {
            self.renderModalResults(modal, products, self.selectedProduct, 'custom');
        })
        .catch(function(error) {
            self.showModalError(modal, 'Błąd custom search: ' + error.message);
        });
};

// Filtruj zaawansowane wyniki
ProductPicker.prototype.filterAdvancedResults = function(products, baseProduct, searchType) {
    if (!products || products.length === 0) return [];
    
    var filtered = products.filter(function(p) { return p.id !== baseProduct.id; });
    
    switch (searchType) {
        case 'size':
            var targetLength = baseProduct.barLengthCm;
            filtered = filtered.filter(function(p) {
                return Math.abs(p.barLengthCm - targetLength) <= 20; // ±20cm
            });
            break;
            
        case 'price':
            var targetPrice = baseProduct.pricePLN;
            var range = targetPrice * 0.3; // ±30%
            filtered = filtered.filter(function(p) {
                return Math.abs(p.pricePLN - targetPrice) <= range;
            });
            break;
    }
    
    return filtered.slice(0, 10);
};

// Renderuj wyniki w modalu
ProductPicker.prototype.renderModalResults = function(modal, products, baseProduct, searchType) {
    var resultsDiv = modal.querySelector('#modalResults');
    var self = this;
    
    if (!products || products.length === 0) {
        resultsDiv.innerHTML = '<div class="no-modal-results">❌ Brak wyników dla tego wyszukiwania</div>';
        return;
    }
    
    var html = '<div class="modal-results-header">' +
        'Znaleziono ' + products.length + ' produktów (' + searchType + ')' +
    '</div>';
    
    html += products.map(function(product, index) {
        var priceDiff = product.pricePLN - baseProduct.pricePLN;
        var sizeDiff = product.barLengthCm - baseProduct.barLengthCm;
        
        var priceDiffText = priceDiff === 0 ? 'Bez różnicy' :
                           priceDiff > 0 ? '+' + priceDiff.toFixed(2) + ' zł' :
                           priceDiff.toFixed(2) + ' zł';
                           
        var sizeDiffText = sizeDiff === 0 ? 'Ta sama długość' :
                          sizeDiff > 0 ? '+' + sizeDiff + ' cm' :
                          sizeDiff + ' cm';
        
        return '<div class="modal-result-item">' +
            '<div class="modal-product-info">' +
                '<div class="modal-product-name">' + self.escapeHtml(product.name) + '</div>' +
                '<div class="modal-product-comparison">' +
                    '<div class="comparison-item">💰 ' + product.pricePLN.toFixed(2) + ' zł (' + priceDiffText + ')</div>' +
                    '<div class="comparison-item">📏 ' + product.barLengthCm + ' cm (' + sizeDiffText + ')</div>' +
                    '<div class="comparison-item">📦 ' + self.getStockText(product.stockStatus) + '</div>' +
                '</div>' +
            '</div>' +
            '<button type="button" class="select-modal-product" data-index="' + index + '">✓ Wybierz</button>' +
        '</div>';
    }).join('');
    
    resultsDiv.innerHTML = html;
    
    // Bind select buttons
    var selectBtns = resultsDiv.querySelectorAll('.select-modal-product');
    selectBtns.forEach(function(btn) {
        btn.onclick = function() {
            var idx = parseInt(this.dataset.index);
            if (products[idx]) {
                self.selectProductDirectly(products[idx]);
                document.body.removeChild(modal);
            }
        };
    });
};

ProductPicker.prototype.selectProductDirectly = function(product) {
    this.input.value = product.name;
    this.selectedProduct = product;
    this.hideDropdown();
    this.showAdvancedButton();
    
    if (this.onSelect) {
        this.onSelect(product);
    }
    
    this.updateProductPill(product);
    console.log('✅ Direct selection:', product.name);
};

// Update product pill display
ProductPicker.prototype.updateProductPill = function(product) {
    var card = this.input.closest('.card');
    if (!card) return;
    
    var pillSelector = null;
    if (this.input.classList.contains('pickListwa')) pillSelector = '.prodNameL';
    else if (this.input.classList.contains('pickGd')) pillSelector = '.prodNameGd';
    else if (this.input.classList.contains('pickGu')) pillSelector = '.prodNameGu';
    
    if (pillSelector) {
        var pill = card.querySelector(pillSelector);
        if (pill) {
            pill.textContent = this.truncateText(product.name, 35);
            pill.style.display = 'inline-block';
            pill.title = product.name + '\n' + 
                        product.barLengthCm + 'cm, ' + 
                        product.pricePLN.toFixed(2) + ' zł\n' +
                        'SKU: ' + (product.sku || 'brak') + '\n' +
                        'Kliknij "🔍 Podobne" dla więcej opcji';
        }
    }
};

ProductPicker.prototype.showAdvancedButton = function() {
    if (this.advancedBtn) {
        this.advancedBtn.style.display = 'inline-block';
    }
};

ProductPicker.prototype.hideAdvancedButton = function() {
    if (this.advancedBtn) {
        this.advancedBtn.style.display = 'none';
    }
    this.selectedProduct = null;
};

// UI helper functions
ProductPicker.prototype.showStartHint = function() {
    var minChars = this.getMinQueryLength();
    var categoryText = this.type === 'listwa' ? 'listwy' : this.type === 'gzyms' ? 'gzymsy' : 'produkty';
    
    this.dropdown.innerHTML = 
        '<div class="start-hint">' +
            '<div class="hint-title">🔍 Wyszukiwanie (' + categoryText + ')</div>' +
            '<div class="hint-text">Wpisz co najmniej ' + minChars + ' znaki dla pełnego wyszukiwania</div>' +
            '<div class="hint-autocomplete">💡 Lub zacznij wpisywać aby zobaczyć podpowiedzi nazw</div>' +
            '<div class="hint-examples">Przykłady: ' + this.getExamples() + '</div>' +
        '</div>';
    this.showDropdown();
};

ProductPicker.prototype.getExamples = function() {
    return this.type === 'listwa' ? '"MDF", "dąb", "200cm"' : 
           this.type === 'gzyms' ? '"dolny", "klasyczny", "biały"' : 
           '"200cm", "biały"';
};

ProductPicker.prototype.showLoading = function(text) {
    text = text || 'Wyszukuję...';
    this.dropdown.innerHTML = 
        '<div class="loading-section">' +
            '<div class="spinner"></div>' +
            '<span>' + text + '</span>' +
        '</div>';
    this.showDropdown();
};

ProductPicker.prototype.showError = function(message) {
    this.dropdown.innerHTML = 
        '<div class="error-section">' +
            '<div>⚠️ ' + this.escapeHtml(message) + '</div>' +
            '<div class="error-help">Sprawdź konfigurację lub spróbuj ponownie</div>' +
        '</div>';
    this.showDropdown();
};

ProductPicker.prototype.showNoResults = function() {
    var minLength = this.getMinQueryLength();
    this.dropdown.innerHTML = 
        '<div class="no-results-section">' +
            '<div>❌ Brak wyników</div>' +
            '<div class="help-text">• Min. ' + minLength + ' znaków</div>' +
            '<div class="help-text">• Sprawdź pisownię</div>' +
            '<div class="help-text">• Spróbuj innych słów</div>' +
        '</div>';
    this.showDropdown();
};

ProductPicker.prototype.showModalLoading = function(modal, text) {
    var resultsDiv = modal.querySelector('#modalResults');
    resultsDiv.innerHTML = '<div class="modal-loading"><div class="spinner"></div><span>' + text + '</span></div>';
};

ProductPicker.prototype.showModalError = function(modal, message) {
    var resultsDiv = modal.querySelector('#modalResults');
    resultsDiv.innerHTML = '<div class="modal-error">⚠️ ' + message + '</div>';
};

// Navigation and utility functions
ProductPicker.prototype.handleKeyboard = function(e) {
    if (this.dropdown.style.display === 'none') return;
    
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            this.navigate(1);
            break;
        case 'ArrowUp':
            e.preventDefault();
            this.navigate(-1);
            break;
        case 'Enter':
            e.preventDefault();
            this.selectCurrent();
            break;
        case 'Escape':
            e.preventDefault();
            this.hideDropdown();
            break;
    }
};

ProductPicker.prototype.navigate = function(direction) {
    var items = this.dropdown.querySelectorAll('.autocomplete-item, .product-row');
    if (items.length === 0) return;
    
    this.selectedIndex += direction;
    if (this.selectedIndex < 0) this.selectedIndex = items.length - 1;
    if (this.selectedIndex >= items.length) this.selectedIndex = 0;
    
    items.forEach(function(item) { item.classList.remove('highlighted'); });
    if (items[this.selectedIndex]) {
        items[this.selectedIndex].classList.add('highlighted');
        items[this.selectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
};

ProductPicker.prototype.selectCurrent = function() {
    var highlighted = this.dropdown.querySelector('.highlighted');
    if (highlighted) {
        if (highlighted.classList.contains('autocomplete-item')) {
            var index = parseInt(highlighted.dataset.suggestion);
            var text = highlighted.querySelector('.suggestion-text').textContent;
            this.input.value = text;
            this.handleFullSearch(text);
        } else if (highlighted.classList.contains('product-row')) {
            var index = parseInt(highlighted.dataset.index);
            this.selectProduct(index);
        }
    }
};

ProductPicker.prototype.getMinQueryLength = function() {
    var status = window.getSellyStatus ? window.getSellyStatus() : { mode: 'demo' };
    return status.mode === 'api' ? 4 : 2;
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

ProductPicker.prototype.getStockText = function(status) {
    switch (status) {
        case 'out-of-stock': return '❌ Brak';
        case 'low-stock': return '⚠️ Mało';
        default: return '✅ Dostępny';
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

ProductPicker.prototype.destroy = function() {
    clearTimeout(this.searchTimeout);
    clearTimeout(this.suggestionTimeout);
    
    if (this.dropdown && this.dropdown.parentNode) {
        this.dropdown.parentNode.removeChild(this.dropdown);
    }
    
    if (this.advancedBtn && this.advancedBtn.parentNode) {
        this.advancedBtn.parentNode.removeChild(this.advancedBtn);
    }
    
    this.cache = {};
    this.suggestions = [];
};

// Global export
if (typeof window !== 'undefined') {
    window.ProductPicker = ProductPicker;
    console.log('🚀 Enhanced ProductPicker ready: Autocomplete + Advanced Search!');
}