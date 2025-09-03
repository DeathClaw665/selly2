# Kalkulator listew + narożniki - Refactored with Selly.pl API Integration

A professional calculator for window frames and corners with integrated product search from Selly.pl marketplace.

## Features

### 🏗️ **Window Calculations**
- Multiple frame modes (full frame, top + sides, sides only)
- Cornice support (upper and lower)
- Accessories (keystones, brackets)
- Quantity management with "aggregate as one" option
- Real-time cost calculations with discount support

### 🧱 **Corner Calculations (Alternating Bricks)**
- Alternating brick dimensions (A/B/A/B pattern)
- Wall height and quantity management
- Gap and spacing calculations
- Cost calculations for different brick sizes

### 🛒 **Selly.pl API Integration**
- Real-time product search
- Product categorization (frames, cornices)
- Stock availability indicators
- Price and dimension auto-fill
- Intelligent caching for performance

### 📊 **Advanced Features**
- Preset management (default + custom)
- Bulk editing for multiple windows
- Cutting plan optimization with waste calculation
- CSV export for spreadsheet analysis
- JSON save/load for project persistence
- Share functionality via URL
- Print-optimized layouts
- Drag & drop reordering

## File Structure

```
public/
├── index.html              # Main HTML structure
├── styles/
│   └── main.css            # All CSS styles
├── scripts/
│   ├── selly-api.js        # Selly.pl API integration
│   ├── product-picker.js   # Product search component
│   ├── calculator.js       # Core calculation logic
│   └── app.js              # Main application logic
└── README.md              # This file
```

## Architecture

### **Modular Design**
- **Separation of Concerns**: CSS, JavaScript, and HTML are in separate files
- **Component-based**: ProductPicker, Calculator, and App modules
- **ES5 Compatible**: Works in older browsers without transpilation

### **API Integration**
- **Fallback System**: Demo data when API is unavailable
- **Caching**: 5-minute cache for product searches
- **Rate Limiting**: Respects API limits with automatic retry
- **Error Handling**: Graceful degradation with user feedback

### **User Experience**
- **Progressive Enhancement**: Works without API, enhanced with it
- **Responsive Design**: Mobile-friendly interface
- **Accessibility**: ARIA labels, keyboard navigation
- **Performance**: Debounced search, lazy loading

## Setup & Usage

### **Development**
```bash
# Serve files locally
npm start

# Visit http://localhost:3000
```

### **Selly.pl API Configuration**
1. Obtain API key from Selly.pl dashboard
2. Enter key when prompted (or leave empty for demo mode)
3. API key is stored locally for future sessions

### **Production Deployment**
Simply upload the `public` folder contents to any web server. No build process required.

## API Integration Details

### **Endpoints Used**
- `/products/search` - Product search with category filtering
- `/user/profile` - API key validation

### **Product Data Structure**
```javascript
{
  id: "product-id",
  name: "Product Name",
  barLengthCm: 200,        // Length in centimeters
  pricePLN: 49.99,         // Price in Polish Zloty
  stock: 25,               // Available quantity
  category: "listwy",      // Product category
  images: [...],           // Product images
  inStock: true,           // Availability status
  stockStatus: "in-stock"  // Stock level indicator
}
```

### **Error Handling**
- Network failures → Fallback to demo data
- Invalid API keys → Prompt for re-entry
- Rate limiting → Automatic retry with backoff
- Search errors → User-friendly messages

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ Internet Explorer 11 (limited functionality)

## Performance Features

- **Intelligent Caching**: Search results cached for 5 minutes
- **Debounced Search**: 300ms delay to reduce API calls
- **Lazy Loading**: Components loaded as needed
- **Optimized DOM**: Minimal reflows and repaints
- **Local Storage**: Autosave and preset management

## Security Considerations

- API keys stored in localStorage (user's discretion)
- XSS protection through proper escaping
- Input validation for all calculations
- HTTPS required for API communication

## Contributing

When extending the application:

1. **CSS**: Add styles to `styles/main.css` with proper organization
2. **API Logic**: Extend `scripts/selly-api.js` for new endpoints
3. **Components**: Add new components to separate files
4. **Calculations**: Extend `scripts/calculator.js` for new formulas

## Technical Notes

### **State Management**
- Window and corner data stored in application state
- Autosave to localStorage every 500ms
- URL hash sharing for project persistence

### **Calculation Engine**
- Precise floating-point math for measurements
- Waste calculation for cutting optimization
- Multi-quantity aggregation support

### **Product Search**
- Type-ahead search with categorization
- Stock status visualization
- Automatic form population from product data

---

**Version**: 1.2.0  
**Last Updated**: December 2024  
**License**: MIT