/**
 * Main Application
 * Handles DOM manipulation, event binding, and UI updates
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
        
        // Initialize UI components
        initPresetsUI();
        initCardCollapsible('presetsCard');
        initCardCollapsible('bulkCard');
        
        // Bind event handlers
        bindGlobalEvents();
        
        // Load state from URL hash or autosave
        loadInitialState();
        
        console.log('Calculator application initialized');
    }
    
    // Initialize presets UI
    function initPresetsUI() {
        var presetSelect = document.getElementById('presetSelect');
        var presetQuick = document.getElementById('presetQuick');
        var addPresetBtn = document.getElementById('addPresetBtn');
        var saveFromActiveBtn = document.getElementById('saveFromActive');
        
        if (!presetSelect || !presetQuick) return;
        
        var userPresets = Calculator.loadUserPresets();
        
        // Build preset options
        var defaultOptions = Calculator.PRESETS.map(function(preset) {
            return '<option value="' + preset.id + '">🔹 ' + Calculator.escapeHtml(preset.label) + '</option>';
        }).join('');
        
        var userOptions = userPresets.length > 0 ? 
            '<optgroup label="Moje">' +
            userPresets.map(function(preset) {
                return '<option value="' + preset.id + '">⭐ ' + Calculator.escapeHtml(preset.label) + '</option>';
            }).join('') +
            '</optgroup>' : '';
        
        presetSelect.innerHTML = '<optgroup label="Domyślne">' + defaultOptions + '</optgroup>' + userOptions;
        
        // Quick preset buttons
        presetQuick.innerHTML = '';
        Calculator.PRESETS.forEach(function(preset) {
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-secondary btn-sm';
            button.textContent = preset.label;
            button.onclick = function() { addWindow(preset); };
            presetQuick.appendChild(button);
        });
        
        // Event handlers
        if (addPresetBtn) {
            addPresetBtn.onclick = function() {
                var presetId = presetSelect.value;
                var preset = findPresetById(presetId);
                if (preset) addWindow(preset);
            };
        }
        
        if (saveFromActiveBtn) {
            saveFromActiveBtn.onclick = function() {
                var nameInput = document.getElementById('newPresetName');
                var label = nameInput ? nameInput.value.trim() : '';
                saveCurrentAsPreset(label);
                if (nameInput) nameInput.value = '';
            };
        }
        
        renderMyPresets();
    }
    
    // Find preset by ID
    function findPresetById(id) {
        var allPresets = Calculator.PRESETS.concat(Calculator.loadUserPresets());
        return allPresets.find(function(preset) { return preset.id === id; });
    }
    
    // Render user presets list
    function renderMyPresets() {
        var list = document.getElementById('myPresetsList');
        if (!list) return;
        
        var userPresets = Calculator.loadUserPresets();
        list.innerHTML = '';
        
        if (userPresets.length === 0) {
            list.innerHTML = '<div class="sub">Brak zapisanych presetów.</div>';
            return;
        }
        
        userPresets.forEach(function(preset) {
            var card = document.createElement('div');
            card.className = 'card';
            card.style.padding = '8px';
            card.innerHTML = 
                '<div style="display:flex;align-items:center;gap:8px;justify-content:space-between">' +
                    '<div><strong>' + Calculator.escapeHtml(preset.label) + '</strong> ' +
                    '<span class="tiny" style="margin-left:6px">(' + Calculator.escapeHtml(preset.w) + '×' + Calculator.escapeHtml(preset.h) + ', ' + preset.mode + ')</span></div>' +
                    '<div style="display:flex;gap:6px">' +
                        '<button type="button" class="btn btn-secondary btn-sm" data-action="add">➕ Dodaj</button>' +
                        '<button type="button" class="btn btn-danger btn-sm" data-action="delete">🗑 Usuń</button>' +
                    '</div>' +
                '</div>';
            
            card.querySelector('[data-action="add"]').onclick = function() {
                addWindow(preset);
            };
            
            card.querySelector('[data-action="delete"]').onclick = function() {
                if (confirm('Usunąć preset: ' + preset.label + '?')) {
                    deleteUserPreset(preset.id);
                }
            };
            
            list.appendChild(card);
        });
    }
    
    // Delete user preset
    function deleteUserPreset(presetId) {
        var presets = Calculator.loadUserPresets().filter(function(preset) {
            return preset.id !== presetId;
        });
        Calculator.saveUserPresets(presets);
        renderMyPresets();
        initPresetsUI();
    }
    
    // Save current window as preset
    function saveCurrentAsPreset(label) {
        var activeCard = lastActiveCard || document.querySelector('#windows .card[data-id]');
        if (!activeCard) {
            alert('Dodaj lub zaznacz okno, aby zapisać preset.');
            return;
        }
        
        var data = readWindowData(activeCard);
        var preset = {
            id: Calculator.makePresetId(),
            label: label || data.name || 'Mój preset'
        };
        
        // Copy all window properties to preset
        Object.keys(data).forEach(function(key) {
            preset[key] = data[key];
        });
        
        var userPresets = Calculator.loadUserPresets();
        userPresets.push(preset);
        Calculator.saveUserPresets(userPresets);
        
        renderMyPresets();
        initPresetsUI();
        alert('Preset zapisany.');
    }
    
    // Collapsible card functionality
    function initCardCollapsible(cardId) {
        var card = document.getElementById(cardId);
        if (!card) return;
        
        var button = card.querySelector('.coll-btn');
        var body = card.querySelector('.body');
        if (!button || !body) return;
        
        function setLabel(expanded) {
            button.textContent = expanded ? '▾ Zwiń' : '▸ Rozwiń';
            button.setAttribute('aria-expanded', String(expanded));
        }
        
        setLabel(false); // Default collapsed
        
        button.addEventListener('click', function() {
            var isCollapsed = body.classList.contains('collapsed');
            
            if (isCollapsed) {
                // Expand
                body.classList.remove('collapsed');
                var targetHeight = body.scrollHeight;
                body.style.height = '0px';
                
                requestAnimationFrame(function() {
                    body.classList.add('collapsing');
                    body.style.height = targetHeight + 'px';
                });
                
                function onExpandEnd() {
                    body.classList.remove('collapsing');
                    body.classList.add('expanded');
                    body.style.height = '';
                    body.removeEventListener('transitionend', onExpandEnd);
                }
                body.addEventListener('transitionend', onExpandEnd);
                setLabel(true);
            } else {
                // Collapse
                body.style.height = body.scrollHeight + 'px';
                
                requestAnimationFrame(function() {
                    body.classList.add('collapsing');
                    body.style.height = '0px';
                });
                
                function onCollapseEnd() {
                    body.classList.remove('collapsing');
                    body.classList.remove('expanded');
                    body.classList.add('collapsed');
                    body.style.height = '';
                    body.removeEventListener('transitionend', onCollapseEnd);
                }
                body.addEventListener('transitionend', onCollapseEnd);
                setLabel(false);
            }
        });
    }
    
    // Bind global event handlers
    function bindGlobalEvents() {
        // Add window button
        if (addWinBtn) {
            addWinBtn.onclick = function() { addWindow(); };
        }
        
        // Add corner button  
        if (addCornerBtn) {
            addCornerBtn.onclick = function() { addCorner(); };
        }
        
        // Renumber button
        var renumberBtn = document.getElementById('renumber');
        if (renumberBtn) {
            renumberBtn.onclick = function() {
                renumberCards();
                renumberCorners();
            };
        }
        
        // Export/import buttons
        bindExportImportButtons();
        
        // Global discount and settings
        bindSettingsEvents();
        
        // Bulk edit
        bindBulkEditEvents();
    }
    
    // Bind export/import button events
    function bindExportImportButtons() {
        var exportCSVBtn = document.getElementById('exportCSV');
        var showCutsBtn = document.getElementById('showCuts');
        var printPDFBtn = document.getElementById('printPDF');
        var saveJSONBtn = document.getElementById('saveJSON');
        var loadJSONBtn = document.getElementById('loadJSON');
        var shareLinkBtn = document.getElementById('shareLink');
        var importFileInput = document.getElementById('importFile');
        var closeCutsBtn = document.getElementById('closeCuts');
        
        if (exportCSVBtn) {
            exportCSVBtn.onclick = function() {
                Calculator.exportToCSV('summaryTable');
            };
        }
        
        if (showCutsBtn) {
            showCutsBtn.onclick = showCuttingPlan;
        }
        
        if (printPDFBtn) {
            printPDFBtn.onclick = function() {
                window.print();
            };
        }
        
        if (saveJSONBtn) {
            saveJSONBtn.onclick = saveToJSON;
        }
        
        if (loadJSONBtn) {
            loadJSONBtn.onclick = function() {
                if (importFileInput) importFileInput.click();
            };
        }
        
        if (importFileInput) {
            importFileInput.onchange = loadFromJSON;
        }
        
        if (shareLinkBtn) {
            shareLinkBtn.onclick = shareLink;
        }
        
        if (closeCutsBtn) {
            closeCutsBtn.onclick = function() {
                document.getElementById('cutsModal').style.display = 'none';
            };
        }
    }
    
    // Bind settings events  
    function bindSettingsEvents() {
        var globalDiscountInput = document.getElementById('globalDiscount');
        var kerfInput = document.getElementById('kerf');
        var overcutInput = document.getElementById('overcut');
        var unitsSelect = document.getElementById('units');
        
        if (globalDiscountInput) {
            globalDiscountInput.addEventListener('input', function() {
                computeAll();
                autosaveNow();
            });
        }
        
        if (kerfInput) {
            kerfInput.addEventListener('input', autosaveNow);
        }
        
        if (overcutInput) {
            overcutInput.addEventListener('input', autosaveNow);
        }
        
        if (unitsSelect) {
            unitsSelect.addEventListener('change', autosaveNow);
        }
    }
    
    // Bind bulk edit events
    function bindBulkEditEvents() {
        var applyBulkBtn = document.getElementById('applyBulk');
        if (!applyBulkBtn) return;
        
        applyBulkBtn.addEventListener('click', function() {
            var getValue = function(id) {
                var el = document.getElementById(id);
                return el ? el.value : '';
            };
            
            var windowCards = document.querySelectorAll('#windows .card[data-id]');
            windowCards.forEach(function(card) {
                var setValue = function(selector, value) {
                    if (value !== '' && value != null) {
                        var el = card.querySelector(selector);
                        if (el) el.value = value;
                    }
                };
                
                setValue('.lenListwa', getValue('bulkLenListwa'));
                setValue('.priceListwa', getValue('bulkPriceListwa'));
                setValue('.discount', getValue('bulkDiscount'));
                setValue('.lenGzymsDown', getValue('bulkLenGd'));
                setValue('.priceGzymsDown', getValue('bulkPriceGd'));
                setValue('.lenGzymsUp', getValue('bulkLenGu'));
                setValue('.priceGzymsUp', getValue('bulkPriceGu'));
                
                var gDownAction = getValue('bulkGDownAction');
                var gUpAction = getValue('bulkGUpAction');
                
                if (gDownAction === 'on') {
                    var gDownCheck = card.querySelector('.gzymsDown');
                    if (gDownCheck) gDownCheck.checked = true;
                }
                if (gDownAction === 'off') {
                    var gDownCheck = card.querySelector('.gzymsDown');
                    if (gDownCheck) gDownCheck.checked = false;
                }
                if (gUpAction === 'on') {
                    var gUpCheck = card.querySelector('.gzymsUp');
                    if (gUpCheck) gUpCheck.checked = true;
                }
                if (gUpAction === 'off') {
                    var gUpCheck = card.querySelector('.gzymsUp');
                    if (gUpCheck) gUpCheck.checked = false;
                }
                
                toggleGzymsGroups(card);
            });
            
            computeAll();
        });
    }
    
    // Add window
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
        enableDragDrop(card);
        
        // Apply preset values
        applyPresetToWindow(card, preset);
        
        toggleGzymsGroups(card);
        toggleAddons(card);
        computeAll();
        
        // Scroll to new window
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Apply preset values to window
    function applyPresetToWindow(card, preset) {
        var setValue = function(selector, value, isCheckbox) {
            if (value !== undefined && value !== null) {
                var el = card.querySelector(selector);
                if (el) {
                    if (isCheckbox) {
                        el.checked = !!value;
                    } else {
                        el.value = value;
                    }
                }
            }
        };
        
        // Basic properties
        setValue('.name', preset.name);
        setValue('.w', preset.w);
        setValue('.h', preset.h);
        setValue('.qty', preset.qty);
        
        // Frame mode
        if (preset.mode) {
            var frameRadio = card.querySelector('input[name="frame_' + card.dataset.id + '"][value="' + preset.mode + '"]');
            if (frameRadio) frameRadio.checked = true;
        }
        
        // Gzymsy
        setValue('.gzymsDown', preset.gDown, true);
        setValue('.gzymsUp', preset.gUp, true);
        setValue('.lenListwa', preset.lenListwa);
        setValue('.priceListwa', preset.priceListwa);
        setValue('.lenGzymsDown', preset.lenGzymsDown);
        setValue('.priceGzymsDown', preset.priceGzymsDown);
        setValue('.lenGzymsUp', preset.lenGzymsUp);
        setValue('.priceGzymsUp', preset.priceGzymsUp);
        setValue('.discount', preset.discount);
        setValue('.addWasteDown', preset.addWasteDown, true);
        setValue('.addWasteUp', preset.addWasteUp, true);
        setValue('.aggAsOne', preset.aggAsOne, true);
        
        // Accessories
        setValue('.keystone', preset.keystone, true);
        setValue('.qtyKeystone', preset.qtyKeystone);
        setValue('.priceKeystone', preset.priceKeystone);
        setValue('.brTop', preset.brTop, true);
        setValue('.qtyBrTop', preset.qtyBrTop);
        setValue('.priceBrTop', preset.priceBrTop);
        setValue('.brBottom', preset.brBottom, true);
        setValue('.qtyBrBottom', preset.qtyBrBottom);
        setValue('.priceBrBottom', preset.priceBrBottom);
        
        // Selly product info
        if (preset.listwaId) {
            card.dataset.listwaId = preset.listwaId;
            card.dataset.listwaName = preset.listwaName;
            var listwaNameEl = card.querySelector('.prodNameL');
            if (listwaNameEl) {
                listwaNameEl.textContent = preset.listwaName || '';
                listwaNameEl.style.display = preset.listwaName ? 'inline-block' : 'none';
            }
        }
        
        if (preset.gzymsDownId) {
            card.dataset.gdId = preset.gzymsDownId;
            card.dataset.gdName = preset.gzymsDownName;
            var gdNameEl = card.querySelector('.prodNameGd');
            if (gdNameEl) {
                gdNameEl.textContent = preset.gzymsDownName || '';
                gdNameEl.style.display = preset.gzymsDownName ? 'inline-block' : 'none';
            }
        }
        
        if (preset.gzymsUpId) {
            card.dataset.guId = preset.gzymsUpId;
            card.dataset.guName = preset.gzymsUpName;
            var guNameEl = card.querySelector('.prodNameGu');
            if (guNameEl) {
                guNameEl.textContent = preset.gzymsUpName || '';
                guNameEl.style.display = preset.gzymsUpName ? 'inline-block' : 'none';
            }
        }
    }
    
    // Bind window events
    function bindWindowEvents(card) {
        // Remove button
        var removeBtn = card.querySelector('.remove');
        if (removeBtn) {
            removeBtn.onclick = function() {
                card.remove();
                computeAll();
                renumberCards();
                autosaveNow();
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
        
        // Save preset button
        var savePresetBtn = card.querySelector('.savePreset');
        if (savePresetBtn) {
            savePresetBtn.onclick = function() {
                lastActiveCard = card;
                var defaultName = card.querySelector('.name').value.trim() || 
                                ('Okno #' + card.querySelector('.num').textContent);
                var label = prompt('Nazwa presetu:', defaultName) || '';
                if (label.trim()) {
                    saveCurrentAsPreset(label.trim());
                }
            };
        }
        
        // Set as active card on click
        card.addEventListener('click', function() {
            lastActiveCard = card;
        });
        
        // Input change events
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
        
        // Addon events
        var addonInputs = card.querySelectorAll('.keystone,.brTop,.brBottom,.qtyKeystone,.priceKeystone,.qtyBrTop,.priceBrTop,.qtyBrBottom,.priceBrBottom');
        addonInputs.forEach(function(input) {
            input.addEventListener('input', computeAll);
        });
        
        // Product pickers
        initProductPickers(card);
    }
    
    // Initialize product pickers for a card
    function initProductPickers(card) {
        if (typeof ProductPicker === 'undefined') {
            console.warn('ProductPicker not available');
            return;
        }
        
        var pillGd = card.querySelector('.prodNameGd');
        var pillGu = card.querySelector('.prodNameGu');
        var pillL = card.querySelector('.prodNameL');
        
        // Listwa picker
        var listwaInput = card.querySelector('.pickListwa');
        if (listwaInput) {
            new ProductPicker(listwaInput, {
                type: 'listwa',
                onSelect: function(product) {
                    card.querySelector('.lenListwa').value = product.barLengthCm || 200;
                    card.querySelector('.priceListwa').value = product.pricePLN || 0;
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
                    card.querySelector('.gzymsDown').checked = true;
                    toggleGzymsGroups(card);
                    card.querySelector('.lenGzymsDown').value = product.barLengthCm || 200;
                    card.querySelector('.priceGzymsDown').value = product.pricePLN || 0;
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
                    card.querySelector('.gzymsUp').checked = true;
                    toggleGzymsGroups(card);
                    card.querySelector('.lenGzymsUp').value = product.barLengthCm || 200;
                    card.querySelector('.priceGzymsUp').value = product.pricePLN || 0;
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
    
    // Continue in next part...
    
    // Initialize sections (accordion functionality)
    function initSections(card) {
        var sectionTitles = card.querySelectorAll('.section-title');
        sectionTitles.forEach(function(title) {
            var body = title.nextElementSibling;
            if (!body) return;
            
            // Set initial state
            if (body.classList.contains('collapsed')) {
                title.classList.add('collapsed');
            } else {
                body.classList.add('expanded');
                title.classList.remove('collapsed');
            }
            
            title.addEventListener('click', function() {
                var isCollapsed = body.classList.contains('collapsed');
                
                if (isCollapsed) {
                    // Expand
                    title.classList.remove('collapsed');
                    body.classList.remove('collapsed');
                    var targetHeight = body.scrollHeight;
                    body.style.height = '0px';
                    
                    requestAnimationFrame(function() {
                        body.classList.add('collapsing');
                        body.style.height = targetHeight + 'px';
                    });
                    
                    function onExpandEnd() {
                        body.classList.remove('collapsing');
                        body.classList.add('expanded');
                        body.style.height = '';
                        body.removeEventListener('transitionend', onExpandEnd);
                    }
                    body.addEventListener('transitionend', onExpandEnd);
                } else {
                    // Collapse
                    title.classList.add('collapsed');
                    body.style.height = body.scrollHeight + 'px';
                    
                    requestAnimationFrame(function() {
                        body.classList.add('collapsing');
                        body.style.height = '0px';
                    });
                    
                    function onCollapseEnd() {
                        body.classList.remove('collapsing');
                        body.classList.remove('expanded');
                        body.classList.add('collapsed');
                        body.style.height = '';
                        body.removeEventListener('transitionend', onCollapseEnd);
                    }
                    body.addEventListener('transitionend', onCollapseEnd);
                }
            });
        });
    }
    
    // Toggle gzyms groups visibility
    function toggleGzymsGroups(card) {
        var gzymsDown = card.querySelector('.gzymsDown');
        var gzymsUp = card.querySelector('.gzymsUp');
        var grpDown = card.querySelector('.grpDown');
        var grpUp = card.querySelector('.grpUp');
        
        if (grpDown) {
            grpDown.classList.toggle('hidden', !gzymsDown.checked);
            var downInputs = grpDown.querySelectorAll('input');
            downInputs.forEach(function(input) {
                input.disabled = !gzymsDown.checked;
            });
        }
        
        if (grpUp) {
            grpUp.classList.toggle('hidden', !gzymsUp.checked);
            var upInputs = grpUp.querySelectorAll('input');
            upInputs.forEach(function(input) {
                input.disabled = !gzymsUp.checked;
            });
        }
    }
    
    // Toggle addon inputs
    function toggleAddons(card) {
        var addonInputs = card.querySelectorAll('.keystone,.qtyKeystone,.priceKeystone,.brTop,.qtyBrTop,.priceBrTop,.brBottom,.qtyBrBottom,.priceBrBottom');
        addonInputs.forEach(function(input) {
            input.disabled = false;
        });
    }
    
    // Enable drag and drop for window cards
    function enableDragDrop(card) {
        card.setAttribute('draggable', 'true');
        
        card.addEventListener('dragstart', function(e) {
            card.classList.add('dragging');
            e.dataTransfer.setData('text/plain', card.dataset.id || '');
        });
        
        card.addEventListener('dragend', function() {
            card.classList.remove('dragging');
            var allCards = windowsWrap.querySelectorAll('.card');
            allCards.forEach(function(c) {
                c.classList.remove('drag-over');
            });
        });
        
        windowsWrap.addEventListener('dragover', function(e) {
            e.preventDefault();
            var afterElement = getDragAfterElement(windowsWrap, e.clientY);
            var dragging = document.querySelector('.card.dragging');
            if (!dragging) return;
            
            if (afterElement == null) {
                windowsWrap.appendChild(dragging);
            } else {
                windowsWrap.insertBefore(dragging, afterElement);
            }
            computeAll();
        });
    }
    
    // Get element to insert dragged item after
    function getDragAfterElement(container, y) {
        var draggableElements = container.querySelectorAll('.card[data-id]:not(.dragging)');
        var closest = { offset: Number.NEGATIVE_INFINITY, element: null };
        
        draggableElements.forEach(function(child) {
            var box = child.getBoundingClientRect();
            var offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                closest = { offset: offset, element: child };
            }
        });
        
        return closest.element;
    }
    
    // Read window data from card
    function readWindowData(card) {
        return {
            name: card.querySelector('.name').value.trim(),
            w: card.querySelector('.w').value,
            h: card.querySelector('.h').value,
            qty: card.querySelector('.qty').value,
            mode: card.querySelector('input[type=radio]:checked').value,
            
            lenListwa: card.querySelector('.lenListwa').value,
            priceListwa: card.querySelector('.priceListwa').value,
            discount: card.querySelector('.discount').value,
            
            gDown: card.querySelector('.gzymsDown').checked,
            gUp: card.querySelector('.gzymsUp').checked,
            lenGzymsDown: card.querySelector('.lenGzymsDown').value,
            priceGzymsDown: card.querySelector('.priceGzymsDown').value,
            lenGzymsUp: card.querySelector('.lenGzymsUp').value,
            priceGzymsUp: card.querySelector('.priceGzymsUp').value,
            addWasteDown: card.querySelector('.addWasteDown') ? card.querySelector('.addWasteDown').checked : false,
            addWasteUp: card.querySelector('.addWasteUp') ? card.querySelector('.addWasteUp').checked : false,
            
            aggAsOne: card.querySelector('.aggAsOne') ? card.querySelector('.aggAsOne').checked : false,
            
            keystone: card.querySelector('.keystone') ? card.querySelector('.keystone').checked : false,
            qtyKeystone: card.querySelector('.qtyKeystone') ? card.querySelector('.qtyKeystone').value : 1,
            priceKeystone: card.querySelector('.priceKeystone') ? card.querySelector('.priceKeystone').value : 0,
            
            brTop: card.querySelector('.brTop') ? card.querySelector('.brTop').checked : false,
            qtyBrTop: card.querySelector('.qtyBrTop') ? card.querySelector('.qtyBrTop').value : 2,
            priceBrTop: card.querySelector('.priceBrTop') ? card.querySelector('.priceBrTop').value : 0,
            
            brBottom: card.querySelector('.brBottom') ? card.querySelector('.brBottom').checked : false,
            qtyBrBottom: card.querySelector('.qtyBrBottom') ? card.querySelector('.qtyBrBottom').value : 2,
            priceBrBottom: card.querySelector('.priceBrBottom') ? card.querySelector('.priceBrBottom').value : 0,
            
            // Selly metadata
            listwaId: card.dataset.listwaId || null,
            listwaName: card.dataset.listwaName || null,
            gzymsDownId: card.dataset.gdId || null,
            gzymsDownName: card.dataset.gdName || null,
            gzymsUpId: card.dataset.guId || null,
            gzymsUpName: card.dataset.guName || null
        };
    }
    
    // Add corner
    function addCorner(preset) {
        preset = preset || {};
        cornerCounter++;
        var id = cornerCounter;
        
        var template = document.getElementById('cornerTemplate');
        var card = template.content.firstElementChild.cloneNode(true);
        card.dataset.cornerId = id;
        card.querySelector('.num').textContent = id;
        
        cornersWrap.appendChild(card);
        bindCornerEvents(card);
        initSections(card);
        
        // Apply preset values
        applyPresetToCorner(card, preset);
        
        toggleAltGroupCorner(card);
        computeCorners();
        
        // Scroll to new corner
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Apply preset to corner
    function applyPresetToCorner(card, preset) {
        var setValue = function(selector, value, isCheckbox) {
            if (value !== undefined && value !== null) {
                var el = card.querySelector(selector);
                if (el) {
                    if (isCheckbox) {
                        el.checked = !!value;
                    } else {
                        el.value = value;
                    }
                }
            }
        };
        
        setValue('.cName', preset.cName);
        setValue('.cWallH', preset.cWallH);
        setValue('.cQty', preset.cQty);
        setValue('.cBlockH', preset.cBlockH);
        setValue('.cBlockW', preset.cBlockW);
        setValue('.cTop', preset.cTop);
        setValue('.cBottom', preset.cBottom);
        setValue('.cGap', preset.cGap);
        setValue('.cPrice', preset.cPrice);
        setValue('.cAlt', preset.cAlt, true);
        setValue('.cBlockH2', preset.cBlockH2);
        setValue('.cBlockW2', preset.cBlockW2);
        setValue('.cPrice2', preset.cPrice2);
    }
    
    // Bind corner events
    function bindCornerEvents(card) {
        // Remove button
        var removeBtn = card.querySelector('.removeCorner');
        if (removeBtn) {
            removeBtn.onclick = function() {
                card.remove();
                computeCorners();
                autosaveNow();
            };
        }
        
        // Clone button
        var cloneBtn = card.querySelector('.cloneCorner');
        if (cloneBtn) {
            cloneBtn.onclick = function() {
                var data = readCornerData(card);
                addCorner(data);
            };
        }
        
        // Input events
        card.addEventListener('input', function() {
            computeCorners();
            autosaveNow();
        });
        
        // Alt checkbox
        var altCheck = card.querySelector('.cAlt');
        if (altCheck) {
            altCheck.addEventListener('change', function() {
                toggleAltGroupCorner(card);
                computeCorners();
                autosaveNow();
            });
        }
    }
    
    // Toggle alternating group for corners
    function toggleAltGroupCorner(card) {
        var altEnabled = card.querySelector('.cAlt').checked;
        var altGroups = card.querySelectorAll('.altGroup');
        
        altGroups.forEach(function(group) {
            group.classList.toggle('hidden', !altEnabled);
            var inputs = group.querySelectorAll('input');
            inputs.forEach(function(input) {
                input.disabled = !altEnabled;
            });
        });
    }
    
    // Read corner data
    function readCornerData(card) {
        return {
            cName: card.querySelector('.cName').value.trim(),
            cWallH: card.querySelector('.cWallH').value,
            cQty: card.querySelector('.cQty').value,
            cBlockH: card.querySelector('.cBlockH').value,
            cBlockW: card.querySelector('.cBlockW').value,
            cTop: card.querySelector('.cTop').value,
            cBottom: card.querySelector('.cBottom').value,
            cGap: card.querySelector('.cGap').value,
            cPrice: card.querySelector('.cPrice').value,
            cAlt: card.querySelector('.cAlt').checked,
            cBlockH2: card.querySelector('.cBlockH2').value,
            cBlockW2: card.querySelector('.cBlockW2').value,
            cPrice2: card.querySelector('.cPrice2').value
        };
    }
    
    // Update window preview SVG
    function updateWindowPreview(card, data) {
        var svg = card.querySelector('svg.preview');
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
        
        var pad = 20;
        var maxW = 320 - 2 * pad;
        var maxH = 240 - 2 * pad;
        var scale = Math.min(maxW / data.w, maxH / data.h);
        var width = data.w * scale;
        var height = data.h * scale;
        var x = (320 - width) / 2;
        var y = (240 - height) / 2;
        
        // Main window frame
        var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', width);
        rect.setAttribute('height', height);
        rect.setAttribute('fill', '#fff');
        rect.setAttribute('stroke', '#94a3b8');
        rect.setAttribute('rx', '2');
        svg.appendChild(rect);
        
        var thick = Math.max(4, Math.min(12, Math.round(0.02 * Math.max(width, height))));
        var listwaColor = '#93c5fd';
        var gzymsColor = '#86efac';
        
        // Draw frame based on mode
        if (data.mode === 'full' || data.mode === 'toplr') {
            // Top frame
            var topFrame = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            topFrame.setAttribute('x', x);
            topFrame.setAttribute('y', y);
            topFrame.setAttribute('width', width);
            topFrame.setAttribute('height', thick);
            topFrame.setAttribute('fill', listwaColor);
            svg.appendChild(topFrame);
        }
        
        if (data.mode === 'full') {
            // Bottom frame
            var bottomFrame = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bottomFrame.setAttribute('x', x);
            bottomFrame.setAttribute('y', y + height - thick);
            bottomFrame.setAttribute('width', width);
            bottomFrame.setAttribute('height', thick);
            bottomFrame.setAttribute('fill', listwaColor);
            svg.appendChild(bottomFrame);
        }
        
        // Side frames (always present)
        var leftFrame = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        leftFrame.setAttribute('x', x);
        leftFrame.setAttribute('y', y);
        leftFrame.setAttribute('width', thick);
        leftFrame.setAttribute('height', height);
        leftFrame.setAttribute('fill', listwaColor);
        svg.appendChild(leftFrame);
        
        var rightFrame = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rightFrame.setAttribute('x', x + width - thick);
        rightFrame.setAttribute('y', y);
        rightFrame.setAttribute('width', thick);
        rightFrame.setAttribute('height', height);
        rightFrame.setAttribute('fill', listwaColor);
        svg.appendChild(rightFrame);
        
        // Cornices
        if (data.gDown) {
            var gzymsDown = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            gzymsDown.setAttribute('x', x);
            gzymsDown.setAttribute('y', y + height + 6);
            gzymsDown.setAttribute('width', width);
            gzymsDown.setAttribute('height', Math.max(6, thick));
            gzymsDown.setAttribute('fill', gzymsColor);
            svg.appendChild(gzymsDown);
        }
        
        if (data.gUp) {
            var gzymsUp = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            gzymsUp.setAttribute('x', x);
            gzymsUp.setAttribute('y', Math.max(6, y - 10));
            gzymsUp.setAttribute('width', width);
            gzymsUp.setAttribute('height', Math.max(6, thick));
            gzymsUp.setAttribute('fill', gzymsColor);
            svg.appendChild(gzymsUp);
        }
        
        // Accessories (simplified visualization)
        var keystoneOn = card.querySelector('.keystone') && card.querySelector('.keystone').checked;
        var brTopOn = card.querySelector('.brTop') && card.querySelector('.brTop').checked;
        var brBottomOn = card.querySelector('.brBottom') && card.querySelector('.brBottom').checked;
        
        if (keystoneOn) {
            var kW = Math.max(14, width * 0.12);
            var kH = Math.max(10, thick * 1.6);
            var kx = x + (width - kW) / 2;
            var ky = Math.max(6, y - 10 - kH);
            
            var keystone = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            keystone.setAttribute('d', 'M' + kx + ' ' + (ky + kH) + ' L' + (kx + kW * 0.2) + ' ' + ky + ' L' + (kx + kW * 0.8) + ' ' + ky + ' L' + (kx + kW) + ' ' + (ky + kH) + ' Z');
            keystone.setAttribute('fill', '#e5e7eb');
            keystone.setAttribute('stroke', '#cbd5e1');
            svg.appendChild(keystone);
        }
        
        if (brTopOn) {
            var bW = Math.max(10, thick * 1.2);
            var bH = Math.max(10, thick * 1.6);
            var by = Math.max(6, y - 10) + Math.max(6, thick);
            
            var leftBr = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            leftBr.setAttribute('x', x + bW * 0.5);
            leftBr.setAttribute('y', by);
            leftBr.setAttribute('width', bW);
            leftBr.setAttribute('height', bH);
            leftBr.setAttribute('fill', '#e5e7eb');
            leftBr.setAttribute('stroke', '#cbd5e1');
            svg.appendChild(leftBr);
            
            var rightBr = leftBr.cloneNode();
            rightBr.setAttribute('x', x + width - bW * 1.5);
            svg.appendChild(rightBr);
        }
        
        if (brBottomOn) {
            var bW = Math.max(10, thick * 1.2);
            var bH = Math.max(10, thick * 1.6);
            var by = y + height + 6 - bH;
            
            var leftBr = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            leftBr.setAttribute('x', x + bW * 0.5);
            leftBr.setAttribute('y', by);
            leftBr.setAttribute('width', bW);
            leftBr.setAttribute('height', bH);
            leftBr.setAttribute('fill', '#e5e7eb');
            leftBr.setAttribute('stroke', '#cbd5e1');
            svg.appendChild(leftBr);
            
            var rightBr = leftBr.cloneNode();
            rightBr.setAttribute('x', x + width - bW * 1.5);
            svg.appendChild(rightBr);
        }
        
        // Dimension labels
        var createText = function(text, textX, textY) {
            var textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textEl.setAttribute('x', textX);
            textEl.setAttribute('y', textY);
            textEl.setAttribute('fill', '#64748b');
            textEl.setAttribute('font-size', '11');
            textEl.setAttribute('font-family', 'ui-sans-serif, system-ui');
            textEl.textContent = text;
            svg.appendChild(textEl);
        };
        
        createText(Math.round(data.w) + ' cm', x + width / 2 - 16, Math.max(12, y - 6));
        createText(Math.round(data.h) + ' cm', Math.max(6, x - 30), y + height / 2);
    }
    
    // Update corner preview SVG
    function updateCornerPreview(card, data) {
        var svg = card.querySelector('svg.cPreview');
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
        
        var pad = 18;
        var W = 320 - 2 * pad;
        var H = 240 - 2 * pad;
        var x = pad;
        var y = pad;
        var wallW = Math.min(W * 0.35, 80);
        var scale = H / data.cWallH;
        
        // Wall
        var wall = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        wall.setAttribute('x', x);
        wall.setAttribute('y', y);
        wall.setAttribute('width', wallW);
        wall.setAttribute('height', H);
        wall.setAttribute('fill', '#ffffff');
        wall.setAttribute('stroke', '#cbd5e1');
        wall.setAttribute('rx', '4');
        svg.appendChild(wall);
        
        // Work area
        var workY = y + data.cTop * scale;
        var workH = Math.max(0, (data.cWallH - data.cTop - data.cBottom) * scale);
        var workArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        workArea.setAttribute('x', x + 2);
        workArea.setAttribute('y', workY);
        workArea.setAttribute('width', wallW - 4);
        workArea.setAttribute('height', workH);
        workArea.setAttribute('fill', '#f8fafc');
        workArea.setAttribute('stroke', '#e2e8f0');
        svg.appendChild(workArea);
        
        // Draw blocks
        var yy = workY;
        var useA = true;
        var aLeft = x + 4;
        var aRight = x + wallW - 4;
        var bonieColor = '#fda4af';
        
        while (true) {
            var hcm = useA ? data.cBlockH : (data.cAlt ? data.cBlockH2 : data.cBlockH);
            var wcm = useA ? data.cBlockW : (data.cAlt ? data.cBlockW2 : data.cBlockW);
            var hpx = hcm * scale;
            
            if (yy + hpx > workY + workH + 1e-6) break;
            
            var bx = aLeft + (wallW - 8 - wcm * scale) / 2;
            var block = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            block.setAttribute('x', Math.max(aLeft, bx));
            block.setAttribute('y', yy);
            block.setAttribute('width', Math.max(8, Math.min(aRight - aLeft, wcm * scale)));
            block.setAttribute('height', Math.max(4, hpx));
            block.setAttribute('fill', bonieColor);
            block.setAttribute('stroke', '#fb7185');
            block.setAttribute('rx', '2');
            svg.appendChild(block);
            
            yy += hpx;
            
            var gap = data.cGap * scale;
            if (yy + gap > workY + workH + 1e-6) break;
            yy += gap;
            
            if (data.cAlt) useA = !useA;
        }
        
        // Labels
        var createText = function(text, textX, textY) {
            var textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textEl.setAttribute('x', textX);
            textEl.setAttribute('y', textY);
            textEl.setAttribute('fill', '#64748b');
            textEl.setAttribute('font-size', '11');
            textEl.setAttribute('font-family', 'ui-sans-serif, system-ui');
            textEl.textContent = text;
            svg.appendChild(textEl);
        };
        
        createText(Math.round(data.cWallH) + ' cm', x + wallW + 10, y + 12);
        createText('A: ' + data.piecesA + ' • B: ' + data.piecesB, x + wallW + 10, y + 28);
    }
    
    // Compute all windows
    function computeAll() {
        if (typeof Calculator === 'undefined') return;
        
        var windowCards = document.querySelectorAll('#windows .card[data-id]');
        var summaryTableBody = document.querySelector('#summaryTable tbody');
        if (!summaryTableBody) return;
        
        summaryTableBody.innerHTML = '';
        renumberCards();
        
        var totals = {
            qty: 0, lenL: 0, pcsL: 0, lenGd: 0, pcsGd: 0, lenGu: 0, pcsGu: 0,
            zw: 0, wsTop: 0, wsBot: 0, cost: 0
        };
        
        var fragment = document.createDocumentFragment();
        
        windowCards.forEach(function(card, index) {
            var rawData = readWindowData(card);
            var calculatedData = Calculator.calculateWindow(rawData);
            
            // Update card displays
            updateWindowPreview(card, calculatedData);
            card.querySelector('.perimeter').textContent = calculatedData.lenL + ' cm';
            card.querySelector('.piecesL').textContent = calculatedData.pcsL;
            card.querySelector('.gzymsDownInfo').textContent = calculatedData.gDown ? 
                (calculatedData.lenGd + ' cm • ' + calculatedData.pcsGd + ' szt.') : 'brak';
            card.querySelector('.gzymsUpInfo').textContent = calculatedData.gUp ? 
                (calculatedData.lenGu + ' cm • ' + calculatedData.pcsGu + ' szt.') : 'brak';
            
            // Handle "aggregate as one" option
            var multiLabel = card.querySelector('.onlyMulti');
            var aggInput = card.querySelector('.aggAsOne');
            if (multiLabel && aggInput) {
                if (calculatedData.qty > 1) {
                    multiLabel.style.display = 'block';
                    aggInput.disabled = false;
                } else {
                    multiLabel.style.display = 'none';
                    aggInput.checked = false;
                }
            }
            
            var aggOn = aggInput && aggInput.checked && calculatedData.qty > 1;
            var finalData = calculatedData;
            
            // Recalculate for aggregated windows
            if (aggOn) {
                var aggLenL = Math.round(calculatedData.lenL * calculatedData.qty);
                var aggPcsL = Math.ceil(aggLenL / calculatedData.lenListwa);
                var aggLenGd = calculatedData.gDown ? Math.round(calculatedData.lenGd * calculatedData.qty) : 0;
                var aggPcsGd = calculatedData.gDown ? Math.ceil(aggLenGd / calculatedData.lenGzymsDown) : 0;
                var aggLenGu = calculatedData.gUp ? Math.round(calculatedData.lenGu * calculatedData.qty) : 0;
                var aggPcsGu = calculatedData.gUp ? Math.ceil(aggLenGu / calculatedData.lenGzymsUp) : 0;
                
                // Recalculate cost
                var aggCostListwy = aggPcsL * calculatedData.priceListwa;
                var aggCostGd = calculatedData.gDown ? aggPcsGd * calculatedData.priceGzymsDown : 0;
                var aggCostGu = calculatedData.gUp ? aggPcsGu * calculatedData.priceGzymsUp : 0;
                var aggCostBefore = aggCostListwy + aggCostGd + aggCostGu + calculatedData.costFixedTotal;
                var aggCost = aggCostBefore * (1 - calculatedData.discount / 100);
                
                finalData = Object.assign({}, calculatedData, {
                    pcsLTotal: aggPcsL,
                    pcsGdTotal: aggPcsGd,
                    pcsGuTotal: aggPcsGu,
                    costTotal: aggCost
                });
            }
            
            // Create table row
            var modeLabel = calculatedData.mode === 'full' ? 'pełna' : 
                          (calculatedData.mode === 'toplr' ? 'góra+boki' : 'tylko boki');
            
            var lenLDisplay = calculatedData.lenLTotal + 
                (aggOn ? '<div class="tiny">↳ jako jedno: ' + Math.round(calculatedData.lenL * calculatedData.qty) + '</div>' : '');
            var pcsLDisplay = calculatedData.pcsLTotal + 
                (aggOn ? '<div class="tiny">↳ szt: ' + finalData.pcsLTotal + '</div>' : '');
            var qtyDisplay = calculatedData.qty + 
                (aggOn ? '<div class="tiny">↳ liczone jako jedno</div>' : '');
            
            var row = document.createElement('tr');
            row.innerHTML = 
                '<td>' + (index + 1) + '</td>' +
                '<td>' + Calculator.escapeHtml(calculatedData.name || '—') + '</td>' +
                '<td>' + calculatedData.w + '×' + calculatedData.h + '</td>' +
                '<td>' + qtyDisplay + '</td>' +
                '<td>' + modeLabel + '</td>' +
                '<td>' + (calculatedData.gDown ? 'tak' : 'nie') + '</td>' +
                '<td>' + (calculatedData.gUp ? 'tak' : 'nie') + '</td>' +
                '<td>' + lenLDisplay + '</td>' +
                '<td>' + pcsLDisplay + '</td>' +
                '<td>' + calculatedData.lenGdTotal + '</td>' +
                '<td>' + calculatedData.pcsGdTotal + '</td>' +
                '<td>' + calculatedData.lenGuTotal + '</td>' +
                '<td>' + calculatedData.pcsGuTotal + '</td>' +
                '<td>' + calculatedData.pcsZwTotal + '</td>' +
                '<td>' + calculatedData.pcsBrTopTotal + '</td>' +
                '<td>' + calculatedData.pcsBrBottomTotal + '</td>' +
                '<td>' + calculatedData.discount + '%</td>' +
                '<td>' + Calculator.money(finalData.costTotal) + '</td>';
            
            fragment.appendChild(row);
            
            // Update totals
            totals.qty += calculatedData.qty;
            totals.lenL += calculatedData.lenLTotal;
            totals.pcsL += finalData.pcsLTotal;
            totals.lenGd += calculatedData.lenGdTotal;
            totals.pcsGd += finalData.pcsGdTotal;
            totals.lenGu += calculatedData.lenGuTotal;
            totals.pcsGu += finalData.pcsGuTotal;
            totals.zw += calculatedData.pcsZwTotal;
            totals.wsTop += calculatedData.pcsBrTopTotal;
            totals.wsBot += calculatedData.pcsBrBottomTotal;
            totals.cost += finalData.costTotal;
        });
        
        summaryTableBody.appendChild(fragment);
        
        // Apply global discount
        var globalDiscountEl = document.getElementById('globalDiscount');
        var globalDiscount = globalDiscountEl ? Calculator.num(globalDiscountEl.value, 0) : 0;
        var finalCost = totals.cost * (1 - Math.min(100, Math.max(0, globalDiscount)) / 100);
        
        // Update totals display
        document.getElementById('tQty').textContent = totals.qty;
        document.getElementById('tLenL').textContent = Math.round(totals.lenL);
        document.getElementById('tPiecesL').textContent = totals.pcsL;
        document.getElementById('tLenGd').textContent = Math.round(totals.lenGd);
        document.getElementById('tPiecesGd').textContent = totals.pcsGd;
        document.getElementById('tLenGu').textContent = Math.round(totals.lenGu);
        document.getElementById('tPiecesGu').textContent = totals.pcsGu;
        document.getElementById('tZw').textContent = totals.zw;
        document.getElementById('tWsTop').textContent = totals.wsTop;
        document.getElementById('tWsBot').textContent = totals.wsBot;
        document.getElementById('tCost').textContent = Calculator.money(finalCost);
        
        // Autosave
        autosaveNow();
    }
    
    // Compute all corners
    function computeCorners() {
        if (typeof Calculator === 'undefined') return;
        
        var cornerCards = document.querySelectorAll('#corners .card[data-corner-id]');
        var cornersTableBody = document.querySelector('#cornersTable tbody');
        if (!cornersTableBody) return;
        
        cornersTableBody.innerHTML = '';
        
        var totals = { bonie: 0, cost: 0 };
        var fragment = document.createDocumentFragment();
        
        cornerCards.forEach(function(card, index) {
            var rawData = readCornerData(card);
            var calculatedData = Calculator.calculateCorner(rawData);
            
            // Update card displays
            updateCornerPreview(card, calculatedData);
            card.querySelector('.cPieces').textContent = calculatedData.pieces1;
            card.querySelector('.cPiecesTotal').textContent = calculatedData.totalPieces;
            card.querySelector('.cCost').textContent = Calculator.money(calculatedData.totalCost);
            
            // Create table row
            var row = document.createElement('tr');
            row.innerHTML = 
                '<td>' + (index + 1) + '</td>' +
                '<td>' + Calculator.escapeHtml(calculatedData.cName || '—') + '</td>' +
                '<td>' + calculatedData.cWallH + ' cm</td>' +
                '<td>' + calculatedData.cQty + '</td>' +
                '<td>' + calculatedData.cBlockH + ' cm</td>' +
                '<td>' + calculatedData.cBlockW + ' cm</td>' +
                '<td>' + (calculatedData.cAlt ? 'TAK' : 'NIE') + '</td>' +
                '<td>' + (calculatedData.cAlt ? calculatedData.cBlockH2 + ' cm' : '—') + '</td>' +
                '<td>' + (calculatedData.cAlt ? calculatedData.cBlockW2 + ' cm' : '—') + '</td>' +
                '<td>' + calculatedData.cTop + ' cm</td>' +
                '<td>' + calculatedData.cBottom + ' cm</td>' +
                '<td>' + calculatedData.cGap + ' cm</td>' +
                '<td>' + calculatedData.pieces1 + '</td>' +
                '<td>' + calculatedData.totalPieces + '</td>' +
                '<td>' + Calculator.money(calculatedData.cPrice) + '</td>' +
                '<td>' + (calculatedData.cAlt ? Calculator.money(calculatedData.cPrice2) : '—') + '</td>' +
                '<td>' + Calculator.money(calculatedData.totalCost) + '</td>';
            
            fragment.appendChild(row);
            
            totals.bonie += calculatedData.totalPieces;
            totals.cost += calculatedData.totalCost;
        });
        
        cornersTableBody.appendChild(fragment);
        
        // Update totals
        document.getElementById('tBonie').textContent = totals.bonie;
        document.getElementById('tBonieCost').textContent = Calculator.money(totals.cost);
    }
    
    // Renumber cards
    function renumberCards() {
        var windowCards = document.querySelectorAll('#windows .card[data-id]');
        windowCards.forEach(function(card, index) {
            var numEl = card.querySelector('.num');
            if (numEl) numEl.textContent = index + 1;
        });
    }
    
    function renumberCorners() {
        var cornerCards = document.querySelectorAll('#corners .card[data-corner-id]');
        cornerCards.forEach(function(card, index) {
            var numEl = card.querySelector('.num');
            if (numEl) numEl.textContent = index + 1;
        });
    }
    
    // Show cutting plan
    function showCuttingPlan() {
        if (typeof Calculator === 'undefined') return;
        
        var units = document.getElementById('units').value || 'cm';
        var kerf = Calculator.toMM(Calculator.num(document.getElementById('kerf').value || 0), 'mm');
        var overcut = Calculator.toMM(Calculator.num(document.getElementById('overcut').value || 0), 'mm');
        
        var segments = collectSegments();
        var output = '';
        
        ['listwy', 'gzymsDown', 'gzymsUp'].forEach(function(type) {
            var typeData = segments[type];
            if (!typeData || typeData.length === 0) return;
            
            var title = type === 'listwy' ? 'LISTWY' : 
                       type === 'gzymsDown' ? 'GZYMS DOLNY' : 'GZYMS GÓRNY';
            output += '== ' + title + ' ==\n';
            
            typeData.forEach(function(group) {
                if (!group.stock || group.cuts.length === 0) return;
                
                var plan = Calculator.optimizeCuttingPlan(group.stock, group.cuts, kerf, overcut);
                output += '• Długość sztangi: ' + Calculator.formatLength(group.stock, units) + '\n';
                output += 'Ilość sztang: ' + plan.bars.length + '\n';
                output += 'Łączny odpad: ' + Calculator.formatLength(plan.totalWaste, units) + '\n';
                
                plan.bars.forEach(function(bar, i) {
                    var partsText = bar.parts.map(function(p) { return Calculator.formatLength(p, units); }).join(' + ');
                    output += 'Sztanga ' + (i + 1) + ' (' + Calculator.formatLength(group.stock, units) + '): ' + 
                             partsText + ' | odpad: ' + Calculator.formatLength(bar.waste, units) + '\n';
                });
                output += '\n';
            });
        });
        
        document.getElementById('cutsContent').textContent = output || 'Brak danych do optymalizacji.';
        document.getElementById('cutsModal').style.display = 'block';
    }
    
    // Collect cutting segments
    function collectSegments() {
        var segments = {
            listwy: {},
            gzymsDown: {},
            gzymsUp: {}
        };
        
        var windowCards = document.querySelectorAll('#windows .card[data-id]');
        
        windowCards.forEach(function(card) {
            var data = readWindowData(card);
            var calculated = Calculator.calculateWindow(data);
            
            // Collect frame cuts
            var stockL = Calculator.toMM(calculated.lenListwa, 'cm');
            var stockLKey = String(stockL);
            if (!segments.listwy[stockLKey]) {
                segments.listwy[stockLKey] = { stock: stockL, cuts: [] };
            }
            
            var W = Calculator.toMM(calculated.w, 'cm');
            var H = Calculator.toMM(calculated.h, 'cm');
            var frameCuts = [];
            
            if (calculated.mode === 'full') {
                frameCuts = [W, W, H, H];
            } else if (calculated.mode === 'toplr') {
                frameCuts = [W, H, H];
            } else {
                frameCuts = [H, H];
            }
            
            for (var i = 0; i < calculated.qty; i++) {
                frameCuts.forEach(function(cut) {
                    segments.listwy[stockLKey].cuts.push(cut);
                });
            }
            
            // Collect gzyms cuts
            if (calculated.gDown) {
                var stockGd = Calculator.toMM(calculated.lenGzymsDown, 'cm');
                var stockGdKey = String(stockGd);
                if (!segments.gzymsDown[stockGdKey]) {
                    segments.gzymsDown[stockGdKey] = { stock: stockGd, cuts: [] };
                }
                
                var gzymsCut = Math.round(W * (calculated.addWasteDown ? 1.15 : 1));
                for (var i = 0; i < calculated.qty; i++) {
                    segments.gzymsDown[stockGdKey].cuts.push(gzymsCut);
                }
            }
            
            if (calculated.gUp) {
                var stockGu = Calculator.toMM(calculated.lenGzymsUp, 'cm');
                var stockGuKey = String(stockGu);
                if (!segments.gzymsUp[stockGuKey]) {
                    segments.gzymsUp[stockGuKey] = { stock: stockGu, cuts: [] };
                }
                
                var gzymsCut = Math.round(W * (calculated.addWasteUp ? 1.15 : 1));
                for (var i = 0; i < calculated.qty; i++) {
                    segments.gzymsUp[stockGuKey].cuts.push(gzymsCut);
                }
            }
        });
        
        // Convert to arrays
        return {
            listwy: Object.values(segments.listwy),
            gzymsDown: Object.values(segments.gzymsDown),
            gzymsUp: Object.values(segments.gzymsUp)
        };
    }
    
    // Save/Load/Share functions
    function saveToJSON() {
        var data = collectCurrentState();
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'kalkulator_listew_wycena.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }
    
    function loadFromJSON(event) {
        var file = event.target.files[0];
        if (!file) return;
        
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var data = JSON.parse(e.target.result);
                loadStateFromData(data);
                autosaveNow();
            } catch (error) {
                alert('Nieprawidłowy plik JSON.');
                console.error('JSON import error:', error);
            }
        };
        reader.readAsText(file);
    }
    
    function shareLink() {
        var data = collectCurrentState();
        var hash = Calculator.encodeShare(data);
        var url = location.origin + location.pathname + '#' + hash;
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function() {
                alert('Link skopiowany do schowka!');
            }).catch(function() {
                prompt('Skopiuj link:', url);
            });
        } else {
            prompt('Skopiuj link:', url);
        }
    }
    
    // Collect current application state
    function collectCurrentState() {
        var windows = [];
        var windowCards = document.querySelectorAll('#windows .card[data-id]');
        windowCards.forEach(function(card) {
            windows.push(readWindowData(card));
        });
        
        var corners = [];
        var cornerCards = document.querySelectorAll('#corners .card[data-corner-id]');
        cornerCards.forEach(function(card) {
            corners.push(readCornerData(card));
        });
        
        var globalDiscountEl = document.getElementById('globalDiscount');
        var kerfEl = document.getElementById('kerf');
        var overcutEl = document.getElementById('overcut');
        var unitsEl = document.getElementById('units');
        
        return {
            _v: Calculator.SCHEMA_VERSION,
            globalDiscount: globalDiscountEl ? Calculator.num(globalDiscountEl.value, 0) : 0,
            kerf: kerfEl ? Calculator.num(kerfEl.value, 0) : 0,
            overcut: overcutEl ? Calculator.num(overcutEl.value, 0) : 0,
            units: unitsEl ? unitsEl.value : 'cm',
            windows: windows,
            corners: corners
        };
    }
    
    // Load state from data
    function loadStateFromData(data) {
        if (!data) return;
        
        // Clear existing cards
        document.querySelectorAll('#windows .card[data-id]').forEach(function(card) {
            card.remove();
        });
        document.querySelectorAll('#corners .card[data-corner-id]').forEach(function(card) {
            card.remove();
        });
        
        // Reset counters
        windowCounter = 0;
        cornerCounter = 0;
        
        // Load windows
        if (data.windows && data.windows.length > 0) {
            data.windows.forEach(function(windowData) {
                addWindow(windowData);
            });
        }
        
        // Load corners
        if (data.corners && data.corners.length > 0) {
            data.corners.forEach(function(cornerData) {
                addCorner(cornerData);
            });
        }
        
        // Load settings
        var globalDiscountEl = document.getElementById('globalDiscount');
        var kerfEl = document.getElementById('kerf');
        var overcutEl = document.getElementById('overcut');
        var unitsEl = document.getElementById('units');
        
        if (globalDiscountEl) globalDiscountEl.value = data.globalDiscount || 0;
        if (kerfEl) kerfEl.value = data.kerf || 0;
        if (overcutEl) overcutEl.value = data.overcut || 0;
        if (unitsEl) unitsEl.value = data.units || 'cm';
        
        // Recalculate
        computeAll();
        computeCorners();
    }
    
    // Load initial state (from hash or autosave)
    function loadInitialState() {
        var loaded = false;
        
        // Try to load from URL hash
        if (location.hash && location.hash.length > 1) {
            try {
                var data = Calculator.decodeShare(location.hash.slice(1));
                loadStateFromData(data);
                loaded = true;
            } catch (error) {
                console.error('Failed to load from hash:', error);
            }
        }
        
        // Try to load from autosave if hash failed
        if (!loaded) {
            if (Calculator.loadAutosave()) {
                var state = Calculator.getState();
                if (state.windows && state.windows.length > 0) {
                    state.windows.forEach(function(windowData) {
                        addWindow(windowData);
                    });
                }
                if (state.corners && state.corners.length > 0) {
                    state.corners.forEach(function(cornerData) {
                        addCorner(cornerData);
                    });
                }
                loaded = true;
            }
        }
        
        // Add default window if nothing loaded
        if (!loaded) {
            addWindow();
        }
        
        // Initial calculations
        computeAll();
        computeCorners();
    }
    
    // Autosave functionality
    function autosaveNow() {
        clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(function() {
            Calculator.autosaveState();
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
        renumberCards: renumberCards,
        renumberCorners: renumberCorners,
        autosaveNow: autosaveNow
    };
})();