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

// GET /drivers - Retrieve all drivers or filter by status (Admin only)
app.get('/drivers', isAuthenticated, isAdmin, (req, res) => {
    const { status } = req.query;
    let query = 'SELECT driver_id, driver_name, phone_number, license_number, experience_years, status FROM driver_info';
    const params = [];

    if (status) {
        query += ' WHERE status = ?';
        params.push(status);
    }

    conn.query(query, params, (err, results) => {
        if (err) {
            console.error('Error fetching drivers:', err);
            return res.status(500).json({ error: 'Failed to retrieve drivers' });
        }
        res.status(200).json({ drivers: results });
    });
});


// GET /drivers/:id - Retrieve a specific driver (Admin only)
app.get('/drivers/:id', isAuthenticated, isAdmin, (req, res) => {
    const driverId = req.params.id;
    const query = 'SELECT driver_id, driver_name, phone_number, license_number, experience_years, status FROM driver_info WHERE driver_id = ?';
    conn.query(query, [driverId], (err, results) => {
        if (err) {
            console.error('Error fetching driver:', err);
            return res.status(500).json({ error: 'Failed to retrieve driver' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Driver not found' });
        }
        res.status(200).json({ driver: results[0] });
    });
});

// POST /drivers - Add a new driver (Admin only)
app.post('/drivers', isAuthenticated, isAdmin, (req, res) => {
    const { driver_id, driver_name, phone_number, license_number, experience_years, status } = req.body;

    // Validate required fields
    if (!driver_id || !driver_name || !phone_number || !license_number || !experience_years) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if the driver_id or license_number already exists
    const checkQuery = 'SELECT * FROM driver_info WHERE driver_id = ? OR license_number = ?';
    conn.query(checkQuery, [driver_id, license_number], (err, result) => {
        if (err) {
            console.error('Error checking existing driver:', err);
            return res.status(500).json({ error: 'Failed to check for existing driver' });
        }

        if (result.length > 0) {
            return res.status(400).json({ error: 'Driver ID or License Number already exists' });
        }

        // Insert the new driver into the database
        const insertQuery = `
            INSERT INTO driver_info 
            (driver_id, driver_name, phone_number, license_number, experience_years, status) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        conn.query(insertQuery, [driver_id, driver_name, phone_number, license_number, experience_years, status || 'Active'], (err, result) => {
            if (err) {
                console.error('Error adding driver:', err);
                return res.status(500).json({ error: 'Failed to add driver' });
            }

            res.status(201).json({ message: 'Driver added successfully!' });
        });
    });
});

// PUT /drivers/:id - Update an existing driver (Admin only)
app.put('/drivers/:id', isAuthenticated, isAdmin, (req, res) => {
    const driverId = req.params.id;
    const { driver_name, phone_number, license_number, experience_years, status } = req.body;

    // Validate required fields
    if (!driver_name || !phone_number || !license_number || !experience_years || !status) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if the driver exists
    const checkQuery = 'SELECT * FROM driver_info WHERE driver_id = ?';
    conn.query(checkQuery, [driverId], (err, result) => {
        if (err) {
            console.error('Error fetching driver:', err);
            return res.status(500).json({ error: 'Failed to retrieve driver' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'Driver not found' });
        }

        const previousStatus = result[0].status;

        // Check if the new status is different from the previous status
        if (previousStatus !== status) {
            // If the driver is being set to inactive, update shuttles
            if (status === 'Inactive') {
                // Update shuttles assigned to this driver to 'Inactive'
                const updateShuttles = 'UPDATE shuttle_info SET current_status = "Inactive" WHERE driver_id = ?';
                conn.query(updateShuttles, [driverId], (err, shuttleResult) => {
                    if (err) {
                        console.error('Error updating shuttles:', err);
                        return res.status(500).json({ error: 'Failed to update shuttle statuses' });
                    }

                    console.log(`Shuttle statuses updated to Inactive for driver ${driverId}`);
                });
            }
        }

        // Check if the new license_number is unique (if changed)
        const existingLicense = 'SELECT * FROM driver_info WHERE license_number = ? AND driver_id != ?';
        conn.query(existingLicense, [license_number, driverId], (err, licenseResult) => {
            if (err) {
                console.error('Error checking license number:', err);
                return res.status(500).json({ error: 'Failed to verify license number' });
            }

            if (licenseResult.length > 0) {
                return res.status(400).json({ error: 'License Number already exists for another driver' });
            }

            // Update the driver in the database
            const updateQuery = `
                UPDATE driver_info 
                SET driver_name = ?, phone_number = ?, license_number = ?, experience_years = ?, status = ?
                WHERE driver_id = ?
            `;
            conn.query(updateQuery, [driver_name, phone_number, license_number, experience_years, status, driverId], (err, updateResult) => {
                if (err) {
                    console.error('Error updating driver:', err);
                    return res.status(500).json({ error: 'Failed to update driver' });
                }

                res.status(200).json({ message: 'Driver updated successfully!' });
            });
        });
    });
});



// DELETE /drivers/:id - Delete a driver (Admin only)
app.delete('/drivers/:id', isAuthenticated, isAdmin, (req, res) => {
    const driverId = req.params.id;

    // Check if the driver exists
    const checkQuery = 'SELECT * FROM driver_info WHERE driver_id = ?';
    conn.query(checkQuery, [driverId], (err, result) => {
        if (err) {
            console.error('Error fetching driver:', err);
            return res.status(500).json({ error: 'Failed to retrieve driver' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'Driver not found' });
        }

        // Delete the driver
        const deleteQuery = 'DELETE FROM driver_info WHERE driver_id = ?';
        conn.query(deleteQuery, [driverId], (err, result) => {
            if (err) {
                console.error('Error deleting driver:', err);
                return res.status(500).json({ error: 'Failed to delete driver' });
            }

            res.status(200).json({ message: 'Driver deleted successfully!' });
        });
    });
});


// GET /routes - Retrieve all routes (Admin only)
app.get('/routes', isAuthenticated, isAdmin, (req, res) => {
    const query = 'SELECT route_id, route_name, start_location, end_location FROM route_info';
    conn.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching routes:', err);
            return res.status(500).json({ error: 'Failed to retrieve routes' });
        }
        res.status(200).json({ routes: results });
    });
});

// POST /routes - Add a new route (Admin only)
app.post('/routes', isAuthenticated, isAdmin, (req, res) => {
    const { route_id, route_name, start_location, end_location } = req.body;

    // Validate required fields
    if (!route_id || !route_name || !start_location || !end_location) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if the route_id or route_name already exists
    const checkQuery = 'SELECT * FROM route_info WHERE route_id = ? OR route_name = ?';
    conn.query(checkQuery, [route_id, route_name], (err, result) => {
        if (err) {
            console.error('Error checking existing route:', err);
            return res.status(500).json({ error: 'Failed to check for existing route' });
        }

        if (result.length > 0) {
            return res.status(400).json({ error: 'Route ID or Route Name already exists' });
        }

        // Insert the new route into the database
        const insertQuery = `
            INSERT INTO route_info 
            (route_id, route_name, start_location, end_location) 
            VALUES (?, ?, ?, ?)
        `;
        conn.query(insertQuery, [route_id, route_name, start_location, end_location], (err, result) => {
            if (err) {
                console.error('Error adding route:', err);
                return res.status(500).json({ error: 'Failed to add route' });
            }

            res.status(201).json({ message: 'Route added successfully!' });
        });
    });
});

// PUT /routes/:id - Update an existing route (Admin only)
app.put('/routes/:id', isAuthenticated, isAdmin, (req, res) => {
    const routeId = req.params.id;
    const { route_name, start_location, end_location } = req.body;

    // Validate required fields
    if (!route_name || !start_location || !end_location) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if the route exists
    const checkQuery = 'SELECT * FROM route_info WHERE route_id = ?';
    conn.query(checkQuery, [routeId], (err, result) => {
        if (err) {
            console.error('Error fetching route:', err);
            return res.status(500).json({ error: 'Failed to retrieve route' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'Route not found' });
        }

        // Update the route in the database
        const updateQuery = `
            UPDATE route_info 
            SET route_name = ?, start_location = ?, end_location = ?
            WHERE route_id = ?
        `;
        conn.query(updateQuery, [route_name, start_location, end_location, routeId], (err, result) => {
            if (err) {
                console.error('Error updating route:', err);
                return res.status(500).json({ error: 'Failed to update route' });
            }

            res.status(200).json({ message: 'Route updated successfully!' });
        });
    });
});

// DELETE /routes/:id - Delete a route (Admin only)
app.delete('/routes/:id', isAuthenticated, isAdmin, (req, res) => {
    const routeId = req.params.id;

    // Check if the route exists
    const checkQuery = 'SELECT * FROM route_info WHERE route_id = ?';
    conn.query(checkQuery, [routeId], (err, result) => {
        if (err) {
            console.error('Error fetching route:', err);
            return res.status(500).json({ error: 'Failed to retrieve route' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'Route not found' });
        }

        // Check if any schedules are associated with this route
        const scheduleCheck = 'SELECT * FROM shuttle_schedules WHERE route_id = ?';
        conn.query(scheduleCheck, [routeId], (err, scheduleResult) => {
            if (err) {
                console.error('Error checking schedules for route:', err);
                return res.status(500).json({ error: 'Failed to check schedules for this route' });
            }

            if (scheduleResult.length > 0) {
                return res.status(400).json({ error: 'Cannot delete route with existing schedules' });
            }

            // Delete the route
            const deleteQuery = 'DELETE FROM route_info WHERE route_id = ?';
            conn.query(deleteQuery, [routeId], (err, deleteResult) => {
                if (err) {
                    console.error('Error deleting route:', err);
                    return res.status(500).json({ error: 'Failed to delete route' });
                }

                res.status(200).json({ message: 'Route deleted successfully!' });
            });
        });
    });
});


// GET /shuttles - Retrieve all shuttles (Admin only)
app.get('/shuttles', isAuthenticated, isAdmin, (req, res) => {
    const query = `
        SELECT 
            s.shuttle_id, 
            s.shuttle_number, 
            s.capacity, 
            s.current_status, 
            d.driver_name,
            r.route_name
        FROM 
            shuttle_info s
        JOIN 
            driver_info d ON s.driver_id = d.driver_id
        JOIN 
            shuttle_schedules ss ON s.shuttle_id = ss.shuttle_id
        JOIN 
            route_info r ON ss.route_id = r.route_id
    `;
    conn.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching shuttles:', err);
            return res.status(500).json({ error: 'Failed to retrieve shuttles' });
        }
        res.status(200).json({ shuttles: results });
    });
});

// GET /shuttles/:id - Retrieve a specific shuttle (Admin only)
app.get('/shuttles/:id', isAuthenticated, isAdmin, (req, res) => {
    const shuttleId = req.params.id;
    const query = `
        SELECT 
            s.shuttle_id, 
            s.shuttle_number, 
            s.capacity, 
            s.current_status, 
            d.driver_id, 
            d.driver_name,
            r.route_id,
            r.route_name
        FROM 
            shuttle_info s
        JOIN 
            driver_info d ON s.driver_id = d.driver_id
        JOIN 
            shuttle_schedules ss ON s.shuttle_id = ss.shuttle_id
        JOIN 
            route_info r ON ss.route_id = r.route_id
        WHERE 
            s.shuttle_id = ?
    `;
    conn.query(query, [shuttleId], (err, results) => {
        if (err) {
            console.error('Error fetching shuttle:', err);
            return res.status(500).json({ error: 'Failed to retrieve shuttle' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Shuttle not found' });
        }
        res.status(200).json({ shuttle: results[0] });
    });
});

// POST /shuttles - Add a new shuttle (Admin only)
app.post('/shuttles', isAuthenticated, isAdmin, (req, res) => {
    const { shuttle_id, shuttle_number, capacity, current_status, driver_id, route_id } = req.body;

    // Validate required fields
    if (!shuttle_id || !shuttle_number || !capacity || !driver_id || !route_id) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
// Check if the driver exists and is active
    const driverCheck = 'SELECT * FROM driver_info WHERE driver_id = ? AND status = "Active"';
    conn.query(driverCheck, [driver_id], (err, driverResult) => {
        if (err) {
            console.error('Error checking driver:', err);
            return res.status(500).json({ error: 'Failed to verify driver' });
        }

        if (driverResult.length === 0) {
            return res.status(400).json({ error: 'Driver does not exist or is not active' });
        }
    });
    // Check if the shuttle_id or shuttle_number already exists
    const checkQuery = 'SELECT * FROM shuttle_info WHERE shuttle_id = ? OR shuttle_number = ?';
    conn.query(checkQuery, [shuttle_id, shuttle_number], (err, result) => {
        if (err) {
            console.error('Error checking existing shuttle:', err);
            return res.status(500).json({ error: 'Failed to check for existing shuttle' });
        }

        if (result.length > 0) {
            return res.status(400).json({ error: 'Shuttle ID or Shuttle Number already exists' });
        }

        // Check if the driver exists
        const driverCheck = 'SELECT * FROM driver_info WHERE driver_id = ?';
        conn.query(driverCheck, [driver_id], (err, driverResult) => {
            if (err) {
                console.error('Error checking driver:', err);
                return res.status(500).json({ error: 'Failed to verify driver' });
            }

            if (driverResult.length === 0) {
                return res.status(400).json({ error: 'Driver does not exist' });
            }

            // Insert the new shuttle into the database
            const insertShuttle = `
                INSERT INTO shuttle_info 
                (shuttle_id, shuttle_number, capacity, current_status, driver_id) 
                VALUES (?, ?, ?, ?, ?)
            `;
            conn.query(insertShuttle, [shuttle_id, shuttle_number, capacity, current_status || 'Active', driver_id], (err, shuttleResult) => {
                if (err) {
                    console.error('Error adding shuttle:', err);
                    return res.status(500).json({ error: 'Failed to add shuttle' });
                }

                // Insert into shuttle_schedules
                const insertSchedule = `
                    INSERT INTO shuttle_schedules 
                    (shuttle_id, route_id, departure_time, arrival_time, days_of_operation)
                    VALUES (?, ?, ?, ?, ?)
                `;
                const departure_time = '08:00:00'; // Example default, can be adjusted
                const arrival_time = '08:45:00';   // Example default, can be adjusted
                const days_of_operation = 'Monday,Tuesday,Wednesday,Thursday,Friday'; // Example

                conn.query(insertSchedule, [shuttle_id, route_id, departure_time, arrival_time, days_of_operation], (err, scheduleResult) => {
                    if (err) {
                        console.error('Error adding shuttle schedule:', err);
                        return res.status(500).json({ error: 'Failed to add shuttle schedule' });
                    }

                    res.status(201).json({ message: 'Shuttle added successfully!' });
                });
            });
        });
    });
});

// PUT /shuttles/:id - Update an existing shuttle (Admin only)
app.put('/shuttles/:id', isAuthenticated, isAdmin, (req, res) => {
    const shuttleId = req.params.id;
    const { shuttle_number, capacity, current_status, driver_id, route_id } = req.body;

    // Validate required fields
    if (!shuttle_number || !capacity || !driver_id || !route_id) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    // Check if the driver exists and is active
    const driverCheck = 'SELECT * FROM driver_info WHERE driver_id = ? AND status = "Active"';
    conn.query(driverCheck, [driver_id], (err, driverResult) => {
        if (err) {
            console.error('Error checking driver:', err);
            return res.status(500).json({ error: 'Failed to verify driver' });
        }

        if (driverResult.length === 0) {
            return res.status(400).json({ error: 'Driver does not exist or is not active' });
        }
    });
    // Check if the shuttle exists
    const checkQuery = 'SELECT * FROM shuttle_info WHERE shuttle_id = ?';
    conn.query(checkQuery, [shuttleId], (err, result) => {
        if (err) {
            console.error('Error fetching shuttle:', err);
            return res.status(500).json({ error: 'Failed to retrieve shuttle' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'Shuttle not found' });
        }

        // Check if the driver exists
        const driverCheck = 'SELECT * FROM driver_info WHERE driver_id = ?';
        conn.query(driverCheck, [driver_id], (err, driverResult) => {
            if (err) {
                console.error('Error checking driver:', err);
                return res.status(500).json({ error: 'Failed to verify driver' });
            }

            if (driverResult.length === 0) {
                return res.status(400).json({ error: 'Driver does not exist' });
            }

            // Update the shuttle in the database
            const updateShuttle = `
                UPDATE shuttle_info 
                SET shuttle_number = ?, capacity = ?, current_status = ?, driver_id = ?
                WHERE shuttle_id = ?
            `;
            conn.query(updateShuttle, [shuttle_number, capacity, current_status, driver_id, shuttleId], (err, shuttleResult) => {
                if (err) {
                    console.error('Error updating shuttle:', err);
                    return res.status(500).json({ error: 'Failed to update shuttle' });
                }

                // Update shuttle_schedules
                const updateSchedule = `
                    UPDATE shuttle_schedules 
                    SET route_id = ?
                    WHERE shuttle_id = ?
                `;
                conn.query(updateSchedule, [route_id, shuttleId], (err, scheduleResult) => {
                    if (err) {
                        console.error('Error updating shuttle schedule:', err);
                        return res.status(500).json({ error: 'Failed to update shuttle schedule' });
                    }

                    res.status(200).json({ message: 'Shuttle updated successfully!' });
                });
            });
        });
    });
});

// DELETE /shuttles/:id - Delete a shuttle (Admin only)
app.delete('/shuttles/:id', isAuthenticated, isAdmin, (req, res) => {
    const shuttleId = req.params.id;

    // Check if the shuttle exists
    const checkQuery = 'SELECT * FROM shuttle_info WHERE shuttle_id = ?';
    conn.query(checkQuery, [shuttleId], (err, result) => {
        if (err) {
            console.error('Error fetching shuttle:', err);
            return res.status(500).json({ error: 'Failed to retrieve shuttle' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'Shuttle not found' });
        }

        // Delete the shuttle_schedules first due to foreign key constraints
        const deleteSchedules = 'DELETE FROM shuttle_schedules WHERE shuttle_id = ?';
        conn.query(deleteSchedules, [shuttleId], (err, scheduleResult) => {
            if (err) {
                console.error('Error deleting shuttle schedules:', err);
                return res.status(500).json({ error: 'Failed to delete shuttle schedules' });
            }

            // Delete the shuttle
            const deleteShuttle = 'DELETE FROM shuttle_info WHERE shuttle_id = ?';
            conn.query(deleteShuttle, [shuttleId], (err, shuttleResult) => {
                if (err) {
                    console.error('Error deleting shuttle:', err);
                    return res.status(500).json({ error: 'Failed to delete shuttle' });
                }

                res.status(200).json({ message: 'Shuttle deleted successfully!' });
            });
        });
    });
});
// index.js (continued)

// ** Schedule Management Routes **

// Middleware to check if shuttle is active
function isShuttleActive(shuttle_id, callback) {
    const query = 'SELECT current_status FROM shuttle_info WHERE shuttle_id = ?';
    conn.query(query, [shuttle_id], (err, results) => {
        if (err) return callback(err, false);
        if (results.length === 0) return callback(null, false);
        const status = results[0].current_status;
        callback(null, status === 'Active');
    });
}

// Middleware to check if route exists
function doesRouteExist(route_id, callback) {
    const query = 'SELECT * FROM route_info WHERE route_id = ?';
    conn.query(query, [route_id], (err, results) => {
        if (err) return callback(err, false);
        callback(null, results.length > 0);
    });
}

// GET /schedules - Retrieve all shuttle schedules (Admin only)
app.get('/schedules', isAuthenticated, isAdmin, (req, res) => {
    const query = `
        SELECT 
            ss.schedule_id, 
            ss.shuttle_id, 
            s.shuttle_number,
            ss.route_id, 
            r.route_name, 
            ss.departure_time, 
            ss.arrival_time, 
            ss.days_of_operation, 
            ss.created_at
        FROM 
            shuttle_schedules ss
        JOIN 
            shuttle_info s ON ss.shuttle_id = s.shuttle_id
        JOIN 
            route_info r ON ss.route_id = r.route_id
        ORDER BY ss.created_at DESC
    `;
    conn.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching schedules:', err);
            return res.status(500).json({ error: 'Failed to retrieve schedules' });
        }
        res.status(200).json({ schedules: results });
    });
});

// GET /schedules/:id - Retrieve a specific schedule (Admin only)
app.get('/schedules/:id', isAuthenticated, isAdmin, (req, res) => {
    const scheduleId = req.params.id;
    const query = `
        SELECT 
            ss.schedule_id, 
            ss.shuttle_id, 
            s.shuttle_number,
            ss.route_id, 
            r.route_name, 
            ss.departure_time, 
            ss.arrival_time, 
            ss.days_of_operation, 
            ss.created_at
        FROM 
            shuttle_schedules ss
        JOIN 
            shuttle_info s ON ss.shuttle_id = s.shuttle_id
        JOIN 
            route_info r ON ss.route_id = r.route_id
        WHERE 
            ss.schedule_id = ?
    `;
    conn.query(query, [scheduleId], (err, results) => {
        if (err) {
            console.error('Error fetching schedule:', err);
            return res.status(500).json({ error: 'Failed to retrieve schedule' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        res.status(200).json({ schedule: results[0] });
    });
});

// POST /schedules - Create a new shuttle schedule (Admin only)
app.post('/schedules', isAuthenticated, isAdmin, (req, res) => {
    const { shuttle_id, route_id, departure_time, arrival_time, days_of_operation } = req.body;

    // Validate required fields
    if (!shuttle_id || !route_id || !departure_time || !arrival_time || !days_of_operation || days_of_operation.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if shuttle is active
    isShuttleActive(shuttle_id, (err, isActive) => {
        if (err) {
            console.error('Error checking shuttle status:', err);
            return res.status(500).json({ error: 'Failed to verify shuttle status' });
        }
        if (!isActive) {
            return res.status(400).json({ error: 'Cannot schedule an inactive shuttle' });
        }

        // Check if route exists
        doesRouteExist(route_id, (err, exists) => {
            if (err) {
                console.error('Error checking route existence:', err);
                return res.status(500).json({ error: 'Failed to verify route' });
            }
            if (!exists) {
                return res.status(400).json({ error: 'Route does not exist' });
            }

            // Retrieve shuttle's driver_id
            const getDriverQuery = 'SELECT driver_id FROM shuttle_info WHERE shuttle_id = ?';
            conn.query(getDriverQuery, [shuttle_id], (err, driverResult) => {
                if (err) {
                    console.error('Error fetching shuttle driver:', err);
                    return res.status(500).json({ error: 'Failed to retrieve shuttle driver' });
                }
                if (driverResult.length === 0) {
                    return res.status(400).json({ error: 'Shuttle does not exist' });
                }
                const driver_id = driverResult[0].driver_id;

                // Check for overlapping schedules
                hasOverlap(shuttle_id, driver_id, route_id, departure_time, arrival_time, days_of_operation, null, (err, overlap) => {
                    if (err) {
                        console.error('Error checking schedule overlap:', err);
                        return res.status(500).json({ error: 'Failed to check schedule overlaps' });
                    }
                    if (overlap) {
                        return res.status(400).json({ error: 'Overlapping schedule exists for this shuttle or driver on the selected days and times' });
                    }

                    // Insert the new schedule
                    const insertQuery = `
                        INSERT INTO shuttle_schedules 
                        (shuttle_id, route_id, departure_time, arrival_time, days_of_operation) 
                        VALUES (?, ?, ?, ?, ?)
                    `;
                    conn.query(insertQuery, [shuttle_id, route_id, departure_time, arrival_time, days_of_operation.join(',')], (err, result) => {
                        if (err) {
                            console.error('Error adding schedule:', err);
                            return res.status(500).json({ error: 'Failed to add schedule' });
                        }

                        res.status(201).json({ message: 'Schedule added successfully!', schedule_id: result.insertId });
                    });
                });
            });
        });
    });
});


// PUT /schedules/:id - Update an existing shuttle schedule (Admin only)
app.put('/schedules/:id', isAuthenticated, isAdmin, (req, res) => {
    const scheduleId = req.params.id;
    const { shuttle_id, route_id, departure_time, arrival_time, days_of_operation } = req.body;

    // Validate required fields
    if (!shuttle_id || !route_id || !departure_time || !arrival_time || !days_of_operation || days_of_operation.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if shuttle is active
    isShuttleActive(shuttle_id, (err, isActive) => {
        if (err) {
            console.error('Error checking shuttle status:', err);
            return res.status(500).json({ error: 'Failed to verify shuttle status' });
        }
        if (!isActive) {
            return res.status(400).json({ error: 'Cannot assign schedule to an inactive shuttle' });
        }

        // Check if route exists
        doesRouteExist(route_id, (err, exists) => {
            if (err) {
                console.error('Error checking route existence:', err);
                return res.status(500).json({ error: 'Failed to verify route' });
            }
            if (!exists) {
                return res.status(400).json({ error: 'Route does not exist' });
            }

            // Retrieve shuttle's driver_id
            const getDriverQuery = 'SELECT driver_id FROM shuttle_info WHERE shuttle_id = ?';
            conn.query(getDriverQuery, [shuttle_id], (err, driverResult) => {
                if (err) {
                    console.error('Error fetching shuttle driver:', err);
                    return res.status(500).json({ error: 'Failed to retrieve shuttle driver' });
                }
                if (driverResult.length === 0) {
                    return res.status(400).json({ error: 'Shuttle does not exist' });
                }
                const driver_id = driverResult[0].driver_id;

                // Check for overlapping schedules, excluding the current schedule
                hasOverlap(shuttle_id, driver_id, route_id, departure_time, arrival_time, days_of_operation, scheduleId, (err, overlap) => {
                    if (err) {
                        console.error('Error checking schedule overlap:', err);
                        return res.status(500).json({ error: 'Failed to check schedule overlaps' });
                    }
                    if (overlap) {
                        return res.status(400).json({ error: 'Overlapping schedule exists for this shuttle or driver on the selected days and times' });
                    }

                    // Update the schedule
                    const updateQuery = `
                        UPDATE shuttle_schedules 
                        SET shuttle_id = ?, route_id = ?, departure_time = ?, arrival_time = ?, days_of_operation = ?
                        WHERE schedule_id = ?
                    `;
                    conn.query(updateQuery, [shuttle_id, route_id, departure_time, arrival_time, days_of_operation.join(','), scheduleId], (err, updateResult) => {
                        if (err) {
                            console.error('Error updating schedule:', err);
                            return res.status(500).json({ error: 'Failed to update schedule' });
                        }

                        res.status(200).json({ message: 'Schedule updated successfully!' });
                    });
                });
            });
        });
    });
});


// DELETE /schedules/:id - Delete a shuttle schedule (Admin only)
app.delete('/schedules/:id', isAuthenticated, isAdmin, (req, res) => {
    const scheduleId = req.params.id;

    // Check if schedule exists
    const checkQuery = 'SELECT * FROM shuttle_schedules WHERE schedule_id = ?';
    conn.query(checkQuery, [scheduleId], (err, result) => {
        if (err) {
            console.error('Error fetching schedule:', err);
            return res.status(500).json({ error: 'Failed to retrieve schedule' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        // Delete the schedule
        const deleteQuery = 'DELETE FROM shuttle_schedules WHERE schedule_id = ?';
        conn.query(deleteQuery, [scheduleId], (err, deleteResult) => {
            if (err) {
                console.error('Error deleting schedule:', err);
                return res.status(500).json({ error: 'Failed to delete schedule' });
            }

            res.status(200).json({ message: 'Schedule deleted successfully!' });
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