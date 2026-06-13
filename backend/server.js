const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Parse requests with JSON and urlencoded payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve assets directory under /assets
app.use('/assets', express.static(path.join(__dirname, '../assets')));



// Serve frontend directory at the root /
app.use(express.static(path.join(__dirname, '../frontend')));

// Handle password reset route explicitly
app.get('/reset-password', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/recover/recover.html'));
});

// Handle 404/Fallback (SPA routing support)
app.get('*splat', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start listening for connections
app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(` BMC Venue Booking Server running on port ${PORT}`);
    console.log(` App is live at: http://localhost:${PORT}`);
    console.log(`==================================================`);
});
