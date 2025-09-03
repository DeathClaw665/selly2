# 🔧 Konfiguracja API Selly.pl

## 🎯 Kroki konfiguracji dla Twojego sklepu

### 1. 🔑 Uzyskanie dostępu do API

1. **Zaloguj się** do panelu administracyjnego swojego sklepu Selly.pl:
   ```
   https://twoj-sklep.selly24.pl/adm
   ```

2. **Przejdź do sekcji API**:
   ```
   Konfiguracja → API
   ```

3. **Utwórz nowy dostęp API**:
   - Kliknij "Dodaj nowy dostęp"
   - Wybierz uprawnienia `WRITE`
   - Zapisz `Client ID` i `Client Secret`

### 2. 🏪 Wprowadzenie danych w kalkulatorze

1. **Otwórz kalkulator** i kliknij przycisk **"🔑 Konfiguracja Selly.pl"**

2. **Wprowadź dane**:
   - **Domena**: `twoj-sklep.selly24.pl` (twoja pełna domena)
   - **Client ID**: Skopiuj z panelu API
   - **Client Secret**: Skopiuj z panelu API

3. **Test połączenia**:
   - Kliknij **"🧪 Test API"**
   - Sprawdź czy wszystko działa poprawnie

## 📋 Przykład konfiguracji

```javascript
// Przykład dla sklepu "adam.selly24.pl"
Domena: adam.selly24.pl
Client ID: abc123def456
Client Secret: secret789xyz
```

## 🔍 Funkcjonalność wyszukiwania

### **Wyszukiwanie produktów**:
- **Minimum 4 znaki** dla prawdziwego API (zgodnie z dokumentacją)
- **Minimum 2 znaki** dla trybu demo
- **Filtrowanie kategorii**: automatyczne dla listwy/gzymsy
- **Parametry API**: `product_name=%nazwa%&enable=1&limit=10`

### **Przykłady wyszukiwania**:
- `"listwa"` → znajdzie wszystkie listwy
- `"gzyms dolny"` → znajdzie gzymsy dolne
- `"200cm"` → znajdzie produkty o długości 200cm
- `"MDF biała"` → znajdzie białe listwy MDF

## 🛠 API Endpoints używane

### **Autoryzacja (OAuth2)**:
```http
POST /api/auth/access_token
Content-Type: application/json

{
  "grant_type": "client_credentials",
  "scope": "WRITE", 
  "client_id": "twoj_client_id",
  "client_secret": "twoj_client_secret"
}
```

### **Wyszukiwanie produktów**:
```http
GET /api/products?product_name=%nazwa%&enable=1&limit=10&page=1
Authorization: Bearer access_token
```

## 🎭 Tryb Demo

**Bez konfiguracji API** aplikacja działa z przykładowymi produktami:
- 4 rodzaje listew (MDF, dąb, sosna, wenge)
- 4 rodzaje gzymsów (klasyczny, nowoczesny, barokowy, LED)
- Wszystkie funkcje kalkulatora działają normalnie

## ❌ Rozwiązywanie problemów

### **Błąd HTTP 400 przy autoryzacji**:
- Sprawdź poprawność `Client ID` i `Client Secret`
- Upewnij się że domena jest pełna (z `.selly24.pl`)
- Sprawdź czy API jest włączone w panelu

### **Brak wyników wyszukiwania**:
- Minimum 4 znaki dla prawdziwego API
- Sprawdź czy produkty są **widoczne** (`enable=1`)
- Sprawdź kategorię produktów w sklepie

### **Błąd 401 Unauthorized**:
- Token wygasł → automatyczne odświeżenie
- Nieprawidłowe uprawnienia → sprawdź scope `WRITE`

## 🧪 Testowanie

**Kliknij "🧪 Test API"** aby sprawdzić:
- ✅ Poprawność autoryzacji
- ✅ Wyszukiwanie listew  
- ✅ Wyszukiwanie gzymsów
- ✅ Format odpowiedzi API

## 📊 Format danych produktu

```json
{
  "product_id": 123,
  "name": "Listwa ozdobna MDF biała 200cm",
  "price": 49.99,
  "quantity": "25",
  "overall_dimensions": 200,
  "category_id": 10,
  "product_code": "L-MDF-200-W",
  "content_html_short": "Opis produktu...",
  "main_photo": "foto.jpg",
  "photo_dir": "products/listwy"
}
```

---

**💡 Więcej informacji**: https://demo.e-store.pl/api/documentation