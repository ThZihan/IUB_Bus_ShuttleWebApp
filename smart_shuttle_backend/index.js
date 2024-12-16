// index.js
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session); // Import the session store

const app = express();
const port = 3000;

// Enable CORS and allow credentials
app.use(cors({
    origin: 'http://localhost:63342', // Replace with your frontend URL and port
    credentials: true
}));

// Parse JSON and URL-encoded requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        httpOnly: true,
        secure: false // Set to true if using HTTPS
    }
}));

// Middleware to check if the user is authenticated and is an admin
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.designation === 'Moderator') {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden: Admins only' });
    }
}

// POST route for creating a new account
app.post('/register', (req, res) => {
    const { user_id, full_name, iub_email, password, designation, phone_number } = req.body;

    // Validate the incoming data
    if (!user_id || !full_name || !iub_email || !password || !designation || !phone_number) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if the user_id or email already exists
    const checkQuery = 'SELECT * FROM user_accounts WHERE user_id = ? OR iub_email = ?';
    conn.query(checkQuery, [user_id, iub_email], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to check for existing user' });
        }

        if (result.length > 0) {
            // If user already exists
            return res.status(400).json({ error: 'User ID or Email already exists' });
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

        const user = result[0];

        // Compare the password with the hashed password stored in the database
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                return res.status(500).json({ error: 'Error comparing password' });
            }

            if (isMatch) {
                // If the password matches, create a session
                req.session.user = {
                    user_id: user.user_id,
                    iub_email: user.iub_email,
                    full_name: user.full_name,
                    designation: user.designation,
                    phone_number: user.phone_number,
                    gender: user.gender,
                    account_status: user.account_status,
                    profile_picture: user.profile_picture
                };
                // Include designation in the response
                res.status(200).json({ message: 'Login successful', designation: user.designation });
            } else {
                // If the password doesn't match, return error
                res.status(401).json({ error: 'Invalid credentials' });
            }
        });
    });
});

// POST route for logging out
app.post('/logout', (req, res) => {
    if (req.session.user) {
        req.session.destroy(err => {
            if (err) {
                return res.status(500).json({ error: 'Failed to log out' });
            }
            res.clearCookie('iub_bus_cookie'); // Correct cookie name
            res.status(200).json({ message: 'Logout successful' });
        });
    } else {
        res.status(400).json({ error: 'No active session' });
    }
});

// GET route to fetch user info
app.get('/user', isAuthenticated, (req, res) => {
    res.status(200).json({ user: req.session.user });
});

// POST route for updating profile picture via URL
app.post('/update-profile-picture-url', isAuthenticated, (req, res) => {
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

// ** User Management Routes **

// GET /users - Retrieve all users (Admin only)
app.get('/users', isAuthenticated, isAdmin, (req, res) => {
    const query = 'SELECT user_id, full_name, iub_email, designation, phone_number, account_status, gender, rfID_code, created_at FROM user_accounts';
    conn.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to retrieve users' });
        }
        res.status(200).json({ users: results });
    });
});

// GET /users/:id - Retrieve a specific user (Admin only)
app.get('/users/:id', isAuthenticated, isAdmin, (req, res) => {
    const userId = req.params.id;
    const query = 'SELECT user_id, full_name, iub_email, designation, phone_number, account_status, gender, rfID_code, created_at FROM user_accounts WHERE user_id = ?';
    conn.query(query, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to retrieve user' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ user: results[0] });
    });
});

// POST /users - Add a new user (Admin only)
app.post('/users', isAuthenticated, isAdmin, (req, res) => {
    const { user_id, full_name, iub_email, password, designation, phone_number, gender, rfID_code, account_status } = req.body;

    // Validate required fields
    if (!user_id || !full_name || !iub_email || !password || !designation || !phone_number) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if the user_id or email already exists
    const checkQuery = 'SELECT * FROM user_accounts WHERE user_id = ? OR iub_email = ?';
    conn.query(checkQuery, [user_id, iub_email], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to check for existing user' });
        }

        if (result.length > 0) {
            // If user already exists
            return res.status(400).json({ error: 'User ID or Email already exists' });
        }

        // Hash the password before storing it
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to hash password' });
            }

            // Insert the new user into the database
            const query = `
                INSERT INTO user_accounts 
                (user_id, full_name, iub_email, password, designation, phone_number, gender, rfID_code, account_status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            conn.query(query, [user_id, full_name, iub_email, hashedPassword, designation, phone_number, gender || null, rfID_code || null, account_status || 'Pending'], (err, result) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to insert user into the database' });
                }

                res.status(201).json({ message: 'User created successfully!' });
            });
        });
    });
});

// PUT /users/:id - Update an existing user (Admin only)
app.put('/users/:id', isAuthenticated, isAdmin, (req, res) => {
    const userId = req.params.id;
    const { full_name, iub_email, designation, phone_number, account_status, gender, rfID_code, password } = req.body;

    // Check if user exists
    const checkQuery = 'SELECT * FROM user_accounts WHERE user_id = ?';
    conn.query(checkQuery, [userId], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to retrieve user' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // If password is being updated, hash it
        if (password) {
            bcrypt.hash(password, 10, (err, hashedPassword) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to hash password' });
                }

                // Update user with hashed password
                const updateQuery = `
                    UPDATE user_accounts 
                    SET full_name = ?, iub_email = ?, designation = ?, phone_number = ?, account_status = ?, gender = ?, rfID_code = ?, password = ? 
                    WHERE user_id = ?
                `;
                conn.query(updateQuery, [full_name, iub_email, designation, phone_number, account_status, gender, rfID_code, hashedPassword, userId], (err, result) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to update user' });
                    }

                    res.status(200).json({ message: 'User updated successfully!' });
                });
            });
        } else {
            // Update user without changing password
            const updateQuery = `
                UPDATE user_accounts 
                SET full_name = ?, iub_email = ?, designation = ?, phone_number = ?, account_status = ?, gender = ?, rfID_code = ? 
                WHERE user_id = ?
            `;
            conn.query(updateQuery, [full_name, iub_email, designation, phone_number, account_status, gender, rfID_code, userId], (err, result) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to update user' });
                }

                res.status(200).json({ message: 'User updated successfully!' });
            });
        }
    });
});

// DELETE /users/:id - Delete a user (Admin only)
app.delete('/users/:id', isAuthenticated, isAdmin, (req, res) => {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (req.session.user.user_id === userId) {
        return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    // Check if user exists
    const checkQuery = 'SELECT * FROM user_accounts WHERE user_id = ?';
    conn.query(checkQuery, [userId], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to retrieve user' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Delete the user
        const deleteQuery = 'DELETE FROM user_accounts WHERE user_id = ?';
        conn.query(deleteQuery, [userId], (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to delete user' });
            }

            res.status(200).json({ message: 'User deleted successfully!' });
        });
    });
});

// Sample route to check server
app.get('/', (req, res) => {
    res.send('IUB Smart Shuttle Backend is running!');
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});