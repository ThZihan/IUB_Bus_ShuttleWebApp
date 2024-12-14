// index.js
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const cors = require('cors');
<<<<<<< Updated upstream
=======
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session); // Import the session store
const path = require('path');
>>>>>>> Stashed changes

const app = express();
const port = 3000;

// Enable CORS
app.use(cors());

// Parse JSON requests
app.use(bodyParser.json());

// MySQL connection
const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password123',
    database: 'iub_smart_shuttle_db'
});

// Connect to the database
conn.connect(function(err) {
    if (err) {
        throw err;
    }
    console.log('Connected to the database!');
});

<<<<<<< Updated upstream
=======
// Configure session store
const sessionStore = new MySQLStore({}, conn);

// Configure session middleware
app.use(session({
    key: 'iub_bus_cookie',
    secret: 'fabbersxbus', // Replace with a strong secret
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60, // 1 hr
        httpOnly: true,
        secure: false, // Set to true if using HTTPS
        sameSite: 'lax' // Helps protect against CSRF
    }
}));


// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

>>>>>>> Stashed changes
// POST route for creating a new account
app.post('/register', (req, res) => {
    const { user_id, full_name, iub_email, password, designation, phone_number } = req.body;

    // Validate the incoming data
    if (!user_id || !full_name || !iub_email || !password || !designation || !phone_number) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if the user_id already exists
    const checkQuery = 'SELECT * FROM user_accounts WHERE user_id = ?';
    conn.query(checkQuery, [user_id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to check for existing user' });
        }

        if (result.length > 0) {
            // If user already exists
            return res.status(400).json({ error: 'User ID already exists' });
        }

        // Hash the password before storing it
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to hash password' });
            }

            // Insert the new user into the database
            const query = 'INSERT INTO user_accounts (user_id, full_name, iub_email, password, designation, phone_number) VALUES (?, ?, ?, ?, ?, ?)';
            conn.query(query, [user_id, full_name, iub_email, hashedPassword, designation, phone_number], (err, result) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to insert user into the database' });
                }

                res.status(201).json({ message: 'User created successfully!' });
            });
        });
    });
});

// POST route for logging in
app.post('/login', (req, res) => {
    const { user_id, password } = req.body;

    // Validate the incoming data
    if (!user_id || !password) {
        return res.status(400).json({ error: 'User ID and Password are required' });
    }

    // Check if the user exists in the database
    const query = 'SELECT * FROM user_accounts WHERE user_id = ?';
    conn.query(query, [user_id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Database query error' });
        }

        if (result.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Compare the password with the hashed password stored in the database
        bcrypt.compare(password, result[0].password, (err, isMatch) => {
            if (err) {
                return res.status(500).json({ error: 'Error comparing password' });
            }

            if (isMatch) {
<<<<<<< Updated upstream
                // If the password matches, return success message
=======
                // If the password matches, create a session
                req.session.user = {
                    user_id: user.user_id,
                    iub_email:user.iub_email,
                    full_name: user.full_name,
                    designation: user.designation,
                    phone_number: user.phone_number,
                    account_status: user.account_status,
                    profile_picture: user.profile_picture,
                    gender: user.gender,
                };
>>>>>>> Stashed changes
                res.status(200).json({ message: 'Login successful' });
            } else {
                // If the password doesn't match, return error
                res.status(401).json({ error: 'Invalid credentials' });
            }
        });
    });
});

<<<<<<< Updated upstream
=======
// POST route for logging out
app.post('/logout', (req, res) => {
    if (req.session.user) {
        req.session.destroy(err => {
            if (err) {
                return res.status(500).json({ error: 'Failed to log out' });
            }
            res.clearCookie('session_cookie_name');
            res.status(200).json({ message: 'Logout successful' });
        });
    } else {
        res.status(400).json({ error: 'No active session' });
    }
});

// **New Route: GET /user**
app.get('/user', (req, res) => {
    if (req.session.user) {
        res.status(200).json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
});

// **New Route: POST /update-profile**
app.post('/update-profile', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { full_name, iub_email, phone_number, designation, gender, pickup_location, drop_location } = req.body;

    // Validate incoming data (basic validation)
    if (!full_name || !iub_email || !phone_number || !designation) {
        return res.status(400).json({ error: 'Full name, Email, Phone number, and Designation are required' });
    }

    // Update the user in the database
    const updateQuery = `
        UPDATE user_accounts 
        SET full_name = ?, iub_email = ?, phone_number = ?, designation = ?, gender = ?
        WHERE user_id = ?
    `;
    conn.query(updateQuery, [full_name, iub_email, phone_number, designation, gender, req.session.user.user_id], (err, result) => {
        if (err) {
            console.error('Error updating profile:', err);
            return res.status(500).json({ error: 'Failed to update profile' });
        }

        // Optionally, update the session data
        req.session.user.full_name = full_name;
        req.session.user.iub_email = iub_email;
        req.session.user.phone_number = phone_number;
        req.session.user.designation = designation;
        req.session.user.gender = gender;
        // Assuming 'rfID_code' is related to drop_location; adjust as needed

        res.status(200).json({ message: 'Profile updated successfully', user: req.session.user });
    });
});

// POST route for updating profile picture via URL
app.post('/update-profile-picture-url', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { profile_picture } = req.body;

    // Validate the incoming URL
    if (!profile_picture) {
        return res.status(400).json({ error: 'Profile picture URL is required' });
    }

    // Simple URL validation (server-side)
    const urlPattern = /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|svg))$/i;
    if (!urlPattern.test(profile_picture)) {
        return res.status(400).json({ error: 'Please provide a valid image URL (png, jpg, jpeg, gif, svg).' });
    }

    // Update the user's profile_picture in the database
    const updateQuery = `
        UPDATE user_accounts 
        SET profile_picture = ? 
        WHERE user_id = ?
    `;
    conn.query(updateQuery, [profile_picture, req.session.user.user_id], (err, result) => {
        if (err) {
            console.error('Error updating profile picture:', err);
            return res.status(500).json({ error: 'Failed to update profile picture' });
        }

        // Update the session data
        req.session.user.profile_picture = profile_picture;

        res.status(200).json({ message: 'Profile picture updated successfully', profile_picture_url: profile_picture });
    });
});

>>>>>>> Stashed changes
// Sample route to check server
app.get('/', (req, res) => {
    res.send('IUB Smart Shuttle Backend is running!');
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
