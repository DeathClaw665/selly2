/**
 * Selly.pl REST API Integration
 * Handles authentication, product search, and data caching
 * ES5 compatible version
 */

function SellyAPI() {
    var self = this;
    
    // API Configuration
    this.baseURL = 'https://api.selly.pl/v1';
    this.apiKey = localStorage.getItem('selly_api_key') || '';
    this.cache = {};
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.requestQueue = [];
    this.isRateLimited = false;
    this.rateLimitDelay = 1000; // 1 second between requests
    
    // Initialize
    this.init();
}

SellyAPI.prototype.init = function() {
    var self = this;
    // Check if API key is set
    if (!this.apiKey) {
        this.showApiKeyPrompt();
    } else {
        // Test API key validity
        this.testConnection().catch(function(error) {
            console.warn('Selly API key invalid, switching to demo mode:', error.message);
            self.showApiKeyPrompt();
        });
    }
};

SellyAPI.prototype.showApiKeyPrompt = function() {
    var key = prompt(
        'Wprowadź klucz API Selly.pl:\n\n' +
        'Możesz go znaleźć w panelu Selly.pl w sekcji API.\n' +
        'Pozostaw puste aby używać danych demonstracyjnych.'
    );
    
    if (key && key.trim()) {
        this.apiKey = key.trim();
        localStorage.setItem('selly_api_key', this.apiKey);
        this.testConnection();
    } else {
        console.info('Using demo data for product search');
    }
};

SellyAPI.prototype.testConnection = function() {
    var self = this;
    if (!this.apiKey) {
        return Promise.reject(new Error('No API key provided'));
    }
    
    return this.makeRequest('/user/profile', {
        method: 'GET'
    }).then(function(response) {
        if (response.error) {
            throw new Error(response.error.message || 'API key invalid');
        }
        
        console.log('Selly API connected successfully');
        return true;
    });
};

SellyAPI.prototype.makeRequest = function(endpoint, options) {
    var self = this;
    options = options || {};
    
    // Return demo data if no API key
    if (!this.apiKey) {
        return Promise.resolve(this.getDemoData(endpoint, options));
    }
    
    // Rate limiting
    var requestPromise = this.isRateLimited ? 
        this.wait(this.rateLimitDelay) : 
        Promise.resolve();
    
    return requestPromise.then(function() {
        var url = self.baseURL + endpoint;
        var config = {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + self.apiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Kalkulator-Listew/1.0'
            }
        };
        
        // Merge options
        Object.keys(options).forEach(function(key) {
            if (key !== 'query' && key !== 'category') {
                config[key] = options[key];
            }
        });
        
        return fetch(url, config).then(function(response) {
            // Handle rate limiting
            if (response.status === 429) {
                self.isRateLimited = true;
                var retryAfter = response.headers.get('Retry-After') || '60';
                return self.wait(parseInt(retryAfter) * 1000).then(function() {
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
        console.error('Selly API request failed:', error);
        
        // Fallback to demo data on error
        if (error.name === 'TypeError' && error.message.indexOf('fetch') !== -1) {
            console.warn('Network error, falling back to demo data');
            return self.getDemoData(endpoint, options);
        }
        
        throw error;
    });
};

SellyAPI.prototype.getDemoData = function(endpoint, options) {
    options = options || {};
    
    // Demo products for development and fallback
    var demoProducts = [
        {
            id: 'DEMO-L200',
            name: 'Listwa ozdobna L-200 (biała, 200cm)',
            description: 'Listwa ozdobna z MDF, biała, długość 200cm',
            sku: 'L200-WHITE',
            price: {
                gross: 49.99,
                net: 40.65,
                currency: 'PLN'
            },
            dimensions: {
                length: 200,
                width: 8,
                height: 2.5,
                unit: 'cm'
            },
            stock: 25,
            category: 'listwy',
            images: [
                'https://placehold.co/400x300?text=Listwa+L-200+biała'
            ],
            attributes: {
                material: 'MDF',
                color: 'biały',
                surface: 'gładka'
            }
        },
        {
            id: 'DEMO-L250',
            name: 'Listwa ozdobna L-250 (dąb, 250cm)',
            description: 'Listwa ozdobna z drewna dębowego, długość 250cm',
            sku: 'L250-OAK',
            price: {
                gross: 67.50,
                net: 54.88,
                currency: 'PLN'
            },
            dimensions: {
                length: 250,
                width: 8,
                height: 2.5,
                unit: 'cm'
            },
            stock: 12,
            category: 'listwy',
            images: [
                'https://placehold.co/400x300?text=Listwa+L-250+dąb'
            ],
            attributes: {
                material: 'drewno dębowe',
                color: 'naturalny dąb',
                surface: 'olejowana'
            }
        },
        {
            id: 'DEMO-G200D',
            name: 'Gzyms dolny G-200 (biały, 200cm)',
            description: 'Gzyms dolny z poliuretanu, biały, długość 200cm',
            sku: 'G200D-WHITE',
            price: {
                gross: 79.99,
                net: 65.04,
                currency: 'PLN'
            },
            dimensions: {
                length: 200,
                width: 12,
                height: 8,
                unit: 'cm'
            },
            stock: 18,
            category: 'gzymsy',
            images: [
                'https://placehold.co/400x300?text=Gzyms+dolny+G-200'
            ],
            attributes: {
                material: 'poliuretan',
                color: 'biały',
                mounting: 'klejony'
            }
        },
        {
            id: 'DEMO-G200U',
            name: 'Gzyms górny G-200 (biały, 200cm)',
            description: 'Gzyms górny z poliuretanu, biały, długość 200cm',
            sku: 'G200U-WHITE',
            price: {
                gross: 85.99,
                net: 69.91,
                currency: 'PLN'
            },
            dimensions: {
                length: 200,
                width: 15,
                height: 10,
                unit: 'cm'
            },
            stock: 15,
            category: 'gzymsy',
            images: [
                'https://placehold.co/400x300?text=Gzyms+górny+G-200'
            ],
            attributes: {
                material: 'poliuretan',
                color: 'biały',
                mounting: 'klejony'
            }
        },
        {
            id: 'DEMO-L180',
            name: 'Listwa przypodłogowa L-180 (sosna, 180cm)',
            description: 'Listwa przypodłogowa z drewna sosnowego, długość 180cm',
            sku: 'L180-PINE',
            price: {
                gross: 35.99,
                net: 29.26,
                currency: 'PLN'
            },
            dimensions: {
                length: 180,
                width: 6,
                height: 2,
                unit: 'cm'
            },
            stock: 30,
            category: 'listwy',
            images: [
                'https://placehold.co/400x300?text=Listwa+L-180+sosna'
            ],
            attributes: {
                material: 'drewno sosnowe',
                color: 'naturalny',
                surface: 'surowa'
            }
        },
        {
            id: 'DEMO-G240D',
            name: 'Gzyms dolny G-240 (szary, 240cm)',
            description: 'Gzyms dolny nowoczesny, szary, długość 240cm',
            sku: 'G240D-GREY',
            price: {
                gross: 92.50,
                net: 75.20,
                currency: 'PLN'
            },
            dimensions: {
                length: 240,
                width: 14,
                height: 9,
                unit: 'cm'
            },
            stock: 8,
            category: 'gzymsy',
            images: [
                'https://placehold.co/400x300?text=Gzyms+G-240+szary'
            ],
            attributes: {
                material: 'poliuretan',
                color: 'szary',
                style: 'nowoczesny'
            }
        }
    ];
    
    if (endpoint.indexOf('/products/search') !== -1) {
        var query = options.query || '';
        var category = options.category || '';
        
        var filtered = demoProducts.slice();
        
        if (query) {
            var q = query.toLowerCase();
            filtered = filtered.filter(function(product) {
                return product.name.toLowerCase().indexOf(q) !== -1 ||
                       product.description.toLowerCase().indexOf(q) !== -1 ||
                       product.sku.toLowerCase().indexOf(q) !== -1;
            });
        }
        
        if (category) {
            filtered = filtered.filter(function(product) {
                return product.category === category;
            });
        }
        
        return {
            data: filtered.slice(0, 10), // Limit to 10 results
            pagination: {
                total: filtered.length,
                page: 1,
                limit: 10,
                pages: Math.ceil(filtered.length / 10)
            }
        };
    }
    
    return { data: [], error: { message: 'Demo endpoint not implemented' } };
};

SellyAPI.prototype.searchProducts = function(query, type, limit) {
    var self = this;
    type = type || '';
    limit = limit || 10;
    
    if (!query || query.length < 2) {
        return Promise.resolve([]);
    }
    
    var cacheKey = 'search_' + type + '_' + query + '_' + limit;
    
    // Check cache first
    var cached = this.getCached(cacheKey);
    if (cached) {
        return Promise.resolve(cached);
    }
    
    var params = [
        'q=' + encodeURIComponent(query),
        'limit=' + limit,
        'status=active'
    ];
    
    // Add category filter based on type
    if (type === 'listwa') {
        params.push('category=listwy');
    } else if (type === 'gzyms') {
        params.push('category=gzymsy');
    }
    
    var queryString = params.join('&');
    
    return this.makeRequest('/products/search?' + queryString, {
        query: query,
        category: type === 'listwa' ? 'listwy' : type === 'gzyms' ? 'gzymsy' : ''
    }).then(function(response) {
        var products = (response.data || []).map(function(product) {
            return self.normalizeProduct(product);
        });
        
        // Cache results
        self.setCached(cacheKey, products);
        
        return products;
    }).catch(function(error) {
        console.error('Product search failed:', error);
        return [];
    });
};

SellyAPI.prototype.getProduct = function(productId) {
    var self = this;
    var cacheKey = 'product_' + productId;
    
    // Check cache first
    var cached = this.getCached(cacheKey);
    if (cached) {
        return Promise.resolve(cached);
    }
    
    return this.makeRequest('/products/' + productId).then(function(response) {
        if (response.error) {
            throw new Error(response.error.message);
        }
        
        var product = self.normalizeProduct(response.data);
        
        // Cache result
        self.setCached(cacheKey, product);
        
        return product;
    }).catch(function(error) {
        console.error('Product fetch failed:', error);
        return null;
    });
};

SellyAPI.prototype.normalizeProduct = function(product) {
    if (!product) return null;
    
    return {
        id: product.id || product.product_id || '',
        name: product.name || product.title || product.product_name || 'Produkt',
        description: product.description || '',
        sku: product.sku || product.code || '',
        barLengthCm: this.extractLength(product),
        pricePLN: this.extractPrice(product),
        stock: this.extractStock(product),
        category: product.category || '',
        images: this.extractImages(product),
        attributes: product.attributes || {},
        inStock: this.isInStock(product),
        stockStatus: this.getStockStatus(product)
    };
};

SellyAPI.prototype.extractLength = function(product) {
    // Try to extract length from various fields
    if (product.dimensions && product.dimensions.length) {
        return Number(product.dimensions.length);
    }
    
    if (product.length_cm || product.length) {
        return Number(product.length_cm || product.length);
    }
    
    // Try to extract from name or description
    var text = (product.name || '') + ' ' + (product.description || '');
    var lengthMatch = text.match(/(\d+)\s*cm/i);
    if (lengthMatch) {
        return Number(lengthMatch[1]);
    }
    
    // Default fallback
    return 200;
};

SellyAPI.prototype.extractPrice = function(product) {
    if (product.price && product.price.gross) {
        return Number(product.price.gross);
    }
    
    if (product.pricePLN || product.price) {
        return Number(product.pricePLN || product.price);
    }
    
    if (product.gross_price || product.net_price) {
        return Number(product.gross_price || product.net_price);
    }
    
    return 0;
};

SellyAPI.prototype.extractStock = function(product) {
    if (typeof product.stock === 'number') {
        return product.stock;
    }
    
    if (product.quantity || product.available) {
        return Number(product.quantity || product.available);
    }
    
    return 0;
};

SellyAPI.prototype.extractImages = function(product) {
    if (Array.isArray(product.images)) {
        return product.images;
    }
    
    if (product.image_url || product.main_image) {
        return [product.image_url || product.main_image];
    }
    
    return [];
};

SellyAPI.prototype.isInStock = function(product) {
    var stock = this.extractStock(product);
    return stock > 0;
};

SellyAPI.prototype.getStockStatus = function(product) {
    var stock = this.extractStock(product);
    
    if (stock === 0) {
        return 'out-of-stock';
    } else if (stock < 5) {
        return 'low-stock';
    } else {
        return 'in-stock';
    }
};

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
};

SellyAPI.prototype.wait = function(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
};

// Utility method to update API key
SellyAPI.prototype.updateApiKey = function(newKey) {
    this.apiKey = newKey;
    localStorage.setItem('selly_api_key', newKey);
    this.clearCache();
    return this.testConnection();
};

// Method to clear API key (logout)
SellyAPI.prototype.clearApiKey = function() {
    this.apiKey = '';
    localStorage.removeItem('selly_api_key');
    this.clearCache();
};

// Create global instance
if (typeof window !== 'undefined') {
    window.SellyAPI = new SellyAPI();
}