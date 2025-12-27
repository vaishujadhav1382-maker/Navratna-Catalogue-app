# 🚀 Backend Setup - Simple Steps (Hindi/English)

## चरण 1: Firebase Console खोलें

**Direct Link:** 
```
https://console.firebase.google.com/project/admin-panel-430b8/settings/serviceaccounts/adminsdk
```

1. ऊपर का link browser में खोलें
2. अगर login नहीं हैं तो Google account से login करें

---

## चरण 2: Service Account Key Download करें

Firebase Console में:

1. **"Generate New Private Key"** button पर क्लिक करें (बड़ा blue button)
2. Popup में **"Generate Key"** पर क्लिक करें
3. एक JSON file download होगी (जैसे: `admin-panel-430b8-firebase-adminsdk-xxxxx.json`)
4. इस file को save करें (Desktop या Downloads में)

⚠️ **Important:** यह file किसी को मत भेजना! Secret credentials हैं।

---

## चरण 3: JSON File खोलें

1. Download की हुई JSON file को Notepad में खोलें
2. आपको कुछ ऐसा दिखेगा:

```json
{
  "project_id": "admin-panel-430b8",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "firebase-adminsdk-xxxxx@admin-panel-430b8.iam.gserviceaccount.com"
}
```

---

## चरण 4: .env File बनाएं

### आसान तरीका:

1. **Command Prompt** खोलें:
   ```cmd
   cd d:\product-admin\backend
   copy .env.template .env
   notepad .env
   ```

2. या **VS Code** में:
   - `backend` folder में right-click करें
   - **"New File"** → नाम रखें: `.env`

---

## चरण 5: .env File में Credentials Copy करें

### JSON file से ये 2 चीजें copy करनी हैं:

**1. client_email:**
- JSON में `"client_email"` ढूंढें
- पूरा email copy करें
- `.env` में `FIREBASE_CLIENT_EMAIL` के बाद paste करें

**Example:**
```env
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-h7k2j@admin-panel-430b8.iam.gserviceaccount.com
```

**2. private_key:**
- JSON में `"private_key"` ढूंढें
- `-----BEGIN` से लेकर `-----END` तक पूरा copy करें (सब `\n` के साथ)
- `.env` में `FIREBASE_PRIVATE_KEY` के quotes में paste करें

**Example:**
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhki...(बहुत लंबा)...END PRIVATE KEY-----\n"
```

### पूरी .env file ऐसी दिखनी चाहिए:

```env
PORT=5000
NODE_ENV=development

FIREBASE_PROJECT_ID=admin-panel-430b8
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-h7k2j@admin-panel-430b8.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQI...\n-----END PRIVATE KEY-----\n"

FRONTEND_URL=http://localhost:3000
```

---

## चरण 6: Firestore Enable करें

1. Firebase Console में **"Firestore Database"** पर क्लिक करें (left menu)
2. **"Create Database"** button पर क्लिक करें
3. **"Start in test mode"** select करें
4. Location: **asia-south1 (Mumbai)** चुनें
5. **"Enable"** पर क्लिक करें

1-2 मिनट wait करें।

---

## चरण 7: Backend Install और Run करें

**Command Prompt** खोलें और ये commands चलाएं:

```cmd
cd d:\product-admin\backend

npm install

npm run dev
```

### अगर सब सही है तो दिखेगा:

```
🚀 Server is running on port 5000
📊 Environment: development
🔥 Firebase connected to project: admin-panel-430b8
✅ Firebase initialized successfully
```

---

## ✅ Success! Backend चल रहा है!

अब आप:
1. **Backend terminal** को open रहने दें
2. **नया terminal** खोलें frontend के लिए:
   ```cmd
   cd d:\product-admin
   npm start
   ```

---

## 🐛 अगर Error आए तो:

**"Cannot find module":**
```cmd
cd d:\product-admin\backend
npm install
```

**"Port 5000 already in use":**
```cmd
# .env में PORT बदलें: PORT=5001
```

**"Firebase initialization error":**
- .env file check करें कि सही जगह है (backend folder में)
- Private key पूरी copy की है या नहीं check करें
- Quotes और \n characters ठीक से हैं check करें

---

## 🎯 Quick Test

Backend test करने के लिए browser में खोलें:
```
http://localhost:5000/api/health
```

दिखना चाहिए:
```json
{"status":"ok","message":"Product Admin Backend is running"}
```

---

## 📞 Help चाहिए?

मुझे बताएं:
1. कौनसे step पर अटके हैं?
2. क्या error आ रहा है?
3. Screenshot भेज सकते हैं (private key मत भेजना!)
