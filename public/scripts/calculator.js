/**
 * Calculator Logic
 * Core calculation functions for windows and corners
 */

var Calculator = (function() {
    'use strict';
    
    // Constants
    var SCHEMA_VERSION = '1.2.0';
    var AUTOSAVE_KEY = 'kalkulator_listew_autosave_v120';
    var USER_PRESETS_KEY = 'kalkulator_listew_user_presets_v1';
    
    // Global state
    var state = {
        windows: [],
        corners: [],
        globalDiscount: 0,
        kerf: 0,
        overcut: 0,
        units: 'cm'
    };
    
    // Default presets
    var PRESETS = [
        {
            id: 'classic', 
            label: 'Ościeże klasyczne', 
            name: 'Salon',  
            w: 150, h: 180, qty: 1, 
            mode: 'full',  
            gDown: true, gUp: true,  
            lenListwa: 200, priceListwa: 50, 
            lenGzymsDown: 200, priceGzymsDown: 80, 
            lenGzymsUp: 200, priceGzymsUp: 80, 
            discount: 0
        },
        {
            id: 'loft',    
            label: 'Loft',               
            name: 'Kuchnia', 
            w: 200, h: 200, qty: 2, 
            mode: 'toplr', 
            gDown: false, gUp: false,
            lenListwa: 250, priceListwa: 60, 
            lenGzymsDown: 200, priceGzymsDown: 90, 
            lenGzymsUp: 200, priceGzymsUp: 90, 
            discount: 5
        },
        {
            id: 'plain',   
            label: 'Bez gzymsów',        
            name: 'Sypialnia', 
            w: 120, h: 150, qty: 1, 
            mode: 'sides', 
            gDown: false, gUp: false,
            lenListwa: 180, priceListwa: 40, 
            lenGzymsDown: 200, priceGzymsDown: 80, 
            lenGzymsUp: 200, priceGzymsUp: 80, 
            discount: 0
        }
    ];
    
    // Utility functions
    function num(value, fallback) {
        fallback = typeof fallback !== 'undefined' ? fallback : 0;
        var parsed = parseFloat(String(value).replace(',', '.'));
        return isFinite(parsed) ? parsed : fallback;
    }
    
    function money(value) {
        var amount = isFinite(value) ? value : num(value, 0);
        try {
            return new Intl.NumberFormat('pl-PL', {
                style: 'currency',
                currency: 'PLN'
            }).format(amount);
        } catch (e) {
            return (Math.round(amount * 100) / 100).toFixed(2).replace('.', ',') + ' zł';
        }
    }
    
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
    
    // Window calculation functions
    function calculateWindow(windowData) {
        var data = {
            name: windowData.name || '',
            w: Math.max(1, num(windowData.w, 120)),
            h: Math.max(1, num(windowData.h, 140)),
            qty: Math.max(1, Math.round(num(windowData.qty, 1))),
            mode: windowData.mode || 'full',
            gDown: !!windowData.gDown,
            gUp: !!windowData.gUp,
            discount: Math.min(100, Math.max(0, num(windowData.discount, 0))),
            
            lenListwa: Math.max(1, num(windowData.lenListwa, 200)),
            priceListwa: Math.max(0, num(windowData.priceListwa, 0)),
            lenGzymsDown: Math.max(1, num(windowData.lenGzymsDown, 200)),
            priceGzymsDown: Math.max(0, num(windowData.priceGzymsDown, 0)),
            lenGzymsUp: Math.max(1, num(windowData.lenGzymsUp, 200)),
            priceGzymsUp: Math.max(0, num(windowData.priceGzymsUp, 0)),
            
            addWasteDown: !!windowData.addWasteDown,
            addWasteUp: !!windowData.addWasteUp,
            
            keystone: !!windowData.keystone,
            qtyKeystone: Math.max(1, Math.round(num(windowData.qtyKeystone, 1))),
            priceKeystone: Math.max(0, num(windowData.priceKeystone, 0)),
            
            brTop: !!windowData.brTop,
            qtyBrTop: Math.max(1, Math.round(num(windowData.qtyBrTop, 2))),
            priceBrTop: Math.max(0, num(windowData.priceBrTop, 0)),
            
            brBottom: !!windowData.brBottom,
            qtyBrBottom: Math.max(1, Math.round(num(windowData.qtyBrBottom, 2))),
            priceBrBottom: Math.max(0, num(windowData.priceBrBottom, 0))
        };
        
        // Calculate frame length
        var lenL = 0;
        if (data.mode === 'full') {
            lenL = 2 * data.w + 2 * data.h;
        } else if (data.mode === 'toplr') {
            lenL = data.w + 2 * data.h;
        } else if (data.mode === 'sides') {
            lenL = 2 * data.h;
        }
        
        var pcsL = Math.ceil(lenL / data.lenListwa);
        
        // Calculate cornices
        var lenGd = data.gDown ? data.w : 0;
        if (data.addWasteDown) lenGd *= 1.15;
        var pcsGd = data.gDown ? Math.ceil(lenGd / data.lenGzymsDown) : 0;
        
        var lenGu = data.gUp ? data.w : 0;
        if (data.addWasteUp) lenGu *= 1.15;
        var pcsGu = data.gUp ? Math.ceil(lenGu / data.lenGzymsUp) : 0;
        
        // Calculate accessories
        var pcsZw = data.keystone ? data.qtyKeystone : 0;
        var pcsBrTop = data.brTop ? data.qtyBrTop : 0;
        var pcsBrBottom = data.brBottom ? data.qtyBrBottom : 0;
        
        // Calculate costs
        var costListwy = pcsL * data.priceListwa;
        var costGd = data.gDown ? pcsGd * data.priceGzymsDown : 0;
        var costGu = data.gUp ? pcsGu * data.priceGzymsUp : 0;
        var costZw = pcsZw * data.priceKeystone;
        var costBrTop = pcsBrTop * data.priceBrTop;
        var costBrBottom = pcsBrBottom * data.priceBrBottom;
        
        var costBefore = costListwy + costGd + costGu + costZw + costBrTop + costBrBottom;
        var cost = costBefore * (1 - data.discount / 100);
        
        // Add calculated values to result
        data.lenL = Math.round(lenL);
        data.pcsL = pcsL;
        data.lenGd = Math.round(lenGd);
        data.pcsGd = pcsGd;
        data.lenGu = Math.round(lenGu);
        data.pcsGu = pcsGu;
        
        data.lenLTotal = Math.round(lenL * data.qty);
        data.pcsLTotal = pcsL * data.qty;
        data.lenGdTotal = Math.round(lenGd * data.qty);
        data.pcsGdTotal = pcsGd * data.qty;
        data.lenGuTotal = Math.round(lenGu * data.qty);
        data.pcsGuTotal = pcsGu * data.qty;
        
        data.pcsZwTotal = pcsZw * data.qty;
        data.pcsBrTopTotal = pcsBrTop * data.qty;
        data.pcsBrBottomTotal = pcsBrBottom * data.qty;
        
        data.costTotal = cost * data.qty;
        data.costFixedTotal = (costZw + costBrTop + costBrBottom) * data.qty;
        
        return data;
    }
    
    // Corner calculation functions
    function calculateCorner(cornerData) {
        var data = {
            cName: cornerData.cName || '',
            cWallH: Math.max(1, num(cornerData.cWallH, 300)),
            cQty: Math.max(1, Math.round(num(cornerData.cQty, 1))),
            
            cBlockH: Math.max(0.1, num(cornerData.cBlockH, 25)),
            cBlockW: Math.max(0.1, num(cornerData.cBlockW, 30)),
            cTop: Math.max(0, num(cornerData.cTop, 20)),
            cBottom: Math.max(0, num(cornerData.cBottom, 20)),
            cGap: Math.max(0, num(cornerData.cGap, 5)),
            cPrice: Math.max(0, num(cornerData.cPrice, 35)),
            
            cAlt: !!cornerData.cAlt,
            cBlockH2: Math.max(0.1, num(cornerData.cBlockH2, 15)),
            cBlockW2: Math.max(0.1, num(cornerData.cBlockW2, 20)),
            cPrice2: Math.max(0, num(cornerData.cPrice2, 35))
        };
        
        // Calculate pieces per wall
        var usable = Math.max(0, data.cWallH - data.cTop - data.cBottom);
        var piecesA = 0, piecesB = 0, y = 0, useA = true;
        
        while (true) {
            var h = useA ? data.cBlockH : (data.cAlt ? data.cBlockH2 : data.cBlockH);
            if (y + h > usable + 1e-6) break;
            
            if (useA) piecesA++; 
            else piecesB++;
            
            y += h;
            
            // Add gap if there's room for more
            if (y + data.cGap > usable + 1e-6) break;
            y += data.cGap;
            
            // Switch size for alternating
            if (data.cAlt) useA = !useA;
        }
        
        var pieces1 = piecesA + piecesB;
        var totalPieces = pieces1 * data.cQty;
        var cost1 = piecesA * data.cPrice + piecesB * (data.cAlt ? data.cPrice2 : data.cPrice);
        var totalCost = cost1 * data.cQty;
        
        data.piecesA = piecesA;
        data.piecesB = piecesB;
        data.pieces1 = pieces1;
        data.totalPieces = totalPieces;
        data.cost1 = cost1;
        data.totalCost = totalCost;
        
        return data;
    }
    
    // Cutting plan optimization
    function optimizeCuttingPlan(stockLenMM, cutsMM, kerfMM, overMM) {
        kerfMM = kerfMM || 0;
        overMM = overMM || 0;
        
        var items = cutsMM.map(function(v) { return v + overMM; }).sort(function(a, b) { return b - a; });
        var bars = [];
        
        items.forEach(function(len) {
            var placed = false;
            for (var i = 0; i < bars.length; i++) {
                var b = bars[i];
                var extra = b.parts.length > 0 ? kerfMM : 0;
                if (b.used + extra + len <= stockLenMM) {
                    b.used += extra + len;
                    b.parts.push(len);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                bars.push({ used: len, parts: [len] });
            }
        });
        
        var result = bars.map(function(b) {
            return {
                parts: b.parts.slice(),
                waste: Math.max(0, Math.round(stockLenMM - b.used))
            };
        });
        
        var totalWaste = result.reduce(function(sum, b) { return sum + b.waste; }, 0);
        
        return {
            bars: result,
            totalWaste: totalWaste
        };
    }
    
    // Convert measurements
    function toMM(value, units) {
        var n = num(value, 0);
        return units === 'mm' ? n : n * 10;
    }
    
    function formatLength(value, units) {
        return units === 'mm' ? value + ' mm' : (value / 10).toFixed(1).replace('.0', '') + ' cm';
    }
    
    // Preset management
    function loadUserPresets() {
        try {
            return JSON.parse(localStorage.getItem(USER_PRESETS_KEY)) || [];
        } catch (e) {
            return [];
        }
    }
    
    function saveUserPresets(presets) {
        try {
            localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(presets));
        } catch (e) {
            console.error('Failed to save user presets:', e);
        }
    }
    
    function makePresetId() {
        return 'user_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }
    
    // State management
    function collectState() {
        return {
            _v: SCHEMA_VERSION,
            globalDiscount: state.globalDiscount,
            kerf: state.kerf,
            overcut: state.overcut,
            units: state.units,
            windows: state.windows,
            corners: state.corners
        };
    }
    
    function loadState(newState) {
        if (!newState) return;
        
        state.globalDiscount = newState.globalDiscount || 0;
        state.kerf = newState.kerf || 0;
        state.overcut = newState.overcut || 0;
        state.units = newState.units || 'cm';
        state.windows = newState.windows || [];
        state.corners = newState.corners || [];
    }
    
    function autosaveState() {
        try {
            var stateData = collectState();
            localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(stateData));
        } catch (e) {
            console.error('Autosave failed:', e);
        }
    }
    
    function loadAutosave() {
        try {
            var raw = localStorage.getItem(AUTOSAVE_KEY);
            if (raw) {
                var saved = JSON.parse(raw);
                if (saved && saved._v) {
                    loadState(saved);
                    return true;
                }
            }
        } catch (e) {
            console.error('Failed to load autosave:', e);
        }
        return false;
    }
    
    // Share functionality
    function encodeShare(obj) {
        var s = JSON.stringify(obj);
        var b64 = btoa(unescape(encodeURIComponent(s)));
        return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    
    function decodeShare(s) {
        var pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
        var b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
        var txt = decodeURIComponent(escape(atob(b64)));
        return JSON.parse(txt);
    }
    
    // Export functions
    function exportToCSV(tableId) {
        var rows = document.querySelectorAll('#' + tableId + ' tr');
        var csv = Array.from(rows).map(function(tr) {
            return Array.from(tr.querySelectorAll('th,td')).map(function(td) {
                return '"' + td.innerText.trim().replace(/"/g, '""') + '"';
            }).join(';');
        }).join('\n');
        
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'kalkulator_listew_podsumowanie.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }
    
    // Public API
    return {
        // Constants
        PRESETS: PRESETS,
        SCHEMA_VERSION: SCHEMA_VERSION,
        
        // Utility functions
        num: num,
        money: money,
        escapeHtml: escapeHtml,
        
        // Calculation functions
        calculateWindow: calculateWindow,
        calculateCorner: calculateCorner,
        optimizeCuttingPlan: optimizeCuttingPlan,
        toMM: toMM,
        formatLength: formatLength,
        
        // Preset management
        loadUserPresets: loadUserPresets,
        saveUserPresets: saveUserPresets,
        makePresetId: makePresetId,
        
        // State management
        getState: function() { return state; },
        setState: loadState,
        collectState: collectState,
        loadState: loadState,
        autosaveState: autosaveState,
        loadAutosave: loadAutosave,
        
        // Share functionality
        encodeShare: encodeShare,
        decodeShare: decodeShare,
        
        // Export
        exportToCSV: exportToCSV
    };
})();

// Make available globally
if (typeof window !== 'undefined') {
    window.Calculator = Calculator;
}