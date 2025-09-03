/**
 * Main Application
 * Handles DOM manipulation, event binding, and UI updates
 * Updated for Selly API 1.0 integration
 */

(function() {
    'use strict';
    
    // Global variables
    var windowCounter = 0;
    var cornerCounter = 0;
    var lastActiveCard = null;
    var autosaveTimer = null;
    
    // DOM elements
    var windowsWrap = document.getElementById('windows');
    var cornersWrap = document.getElementById('corners');
    var addWinBtn = document.getElementById('addWin');
    var addCornerBtn = document.getElementById('addCorner');
    
    // Initialize application
    function init() {
        if (typeof Calculator === 'undefined') {
            console.error('Calculator module not loaded');
            return;
        }
        
        // Initialize API status display
        updateApiStatus();
        
        // Initialize UI components
        initPresetsUI();
        initCardCollapsible('presetsCard');
        initCardCollapsible('bulkCard');
        
        // Bind event handlers
        bindGlobalEvents();
        
        // Load state from URL hash or autosave
        loadInitialState();
        
        console.log('✅ Calculator application initialized');
        console.log('🛒 Selly.pl API integration ready');
        
        // Set up periodic API status updates
        setInterval(updateApiStatus, 30000); // Every 30 seconds
    }
    
    // Update API status display
    function updateApiStatus() {
        var statusEl = document.getElementById('apiStatus');
        var btnEl = document.getElementById('apiKeyBtn');
        
        if (!statusEl) return;
        
        var status = window.getSellyStatus ? window.getSellyStatus() : { mode: 'demo', connected: false };
        
        if (status.mode === 'api' && status.connected) {
            statusEl.innerHTML = '✅ API połączone: ' + status.shop;
            statusEl.style.color = '#16a34a';
            if (btnEl) btnEl.textContent = '🔑 Zmień konfigurację';
        } else if (status.mode === 'api' && !status.connected) {
            statusEl.innerHTML = '⚠️ API nie połączone: ' + (status.shop || 'brak');
            statusEl.style.color = '#f59e0b';
            if (btnEl) btnEl.textContent = '🔑 Napraw konfigurację';
        } else {
            statusEl.innerHTML = '🎭 Tryb demo (bez API)';
            statusEl.style.color = '#6b7280';
            if (btnEl) btnEl.textContent = '🔑 Konfiguracja Selly.pl';
        }
    }
    
    // Add window function
    function addWindow(preset) {
        preset = preset || {};
        windowCounter++;
        var id = windowCounter;
        
        var template = document.getElementById('winTemplate');
        var card = template.content.firstElementChild.cloneNode(true);
        card.dataset.id = id;
        card.querySelector('.num').textContent = id;
        
        // Replace template IDs
        card.innerHTML = card.innerHTML
            .replace(/frame__ID__/g, 'frame_' + id)
            .replace(/__ID__/g, id);
        
        windowsWrap.appendChild(card);
        bindWindowEvents(card);
        initSections(card);
        
        // Apply preset values if provided
        if (preset.name) card.querySelector('.name').value = preset.name;
        if (preset.w) card.querySelector('.w').value = preset.w;
        if (preset.h) card.querySelector('.h').value = preset.h;
        if (preset.qty) card.querySelector('.qty').value = preset.qty;
        
        // Initialize product pickers
        initProductPickers(card);
        
        computeAll();
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Initialize product pickers for a card
    function initProductPickers(card) {
        if (typeof ProductPicker === 'undefined') {
            console.warn('ProductPicker not available');
            return;
        }
        
        // Listwa picker
        var listwaInput = card.querySelector('.pickListwa');
        if (listwaInput) {
            new ProductPicker(listwaInput, {
                type: 'listwa',
                onSelect: function(product) {
                    console.log('🔗 Listwa selected:', product.name);
                    card.querySelector('.lenListwa').value = product.barLengthCm || 200;
                    card.querySelector('.priceListwa').value = product.pricePLN || 0;
                    var pillL = card.querySelector('.prodNameL');
                    if (pillL) {
                        pillL.textContent = product.name;
                        pillL.style.display = 'inline-block';
                    }
                    card.dataset.listwaId = product.id;
                    card.dataset.listwaName = product.name;
                    computeAll();
                    autosaveNow();
                }
            });
        }
        
        // Gzyms down picker
        var gdInput = card.querySelector('.pickGd');
        if (gdInput) {
            new ProductPicker(gdInput, {
                type: 'gzyms',
                onSelect: function(product) {
                    console.log('🔗 Gzyms dolny selected:', product.name);
                    card.querySelector('.gzymsDown').checked = true;
                    toggleGzymsGroups(card);
                    card.querySelector('.lenGzymsDown').value = product.barLengthCm || 200;
                    card.querySelector('.priceGzymsDown').value = product.pricePLN || 0;
                    var pillGd = card.querySelector('.prodNameGd');
                    if (pillGd) {
                        pillGd.textContent = product.name;
                        pillGd.style.display = 'inline-block';
                    }
                    card.dataset.gdId = product.id;
                    card.dataset.gdName = product.name;
                    computeAll();
                    autosaveNow();
                }
            });
        }
        
        // Gzyms up picker
        var guInput = card.querySelector('.pickGu');
        if (guInput) {
            new ProductPicker(guInput, {
                type: 'gzyms',
                onSelect: function(product) {
                    console.log('🔗 Gzyms górny selected:', product.name);
                    card.querySelector('.gzymsUp').checked = true;
                    toggleGzymsGroups(card);
                    card.querySelector('.lenGzymsUp').value = product.barLengthCm || 200;
                    card.querySelector('.priceGzymsUp').value = product.pricePLN || 0;
                    var pillGu = card.querySelector('.prodNameGu');
                    if (pillGu) {
                        pillGu.textContent = product.name;
                        pillGu.style.display = 'inline-block';
                    }
                    card.dataset.guId = product.id;
                    card.dataset.guName = product.name;
                    computeAll();
                    autosaveNow();
                }
            });
        }
    }
    
    // Bind window events (simplified)
    function bindWindowEvents(card) {
        // Basic event binding for remove, clone, etc.
        var removeBtn = card.querySelector('.remove');
        if (removeBtn) {
            removeBtn.onclick = function() {
                card.remove();
                computeAll();
                autosaveNow();
            };
        }
        
        var cloneBtn = card.querySelector('.clone');
        if (cloneBtn) {
            cloneBtn.onclick = function() {
                var data = readWindowData(card);
                addWindow(data);
            };
        }
        
        // Input events
        card.addEventListener('input', computeAll);
        
        // Gzyms toggles
        var gzymsDownCheck = card.querySelector('.gzymsDown');
        var gzymsUpCheck = card.querySelector('.gzymsUp');
        
        if (gzymsDownCheck) {
            gzymsDownCheck.addEventListener('change', function() {
                toggleGzymsGroups(card);
                computeAll();
            });
        }
        
        if (gzymsUpCheck) {
            gzymsUpCheck.addEventListener('change', function() {
                toggleGzymsGroups(card);
                computeAll();
            });
        }
    }
    
    function toggleGzymsGroups(card) {
        var gzymsDown = card.querySelector('.gzymsDown');
        var gzymsUp = card.querySelector('.gzymsUp');
        var grpDown = card.querySelector('.grpDown');
        var grpUp = card.querySelector('.grpUp');
        
        if (grpDown) {
            grpDown.classList.toggle('hidden', !gzymsDown.checked);
        }
        
        if (grpUp) {
            grpUp.classList.toggle('hidden', !gzymsUp.checked);
        }
    }
    
    function readWindowData(card) {
        return {
            name: card.querySelector('.name').value.trim(),
            w: card.querySelector('.w').value,
            h: card.querySelector('.h').value,
            qty: card.querySelector('.qty').value,
            mode: card.querySelector('input[type=radio]:checked').value,
            lenListwa: card.querySelector('.lenListwa').value,
            priceListwa: card.querySelector('.priceListwa').value,
            gDown: card.querySelector('.gzymsDown').checked,
            gUp: card.querySelector('.gzymsUp').checked,
            lenGzymsDown: card.querySelector('.lenGzymsDown').value,
            priceGzymsDown: card.querySelector('.priceGzymsDown').value,
            lenGzymsUp: card.querySelector('.lenGzymsUp').value,
            priceGzymsUp: card.querySelector('.priceGzymsUp').value,
            discount: card.querySelector('.discount').value
        };
    }
    
    // Simplified computation functions
    function computeAll() {
        if (typeof Calculator === 'undefined') return;
        
        var windowCards = document.querySelectorAll('#windows .card[data-id]');
        var summaryTableBody = document.querySelector('#summaryTable tbody');
        if (!summaryTableBody) return;
        
        summaryTableBody.innerHTML = '';
        
        var totals = { qty: 0, cost: 0, lenL: 0, pcsL: 0 };
        
        for (var i = 0; i < windowCards.length; i++) {
            var card = windowCards[i];
            var data = readWindowData(card);
            var calc = Calculator.calculateWindow(data);
            
            // Update card info
            card.querySelector('.perimeter').textContent = calc.lenL + ' cm';
            card.querySelector('.piecesL').textContent = calc.pcsL;
            
            // Add to table
            var row = document.createElement('tr');
            row.innerHTML = 
                '<td>' + (i + 1) + '</td>' +
                '<td>' + Calculator.escapeHtml(calc.name || '—') + '</td>' +
                '<td>' + calc.w + '×' + calc.h + '</td>' +
                '<td>' + calc.qty + '</td>' +
                '<td>' + calc.mode + '</td>' +
                '<td>' + (calc.gDown ? 'tak' : 'nie') + '</td>' +
                '<td>' + (calc.gUp ? 'tak' : 'nie') + '</td>' +
                '<td>' + calc.lenL + '</td>' +
                '<td>' + calc.pcsL + '</td>' +
                '<td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td>' +
                '<td>' + calc.discount + '%</td>' +
                '<td>' + Calculator.money(calc.costTotal) + '</td>';
            
            summaryTableBody.appendChild(row);
            
            totals.qty += calc.qty;
            totals.cost += calc.costTotal;
            totals.lenL += calc.lenLTotal;
            totals.pcsL += calc.pcsLTotal;
        }
        
        // Update totals
        document.getElementById('tQty').textContent = totals.qty;
        document.getElementById('tCost').textContent = Calculator.money(totals.cost);
        document.getElementById('tLenL').textContent = totals.lenL;
        document.getElementById('tPiecesL').textContent = totals.pcsL;
        
        autosaveNow();
    }
    
    // Simplified corner functions
    function addCorner() {
        cornerCounter++;
        var template = document.getElementById('cornerTemplate');
        var card = template.content.firstElementChild.cloneNode(true);
        card.dataset.cornerId = cornerCounter;
        card.querySelector('.num').textContent = cornerCounter;
        cornersWrap.appendChild(card);
        computeCorners();
    }
    
    function computeCorners() {
        // Simplified corner calculation
        document.getElementById('tBonie').textContent = '0';
        document.getElementById('tBonieCost').textContent = Calculator.money(0);
    }
    
    function initPresetsUI() {
        var presetSelect = document.getElementById('presetSelect');
        if (presetSelect) {
            presetSelect.innerHTML = '<option value="classic">Ościeże klasyczne</option>';
        }
        
        var addPresetBtn = document.getElementById('addPresetBtn');
        if (addPresetBtn) {
            addPresetBtn.onclick = function() {
                addWindow({ name: 'Salon', w: 150, h: 180, qty: 1, mode: 'full' });
            };
        }
    }
    
    function initCardCollapsible(cardId) {
        var card = document.getElementById(cardId);
        if (!card) return;
        
        var button = card.querySelector('.coll-btn');
        var body = card.querySelector('.body');
        if (!button || !body) return;
        
        button.addEventListener('click', function() {
            var isCollapsed = body.classList.contains('collapsed');
            if (isCollapsed) {
                body.classList.remove('collapsed');
                body.classList.add('expanded');
                button.textContent = '▾ Zwiń';
            } else {
                body.classList.add('collapsed');
                body.classList.remove('expanded');
                button.textContent = '▸ Rozwiń';
            }
        });
    }
    
    function initSections(card) {
        var sectionTitles = card.querySelectorAll('.section-title');
        for (var i = 0; i < sectionTitles.length; i++) {
            var title = sectionTitles[i];
            title.addEventListener('click', function() {
                var body = this.nextElementSibling;
                if (body) {
                    body.classList.toggle('collapsed');
                    body.classList.toggle('expanded');
                    this.classList.toggle('collapsed');
                }
            });
        }
    }
    
    function bindGlobalEvents() {
        if (addWinBtn) {
            addWinBtn.onclick = function() { addWindow(); };
        }
        
        if (addCornerBtn) {
            addCornerBtn.onclick = function() { addCorner(); };
        }
        
        var exportCSVBtn = document.getElementById('exportCSV');
        if (exportCSVBtn) {
            exportCSVBtn.onclick = function() {
                Calculator.exportToCSV('summaryTable');
            };
        }
        
        var printPDFBtn = document.getElementById('printPDF');
        if (printPDFBtn) {
            printPDFBtn.onclick = function() {
                window.print();
            };
        }
    }
    
    function loadInitialState() {
        // Add one default window
        addWindow();
        computeAll();
        computeCorners();
    }
    
    function autosaveNow() {
        clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(function() {
            try {
                Calculator.autosaveState();
            } catch (e) {
                console.error('Autosave failed:', e);
            }
        }, 500);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Export functions for global access
    window.CalcApp = {
        addWindow: addWindow,
        addCorner: addCorner,
        computeAll: computeAll,
        computeCorners: computeCorners,
        autosaveNow: autosaveNow,
        updateApiStatus: updateApiStatus
    };
    
    // Global test function for API
    window.testSellyAPI = function() {
        if (!window.SellyAPI) {
            alert('❌ SellyAPI nie jest dostępne');
            return;
        }
        
        console.log('🧪 Testing Selly API...');
        
        // Test search
        window.SellyAPI.searchProducts('listwa', 'listwa', 5)
            .then(function(products) {
                var message = '✅ Test API zakończony sukcesem!\n\n' +
                              'Znaleziono produktów: ' + products.length + '\n';
                
                if (products.length > 0) {
                    message += '\nPierwszy produkt:\n' +
                               '• Nazwa: ' + products[0].name + '\n' +
                               '• Długość: ' + products[0].barLengthCm + ' cm\n' +
                               '• Cena: ' + products[0].pricePLN + ' zł';
                }
                
                var status = window.getSellyStatus();
                message += '\n\nStatus: ' + (status.connected ? 'Połączono' : 'Demo mode');
                
                alert(message);
            })
            .catch(function(error) {
                alert('❌ Test API nieudany\nBłąd: ' + error.message);
            });
    };
})();