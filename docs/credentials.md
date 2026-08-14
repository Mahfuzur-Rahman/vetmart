# VetMart Project Credentials & Configuration Reference

> [!IMPORTANT]
> Never commit actual passwords or API secrets to version control. Keep all credentials strictly inside `.env.local` or your Vercel project environment variables.

---

## 1. Database (Aiven PostgreSQL)

- **Managed Service**: Aiven PostgreSQL 17
- **Connection Format**:
```env
DATABASE_URL=postgres://<username>:<password>@<host>:<port>/defaultdb?sslmode=require
```

---

## 2. Storage (Cloudinary)

- **Service**: Cloudinary Media API
- **Configuration Keys**:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 3. Courier (Steadfast)

- **Service**: Steadfast Courier BD
- **Base URL**: `https://portal.packzy.com/api/v1`
- **Webhook Endpoint**: `/api/v1/webhook/steadfast`

---

## 4. Test Accounts (Seed Data)

These demo accounts are configured in the mock / seed database for testing:

### 👑 MasterAdmin
- **Email:** `master@vetmart.bd`
- **Role:** Super Admin

### 🛠️ Superadmin (DB-backed)
- **Email:** `superadmin@vetmart.bd`
- **Role:** Super Admin

### 📦 Admin (DB-backed)
- **Email:** `admin@vetmart.bd`
- **Role:** Inventory Manager

### 🛒 Demo Customer (DB-backed)
- **Phone:** `01711000000`
- **Tier:** Verified Vet (`isVerifiedVet: true`)
