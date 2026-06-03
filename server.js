require('dotenv').config();
const express = require('express');
const connectDB = require('./src/config/db');

const app = express();
app.use(express.json());

const authRoutes = require('./src/routes/authRoutes');
const locationRoutes = require('./src/routes/locationRoutes');
const spaceRoutes = require('./src/routes/spaceRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const guestPassRoutes = require('./src/routes/guestPassRoutes');
const billingRoutes = require('./src/routes/billingRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/spaces', spaceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/guest-passes', guestPassRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/reviews', reviewRoutes);

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deskflow API</title>
    <style>
        :root {
            --bg-color: #0f172a;
            --card-bg: #1e293b;
            --text-main: #e2e8f0;
            --text-muted: #94a3b8;
            --border-color: #334155;
            --accent: #3b82f6;
            --get-color: #10b981;
            --post-color: #f59e0b;
            --put-color: #3b82f6;
            --delete-color: #ef4444;
            --font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: var(--font-family);
            background-color: var(--bg-color);
            color: var(--text-main);
            line-height: 1.6;
            padding: 2rem;
            max-width: 1200px;
            margin: 0 auto;
        }
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 3rem;
            padding-bottom: 2rem;
            border-bottom: 1px solid var(--border-color);
        }
        .logo-area { display: flex; align-items: center; gap: 1rem; }
        h1 { font-size: 2.5rem; font-weight: 700; letter-spacing: -0.025em; }
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 0.375rem;
            background: rgba(16, 185, 129, 0.1);
            color: var(--get-color);
            padding: 0.375rem 0.875rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 600;
            border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .badge::before {
            content: '';
            width: 8px;
            height: 8px;
            background-color: var(--get-color);
            border-radius: 50%;
            box-shadow: 0 0 8px var(--get-color);
        }
        .base-url {
            background-color: var(--card-bg);
            padding: 1.25rem;
            border-radius: 0.75rem;
            border: 1px solid var(--border-color);
            font-family: monospace;
            font-size: 1.1rem;
            margin-bottom: 3rem;
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .base-url-label { color: var(--text-muted); font-family: var(--font-family); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 1.5rem;
        }
        .category {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 1rem;
            overflow: hidden;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .category:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }
        .category-header {
            background-color: rgba(0,0,0,0.2);
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--border-color);
            font-weight: 600;
            font-size: 1.2rem;
            text-transform: capitalize;
        }
        .endpoint-list {
            list-style: none;
            padding: 0;
        }
        .endpoint-item {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .endpoint-item:last-child { border-bottom: none; }
        .method {
            font-size: 0.8rem;
            font-weight: 700;
            padding: 0.25rem 0.6rem;
            border-radius: 0.375rem;
            min-width: 4.5rem;
            text-align: center;
            font-family: monospace;
        }
        .method.get { background-color: rgba(16, 185, 129, 0.1); color: var(--get-color); }
        .method.post { background-color: rgba(245, 158, 11, 0.1); color: var(--post-color); }
        .method.put { background-color: rgba(59, 130, 246, 0.1); color: var(--put-color); }
        .method.delete { background-color: rgba(239, 68, 68, 0.1); color: var(--delete-color); }
        .path {
            font-family: monospace;
            color: var(--text-main);
            font-size: 0.95rem;
        }
        @media (max-width: 768px) {
            header { flex-direction: column; align-items: flex-start; gap: 1rem; }
            .grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <header>
        <div class="logo-area">
            <h1>Deskflow API</h1>
        </div>
        <div class="badge">Live</div>
    </header>

    <div class="base-url">
        <span class="base-url-label">Base URL</span>
        <span>https://deskflow.kreatenvibe.com/api</span>
    </div>

    <div class="grid">
        <!-- Auth -->
        <div class="category">
            <div class="category-header">Authentication</div>
            <ul class="endpoint-list">
                <li class="endpoint-item"><span class="method post">POST</span><span class="path">/api/auth/register</span></li>
                <li class="endpoint-item"><span class="method post">POST</span><span class="path">/api/auth/register/admin</span></li>
                <li class="endpoint-item"><span class="method post">POST</span><span class="path">/api/auth/register/location-manager</span></li>
                <li class="endpoint-item"><span class="method post">POST</span><span class="path">/api/auth/register/guest</span></li>
                <li class="endpoint-item"><span class="method post">POST</span><span class="path">/api/auth/login</span></li>
            </ul>
        </div>
        
        <!-- Locations -->
        <div class="category">
            <div class="category-header">Locations</div>
            <ul class="endpoint-list">
                <li class="endpoint-item"><span class="method get">GET</span><span class="path">/api/locations</span></li>
                <li class="endpoint-item"><span class="method get">GET</span><span class="path">/api/locations/:id</span></li>
                <li class="endpoint-item"><span class="method post">POST</span><span class="path">/api/locations</span></li>
                <li class="endpoint-item"><span class="method put">PUT</span><span class="path">/api/locations/:id</span></li>
                <li class="endpoint-item"><span class="method put">PUT</span><span class="path">/api/locations/:id/assign-manager</span></li>
                <li class="endpoint-item"><span class="method delete">DELETE</span><span class="path">/api/locations/:id</span></li>
            </ul>
        </div>

        <!-- Spaces -->
        <div class="category">
            <div class="category-header">Spaces</div>
            <ul class="endpoint-list">
                <li class="endpoint-item"><span class="method get">GET</span><span class="path">/api/spaces</span></li>
                <li class="endpoint-item"><span class="method get">GET</span><span class="path">/api/spaces/availability</span></li>
                <li class="endpoint-item"><span class="method get">GET</span><span class="path">/api/spaces/:id</span></li>
                <li class="endpoint-item"><span class="method post">POST</span><span class="path">/api/spaces</span></li>
                <li class="endpoint-item"><span class="method put">PUT</span><span class="path">/api/spaces/:id</span></li>
                <li class="endpoint-item"><span class="method delete">DELETE</span><span class="path">/api/spaces/:id</span></li>
            </ul>
        </div>

        <!-- Bookings -->
        <div class="category">
            <div class="category-header">Bookings</div>
            <ul class="endpoint-list">
                <li class="endpoint-item"><span class="method get">GET</span><span class="path">/api/bookings/my</span></li>
                <li class="endpoint-item"><span class="method get">GET</span><span class="path">/api/bookings/all</span></li>
                <li class="endpoint-item"><span class="method get">GET</span><span class="path">/api/bookings/:id</span></li>
                <li class="endpoint-item"><span class="method post">POST</span><span class="path">/api/bookings</span></li>
                <li class="endpoint-item"><span class="method put">PUT</span><span class="path">/api/bookings/:id/cancel</span></li>
                <li class="endpoint-item"><span class="method put">PUT</span><span class="path">/api/bookings/:id/checkin</span></li>
                <li class="endpoint-item"><span class="method put">PUT</span><span class="path">/api/bookings/:id/checkout</span></li>
            </ul>
        </div>

        <!-- Guest Passes -->
        <div class="category">
            <div class="category-header">Guest Passes</div>
            <ul class="endpoint-list">
                <li class="endpoint-item"><span class="method get">GET</span><span class="path">/api/guest-passes/my</span></li>
                <li class="endpoint-item"><span class="method get">GET</span><span class="path">/api/guest-passes/:id</span></li>
                <li class="endpoint-item"><span class="method post">POST</span><span class="path">/api/guest-passes</span></li>
                <li class="endpoint-item"><span class="method put">PUT</span><span class="path">/api/guest-passes/:id/revoke</span></li>
            </ul>
        </div>

        <!-- Billing -->
        <div class="category">
            <div class="category-header">Billing</div>
            <ul class="endpoint-list">
                <li class="endpoint-item"><span class="method get">GET</span><span class="path">/api/billing/my</span></li>
                <li class="endpoint-item"><span class="method get">GET</span><span class="path">/api/billing/all</span></li>
                <li class="endpoint-item"><span class="method get">GET</span><span class="path">/api/billing/:id</span></li>
            </ul>
        </div>

        <!-- Reviews -->
        <div class="category">
            <div class="category-header">Reviews</div>
            <ul class="endpoint-list">
                <li class="endpoint-item"><span class="method get">GET</span><span class="path">/api/reviews/space/:spaceId</span></li>
                <li class="endpoint-item"><span class="method post">POST</span><span class="path">/api/reviews</span></li>
                <li class="endpoint-item"><span class="method delete">DELETE</span><span class="path">/api/reviews/:id</span></li>
            </ul>
        </div>
    </div>
</body>
</html>
  `);
});

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('DB connection failed:', err.message);
    process.exit(1);
  });
