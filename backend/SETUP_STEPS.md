# 🔥 Firebase Server-Side Credentials - Step by Step

Your Firebase Project: **admin-panel-430b8**

## 📋 Step 1: Go to Firebase Console

1. Open this link in your browser:
   ```
   https://console.firebase.google.com/project/admin-panel-430b8/settings/serviceaccounts/adminsdk
   ```

   OR

2. Go to: https://console.firebase.google.com/
3. Click on your project: **admin-panel-430b8**

---

## 🔧 Step 2: Navigate to Service Accounts

1. Click the **⚙️ Gear Icon** (top-left corner)
2. Click **"Project Settings"**
3. Click the **"Service Accounts"** tab at the top

---

## 🔑 Step 3: Generate Private Key

1. You will see: **"Firebase Admin SDK"** section
2. Click the big button: **"Generate New Private Key"**
3. A popup will appear asking for confirmation
4. Click **"Generate Key"** button
5. A JSON file will download automatically
   - File name: `admin-panel-430b8-firebase-adminsdk-xxxxx.json`
6. **Save this file in a safe place!** (Desktop, Downloads folder, etc.)

⚠️ **Security Warning:** Never share this file or commit it to Git!

---

## 📄 Step 4: Open the Downloaded JSON File

1. Find the downloaded JSON file
2. Open it with Notepad or any text editor
3. You'll see something like this:

```json
{
  "type": "service_account",
  "project_id": "admin-panel-430b8",
  "private_key_id": "abc123def456...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@admin-panel-430b8.iam.gserviceaccount.com",
  "client_id": "1234567890",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

---

## ✏️ Step 5: Create .env File in Backend Folder

### Option A: Using Command Prompt

1. Open Command Prompt in backend folder:
   ```cmd
   cd d:\product-admin\backend
   ```

2. Create .env file:
   ```cmd
   notepad .env
   ```

3. When Notepad asks "File doesn't exist, create new?", click **Yes**

### Option B: Using VS Code

1. In VS Code, right-click on `backend` folder
2. Click **"New File"**
3. Name it: `.env`

---

## 📝 Step 6: Copy This Template to .env File

Copy this EXACT text and paste into your `.env` file:

```env
PORT=5000
NODE_ENV=development

# Firebase Configuration
FIREBASE_PROJECT_ID=admin-panel-430b8
FIREBASE_CLIENT_EMAIL=paste-your-client-email-here
FIREBASE_PRIVATE_KEY="paste-your-private-key-here"

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

---

## 🔄 Step 7: Replace with Your Credentials

From your downloaded JSON file, copy these 3 values:

### 1. FIREBASE_CLIENT_EMAIL
- Find: `"client_email": "firebase-adminsdk-xxxxx@admin-panel-430b8.iam.gserviceaccount.com"`
- Copy the email part
- Replace `paste-your-client-email-here`

**Example:**
```env
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-h7k2j@admin-panel-430b8.iam.gserviceaccount.com
```

### 2. FIREBASE_PRIVATE_KEY
- Find: `"private_key": "-----BEGIN PRIVATE KEY-----\nMIIE..."`
- Copy the ENTIRE private key (including BEGIN and END lines)
- Replace `paste-your-private-key-here`
- **IMPORTANT:** Keep it in quotes and keep all `\n` characters!

**Example:**
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7W...\n-----END PRIVATE KEY-----\n"
```

### Final .env should look like:

```env
PORT=5000
NODE_ENV=development

FIREBASE_PROJECT_ID=admin-panel-430b8
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-h7k2j@admin-panel-430b8.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7W2h...\n-----END PRIVATE KEY-----\n"

FRONTEND_URL=http://localhost:3000
```

---

## 💾 Step 8: Save the .env File

1. Press `Ctrl + S` to save
2. Close the file

---

## ✅ Step 9: Enable Firestore Database

1. In Firebase Console, click **"Firestore Database"** from left menu
2. Click **"Create Database"**
3. Select **"Start in test mode"**
4. Choose location: **asia-south1 (Mumbai)** or closest to you
5. Click **"Enable"**

Wait 1-2 minutes for setup to complete.

---

## 🎉 Done! Now Run the Backend

1. Open terminal in backend folder:
   ```cmd
   cd d:\product-admin\backend
   ```

2. Install dependencies (first time only):
   ```cmd
   npm install
   ```

3. Start the server:
   ```cmd
   npm run dev
   ```

You should see:
```
🚀 Server is running on port 5000
📊 Environment: development
🔥 Firebase connected to project: admin-panel-430b8
✅ Firebase initialized successfully
```

---

## 🐛 If You See Errors

**Error: "FIREBASE_PRIVATE_KEY is not defined"**
- Check that .env file is in the `backend` folder
- Check that you saved the file

**Error: "Invalid private key"**
- Make sure you copied the ENTIRE private key
- Keep the `\n` characters
- Keep it in quotes

**Error: "Port 5000 is already in use"**
- Change PORT=5000 to PORT=5001 in .env
- Or kill the process using port 5000

---

## 📞 Need Help?

If stuck, send me:
1. Screenshot of Firebase Console (Service Accounts page)
2. First line of your .env file (don't send the private key!)
3. Error message you're seeing
