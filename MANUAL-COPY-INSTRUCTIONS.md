# 📋 Manual Copy Instructions for GitHub

Since automatic git push requires authentication, here are the complete files you need to copy to your GitHub repository manually.

## 🎯 **Method 1: Copy Files Directly**

Visit the live application and copy the source files:
**Live App**: https://sb-1v4jehinsad7.vercel.run

### **Files to Download/Copy:**

#### **1. public/index.html**
- Right-click on the page → View Page Source
- Copy the entire HTML content

#### **2. public/styles/main.css**
- In browser DevTools (F12) → Sources → styles/main.css
- Copy the entire CSS content

#### **3. public/scripts/selly-api.js**
- In browser DevTools (F12) → Sources → scripts/selly-api.js
- Copy the entire JavaScript content

#### **4. public/scripts/product-picker.js**
- In browser DevTools (F12) → Sources → scripts/product-picker.js
- Copy the entire JavaScript content

#### **5. public/scripts/calculator.js**
- In browser DevTools (F12) → Sources → scripts/calculator.js
- Copy the entire JavaScript content

#### **6. public/scripts/app.js**
- In browser DevTools (F12) → Sources → scripts/app.js
- Copy the entire JavaScript content

#### **7. public/package.json**
```json
{
  "name": "kalkulator-listew-refactored",
  "version": "1.0.0",
  "description": "Refactored calculator for window frames and corners with Selly.pl API integration",
  "main": "index.html",
  "scripts": {
    "start": "python3 -m http.server 3000 2>/dev/null || python -m http.server 3000 2>/dev/null || node -e \"const http=require('http'),fs=require('fs'),path=require('path');http.createServer((req,res)=>{const file=path.join(__dirname,req.url==='/'?'/index.html':req.url);fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('404');return;}const ext=path.extname(file);const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json'};res.writeHead(200,{'Content-Type':types[ext]||'text/plain'});res.end(data);});}).listen(3000,()=>console.log('Server running on http://localhost:3000'))\"",
    "build": "echo 'Static files ready for deployment'",
    "dev": "npm start"
  },
  "keywords": ["calculator", "windows", "frames", "selly", "api", "construction"],
  "author": "Kalkulator Listew",
  "license": "MIT"
}
```

#### **8. public/README.md**
- Comprehensive documentation (see live app or copy from instructions)

## 🎯 **Method 2: Download via Browser**

1. **Visit**: https://sb-1v4jehinsad7.vercel.run
2. **Open DevTools** (F12)
3. **Go to Sources tab**
4. **Navigate to each file** and copy content
5. **Create the same file structure** in your repository

## 🎯 **Method 3: Use Git Bundle (Advanced)**

If you have access to the file system where this sandbox runs, there's a git bundle available:
- File: `refactored-calculator.bundle`
- Archive: `refactored-calculator-complete.tar.gz`

## 📁 **Required Directory Structure**

Create this structure in your GitHub repository:

```
your-repo/
├── public/                     # NEW - All refactored calculator files
│   ├── index.html             # Main application
│   ├── styles/
│   │   └── main.css          # All styles
│   ├── scripts/
│   │   ├── selly-api.js      # API integration
│   │   ├── product-picker.js  # Search component
│   │   ├── calculator.js     # Core logic
│   │   └── app.js           # Main application
│   ├── package.json         # Development server config
│   └── README.md            # Documentation
├── src/                       # EXISTING - Your Next.js files (keep as is)
├── package.json              # EXISTING - Your main package.json
└── (other existing files)     # EXISTING - Keep all existing files
```

## 🔧 **Git Commands to Run Locally**

Once you have the files in your local repository:

```bash
# Navigate to your local selly.pl repository
cd path/to/your/selly.pl

# Create a new branch for the refactor
git checkout -b blackboxai-refactor-selly-integration

# Add the new files
git add public/

# Commit the changes
git commit -m "feat: refactor calculator to modular architecture with Selly.pl API integration

- Split monolithic HTML into separate CSS/JS files  
- Added real Selly.pl REST API integration with fallback demo data
- Enhanced product picker with search, caching, and stock status
- Improved UI with modern styling and responsive design
- Added comprehensive error handling and accessibility features
- Maintained all existing calculation functionality
- Added proper documentation and setup instructions"

# Push to GitHub
git push -u origin blackboxai-refactor-selly-integration
```

## 🌐 **Testing the Application**

After copying the files:

1. **Local Testing**:
   ```bash
   cd public/
   npm start
   # Visit http://localhost:3000
   ```

2. **Live Testing**: https://sb-1v4jehinsad7.vercel.run

3. **API Testing**:
   - Enter your Selly.pl API key when prompted
   - Or use demo mode (leave empty)
   - Test product search functionality

## ✅ **Verification Checklist**

- [ ] All files copied to `public/` directory
- [ ] File structure matches the requirements
- [ ] Local testing works (`npm start` in public folder)
- [ ] Product picker shows search results
- [ ] All calculations work correctly
- [ ] CSV export functions
- [ ] JSON save/load works
- [ ] Print functionality intact

## 🚨 **Important Notes**

1. **Don't overwrite existing files** - The refactored files are in the `public/` directory
2. **Keep your existing Next.js structure** - This is additional functionality
3. **API Key Required** - Get your Selly.pl API key for full functionality
4. **Demo Mode Available** - Works without API key for testing

## 📞 **If You Need Help**

The refactored calculator is fully functional at the live demo URL. You can:
- Test all functionality there
- Copy the working code from the browser
- Use the demo mode to see how the Selly.pl integration works

---

**✨ The refactored calculator includes all original features plus powerful Selly.pl product search integration!**