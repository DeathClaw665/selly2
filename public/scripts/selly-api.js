/**
 * Selly.pl REST API - SCOPE FIX VERSION
 * Fixes "Scope not match" error
 */

function SellyAPI() {
    this.shopDomain = localStorage.getItem('selly_shop_domain') || '';
    this.clientId = localStorage.getItem('selly_client_id') || '';
    this.clientSecret = localStorage.getItem('selly_client_secret') || '';
    this.accessToken = localStorage.getItem('selly_access_token') || '';
    this.tokenExpiry = parseInt(localStorage.getItem('selly_token_expiry') || '0');
    this.currentScope = localStorage.getItem('selly_scope') || 'READ';
    
    this.cache = {};
    this.cacheTimeout = 5 * 60 * 1000;
    
    console.log('🛒 SellyAPI initialized - SCOPE FIX VERSION');
    this.showDemoInfo();
}

SellyAPI.prototype.showDemoInfo = function() {
    console.log('🎭 DEMO MODE: 6 produktów (listwy + gzymsy)');
    console.log('💡 Kliknij "🔑 Konfiguracja API" aby połączyć');
};

SellyAPI.prototype.setCredentials = function() {
    var self = this;
    
    var domain = prompt('🏪 SELLY.pl API\n\nDomena sklepu (np. adam.selly24.pl):');
    if (!domain) return;
    
    var clientId = prompt('Client ID z panelu API:');
    if (!clientId) return;
    
    var clientSecret = prompt('Client Secret z panelu API:');
    if (!clientSecret) return;
    
    this.shopDomain = domain.trim();
    this.clientId = clientId.trim();
    this.clientSecret = clientSecret.trim();
    
    localStorage.setItem('selly_shop_domain', this.shopDomain);
    localStorage.setItem('selly_client_id', this.clientId);
    localStorage.setItem('selly_client_secret', this.clientSecret);
    
    console.log('💾 Saved credentials for:', this.shopDomain);
    
    // Test multiple scopes
    this.tryAllScopes().then(function(workingScope) {
        alert('✅ SUKCES!\n\nAPI połączone z scope: ' + workingScope + '\nMożesz wyszukiwać produkty ze sklepu.');
        if (window.CalcApp) window.CalcApp.updateApiStatus();
    }).catch(function(error) {
        alert('❌ BŁĄD\n\n' + error + '\n\nSprawdź dane API w panelu:\n' + self.shopDomain + '/adm');
        self.clearCredentials();
    });
};

SellyAPI.prototype.tryAllScopes = function() {
    var self = this;
    var scopes = ['READ', 'READWRITE', 'WRITE'];
    
    function tryScope(index) {
        if (index >= scopes.length) {
            return Promise.reject('Wszystkie scope nie działają');
        }
        
        var scope = scopes[index];
        console.log('🔐 Testing scope:', scope);
        
        return self.authenticateWithScope(scope).then(function() {
            console.log('✅ Scope działa:', scope);
            localStorage.setItem('selly_scope', scope);
            self.currentScope = scope;
            return scope;
        }).catch(function(error) {
            console.log('❌ Scope failed:', scope, error.message);
            return tryScope(index + 1);
        });
    }
    
    return tryScope(0);
};

SellyAPI.prototype.authenticateWithScope = function(scope) {
    var self = this;
    var url = this.getBaseURL() + '/auth/access_token';
    
    var body = {
        grant_type: 'client_credentials',
        scope: scope,
        client_id: this.clientId,
        client_secret: this.clientSecret
    };
    
    console.log('📡 POST:', url);
    console.log('📝 Scope:', scope, 'Client:', this.clientId);
    
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(body)
    }).then(function(response) {
        return response.text().then(function(text) {
            console.log('📦 Response (' + scope + '):', response.status, text);
            
            if (!response.ok) {
                var msg = 'HTTP ' + response.status;
                try {
                    var err = JSON.parse(text);
                    if (err.error) msg += ' - ' + err.error;
                    if (err.error_description) msg += ': ' + err.error_description;
                } catch (e) {
                    msg += ' - ' + text;
                }
                throw new Error(msg);
            }
            
            var data = JSON.parse(text);
            if (!data.access_token) throw new Error('No token');
            
            self.accessToken = data.access_token;
            self.tokenExpiry = Date.now() + (data.expires_in * 1000);
            
            localStorage.setItem('selly_access_token', self.accessToken);
            localStorage.setItem('selly_token_expiry', self.tokenExpiry.toString());
            
            console.log('✅ Auth OK:', scope, 'expires in', Math.round(data.expires_in/60), 'min');
            return true;
        });
    });
};

SellyAPI.prototype.getBaseURL = function() {
    if (!this.shopDomain) return '';
    var domain = this.shopDomain;
    if (domain.indexOf('http') !== 0) domain = 'https://' + domain;
    return domain + '/api';
};

SellyAPI.prototype.searchProducts = function(query, type, limit) {
    var self = this;
    type = type || '';
    limit = limit || 10;
    
    if (!query || query.length < 2) return Promise.resolve([]);
    
    var cacheKey = type + '|' + query;
    var cached = this.getCached(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    // Demo mode
    if (!this.shopDomain || !this.clientId) {
        return this.searchDemo(query, type);
    }
    
    // Real API (requires 4+ chars)
    if (query.length < 4) return Promise.resolve([]);
    
    var url = this.getBaseURL() + '/products?product_name=' + encodeURIComponent('%' + query + '%') + 
              '&enable=1&limit=' + limit + '&page=1';
    
    console.log('📡 API Search:', url);
    
    return fetch(url, {
        headers: { 'Authorization': 'Bearer ' + this.accessToken }
    }).then(function(response) {
        return response.json();
    }).then(function(data) {
        var products = (data.data || []).map(function(p) {
            return self.normalizeProduct(p);
        }).filter(function(p) {
            return p && self.matchesType(p, type);
        });
        
        self.setCached(cacheKey, products);
        return products;
    }).catch(function(error) {
        console.error('API failed, using demo:', error);
        return self.searchDemo(query, type);
    });
};

SellyAPI.prototype.searchDemo = function(query, type) {
    var products = [
        { product_id: 1001, name: 'Listwa MDF biała 200cm', price: 49.99, quantity: '25', overall_dimensions: 200 },
        { product_id: 1002, name: 'Listwa dęb 250cm', price: 89.50, quantity: '8', overall_dimensions: 250 },
        { product_id: 1003, name: 'Listwa sosna 180cm', price: 24.99, quantity: '45', overall_dimensions: 180 },
        { product_id: 2001, name: 'Gzyms dolny biały 200cm', price: 79.99, quantity: '18', overall_dimensions: 200 },
        { product_id: 2002, name: 'Gzyms górny klasyczny 200cm', price: 94.99, quantity: '12', overall_dimensions: 200 },
        { product_id: 2003, name: 'Gzyms nowoczesny szary 240cm', price: 112.50, quantity: '6', overall_dimensions: 240 }
    ];
    
    var q = query.toLowerCase();
    var filtered = products.filter(function(p) {
        var name = p.name.toLowerCase();
        if (name.indexOf(q) === -1) return false;
        if (type === 'listwa') return name.indexOf('listwa') !== -1;
        if (type === 'gzyms') return name.indexOf('gzyms') !== -1;
        return true;
    });
    
    var normalized = filtered.map(function(p) {
        return this.normalizeProduct(p);
    }, this);
    
    console.log('🎭 Demo results:', normalized.length);
    return Promise.resolve(normalized);
};

SellyAPI.prototype.normalizeProduct = function(product) {
    if (!product) return null;
    
    var length = product.overall_dimensions || 200;
    if (!length) {
        var match = product.name.match(/(\d+)cm/i);
        if (match) length = Number(match[1]);
    }
    
    var stock = 0;
    if (product.quantity) {
        stock = parseInt(product.quantity) || 0;
    }
    
    return {
        id: String(product.product_id || ''),
        name: product.name || 'Produkt',
        description: product.content_html_short || '',
        sku: product.product_code || '',
        barLengthCm: length,
        pricePLN: Number(product.price) || 0,
        stock: stock,
        inStock: stock > 0,
        stockStatus: stock === 0 ? 'out-of-stock' : (stock < 5 ? 'low-stock' : 'in-stock')
    };
};

SellyAPI.prototype.matchesType = function(product, type) {
    if (!type) return true;
    var name = (product.name || '').toLowerCase();
    if (type === 'listwa') return name.indexOf('listwa') !== -1;
    if (type === 'gzyms') return name.indexOf('gzyms') !== -1;
    return true;
};

SellyAPI.prototype.getCached = function(key) {
    var cached = this.cache[key];
    return (cached && Date.now() - cached.timestamp < this.cacheTimeout) ? cached.data : null;
};

SellyAPI.prototype.setCached = function(key, data) {
    this.cache[key] = { data: data, timestamp: Date.now() };
};

SellyAPI.prototype.clearCredentials = function() {
    this.shopDomain = this.clientId = this.clientSecret = this.accessToken = '';
    this.tokenExpiry = 0;
    ['selly_shop_domain', 'selly_client_id', 'selly_client_secret', 'selly_access_token', 'selly_token_expiry', 'selly_scope'].forEach(function(key) {
        localStorage.removeItem(key);
    });
    this.cache = {};
    console.log('🚪 Credentials cleared');
    if (window.CalcApp) window.CalcApp.updateApiStatus();
};

SellyAPI.prototype.getStatus = function() {
    if (this.shopDomain && this.clientId && this.clientSecret) {
        return this.accessToken && Date.now() < this.tokenExpiry ? 
            { connected: true, mode: 'api', shop: this.shopDomain } :
            { connected: false, mode: 'api', shop: this.shopDomain, needsAuth: true };
    }
    return { connected: false, mode: 'demo' };
};

SellyAPI.prototype.testAPI = function() {
    var self = this;
    var status = this.getStatus();
    
    if (status.mode === 'demo') {
        this.searchProducts('listwa', 'listwa', 3).then(function(products) {
            alert('🎭 DEMO TEST\n\nZnaleziono: ' + products.length + ' produktów demo\n\n' +
                  (products[0] ? 'Przykład: ' + products[0].name + '\n' + products[0].pricePLN + ' zł' : '') +
                  '\n\nKonfiguracja → API dla prawdziwych danych');
        });
        return;
    }
    
    console.log('🧪 Testing real API...');
    this.tryAllScopes().then(function(scope) {
        return Promise.all([
            self.searchProducts('listwa', 'listwa', 2),
            self.searchProducts('gzyms', 'gzyms', 2)
        ]).then(function(results) {
            var listwy = results[0].length;
            var gzymsy = results[1].length;
            alert('✅ API TEST OK\n\n' +
                  'Scope: ' + scope + '\n' +
                  'Listwy: ' + listwy + '\n' +
                  'Gzymsy: ' + gzymsy + '\n\n' +
                  'API gotowe!');
        });
    }).catch(function(error) {
        alert('❌ API TEST FAILED\n\n' + error);
    });
};

// Create global instance and functions
if (typeof window !== 'undefined') {
    window.SellyAPI = new SellyAPI();
    
    window.setSellyCredentials = function() {
        window.SellyAPI.setCredentials();
    };
    
    window.getSellyStatus = function() {
        return window.SellyAPI.getStatus();
    };
    
    window.testSellyAPI = function() {
        window.SellyAPI.testAPI();
    };
    
    console.log('🌐 Global Selly functions ready');
}