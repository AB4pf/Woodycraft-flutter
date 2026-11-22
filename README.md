# Woodycraft Admin App (Flutter + Node.js)

A mobile admin app for the Woodycraft wooden-crafts store. Store staff log in, then view, add, edit, and delete products and check which items have the highest and lowest stock.

The Flutter app talks to a Node.js/Express REST API backed by MySQL (the same database as the store's Laravel website).

<!-- Add 2–3 screenshots here: login, product list, stock page -->

## Security

| Area | How it works |
| --- | --- |
| Passwords | Checked against **bcrypt** hashes in the `users` table; never stored or logged in plain text |
| Sessions | `/login` returns a **JWT** that expires after 1 hour |
| Protected API | Every `/products` route requires `Authorization: Bearer <token>`; missing or expired tokens get `401` and the app returns to the login screen |
| Login errors | Same message for a wrong email or a wrong password, so accounts can't be guessed |
| Config | Database credentials and the JWT secret live in `.env`, which is git-ignored |
| SQL | All queries use parameters (`?`) to prevent SQL injection |
| Input | IDs, names, prices, and quantities are validated before hitting the database |

## Tech stack

| Layer | Technology |
| --- | --- |
| Mobile app | Flutter (Dart), `http` package |
| API | Node.js, Express, bcryptjs, jsonwebtoken, dotenv |
| Database | MySQL (`woodycraftv2`) |

## API

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/login` | No | Returns a JWT |
| GET | `/products` | Yes | List all products |
| GET | `/products/stocks/haut` | Yes | Highest-stock products |
| GET | `/products/stocks/bas` | Yes | Lowest-stock products |
| POST | `/products/create` | Yes | Add a product |
| PUT | `/products/modifier/:id` | Yes | Update name and price |
| DELETE | `/products/delete/:id` | Yes | Delete a product |

## Run it

**1. Database:** import the SQL files in `woodycraftv2/` into a MySQL database named `woodycraftv2`.

**2. API:**
```bash
npm install
cp .env.example .env      # then set DB_PASSWORD and a long random JWT_SECRET
npm start
```

**3. App:** start an Android emulator, then:
```bash
flutter pub get
flutter run
```
The app calls the API at `http://10.0.2.2:3000` (the emulator's address for your computer). Change `baseUrl` in `lib/Services/auth.dart` for a real device.

## What I'd improve next

- Store the token in secure storage so users stay logged in between launches
- Add role checks so only admins can delete products
- Rate-limit `/login` to slow down password guessing
