/**
 * Selly.pl REST API Integration
 * Based on official Selly API 1.0 documentation
 * OAuth2 client_credentials authentication
 */

function SellyAPI() {
    var self = this;
    
    // API Configuration based on official Selly documentation
    this.shopDomain = localStorage.getItem('selly_shop_domain') || '';
    this.clientId = localStorage.getItem('selly_client_id') || '';
    this.clientSecret = localStorage.getItem('selly_client_secret') || '';
    this.accessToken = localStorage.getItem('selly_access_token') || '';
    this.tokenExpiry = parseInt(localStorage.getItem('selly_token_expiry') || '0');
    
    this.cache = {};
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.isRateLimited = false;
    this.rateLimitDelay = 2000;
    
    // Initialize
    this.init();
}

SellyAPI.prototype.init = function() {
    var self = this;
    
    console.log('🛒 Initializing Selly API integration...');
    
    // Check if credentials are set
    if (!this.shopDomain || !this.clientId || !this.clientSecret) {
        setTimeout(function() {
            self.showCredentialsPrompt();
        }, 1000);
    } else {
        // Check if token is valid
        this.ensureValidToken().then(function() {
            console.log('✅ Selly API ready');
        }).catch(function(error) {
            console.warn('🔑 Token issue, prompting for credentials:', error.message);
            self.showCredentialsPrompt();
        });
    }
};

SellyAPI.prototype.showCredentialsPrompt = function() {
    var message = 'KONFIGURACJA SELLY.PL API\n\n' +
        '🏪 Wprowadź dane swojego sklepu Selly.pl:\n\n' +
        'Przykład dla sklepu "mojsklep.pl":\n' +
        '• Domena: mojsklep.pl\n' +
        '• Client ID: otrzymujesz w panelu\n' +
        '• Client Secret: otrzymujesz w panelu\n\n' +
        '📋 Znajdziesz je w: Panel → Konfiguracja → API\n\n' +
        '💡 Lub pozostaw puste dla trybu demonstracyjnego';
    
    var domain = prompt(message + '\n\nDomena sklepu (np. mojsklep.pl):');
    if (!domain || !domain.trim()) {
        console.info('🎭 Using demo mode');
        this.showDemoInfo();
        return;
    }
    
    var clientId = prompt('Client ID z panelu API:');
    if (!clientId || !clientId.trim()) {
        console.info('🎭 Using demo mode');
        this.showDemoInfo();
        return;
    }
    
    var clientSecret = prompt('Client Secret z panelu API:');
    if (!clientSecret || !clientSecret.trim()) {
        console.info('🎭 Using demo mode');
        this.showDemoInfo();
        return;
    }
    
    this.shopDomain = domain.trim();
    this.clientId = clientId.trim();
    this.clientSecret = clientSecret.trim();
    
    // Save credentials
    localStorage.setItem('selly_shop_domain', this.shopDomain);
    localStorage.setItem('selly_client_id', this.clientId);
    localStorage.setItem('selly_client_secret', this.clientSecret);
    
    console.log('💾 Credentials saved, authenticating...');
    this.authenticate();
};

SellyAPI.prototype.showDemoInfo = function() {
    console.log('🎭 DEMO MODE ACTIVE');
    console.log('📦 Available demo products:');
    console.log('  • Listwy: MDF, dąb, sosna (180-300cm)');
    console.log('  • Gzymsy: klasyczne, nowoczesne (200-300cm)');
    console.log('💡 Wpisz np. "listwa", "gzyms", "200cm" w wyszukiwarkę');
};

// Get base API URL for shop
SellyAPI.prototype.getBaseURL = function() {
    if (!this.shopDomain) return '';
    
    // Handle different domain formats
    var domain = this.shopDomain;
    if (!domain.startsWith('http')) {
        domain = 'https://' + domain;
    }
    
    return domain + '/api';
};

// OAuth2 Authentication according to Selly API docs
SellyAPI.prototype.authenticate = function() {
    var self = this;
    
    if (!this.shopDomain || !this.clientId || !this.clientSecret) {
        return Promise.reject(new Error('Missing credentials'));
    }
    
    var url = this.getBaseURL() + '/auth/access_token';
    var body = {
        grant_type: 'client_credentials',
        scope: 'WRITE',
        client_id: this.clientId,
        client_secret: this.clientSecret
    };
    
    console.log('🔐 Authenticating with Selly API...', this.shopDomain);
    
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(body)
    }).then(function(response) {
        if (!response.ok) {
            throw new Error('Authentication failed: HTTP ' + response.status + ' - ' + response.statusText);
        }
        
        return response.json();
    }).then(function(data) {
        if (data.error) {
            throw new Error(data.error_description || data.error);
        }
        
        self.accessToken = data.access_token;
        self.tokenExpiry = Date.now() + ((data.expires_in - 60) * 1000); // Refresh 1 minute early
        
        // Save token
        localStorage.setItem('selly_access_token', self.accessToken);
        localStorage.setItem('selly_token_expiry', self.tokenExpiry.toString());
        
        console.log('✅ Selly API authenticated successfully');
        console.log('⏰ Token expires in:', Math.round(data.expires_in / 60), 'minutes');
        
        return true;
    }).catch(function(error) {
        console.error('❌ Authentication failed:', error);
        console.log('🎭 Switching to demo mode due to auth error');
        throw error;
    });
};

// Ensure token is valid before making requests
SellyAPI.prototype.ensureValidToken = function() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
        console.log('🔄 Token expired or missing, refreshing...');
        return this.authenticate();
    }
    return Promise.resolve();
};

// Make authenticated API request
SellyAPI.prototype.makeRequest = function(endpoint, options) {
    var self = this;
    options = options || {};
    
    // Return demo data if no credentials
    if (!this.shopDomain || !this.clientId || !this.clientSecret) {
        return Promise.resolve(this.getDemoData(endpoint, options));
    }
    
    return this.ensureValidToken().then(function() {
        var url = self.getBaseURL() + endpoint;
        var config = {
            method: options.method || 'GET',
            headers: {
                'Authorization': 'Bearer ' + self.accessToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Kalkulator-Listew/1.0'
            }
        };
        
        if (options.body) {
            config.body = JSON.stringify(options.body);
        }
        
        console.log('📡 Making request to:', url);
        
        return fetch(url, config).then(function(response) {
            // Handle rate limiting
            if (response.status === 429) {
                console.warn('⏳ Rate limited, waiting...');
                self.isRateLimited = true;
                return self.wait(self.rateLimitDelay).then(function() {
                    self.isRateLimited = false;
                    return self.makeRequest(endpoint, options);
                });
            }
            
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }
            
            return response.json();
        });
    }).catch(function(error) {
        console.error('❌ Selly API request failed:', error);
        console.warn('🎭 Falling back to demo data');
        return self.getDemoData(endpoint, options);
    });
};

// Search products using official Selly API format
SellyAPI.prototype.searchProducts = function(query, type, limit) {
    var self = this;
    type = type || '';
    limit = limit || 10;
    
    if (!query || query.length < 4) { // Selly requires minimum 4 characters
        return Promise.resolve([]);
    }
    
    console.log('🔍 Searching products:', { query: query, type: type, limit: limit });
    
    var cacheKey = 'search_' + type + '_' + query + '_' + limit;
    
    // Check cache first
    var cached = this.getCached(cacheKey);
    if (cached) {
        console.log('💾 Using cached results');
        return Promise.resolve(cached);
    }
    
    // Build parameters according to Selly API docs
    var params = [
        'page=1',
        'limit=' + limit,
        'enable=1', // Only visible products
        'sort_by=product_id',
        'sort=ASC'
    ];
    
    // Add product name search (minimum 4 chars without %)
    if (query.length >= 4) {
        params.push('product_name=%' + encodeURIComponent(query) + '%');
    }
    
    var queryString = params.join('&');
    
    return this.makeRequest('/products?' + queryString).then(function(response) {
        console.log('📦 Raw API response:', response);
        
        var products = [];
        var metadata = null;
        
        // Handle Selly API response format
        if (response.data && Array.isArray(response.data)) {
            products = response.data;
            metadata = response.__metadata && response.__metadata[0];
        }
        
        console.log('📊 API returned:', products.length, 'products');
        if (metadata) {
            console.log('📈 Total available:', metadata.total_count);
        }
        
        // Normalize and filter products
        var normalizedProducts = products.map(function(product) {
            return self.normalizeSellyProduct(product);
        }).filter(function(product) {
            return product !== null && self.matchesSearchCriteria(product, query, type);
        });
        
        console.log('✅ Found and filtered products:', normalizedProducts.length);
        
        // Cache results
        self.setCached(cacheKey, normalizedProducts);
        
        return normalizedProducts;
    }).catch(function(error) {
        console.error('❌ Product search failed:', error);
        console.log('🎭 Using demo data instead');
        
        // Use demo data with same filtering
        var demoResponse = self.getDemoData('/products', { query: query, category: type });
        return demoResponse.data || [];
    });
};

// Normalize Selly product to our format
SellyAPI.prototype.normalizeSellyProduct = function(product) {
    if (!product || !product.name) return null;
    
    // Build image URL if available
    var imageUrl = '';
    if (product.main_photo && product.photo_dir) {
        var baseUrl = this.getBaseURL().replace('/api', '');
        imageUrl = baseUrl + '/' + product.photo_dir + '/' + product.main_photo;
    }
    
    var normalized = {
        id: String(product.product_id || ''),
        name: product.name || 'Produkt',
        description: product.content_html_short || product.html_description || '',
        sku: product.product_code || product.provider_code || '',
        barLengthCm: this.extractLengthFromSelly(product),
        pricePLN: Number(product.price) || 0,
        stock: this.parseQuantity(product.quantity),
        category: String(product.category_id || ''),
        images: imageUrl ? [imageUrl] : [],
        attributes: {
            weight: product.weight,
            dimensions: product.overall_dimensions,
            ean: product.ean,
            unit: product.unit_of_measure_name,
            vat_rate: product.vat_rate
        },
        inStock: this.parseQuantity(product.quantity) > 0,
        stockStatus: this.getStockStatusFromQuantity(product.quantity)
    };
    
    return normalized;
};

// Extract length from Selly product data
SellyAPI.prototype.extractLengthFromSelly = function(product) {
    // 1. Try overall_dimensions field first
    if (product.overall_dimensions) {
        var dim = Number(product.overall_dimensions);
        if (dim > 50 && dim <= 600) return dim;
    }
    
    // 2. Check meta fields for dimensions
    if (product.meta && Array.isArray(product.meta)) {
        for (var i = 0; i < product.meta.length; i++) {
            var meta = product.meta[i];
            if (meta.meta_key) {
                var key = meta.meta_key.toLowerCase();
                if (key.indexOf('długość') !== -1 || 
                    key.indexOf('length') !== -1 ||
                    key.indexOf('dlugosc') !== -1) {
                    var metaLength = Number(meta.meta_value);
                    if (metaLength > 50 && metaLength <= 600) {
                        return metaLength;
                    }
                }
            }
        }
    }
    
    // 3. Extract from product name and description
    var searchText = [
        product.name || '',
        product.content_html_short || '',
        product.html_description || '',
        product.product_symbol || ''
    ].join(' ');
    
    // Look for length patterns in Polish
    var patterns = [
        /(\d+)\s*cm/i,                    // "200cm", "200 cm"
        /(\d+)\s*centymetr/i,             // "200 centymetrów"
        /dł\.?\s*(\d+)/i,                 // "dł. 200", "dł 200"
        /długość[:\s]*(\d+)/i,            // "długość: 200"
        /(\d+)\s*x\s*\d+\s*x?\s*\d*/i,   // "200x10x3" - first number
        /(\d{3})\s*(cm|mm)/i,             // 3-digit numbers with units
        /(\d+)\s*(cm|centymetrów)/i       // numbers with cm/centymetrów
    ];
    
    for (var j = 0; j < patterns.length; j++) {
        var match = searchText.match(patterns[j]);
        if (match && match[1]) {
            var length = Number(match[1]);
            if (length > 50 && length <= 600) {
                return length;
            }
        }
    }
    
    return 200; // Default fallback
};

// Parse quantity from Selly format (can be string or number)
SellyAPI.prototype.parseQuantity = function(quantity) {
    if (typeof quantity === 'number') return Math.max(0, quantity);
    if (typeof quantity === 'string') {
        // Handle different formats: "15", "15.5", "15,5"
        var cleaned = quantity.replace(',', '.');
        var num = parseFloat(cleaned);
        return isNaN(num) ? 0 : Math.max(0, num);
    }
    return 0;
};

// Get stock status from quantity
SellyAPI.prototype.getStockStatusFromQuantity = function(quantity) {
    var stock = this.parseQuantity(quantity);
    
    if (stock === 0) {
        return 'out-of-stock';
    } else if (stock < 5) {
        return 'low-stock';
    } else {
        return 'in-stock';
    }
};

// Check if product matches search criteria and category
SellyAPI.prototype.matchesSearchCriteria = function(product, query, type) {
    if (!product || !product.name) return false;
    
    var searchText = (
        (product.name || '') + ' ' + 
        (product.description || '') + ' ' +
        (product.sku || '') + ' ' +
        (product.attributes && product.attributes.material ? product.attributes.material : '')
    ).toLowerCase();
    
    var queryLower = query.toLowerCase();
    
    // Must contain the search query
    if (searchText.indexOf(queryLower) === -1) return false;
    
    // Category-specific filtering
    if (type === 'listwa') {
        return searchText.indexOf('listwa') !== -1 || 
               searchText.indexOf('profil') !== -1 ||
               searchText.indexOf('ramka') !== -1 ||
               searchText.indexOf('ościeżnica') !== -1 ||
               searchText.indexOf('frame') !== -1 ||
               (product.category && String(product.category).indexOf('10') !== -1); // Assuming category 10-19 for frames
    } else if (type === 'gzyms') {
        return searchText.indexOf('gzyms') !== -1 || 
               searchText.indexOf('sztukateria') !== -1 ||
               searchText.indexOf('cornice') !== -1 ||
               searchText.indexOf('ozdoba') !== -1 ||
               searchText.indexOf('profil') !== -1 ||
               (product.category && String(product.category).indexOf('20') !== -1); // Assuming category 20-29 for cornices
    }
    
    return true; // If no type specified, include all matching products
};

// Enhanced demo data matching the Selly API format
SellyAPI.prototype.getDemoData = function(endpoint, options) {
    options = options || {};
    
    var demoProducts = [
        {
            product_id: 1001,
            name: 'Listwa ozdobna MDF biała 200cm x 8cm x 2.5cm',
            content_html_short: 'Listwa ozdobna z MDF lakierowana na biało. Idealna do wykończenia okien i drzwi. Łatwy montaż.',
            product_code: 'L-MDF-200-W',
            price: 49.99,
            quantity: '25',
            category_id: 10,
            overall_dimensions: 200,
            main_photo: 'listwa-mdf-biala.jpg',
            photo_dir: 'products/listwy',
            unit_of_measure_name: 'szt',
            visible: true,
            vat_rate: 23
        },
        {
            product_id: 1002,
            name: 'Listwa dębowa olejowana 250cm x 10cm x 3cm',
            content_html_short: 'Listwa z litego drewna dębowego, olejowana. Naturalne usłojenie. Wysoka jakość.',
            product_code: 'L-DAB-250-O',
            price: 89.50,
            quantity: '8',
            category_id: 10,
            overall_dimensions: 250,
            main_photo: 'listwa-dab-olejowana.jpg',
            photo_dir: 'products/listwy',
            unit_of_measure_name: 'szt',
            visible: true
        },
        {
            product_id: 1003,
            name: 'Listwa przypodłogowa sosna 180cm x 6cm',
            content_html_short: 'Listwa przypodłogowa z drewna sosnowego. Do malowania lub bejcowania. Profil gładki.',
            product_code: 'L-SOC-180',
            price: 24.99,
            quantity: '45',
            category_id: 11,
            overall_dimensions: 180,
            main_photo: 'listwa-sosna-180.jpg',
            photo_dir: 'products/listwy',
            unit_of_measure_name: 'szt',
            visible: true
        },
        {
            product_id: 2001,
            name: 'Gzyms dolny poliuretanowy biały 200cm x 12cm',
            content_html_short: 'Gzyms dolny z poliuretanu HD. Łatwy montaż na klej. Można malować. Wodoodporny.',
            product_code: 'G-PU-200-D-W',
            price: 79.99,
            quantity: '18',
            category_id: 20,
            overall_dimensions: 200,
            main_photo: 'gzyms-dolny-pu-200.jpg',
            photo_dir: 'products/gzymsy',
            unit_of_measure_name: 'szt',
            visible: true
        },
        {
            product_id: 2002,
            name: 'Gzyms górny klasyczny biały 200cm x 15cm',
            content_html_short: 'Gzyms górny w stylu klasycznym. Bogato zdobiony profil. Z poliuretanu HD.',
            product_code: 'G-KL-200-G-W',
            price: 94.99,
            quantity: '12',
            category_id: 21,
            overall_dimensions: 200,
            main_photo: 'gzyms-gorny-klasyczny.jpg',
            photo_dir: 'products/gzymsy',
            unit_of_measure_name: 'szt',
            visible: true
        },
        {
            product_id: 2003,
            name: 'Gzyms nowoczesny minimalistyczny szary 240cm',
            content_html_short: 'Gzyms w stylu nowoczesnym, gładki profil. Kolor szary antracyt. Idealne wykończenie.',
            product_code: 'G-MOD-240-S',
            price: 112.50,
            quantity: '6',
            category_id: 21,
            overall_dimensions: 240,
            main_photo: 'gzyms-nowoczesny-240.jpg',
            photo_dir: 'products/gzymsy',
            unit_of_measure_name: 'szt',
            visible: true
        },
        {
            product_id: 1004,
            name: 'Listwa narożna wenge 220cm profil L 12cm',
            content_html_short: 'Listwa narożna w kolorze wenge. Profil L do narożników zewnętrznych. Laminowana.',
            product_code: 'L-WE-220-L',
            price: 67.80,
            quantity: '15',
            category_id: 12,
            overall_dimensions: 220,
            main_photo: 'listwa-wenge-l.jpg',
            photo_dir: 'products/listwy',
            unit_of_measure_name: 'szt',
            visible: true
        },
        {
            product_id: 2004,
            name: 'Gzyms barokowy złoty 300cm ekskluzywny 18cm',
            content_html_short: 'Gzyms w stylu barokowym z imitacją złota. Do wnętrz reprezentacyjnych. Ręcznie zdobiony.',
            product_code: 'G-BAR-300-Z',
            price: 189.99,
            quantity: '3',
            category_id: 22,
            overall_dimensions: 300,
            main_photo: 'gzyms-barokowy-zloty.jpg',
            photo_dir: 'products/gzymsy',
            unit_of_measure_name: 'szt',
            visible: true
        },
        {
            product_id: 1005,
            name: 'Listwa MDF surowa 300cm x 5cm do malowania',
            content_html_short: 'Listwa z MDF surowa, do samodzielnego malowania. Gładka powierzchnia.',
            product_code: 'L-MDF-300-RAW',
            price: 32.50,
            quantity: '30',
            category_id: 10,
            overall_dimensions: 300,
            main_photo: 'listwa-mdf-surowa.jpg',
            photo_dir: 'products/listwy',
            unit_of_measure_name: 'szt',
            visible: true
        },
        {
            product_id: 2005,
            name: 'Gzyms dolny nowoczesny 280cm LED ready',
            content_html_short: 'Gzyms dolny z rowkiem na taśmę LED. Nowoczesny design. Z poliuretanu.',
            product_code: 'G-LED-280-D',
            price: 145.00,
            quantity: '7',
            category_id: 23,
            overall_dimensions: 280,
            main_photo: 'gzyms-led-ready.jpg',
            photo_dir: 'products/gzymsy',
            unit_of_measure_name: 'szt',
            visible: true
        }
    ];
    
    // Search filtering for demo data
    if (endpoint.indexOf('/products') !== -1) {
        var query = options.query || '';
        var category = options.category || '';
        
        var filtered = demoProducts.slice();
        
        // Text search (minimum 2 chars for demo, 4 for real API)
        if (query && query.length >= 2) {
            var q = query.toLowerCase();
            filtered = filtered.filter(function(product) {
                var searchableText = [
                    product.name || '',
                    product.content_html_short || '',
                    product.product_code || ''
                ].join(' ').toLowerCase();
                
                return searchableText.indexOf(q) !== -1;
            });
        }
        
        // Category filtering
        if (category === 'listwa') {
            filtered = filtered.filter(function(product) {
                return product.name.toLowerCase().indexOf('listwa') !== -1;
            });
        } else if (category === 'gzyms') {
            filtered = filtered.filter(function(product) {
                return product.name.toLowerCase().indexOf('gzyms') !== -1;
            });
        }
        
        // Convert to normalized format
        var normalized = filtered.map(function(product) {
            return self.normalizeSellyProduct(product);
        });
        
        console.log('🎭 Demo search results for "' + query + '":', normalized.length);
        
        return {
            data: normalized,
            __metadata: [{
                total_count: normalized.length,
                page: 1,
                per_page: normalized.length,
                page_count: 1
            }]
        };
    }
    
    return { 
        data: [], 
        __metadata: [{ total_count: 0, page: 1, per_page: 0, page_count: 0 }] 
    };
};

// Utility functions
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

SellyAPI.prototype.wait = function(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
};

// Clear credentials and return to demo mode
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
    console.log('🚪 Credentials cleared, switched to demo mode');
    
    // Update UI
    if (window.CalcApp && window.CalcApp.updateApiStatus) {
        window.CalcApp.updateApiStatus();
    }
};

// Manual credentials setting
SellyAPI.prototype.setCredentials = function() {
    this.showCredentialsPrompt();
};

// Get connection status for UI display
SellyAPI.prototype.getStatus = function() {
    if (this.shopDomain && this.clientId && this.clientSecret) {
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return { 
                connected: true, 
                mode: 'api', 
                shop: this.shopDomain,
                tokenValid: true 
            };
        } else {
            return { 
                connected: false, 
                mode: 'api', 
                shop: this.shopDomain, 
                needsAuth: true 
            };
        }
    }
    return { connected: false, mode: 'demo' };
};

// Test API functionality
SellyAPI.prototype.testAPI = function() {
    var self = this;
    
    console.log('🧪 Testing Selly API with multiple queries...');
    
    var testQueries = [
        { query: 'listwa', type: 'listwa', description: 'Wyszukiwanie listew' },
        { query: 'gzyms', type: 'gzyms', description: 'Wyszukiwanie gzymsów' },
        { query: '200cm', type: '', description: 'Wyszukiwanie według długości' }
    ];
    
    var results = [];
    var completed = 0;
    
    testQueries.forEach(function(test, index) {
        setTimeout(function() {
            console.log('🔍 Test ' + (index + 1) + ':', test.description);
            
            self.searchProducts(test.query, test.type, 5).then(function(products) {
                completed++;
                results.push({
                    test: test,
                    success: true,
                    count: products.length,
                    products: products
                });
                
                console.log('✅ Test ' + (index + 1) + ' completed:', products.length + ' products found');
                
                if (completed === testQueries.length) {
                    self.showTestResults(results);
                }
            }).catch(function(error) {
                completed++;
                results.push({
                    test: test,
                    success: false,
                    error: error.message
                });
                
                console.error('❌ Test ' + (index + 1) + ' failed:', error);
                
                if (completed === testQueries.length) {
                    self.showTestResults(results);
                }
            });
        }, index * 1000); // Stagger requests
    });
};

SellyAPI.prototype.showTestResults = function(results) {
    var status = this.getStatus();
    var summary = '🧪 WYNIKI TESTU API SELLY.PL\n\n';
    
    summary += '📊 Status połączenia: ' + (status.connected ? '✅ Połączono' : '❌ Rozłączono') + '\n';
    summary += '🔧 Tryb: ' + (status.mode === 'api' ? 'API (' + status.shop + ')' : 'Demo') + '\n\n';
    
    results.forEach(function(result, index) {
        summary += '🔍 Test ' + (index + 1) + ': ' + result.test.description + '\n';
        if (result.success) {
            summary += '   ✅ Sukces - znaleziono ' + result.count + ' produktów\n';
            if (result.products && result.products.length > 0) {
                summary += '   📦 Pierwszy produkt: ' + result.products[0].name + '\n';
                summary += '   💰 Cena: ' + result.products[0].pricePLN + ' zł\n';
            }
        } else {
            summary += '   ❌ Błąd: ' + result.error + '\n';
        }
        summary += '\n';
    });
    
    summary += '💡 Jeśli używasz trybu API i występują błędy,\nsprawdź poprawność danych w konfiguracji.';
    
    alert(summary);
};

// Create global instance
if (typeof window !== 'undefined') {
    window.SellyAPI = new SellyAPI();
    
    // Global helpers for UI
    window.setSellyCredentials = function() {
        if (window.SellyAPI) {
            window.SellyAPI.setCredentials();
        }
    };
    
    window.clearSellyCredentials = function() {
        if (window.SellyAPI) {
            window.SellyAPI.clearCredentials();
        }
    };
    
    window.getSellyStatus = function() {
        return window.SellyAPI ? window.SellyAPI.getStatus() : { connected: false, mode: 'unavailable' };
    };
    
    window.testSellyAPI = function() {
        if (window.SellyAPI) {
            window.SellyAPI.testAPI();
        } else {
            alert('❌ Selly API nie jest dostępne');
        }
    };
}