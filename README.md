# Ledger System

A simple ledger system with a web UI for managing user balances and transactions.

## Features

- **Ranking Page**: View all users sorted by balance in descending order. Cards are dynamically sized based on balance (more money = bigger card).
- **Transaction Page**: Transfer money between users and the "Pot" user with a searchable dropdown.
- **User Registration Page**: Register multiple users at once with a fixed initial amount for all users.

## Setup

1. Install all dependencies:
```bash
npm run install-all
```

2. Start the development servers (backend and frontend):
```bash
npm run dev
```

Or start them separately:
```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

## Usage

1. **Register Users**: Go to the "User Registration" page and enter user names (one per line) and an initial amount that all users will receive.

2. **View Rankings**: The "Ranking" page shows all users sorted by balance. Cards are automatically sized based on the amount of money each user has.

3. **Make Transactions**: Use the "Transaction" page to transfer money between users. You can search for users in the dropdown menus. Transactions can be made from any user to "Pot" or from "Pot" to any user.

## Technology Stack

- **Frontend**: React, React Router, Vite, Axios
- **Backend**: Node.js, Express
- **Database**: SQLite

## API Endpoints

- `GET /api/users/ranking` - Get all users sorted by balance
- `GET /api/users` - Get all users
- `POST /api/users/register` - Register multiple users
- `POST /api/transactions` - Create a transaction
- `GET /api/transactions` - Get transaction history

