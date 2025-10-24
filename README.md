# Tradeify-Style Trading Journal

A full-stack trading journal inspired by Tradeify. The application includes a Node.js/Express backend with a MySQL database and a static frontend built with HTML, Bootstrap 5, Chart.js, and FullCalendar.

## Features

- JWT authentication with registration and login pages
- Dashboard with P&L chart, performance metrics, streak widgets, and calendar
- Trade journal for adding and deleting trades
- CSV import workflow for bulk uploads
- Reports page with additional visualizations
- Automatic database schema creation with demo data on first run

## Quick Start

1. **Setup MySQL**
   Ensure you have a local MySQL server running and a user that matches the default credentials (or create an `.env` file in `backend/`).

   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=asd123
   DB_NAME=trading_journal
   PORT=5000
   JWT_SECRET=supersecret
   ```

2. **Install backend dependencies and start the API**

   ```bash
   cd backend
   npm install
   npm start
   ```

   The API will create the database and seed demo data automatically on first launch.

3. **Open the frontend**

   Use your browser to open `frontend/index.html` to login or register. After authenticating, navigate to `dashboard.html` for the analytics view.

4. **Demo credentials**

   After the first run, the following credentials are available:

   - Username: `demo_trader`
   - Password: `password123`

## CSV Format

The import page expects a CSV file with headers similar to:

```csv
symbol,trade_type,entry,exit,result,close_date,strategy,notes
AAPL,buy,170.25,175.10,250.00,2024-07-01,Breakout,"Earnings breakout"
```

## Project Structure

```
backend/
  server.js
  config/db.js
  controllers/
  middleware/
  models/
  routes/
frontend/
  *.html
  css/style.css
  js/
  assets/
```

## Development Notes

- The backend uses ES modules. Nodemon is available via `npm run dev`.
- JWT tokens are stored in `localStorage`. The frontend checks for a token before loading protected views.
- Trade data powers all charts and tables, so the dashboard updates automatically as new trades are added or imported.

## License

This project is provided for educational purposes.
