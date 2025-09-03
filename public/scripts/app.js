/**
 * Main Application - FIXED VERSION
 * Handles DOM manipulation, event binding, and UI updates
 * Fixes for template.content errors and missing functions
 */

(function() {
    'use strict';
    
    // Global variables
    var windowCounter = 0;
    var cornerCounter = 0;
    var lastActiveCard = null;
    var autosaveTimer = null;
    
    // DOM elements - with null checks
    var windowsWrap, cornersWrap, addWinBtn, addCornerBtn;
    
    // Initialize application
    function init() {
        console.log('🚀 Starting calculator application...');
        
        // Check required modules
        if (typeof Calculator === 'undefined') {
            console.error('❌ Calculator module not loaded');
            return;
        }
        
        // Initialize DOM elements
        windowsWrap = document.getElementById('windows');
        cornersWrap = document.getElementById('corners');
        addWinBtn = document.getElementById('addWin');
        addCornerBtn = document.getElementById('addCorner');
        
        // Validate critical elements
        if (!windowsWrap) {
            console.error('❌ Windows container not found');
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
        
        // Load initial state
        loadInitialState();
        
        console.log('✅ Calculator application initialized successfully');
        
        // Set up periodic API status updates
        setInterval(updateApiStatus, 30000);
    }
    
    // Update API status display
    function updateApiStatus() {
        var statusEl = document.getElementById('apiStatus');
        var btnEl = document.getElementById('apiKeyBtn');
        
        if (!statusEl) return;
        
        try {
            var status = window.getSellyStatus ? window.getSellyStatus() : { mode: 'demo', connected: false };
            
            if (status.mode === 'api' && status.connected) {
                statusEl.innerHTML = '✅ API połączone: ' + (status.shop || 'Selly.pl');
                statusEl.style.color = '#16a34a';
                if (btnEl) btnEl.textContent = '🔑 Zmień konfigurację';
            } else if (status.mode === 'api' && !status.connected) {
                statusEl.innerHTML = '⚠️ API wymagana autoryzacja';
                statusEl.style.color = '#f59e0b';
                if (btnEl) btnEl.textContent = '🔑 Napraw API';
            } else {
                statusEl.innerHTML = '🎭 Tryb demo (bez API)';
                statusEl.style.color = '#6b7280';
                if (btnEl) btnEl.textContent = '🔑 Konfiguracja API';
            }
        } catch (error) {
            console.error('Error updating API status:', error);
            statusEl.innerHTML = '❌ Błąd statusu API';
            statusEl.style.color = '#dc2626';
        }
    }
    
    // FIXED: Add window function with proper template handling
    function addWindow(preset) {
        preset = preset || {};
        windowCounter++;
        var id = windowCounter;
        
        console.log('➕ Adding window #' + id);
        
        try {
            var template = document.getElementById('winTemplate');
            if (!template) {
                console.error('❌ Window template (#winTemplate) not found in DOM');
                return;
            }
            
            var card;
            
            // Safe template content extraction with fallback
            if (template.content && template.content.firstElementChild) {
                // Modern browsers with template support
                card = template.content.firstElementChild.cloneNode(true);
                console.log('✅ Using template.content');
            } else if (template.innerHTML) {
                // Fallback for older browsers or when content is not available
                var tempDiv = document.createElement('div');
                tempDiv.innerHTML = template.innerHTML;
                card = tempDiv.querySelector('.card');
                if (card) {
                    card = card.cloneNode(true);
                    console.log('✅ Using innerHTML fallback');
                }
            }
            
            if (!card) {
                console.error('❌ Could not create window card from template');
                // Create basic card as last resort
                card = createBasicWindowCard();
            }
            
            // Set up card
            card.dataset.id = id;
            var numEl = card.querySelector('.num');
            if (numEl) numEl.textContent = id;
            
            // Replace template IDs safely
            if (card.innerHTML) {
                card.innerHTML = card.innerHTML
                    .replace(/frame__ID__/g, 'frame_' + id)
                    .replace(/__ID__/g, id);
            }
            
            // Add to DOM
            if (windowsWrap) {
                windowsWrap.appendChild(card);
            } else {
                console.error('❌ windowsWrap not available');
                return;
            }
            
            // Initialize card functionality
            bindWindowEvents(card);
            initSections(card);
            
            // Apply preset values safely
            applyPresetToWindow(card, preset);
            
            // Initialize product pickers
            initProductPickers(card);
            
            // Update calculations
            computeAll();
            
            // Scroll to new card
            try {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (e) {
                console.log('Scroll not supported, skipping animation');
            }
            
            console.log('✅ Window #' + id + ' added successfully');
            
        } catch (error) {
            console.error('❌ Error adding window:', error);
            alert('Błąd podczas dodawania okna: ' + error.message);
        }
    }
    
    // Create basic window card as fallback
    function createBasicWindowCard() {
        var card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = '<div class="head">Okno #<span class="num"></span></div><div class="body"><p>Podstawowe okno utworzone jako fallback</p></div>';
        return card;
    }
    
    // Apply preset values safely
    function applyPresetToWindow(card, preset) {
        if (!preset || !card) return;
        
        try {
            var setValue = function(selector, value) {
                if (value !== undefined && value !== null) {
                    var el = card.querySelector(selector);
                    if (el && el.tagName === 'INPUT') {
                        el.value = value;
                    }
                }
            };
            
            setValue('.name', preset.name);
            setValue('.w', preset.w);
            setValue('.h', preset.h);
            setValue('.qty', preset.qty);
            setValue('.lenListwa', preset.lenListwa);
            setValue('.priceListwa', preset.priceListwa);
            setValue('.discount', preset.discount);
            
        } catch (error) {
            console.error('Error applying preset:', error);
        }
    }
    
    // Initialize product pickers safely
    function initProductPickers(card) {
        if (typeof ProductPicker === 'undefined') {
            console.warn('⚠️ ProductPicker not available, skipping picker initialization');
            return;
        }
        
        try {
            // Listwa picker
            var listwaInput = card.querySelector('.pickListwa');
            if (listwaInput) {
                new ProductPicker(listwaInput, {
                    type: 'listwa',
                    onSelect: function(product) {
                        console.log('📏 Listwa selected:', product.name);
                        
                        var lenInput = card.querySelector('.lenListwa');
                        var priceInput = card.querySelector('.priceListwa');
                        var pill = card.querySelector('.prodNameL');
                        
                        if (lenInput) lenInput.value = product.barLengthCm || 200;
                        if (priceInput) priceInput.value = product.pricePLN || 0;
                        
                        if (pill) {
                            pill.textContent = product.name;
                            pill.style.display = 'inline-block';
                        }
                        
                        card.dataset.listwaId = product.id;
                        card.dataset.listwaName = product.name;
                        
                        computeAll();
                        autosaveNow();
                    },
                    onError: function(error) {
                        console.error('Listwa picker error:', error);
                    }
                });
            }
            
            // Gzyms down picker
            var gdInput = card.querySelector('.pickGd');
            if (gdInput) {
                new ProductPicker(gdInput, {
                    type: 'gzyms',
                    onSelect: function(product) {
                        console.log('📐 Gzyms dolny selected:', product.name);
                        
                        var checkbox = card.querySelector('.gzymsDown');
                        var lenInput = card.querySelector('.lenGzymsDown');
                        var priceInput = card.querySelector('.priceGzymsDown');
                        var pill = card.querySelector('.prodNameGd');
                        
                        if (checkbox) checkbox.checked = true;
                        if (lenInput) lenInput.value = product.barLengthCm || 200;
                        if (priceInput) priceInput.value = product.pricePLN || 0;
                        
                        if (pill) {
                            pill.textContent = product.name;
                            pill.style.display = 'inline-block';
                        }
                        
                        card.dataset.gdId = product.id;
                        card.dataset.gdName = product.name;
                        
                        toggleGzymsGroups(card);
                        computeAll();
                        autosaveNow();
                    },
                    onError: function(error) {
                        console.error('Gzyms down picker error:', error);
                    }
                });
            }
            
            // Gzyms up picker
            var guInput = card.querySelector('.pickGu');
            if (guInput) {
                new ProductPicker(guInput, {
                    type: 'gzyms',
                    onSelect: function(product) {
                        console.log('📐 Gzyms górny selected:', product.name);
                        
                        var checkbox = card.querySelector('.gzymsUp');
                        var lenInput = card.querySelector('.lenGzymsUp');
                        var priceInput = card.querySelector('.priceGzymsUp');
                        var pill = card.querySelector('.prodNameGu');
                        
                        if (checkbox) checkbox.checked = true;
                        if (lenInput) lenInput.value = product.barLengthCm || 200;
                        if (priceInput) priceInput.value = product.pricePLN || 0;
                        
                        if (pill) {
                            pill.textContent = product.name;
                            pill.style.display = 'inline-block';
                        }
                        
                        card.dataset.guId = product.id;
                        card.dataset.guName = product.name;
                        
                        toggleGzymsGroups(card);
                        computeAll();
                        autosaveNow();
                    },
                    onError: function(error) {
                        console.error('Gzyms up picker error:', error);
                    }
                });
            }
            
        } catch (error) {
            console.error('❌ Error initializing product pickers:', error);
        }
    }
    
    // Bind window events safely
    function bindWindowEvents(card) {
        try {
            // Remove button
            var removeBtn = card.querySelector('.remove');
            if (removeBtn) {
                removeBtn.onclick = function() {
                    if (confirm('Usunąć to okno?')) {
                        card.remove();
                        computeAll();
                        autosaveNow();
                    }
                };
            }
            
            // Clone button
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
            
        } catch (error) {
            console.error('Error binding window events:', error);
        }
    }
    
    // Toggle gzyms groups visibility
    function toggleGzymsGroups(card) {
        try {
            var gzymsDown = card.querySelector('.gzymsDown');
            var gzymsUp = card.querySelector('.gzymsUp');
            var grpDown = card.querySelector('.grpDown');
            var grpUp = card.querySelector('.grpUp');
            
            if (grpDown && gzymsDown) {
                grpDown.classList.toggle('hidden', !gzymsDown.checked);
            }
            
            if (grpUp && gzymsUp) {
                grpUp.classList.toggle('hidden', !gzymsUp.checked);
            }
        } catch (error) {
            console.error('Error toggling gzyms groups:', error);
        }
    }
    
    // Read window data safely
    function readWindowData(card) {
        try {
            var nameInput = card.querySelector('.name');
            var wInput = card.querySelector('.w');
            var hInput = card.querySelector('.h');
            var qtyInput = card.querySelector('.qty');
            var modeRadio = card.querySelector('input[type=radio]:checked');
            
            return {
                name: nameInput ? nameInput.value.trim() : '',
                w: wInput ? wInput.value : '120',
                h: hInput ? hInput.value : '140',
                qty: qtyInput ? qtyInput.value : '1',
                mode: modeRadio ? modeRadio.value : 'full',
                lenListwa: card.querySelector('.lenListwa') ? card.querySelector('.lenListwa').value : '200',
                priceListwa: card.querySelector('.priceListwa') ? card.querySelector('.priceListwa').value : '50',
                discount: card.querySelector('.discount') ? card.querySelector('.discount').value : '0'
            };
        } catch (error) {
            console.error('Error reading window data:', error);
            return {
                name: 'Okno',
                w: 120, h: 140, qty: 1, mode: 'full',
                lenListwa: 200, priceListwa: 50, discount: 0
            };
        }
    }
    
    // FIXED: Add corner function with proper template handling
    function addCorner() {
        cornerCounter++;
        
        try {
            var template = document.getElementById('cornerTemplate');
            if (!template) {
                console.error('❌ Corner template not found');
                return;
            }
            
            var card;
            if (template.content && template.content.firstElementChild) {
                card = template.content.firstElementChild.cloneNode(true);
            } else {
                var tempDiv = document.createElement('div');
                tempDiv.innerHTML = template.innerHTML;
                card = tempDiv.querySelector('.card');
                if (card) card = card.cloneNode(true);
            }
            
            if (!card) {
                console.error('❌ Could not create corner card');
                return;
            }
            
            card.dataset.cornerId = cornerCounter;
            var numEl = card.querySelector('.num');
            if (numEl) numEl.textContent = cornerCounter;
            
            if (cornersWrap) {
                cornersWrap.appendChild(card);
            }
            
            bindCornerEvents(card);
            initSections(card);
            computeCorners();
            
        } catch (error) {
            console.error('❌ Error adding corner:', error);
        }
    }
    
    // Bind corner events
    function bindCornerEvents(card) {
        try {
            var removeBtn = card.querySelector('.removeCorner');
            if (removeBtn) {
                removeBtn.onclick = function() {
                    if (confirm('Usunąć ten narożnik?')) {
                        card.remove();
                        computeCorners();
                    }
                };
            }
            
            var cloneBtn = card.querySelector('.cloneCorner');
            if (cloneBtn) {
                cloneBtn.onclick = function() {
                    addCorner();
                };
            }
            
            card.addEventListener('input', computeCorners);
        } catch (error) {
            console.error('Error binding corner events:', error);
        }
    }
    
    // Compute all windows with error handling
    function computeAll() {
        try {
            if (typeof Calculator === 'undefined') {
                console.warn('Calculator not available for computation');
                return;
            }
            
            var windowCards = windowsWrap ? windowsWrap.querySelectorAll('.card[data-id]') : [];
            var summaryTableBody = document.querySelector('#summaryTable tbody');
            
            if (summaryTableBody) {
                summaryTableBody.innerHTML = '';
            }
            
            var totals = { qty: 0, cost: 0, lenL: 0, pcsL: 0 };
            
            for (var i = 0; i < windowCards.length; i++) {
                var card = windowCards[i];
                var data = readWindowData(card);
                
                // Calculate using Calculator module
                var calc = Calculator.calculateWindow(data);
                
                // Update card display elements safely
                var perimeterEl = card.querySelector('.perimeter');
                var piecesEl = card.querySelector('.piecesL');
                
                if (perimeterEl) perimeterEl.textContent = calc.lenL + ' cm';
                if (piecesEl) piecesEl.textContent = calc.pcsL;
                
                // Add to summary table if available
                if (summaryTableBody) {
                    var row = document.createElement('tr');
                    row.innerHTML = 
                        '<td>' + (i + 1) + '</td>' +
                        '<td>' + Calculator.escapeHtml(calc.name || '—') + '</td>' +
                        '<td>' + calc.w + '×' + calc.h + '</td>' +
                        '<td>' + calc.qty + '</td>' +
                        '<td>' + calc.mode + '</td>' +
                        '<td>—</td><td>—</td>' +
                        '<td>' + calc.lenLTotal + '</td>' +
                        '<td>' + calc.pcsLTotal + '</td>' +
                        '<td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td>' +
                        '<td>' + calc.discount + '%</td>' +
                        '<td>' + Calculator.money(calc.costTotal) + '</td>';
                    
                    summaryTableBody.appendChild(row);
                }
                
                // Update totals
                totals.qty += calc.qty;
                totals.cost += calc.costTotal;
                totals.lenL += calc.lenLTotal;
                totals.pcsL += calc.pcsLTotal;
            }
            
            // Update totals display safely
            var elements = [
                { id: 'tQty', value: totals.qty },
                { id: 'tCost', value: Calculator.money(totals.cost) },
                { id: 'tLenL', value: Math.round(totals.lenL) },
                { id: 'tPiecesL', value: totals.pcsL }
            ];
            
            elements.forEach(function(el) {
                var element = document.getElementById(el.id);
                if (element) element.textContent = el.value;
            });
            
            console.log('📊 Computation completed:', totals);
            
        } catch (error) {
            console.error('❌ Error in computeAll:', error);
        }
    }
    
    // Compute corners safely
    function computeCorners() {
        try {
            var cornerCards = cornersWrap ? cornersWrap.querySelectorAll('.card[data-corner-id]') : [];
            var bonieEl = document.getElementById('tBonie');
            var bonieCostEl = document.getElementById('tBonieCost');
            
            if (bonieEl) bonieEl.textContent = cornerCards.length;
            if (bonieCostEl) bonieCostEl.textContent = Calculator.money(0);
            
        } catch (error) {
            console.error('❌ Error in computeCorners:', error);
        }
    }
    
    // Initialize sections safely
    function initSections(card) {
        try {
            var sectionTitles = card.querySelectorAll('.section-title');
            for (var i = 0; i < sectionTitles.length; i++) {
                var title = sectionTitles[i];
                (function(title) {
                    title.addEventListener('click', function() {
                        var body = title.nextElementSibling;
                        if (body) {
                            var isCollapsed = body.classList.contains('collapsed');
                            if (isCollapsed) {
                                body.classList.remove('collapsed');
                                body.classList.add('expanded');
                                title.classList.remove('collapsed');
                            } else {
                                body.classList.add('collapsed');
                                body.classList.remove('expanded');
                                title.classList.add('collapsed');
                            }
                        }
                    });
                })(title);
            }
        } catch (error) {
            console.error('Error initializing sections:', error);
        }
    }
    
    // Initialize preset UI safely
    function initPresetsUI() {
        try {
            var presetSelect = document.getElementById('presetSelect');
            if (presetSelect) {
                presetSelect.innerHTML = '<option value="classic">🔹 Ościeże klasyczne</option>';
            }
            
            var addPresetBtn = document.getElementById('addPresetBtn');
            if (addPresetBtn) {
                addPresetBtn.onclick = function() {
                    addWindow({ 
                        name: 'Salon', 
                        w: 150, h: 180, qty: 1, 
                        mode: 'full',
                        lenListwa: 200, priceListwa: 50,
                        discount: 0 
                    });
                };
            }
        } catch (error) {
            console.error('Error initializing presets UI:', error);
        }
    }
    
    // Initialize collapsible cards safely
    function initCardCollapsible(cardId) {
        try {
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
                    button.setAttribute('aria-expanded', 'true');
                } else {
                    body.classList.add('collapsed');
                    body.classList.remove('expanded');
                    button.textContent = '▸ Rozwiń';
                    button.setAttribute('aria-expanded', 'false');
                }
            });
        } catch (error) {
            console.error('Error initializing collapsible:', error);
        }
    }
    
    // Bind global events safely
    function bindGlobalEvents() {
        try {
            if (addWinBtn) {
                addWinBtn.onclick = function() { addWindow(); };
            }
            
            if (addCornerBtn) {
                addCornerBtn.onclick = function() { addCorner(); };
            }
            
            var exportCSVBtn = document.getElementById('exportCSV');
            if (exportCSVBtn) {
                exportCSVBtn.onclick = function() {
                    try {
                        Calculator.exportToCSV('summaryTable');
                    } catch (error) {
                        alert('Błąd eksportu CSV: ' + error.message);
                    }
                };
            }
            
            var printPDFBtn = document.getElementById('printPDF');
            if (printPDFBtn) {
                printPDFBtn.onclick = function() {
                    window.print();
                };
            }
            
            var renumberBtn = document.getElementById('renumber');
            if (renumberBtn) {
                renumberBtn.onclick = function() {
                    renumberCards();
                };
            }
            
        } catch (error) {
            console.error('Error binding global events:', error);
        }
    }
    
    function renumberCards() {
        try {
            var windowCards = windowsWrap ? windowsWrap.querySelectorAll('.card[data-id]') : [];
            for (var i = 0; i < windowCards.length; i++) {
                var card = windowCards[i];
                var numEl = card.querySelector('.num');
                if (numEl) numEl.textContent = i + 1;
            }
        } catch (error) {
            console.error('Error renumbering cards:', error);
        }
    }
    
    function loadInitialState() {
        try {
            // Try to load from URL hash
            if (location.hash && location.hash.length > 1) {
                try {
                    var data = Calculator.decodeShare(location.hash.slice(1));
                    if (data && data.windows && data.windows.length > 0) {
                        data.windows.forEach(function(windowData) {
                            addWindow(windowData);
                        });
                        return;
                    }
                } catch (e) {
                    console.log('Could not load from hash, using default');
                }
            }
            
            // Add default window
            addWindow({
                name: 'Salon',
                w: 150, h: 180, qty: 1,
                mode: 'full',
                lenListwa: 200, priceListwa: 50,
                discount: 0
            });
            
        } catch (error) {
            console.error('Error loading initial state:', error);
        }
    }
    
    function autosaveNow() {
        clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(function() {
            try {
                if (Calculator && Calculator.autosaveState) {
                    Calculator.autosaveState();
                }
            } catch (e) {
                console.error('Autosave failed:', e);
            }
        }, 500);
    }
    
    // Initialize when DOM is ready
    function initWhenReady() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            // DOM already ready
            setTimeout(init, 100); // Small delay to ensure all scripts loaded
        }
    }
    
    initWhenReady();
    
    // Export functions for global access
    window.CalcApp = {
        addWindow: addWindow,
        addCorner: addCorner,
        computeAll: computeAll,
        computeCorners: computeCorners,
        autosaveNow: autosaveNow,
        updateApiStatus: updateApiStatus
    };
    
    // Global test function for API with better error handling
    window.testSellyAPI = function() {
        try {
            if (!window.SellyAPI) {
                alert('❌ SellyAPI nie jest dostępne\n\nPrawdopodobnie nie załadował się moduł selly-api.js');
                return;
            }
            
            console.log('🧪 Starting Selly API test...');
            
            // Get current status
            var status = window.getSellyStatus();
            console.log('📊 Current API status:', status);
            
            if (!status || status.mode === 'demo') {
                alert('🎭 TRYB DEMO\n\n' +
                      'Używasz danych demonstracyjnych.\n\n' +
                      'Aby przetestować prawdziwe API:\n' +
                      '1. Kliknij "🔑 Konfiguracja API"\n' +
                      '2. Wprowadź dane sklepu Selly.pl\n' +
                      '3. Spróbuj ponownie\n\n' +
                      'Demo mode ma ' + (window.SellyAPI ? '8' : '0') + ' przykładowych produktów.');
                
                // Test demo search anyway
                if (window.SellyAPI) {
                    window.SellyAPI.searchProducts('listwa', 'listwa', 3)
                        .then(function(products) {
                            console.log('🎭 Demo search result:', products);
                        });
                }
                return;
            }
            
            // Test real API
            window.SellyAPI.testAPI();
            
        } catch (error) {
            console.error('❌ Test function error:', error);
            alert('❌ Błąd podczas testowania API:\n' + error.message);
        }
    };
    
    console.log('📚 App module loaded successfully');
})();