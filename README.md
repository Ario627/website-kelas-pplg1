# Class Website Backend PPLG 1

> [!WARNING]
> ⚠️ **Masih dalam pengembangan, fitur dapat berubah sewaktu-waktu dan beberapa fitur mungkin belum selesai dikembangkan! 
(still in development, subject to change at any time and some of the features listed are still in the development process)** ⚠️

Backend API untuk website kelas menggunakan **NestJS 11**, **TypeORM**, dan **PostgreSQL**. 

![NestJS](https://img.shields.io/badge/NestJS-11.1.11-red?style=flat-square&logo=nestjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=flat-square&logo=postgresql)

## ✨ Fitur

- 🔐 **Authentication** - JWT dengan approval system
- 📧 **Email Notifications** - Notifikasi registrasi & login ke admin
- 👤 **Admin Management** - Role-based access control
- 📢 **Announcements** - Pengumuman dengan prioritas & expiry
- 🖼️ **Gallery** - Galeri foto dengan kategori
- 🏫 **Class Structure** - Struktur kelas + Wali Kelas
- 💾 **Storage** - Upload & manage files
- 👥 **Members** - 36 anggota kelas
- 🚫 **IP Blocker** - Blokir IP tertentu
- 🛡️ **Rate Limiting** - Throttler untuk keamanan

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm atau yarn

### Installation

```bash
# Clone repository
git clone <repo-url>
cd class-website-backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env dengan konfigurasi kamu

# Buat folder uploads
mkdir -p uploads/gallery uploads/storage

# Jalankan development server
npm run start:dev
```

### Database Setup

```sql
-- Buat database di PostgreSQL
CREATE DATABASE class_website;
```

## ⚙️ Environment Variables

```env
# App
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=yourpassword
DB_DATABASE=class_website

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=7d

# Email (Gmail)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=youremail@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM="Website Kelas <youremail@gmail.com>"

# Admin
ADMIN_EMAIL=youremail@gmail.com
ADMIN_NAME=Admin

# Features
REQUIRE_ADMIN_APPROVAL=true
SEND_LOGIN_ALERTS=true
```

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register (pending approval) | - |
| POST | `/api/auth/login` | Login | - |
| GET | `/api/auth/me` | Get profile | User |
| GET | `/api/auth/pending` | List pending registrations | Admin |
| GET | `/api/auth/approve/: token` | Approve via link | - |
| POST | `/api/auth/approve/: token` | Approve via API | Admin |
| POST | `/api/auth/reject/:token` | Reject registration | Admin |

### Users
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users` | Get all users | Admin |
| GET | `/api/users/:id` | Get user | User |
| PATCH | `/api/users/:id` | Update user | Admin |
| DELETE | `/api/users/:id` | Delete user | Admin |

### Announcements
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/announcements` | Get active | - |
| GET | `/api/announcements/all` | Get all | Admin |
| POST | `/api/announcements` | Create | Admin |
| PATCH | `/api/announcements/:id` | Update | Admin |
| DELETE | `/api/announcements/:id` | Delete | Admin |

### Gallery
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/gallery` | Get all | - |
| GET | `/api/gallery/categories` | Get categories | - |
| POST | `/api/gallery` | Upload image | Admin |
| DELETE | `/api/gallery/:id` | Delete | Admin |

### Class Structure
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/class-structure` | Get full structure | - |
| PATCH | `/api/class-structure/info` | Update info | Admin |
| POST | `/api/class-structure/positions` | Add position | Admin |
| DELETE | `/api/class-structure/positions/: id` | Remove position | Admin |

### Members
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/members` | Get active members | - |
| GET | `/api/members/stats` | Get statistics | - |
| POST | `/api/members` | Add member | Admin |
| PATCH | `/api/members/:id` | Update member | Admin |
| DELETE | `/api/members/:id` | Delete member | Admin |

### Storage
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/storage` | Get all files | User |
| GET | `/api/storage/public` | Get public files | - |
| GET | `/api/storage/:id/download` | Download file | - |
| POST | `/api/storage` | Upload file | Admin |
| DELETE | `/api/storage/:id` | Delete file | Admin |

### IP Blocker
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/ip-blocker` | Get all blocked IPs | Admin |
| GET | `/api/ip-blocker/active` | Get active blocks | Admin |
| POST | `/api/ip-blocker` | Block IP | Admin |
| POST | `/api/ip-blocker/:id/unblock` | Unblock IP | Admin |
| DELETE | `/api/ip-blocker/:id` | Delete record | Admin |

## 🔑 Default Admin

```
Email: admin@kelaskita. com
Password: Admin123! 
```

⚠️ **GANTI PASSWORD SETELAH LOGIN PERTAMA!**

## 📂 Project Structure (development)

```
src/
├── main.ts
├── app.module.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts
│   └── dto/
├── users/
├── announcements/
├── gallery/
├── class-structure/
├── storage/
├── members/
├── ip-blocker/
├── mail/
│   ├── mail.module.ts
│   └── mail.service.ts
├── common/
│   ├── guards/
│   ├── decorators/
│   ├── filters/
│   ├── interceptors/
│   └── dto/
└── database/
    └── seeders/
```

## 🛡️ Security Features

- ✅ JWT Authentication
- ✅ Password hashing (bcrypt 6.x, 12 rounds)
- ✅ Role-based access control (RBAC)
- ✅ Rate limiting (Throttler v6)
- ✅ IP blocking system
- ✅ Input validation (class-validator)
- ✅ CORS configured
- ✅ Registration approval system
- ✅ Login alerts via email

## 📧 Gmail Setup

1. Aktifkan **2-Step Verification** di Google Account
2. Buat **App Password**: 
   - Buka https://myaccount.google.com/apppasswords
   - Pilih "Mail" dan device "Other"
   - Copy 16-character password
   - Paste ke `MAIL_PASSWORD` di `.env`

## 🔧 Scripts

```bash
npm run start:dev    # Development with hot reload
npm run start:prod   # Production
npm run build        # Build for production
npm run lint         # Lint code
npm run test         # Run tests
```

## 📜 License

MIT © 2026 Kelas Kita
