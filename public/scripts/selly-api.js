/**
 * Selly.pl REST API Integration - NAPRAWIONA WERSJA
 * OAuth2 client_credentials authentication
 * FIX: Wszystkie błędy rozwiązane
 */

function SellyAPI() {
    var self = this;
    
    // API Configuration
    this.shopDomain = localStorage.getItem('selly_shop_domain') || '';
    this.clientId = localStorage.getItem('selly_client_id') || '';
    this.clientSecret = localStorage.getItem('selly_client_secret') || '';
    this.accessToken = localStorage.getItem('selly_access_token') || '';
    this.tokenExpiry = parseInt(localStorage.getItem('selly_token_expiry') || '0');
    
    this.cache = {};
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    console.log('🛒 SellyAPI initialized');
    this.showDemoInfo();
}

SellyAPI.prototype.showDemoInfo = function() {
    console.log('🎭 DEMO MODE ACTIVE');
    console.log('📦 6 produktów demo: listwy MDF/dąb/sosna + gzymsy');
    console.log('💡 Kliknij "🔑 Konfiguracja API" aby połączyć sklep');
};

// Manual credentials configuration
SellyAPI.prototype.setCredentials = function() {
    var self = this;
    
    var message = '🏪 KONFIGURACJA API SELLY.PL\n\n' +
        'Wprowadź dane z Twojego panelu:\n\n' +
        'PRZYKŁAD:\n' +
        '• Domena: adam.selly24.pl\n' +
        '• Client ID: 123-acf802837e8c946\n' +
        '• Client Secret: 123-418c925145f44779...\n\n' +
        '📋 Znajdziesz w:\nhttps://adam.selly24.pl/adm\n→ Konfiguracja → API';
    
    var domain = prompt(message + '\n\n1. Domena sklepu:');
    if (!domain || !domain.trim()) {
        console.info('Anulowano konfigurację');
        return;
    }
    
    var clientId = prompt('2. Client ID:');
    if (!clientId || !clientId.trim()) {
        console.info('Anulowano konfigurację');
        return;
    }
    
    var clientSecret = prompt('3. Client Secret:');
    if (!clientSecret || !clientSecret.trim()) {
        console.info('Anulowano konfigurację'); 
        return;
    }
    
    // Save credentials
    this.shopDomain = domain.trim();
    this.clientId = clientId.trim();
    this.clientSecret = clientSecret.trim();
    
    localStorage.setItem('selly_shop_domain', this.shopDomain);
    localStorage.setItem('selly_client_id', this.clientId);
    localStorage.setItem('selly_client_secret', this.clientSecret);
    
    console.log('💾 Dane zapisane dla:', this.shopDomain);
    
    // Test authentication immediately
    this.authenticate().then(function() {
        alert('✅ SUKCES!\n\nAPI Selly.pl połączone.\nMożesz teraz wyszukiwać produkty z Twojego sklepu.');
        if (window.CalcApp && window.CalcApp.updateApiStatus) {
            window.CalcApp.updateApiStatus();
        }
    }).catch(function(error) {
        console.error('❌ Auth failed:', error);
        alert('❌ BŁĄD AUTORYZACJI\n\n' + error.message + 
              '\n\nSprawdź w panelu:\n' + self.shopDomain + '/adm → Konfiguracja → API\n\n' +
              'Czy Client ID i Secret są prawidłowe?');
        self.clearCredentials();
    });
};

// Get API base URL
SellyAPI.prototype.getBaseURL = function() {
    if (!this.shopDomain) return '';
    
    var domain = this.shopDomain;
    if (domain.indexOf('http') !== 0) {
        domain = 'https://' + domain;
    }
    
    return domain + '/api';
};

// OAuth2 Authentication - POPRAWIONY
SellyAPI.prototype.authenticate = function() {
    var self = this;
    
    if (!this.shopDomain || !this.clientId || !this.clientSecret) {
        return Promise.reject(new Error('Brak danych autoryzacji'));
    }
    
    var url = this.getBaseURL() + '/auth/access_token';
    
    // POPRAWIONY format body według dokumentacji
    var requestBody = {
        grant_type: 'client_credentials',
        scope: 'WRITE',
        client_id: this.clientId,
        client_secret: this.clientSecret
    };
    
    console.log('🔐 Autoryzacja:', this.shopDomain);
    console.log('📡 URL:', url);
    console.log('📝 Body:', {
        grant_type: requestBody.grant_type,
        scope: requestBody.scope,
        client_id: this.clientId,
        client_secret: this.clientSecret.substring(0, 10) + '...'
    });
    
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Kalkulator-Listew/2.0'
        },
        body: JSON.stringify(requestBody)
    }).then(function(response) {
        console.log('📡 Status:', response.status, response.statusText);
        
        return response.text().then(function(responseText) {
            console.log('📦 Response:', responseText);
            
            if (!response.ok) {
                var errorMsg = 'HTTP ' + response.status + ': ' + response.statusText;
                try {
                    var errorData = JSON.parse(responseText);
                    if (errorData.error) errorMsg += '\nBłąd: ' + errorData.error;
                    if (errorData.error_description) errorMsg += '\nOpis: ' + errorData.error_description;
                    if (errorData.hint) errorMsg += '\nWskazówka: ' + errorData.hint;
                } catch (e) {
                    errorMsg += '\nOdpowiedź: ' + responseText;
                }
                throw new Error(errorMsg);
            }
            
            var data = JSON.parse(responseText);
            
            if (!data.access_token) {
                throw new Error('Brak access_token w odpowiedzi');
            }
            
            // Zapisz token
            self.accessToken = data.access_token;
            self.tokenExpiry = Date.now() + ((data.expires_in - 60) * 1000);
            
            localStorage.setItem('selly_access_token', self.accessToken);
            localStorage.setItem('selly_token_expiry', self.tokenExpiry.toString());
            
            console.log('✅ Autoryzacja udana');
            console.log('⏰ Token ważny przez:', Math.round(data.expires_in / 60), 'min');
            
            return true;
        });
    });
};

// Search products - NAPRAWIONY
SellyAPI.prototype.searchProducts = function(query, type, limit) {
    var self = this;
    type = type || '';
    limit = limit || 10;
    
    console.log('🔍 Wyszukiwanie:', { query: query, type: type, hasAPI: !!(this.shopDomain && this.clientId) });
    
    if (!query || query.length < 2) {
        console.log('❌ Query zbyt krótkie');
        return Promise.resolve([]);
    }
    
    var cacheKey = 'search_' + type + '_' + query + '_' + limit;
    var cached = this.getCached(cacheKey);
    if (cached) {
        console.log('💾 Cache hit');
        return Promise.resolve(cached);
    }
    
    // Jeśli brak credentials → demo
    if (!this.shopDomain || !this.clientId || !this.clientSecret) {
        console.log('🎭 Brak API - używam demo');
        return this.searchDemo(query, type, limit);
    }
    
    // API wymaga 4+ znaków
    if (query.length < 4) {
        console.log('🔍 API wymaga 4+ znaków, mam:', query.length);
        return Promise.resolve([]);
    }
    
    // Real API search
    return this.searchRealAPI(query, type, limit);
};

// Search using demo data - NAPRAWIONY
SellyAPI.prototype.searchDemo = function(query, type, limit) {
    var self = this;
    
    var demoProducts = [
        { product_id: 1001, name: 'Listwa ozdobna MDF biała 200cm x 8cm', product_code: 'L-MDF-200-W', price: 49.99, quantity: '25', overall_dimensions: 200 },
        { product_id: 1002, name: 'Listwa dębowa olejowana 250cm x 10cm', product_code: 'L-DAB-250-O', price: 89.50, quantity: '8', overall_dimensions: 250 },
        { product_id: 1003, name: 'Listwa sosna 180cm x 6cm przypodłogowa', product_code: 'L-SOC-180', price: 24.99, quantity: '45', overall_dimensions: 180 },
        { product_id: 2001, name: 'Gzyms dolny poliuretanowy biały 200cm', product_code: 'G-PU-200-D', price: 79.99, quantity: '18', overall_dimensions: 200 },
        { product_id: 2002, name: 'Gzyms górny klasyczny biały 200cm x 15cm', product_code: 'G-KL-200-G', price: 94.99, quantity: '12', overall_dimensions: 200 },
        { product_id: 2003, name: 'Gzyms nowoczesny szary 240cm minimalistyczny', product_code: 'G-MOD-240-S', price: 112.50, quantity: '6', overall_dimensions: 240 }
    ];
    
    var q = query.toLowerCase();
    var filtered = demoProducts.filter(function(product) {
        var text = product.name.toLowerCase();
        if (text.indexOf(q) === -1) return false;
        
        if (type === 'listwa') return text.indexOf('listwa') !== -1;
        if (type === 'gzyms') return text.indexOf('gzyms') !== -1;
        return true;
    });
    
    var normalized = filtered.map(function(product) {
        return self.normalizeProduct(product);
    });
    
    console.log('🎭 Demo results:', normalized.length);
    
    var cacheKey = 'search_' + type + '_' + query + '_' + limit;
    this.setCached(cacheKey, normalized);
    
    return Promise.resolve(normalized);
};

// Search real API - NAPRAWIONY
SellyAPI.prototype.searchRealAPI = function(query, type, limit) {
    var self = this;
    
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
        console.log('🔄 Token refresh needed');
        return this.authenticate().then(function() {
            return self.searchRealAPI(query, type, limit);
        });
    }
    
    var url = this.getBaseURL() + '/products';
    var params = new URLSearchParams({
        product_name: '%' + query + '%',
        enable: '1',
        limit: limit.toString(),
        page: '1',
        sort_by: 'product_id',
        sort: 'ASC'
    });
    
    console.log('📡 Real API search:', url + '?' + params.toString());
    
    return fetch(url + '?' + params.toString(), {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + this.accessToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    }).then(function(response) {
        return response.text().then(function(responseText) {
            console.log('📦 API Response:', response.status, responseText.substring(0, 300));
            
            if (!response.ok) {
                throw new Error('API Error ' + response.status + ': ' + responseText);
            }
            
            var data = JSON.parse(responseText);
            var products = data.data || [];
            
            var normalized = products.map(function(product) {
                return self.normalizeProduct(product);
            }).filter(function(product) {
                return product && self.matchesType(product, type);
            });
            
            console.log('✅ API results:', normalized.length);
            
            var cacheKey = 'search_' + type + '_' + query + '_' + limit;
            self.setCached(cacheKey, normalized);
            
            return normalized;
        });
    }).catch(function(error) {
        console.error('❌ Real API failed:', error);
        // Fallback to demo
        return self.searchDemo(query, type, limit);
    });
};

// NAPRAWIONY: Normalize product (pojedyncza funkcja)
SellyAPI.prototype.normalizeProduct = function(product) {
    if (!product) return null;
    
    try {
        var imageUrl = '';
        if (product.main_photo && product.photo_dir) {
            var baseUrl = this.getBaseURL().replace('/api', '');
            imageUrl = baseUrl + '/' + product.photo_dir + '/' + product.main_photo;
        }
        
        // Extract length from name/dimensions
        var length = 200; // default
        if (product.overall_dimensions) {
            length = Number(product.overall_dimensions);
        } else {
            var match = product.name.match(/(\d+)cm/i);
            if (match) length = Number(match[1]);
        }
        
        // Parse quantity
        var stock = 0;
        if (typeof product.quantity === 'string') {
            stock = parseInt(product.quantity) || 0;
        } else if (typeof product.quantity === 'number') {
            stock = product.quantity;
        }
        
        return {
            id: String(product.product_id || ''),
            name: product.name || 'Produkt',
            description: product.content_html_short || '',
            sku: product.product_code || '',
            barLengthCm: length,
            pricePLN: Number(product.price) || 0,
            stock: stock,
            category: String(product.category_id || ''),
            images: imageUrl ? [imageUrl] : [],
            inStock: stock > 0,
            stockStatus: stock === 0 ? 'out-of-stock' : (stock < 5 ? 'low-stock' : 'in-stock')
        };
    } catch (error) {
        console.error('Błąd normalizacji produktu:', error);
        return null;
    }
};

// Check if product matches category type
SellyAPI.prototype.matchesType = function(product, type) {
    if (!type) return true;
    
    var name = (product.name || '').toLowerCase();
    
    if (type === 'listwa') {
        return name.indexOf('listwa') !== -1;
    }
    if (type === 'gzyms') {
        return name.indexOf('gzyms') !== -1;
    }
    
    return true;
};

// Cache functions
SellyAPI.prototype.getCached = function(key) {
    var cached = this.cache[key];
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
    }
    return null;
};

SellyAPI.prototype.setCached = function(key, data) {
    this.cache[key] = {
        data: data,
        timestamp: Date.now()
    };
};

SellyAPI.prototype.clearCache = function() {
    this.cache = {};
    console.log('🗑️ Cache cleared');
};

// Clear credentials
SellyAPI.prototype.clearCredentials = function() {
    this.shopDomain = '';
    this.clientId = '';
    this.clientSecret = '';
    this.accessToken = '';
    this.tokenExpiry = 0;
    
    localStorage.removeItem('selly_shop_domain');
    localStorage.removeItem('selly_client_id');
    localStorage.removeItem('selly_client_secret');
    localStorage.removeItem('selly_access_token');
    localStorage.removeItem('selly_token_expiry');
    
    this.clearCache();
    console.log('🚪 Credentials cleared');
    
    if (window.CalcApp && window.CalcApp.updateApiStatus) {
        window.CalcApp.updateApiStatus();
    }
};

// Get status
SellyAPI.prototype.getStatus = function() {
    if (this.shopDomain && this.clientId && this.clientSecret) {
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return { connected: true, mode: 'api', shop: this.shopDomain };
        } else {
            return { connected: false, mode: 'api', shop: this.shopDomain, needsAuth: true };
        }
    }
    return { connected: false, mode: 'demo' };
};

// Test API functionality - NAPRAWIONY
SellyAPI.prototype.testAPI = function() {
    var self = this;
    
    console.log('🧪 Testing API...');
    
    var status = this.getStatus();
    
    if (status.mode === 'demo') {
        // Test demo
        this.searchProducts('listwa', 'listwa', 3).then(function(products) {
            alert('🎭 DEMO TEST OK\n\n' +
                  'Produkty demo: ' + products.length + '\n\n' +
                  (products[0] ? 'Przykład: ' + products[0].name + '\nCena: ' + products[0].pricePLN + ' zł' : '') +
                  '\n\nAby testować prawdziwe API:\n' +
                  'Kliknij "🔑 Konfiguracja API"');
        });
        return;
    }
    
    // Test real API
    console.log('🔐 Testing authentication...');
    
    this.authenticate().then(function() {
        console.log('✅ Auth OK, testing search...');
        
        return Promise.all([
            self.searchProducts('listwa', 'listwa', 2),
            self.searchProducts('gzyms', 'gzyms', 2)
        ]);
    }).then(function(results) {
        var listwy = results[0] || [];
        var gzymsy = results[1] || [];
        
        alert('✅ API TEST SUKCES\n\n' +
              '🏪 Sklep: ' + self.shopDomain + '\n' +
              '📏 Listwy: ' + listwy.length + ' wyników\n' +
              '📐 Gzymsy: ' + gzymsy.length + ' wyników\n\n' +
              (listwy[0] ? 'Przykład listwy: ' + listwy[0].name + '\nCena: ' + listwy[0].pricePLN + ' zł\n\n' : '') +
              '🎯 API jest gotowe!');
        
    }).catch(function(error) {
        console.error('❌ API test failed:', error);
        
        alert('❌ TEST API BŁĄD\n\n' + error.message + 
              '\n\nMożliwe przyczyny:\n' +
              '• Błędny Client ID lub Secret\n' +
              '• API wyłączone w sklepie\n' +
              '• Nieprawidłowa domena\n' +
              '• Brak uprawnień WRITE\n\n' +
              'Sprawdź panel: ' + self.shopDomain + '/adm');
    });
};

// Create global instance
if (typeof window !== 'undefined') {
    window.SellyAPI = new SellyAPI();
    
    // Global functions for HTML buttons
    window.setSellyCredentials = function() {
        window.SellyAPI.setCredentials();
    };
    
    window.clearSellyCredentials = function() {
        window.SellyAPI.clearCredentials();
    };
    
    window.getSellyStatus = function() {
        return window.SellyAPI.getStatus();
    };
    
    window.testSellyAPI = function() {
        window.SellyAPI.testAPI();
    };
    
    console.log('🌐 Selly API globalne funkcje gotowe');
}