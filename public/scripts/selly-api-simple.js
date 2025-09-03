/**
 * Simplified Selly API - WORKING VERSION
 * Focuses on demo mode with working suggestions
 */

function SellyAPISimple() {
    this.cache = {};
    this.demoMode = true;
    
    console.log('🎭 SellyAPI Simple - Demo Mode Only');
    
    // Enhanced demo data
    this.demoProducts = [
        { id: '1001', name: 'Listwa MDF biała 200cm x 8cm ozdobna', price: 49.99, length: 200, type: 'listwa' },
        { id: '1002', name: 'Listwa dębowa olejowana 250cm x 10cm klasyczna', price: 89.50, length: 250, type: 'listwa' },
        { id: '1003', name: 'Listwa sosna surowa 180cm x 6cm przypodłogowa', price: 24.99, length: 180, type: 'listwa' },
        { id: '1004', name: 'Listwa wenge laminowana 220cm x 12cm profil L', price: 67.80, length: 220, type: 'listwa' },
        { id: '1005', name: 'Listwa MDF surowa 300cm x 5cm do malowania', price: 32.50, length: 300, type: 'listwa' },
        
        { id: '2001', name: 'Gzyms dolny poliuretanowy biały 200cm x 12cm', price: 79.99, length: 200, type: 'gzyms' },
        { id: '2002', name: 'Gzyms górny klasyczny biały 200cm x 15cm ozdobny', price: 94.99, length: 200, type: 'gzyms' },
        { id: '2003', name: 'Gzyms nowoczesny szary 240cm minimalistyczny', price: 112.50, length: 240, type: 'gzyms' },
        { id: '2004', name: 'Gzyms barokowy złoty 300cm ekskluzywny ręcznie zdobiony', price: 189.99, length: 300, type: 'gzyms' },
        { id: '2005', name: 'Gzyms LED ready nowoczesny 280cm z rowkiem', price: 145.00, length: 280, type: 'gzyms' }
    ];
    
    console.log('📦 Loaded', this.demoProducts.length, 'demo products');
}

SellyAPISimple.prototype.searchProducts = function(query, type, limit) {
    var self = this;
    console.log('🔍 Simple search:', { query: query, type: type, limit: limit });
    
    if (!query || query.length < 1) {
        return Promise.resolve([]);
    }
    
    // Symulacja delay API
    return new Promise(function(resolve) {
        setTimeout(function() {
            var q = query.toLowerCase();
            var filtered = self.demoProducts.filter(function(product) {
                var nameMatch = product.name.toLowerCase().indexOf(q) !== -1;
                var typeMatch = !type || product.type === type;
                return nameMatch && typeMatch;
            });
            
            // Konwersja do standardowego formatu
            var normalized = filtered.slice(0, limit || 10).map(function(product) {
                return {
                    id: product.id,
                    name: product.name,
                    description: 'Opis produktu ' + product.name,
                    sku: 'SKU-' + product.id,
                    barLengthCm: product.length,
                    pricePLN: product.price,
                    stock: Math.floor(Math.random() * 30) + 5,
                    category: product.type,
                    images: ['https://placehold.co/50x50?text=' + (product.type === 'listwa' ? 'L' : 'G')],
                    inStock: true,
                    stockStatus: 'in-stock'
                };
            });
            
            console.log('✅ Demo search results:', normalized.length, 'products for query:', query);
            
            resolve(normalized);
        }, 200); // 200ms delay
    });
};

SellyAPISimple.prototype.getStatus = function() {
    return { connected: false, mode: 'demo' };
};

SellyAPISimple.prototype.setCredentials = function() {
    alert('🎭 DEMO MODE\n\nTa wersja działa tylko w trybie demo.\nAby przetestować prawdziwe API, użyj głównej aplikacji.');
};

SellyAPISimple.prototype.testAPI = function() {
    var self = this;
    
    console.log('🧪 Testing demo API...');
    
    Promise.all([
        this.searchProducts('listwa', 'listwa', 3),
        this.searchProducts('gzyms', 'gzyms', 3),
        this.searchProducts('biał', '', 5) // Test cross-category
    ]).then(function(results) {
        var listwy = results[0];
        var gzymsy = results[1];
        var biale = results[2];
        
        console.log('✅ Test results:');
        console.log('📏 Listwy:', listwy.length);
        console.log('📐 Gzymsy:', gzymsy.length);
        console.log('⚪ Białe produkty:', biale.length);
        
        var message = '✅ DEMO API TEST PASSED\n\n' +
                      'Funkcjonalność:\n' +
                      '• Wyszukiwanie listew: ' + listwy.length + ' wyników\n' +
                      '• Wyszukiwanie gzymsów: ' + gzymsy.length + ' wyników\n' +
                      '• Wyszukiwanie krzyżowe: ' + biale.length + ' wyników\n\n';
        
        if (listwy.length > 0) {
            message += 'Przykład listwy:\n' + listwy[0].name + '\nCena: ' + listwy[0].pricePLN + ' zł\n\n';
        }
        
        message += 'Podpowiedzi i wyszukiwarka działają!';
        
        alert(message);
    }).catch(function(error) {
        console.error('❌ Demo test failed:', error);
        alert('❌ Demo test failed: ' + error.message);
    });
};

// Create global instance dla compatibility
if (typeof window !== 'undefined') {
    // Use simple version if main API fails
    if (!window.SellyAPI || !window.SellyAPI.searchProducts) {
        console.log('🔄 Using simplified SellyAPI for better compatibility');
        window.SellyAPI = new SellyAPISimple();
    }
    
    window.setSellyCredentials = function() {
        if (window.SellyAPI && window.SellyAPI.setCredentials) {
            window.SellyAPI.setCredentials();
        } else {
            alert('API configuration not available in demo');
        }
    };
    
    window.getSellyStatus = function() {
        return window.SellyAPI ? window.SellyAPI.getStatus() : { connected: false, mode: 'demo' };
    };
    
    window.testSellyAPI = function() {
        if (window.SellyAPI && window.SellyAPI.testAPI) {
            window.SellyAPI.testAPI();
        }
    };
    
    console.log('🌐 Simple API functions ready');
}