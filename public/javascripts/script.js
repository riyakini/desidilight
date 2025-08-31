const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

// Serve static files from public
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS as the template engine
app.set('view engine', 'ejs');

// Render the homepage
app.get('/', (req, res) => {
    res.render('index');
});

// Dummy driver data
let drivers = [
    { id: 1, lat: 19.296864, lng: 73.067733 },
    { id: 2, lat: 19.298864, lng: 73.070733 },
    { id: 3, lat: 19.290864, lng: 73.060733 }
];

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('a user connected');

    // Send driver locations periodically
    setInterval(() => {
        socket.emit('driver-locations', drivers);
    }, 5000);

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

// Start the server
const port = process.env.PORT || 3000;
http.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
