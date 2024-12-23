// index.js
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session); // Import the session store
const PDFDocument = require('pdfkit'); // For PDF generation
const { body, validationResult } = require('express-validator'); // For input validation

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
function isUserAuthenticated(req, res, next) {
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
    if (!shuttle_id || !route_id || !departure_time || !arrival_time || !days_of_operation) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert time strings to comparable formats (24-hour)
    const convertTo24Hour = (timeStr) => {
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        if (modifier === 'PM' && hours !== '12') {
            hours = parseInt(hours, 10) + 12;
        }
        if (modifier === 'AM' && hours === '12') {
            hours = '00';
        }
        return `${hours}:${minutes}:00`;
    };

    const departureTime24 = convertTo24Hour(departure_time);
    const arrivalTime24 = convertTo24Hour(arrival_time);

    // Split days_of_operation into an array
    const daysArray = days_of_operation.split(',');

    // Check if shuttle is active and not already scheduled at the same time
    const shuttleStatusQuery = 'SELECT current_status FROM shuttle_info WHERE shuttle_id = ?';
    conn.query(shuttleStatusQuery, [shuttle_id], (err, shuttleResults) => {
        if (err) {
            console.error('Error checking shuttle status:', err);
            return res.status(500).json({ error: 'Failed to verify shuttle status' });
        }

        if (shuttleResults.length === 0) {
            return res.status(400).json({ error: 'Shuttle does not exist' });
        }

        if (shuttleResults[0].current_status !== 'Active') {
            return res.status(400).json({ error: 'Cannot schedule an inactive shuttle' });
        }

        // Check for shuttle scheduling conflicts
        const shuttleConflictQuery = `
            SELECT * FROM shuttle_schedules 
            WHERE shuttle_id = ? 
              AND departure_time = ? 
              AND days_of_operation REGEXP ?
        `;
        // Regex to match any overlapping days
        const shuttleConflictDaysRegex = daysArray.join('|');
        conn.query(shuttleConflictQuery, [shuttle_id, departureTime24, shuttleConflictDaysRegex], (err, shuttleConflictResults) => {
            if (err) {
                console.error('Error checking shuttle conflicts:', err);
                return res.status(500).json({ error: 'Failed to check shuttle conflicts' });
            }

            if (shuttleConflictResults.length > 0) {
                return res.status(400).json({ error: 'Shuttle is already scheduled at the selected time on one or more of the selected days' });
            }

            // Fetch shuttle's driver
            const shuttleDriverQuery = 'SELECT driver_id FROM shuttle_info WHERE shuttle_id = ?';
            conn.query(shuttleDriverQuery, [shuttle_id], (err, driverResults) => {
                if (err) {
                    console.error('Error fetching shuttle driver:', err);
                    return res.status(500).json({ error: 'Failed to fetch shuttle driver' });
                }

                if (driverResults.length === 0) {
                    return res.status(400).json({ error: 'Shuttle driver does not exist' });
                }

                const driver_id = driverResults[0].driver_id;

                // Check for driver scheduling conflicts
                const driverConflictQuery = `
                    SELECT * FROM shuttle_schedules 
                    WHERE shuttle_id IN (
                        SELECT shuttle_id FROM shuttle_info WHERE driver_id = ?
                    )
                      AND departure_time = ?
                      AND days_of_operation REGEXP ?
                `;
                conn.query(driverConflictQuery, [driver_id, departureTime24, shuttleConflictDaysRegex], (err, driverConflictResults) => {
                    if (err) {
                        console.error('Error checking driver conflicts:', err);
                        return res.status(500).json({ error: 'Failed to check driver conflicts' });
                    }

                    if (driverConflictResults.length > 0) {
                        return res.status(400).json({ error: 'Driver is already assigned to another shuttle at the selected time on one or more of the selected days' });
                    }

                    // Proceed to insert the new schedule
                    const insertScheduleQuery = `
                        INSERT INTO shuttle_schedules 
                        (shuttle_id, route_id, departure_time, arrival_time, days_of_operation) 
                        VALUES (?, ?, ?, ?, ?)
                    `;
                    conn.query(insertScheduleQuery, [shuttle_id, route_id, departureTime24, arrivalTime24, days_of_operation], (err, insertResult) => {
                        if (err) {
                            console.error('Error inserting schedule:', err);
                            return res.status(500).json({ error: 'Failed to add schedule' });
                        }

                        res.status(201).json({ message: 'Schedule added successfully!', schedule_id: insertResult.insertId });
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
    if (!shuttle_id || !route_id || !departure_time || !arrival_time || !days_of_operation) {
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

            // Check if schedule exists
            const checkSchedule = 'SELECT * FROM shuttle_schedules WHERE schedule_id = ?';
            conn.query(checkSchedule, [scheduleId], (err, result) => {
                if (err) {
                    console.error('Error fetching schedule:', err);
                    return res.status(500).json({ error: 'Failed to retrieve schedule' });
                }
                if (result.length === 0) {
                    return res.status(404).json({ error: 'Schedule not found' });
                }

                // Update the schedule
                const updateQuery = `
                    UPDATE shuttle_schedules 
                    SET shuttle_id = ?, route_id = ?, departure_time = ?, arrival_time = ?, days_of_operation = ?
                    WHERE schedule_id = ?
                `;
                conn.query(updateQuery, [shuttle_id, route_id, departure_time, arrival_time, days_of_operation, scheduleId], (err, updateResult) => {
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
// GET /routes - Retrieve all routes
app.get('/routes', isAuthenticated, (req, res) => {
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

        // Delete the route
        const deleteQuery = 'DELETE FROM route_info WHERE route_id = ?';
        conn.query(deleteQuery, [routeId], (err, result) => {
            if (err) {
                console.error('Error deleting route:', err);
                return res.status(500).json({ error: 'Failed to delete route' });
            }

            res.status(200).json({ message: 'Route deleted successfully!' });
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

        // Check if the route exists
        const routeCheck = 'SELECT * FROM route_info WHERE route_id = ?';
        conn.query(routeCheck, [route_id], (err, routeResult) => {
            if (err) {
                console.error('Error checking route:', err);
                return res.status(500).json({ error: 'Failed to verify route' });
            }

            if (routeResult.length === 0) {
                return res.status(400).json({ error: 'Route does not exist' });
            }

            // Check if the shuttle_id or shuttle_number already exists
            const shuttleCheck = 'SELECT * FROM shuttle_info WHERE shuttle_id = ? OR shuttle_number = ?';
            conn.query(shuttleCheck, [shuttle_id, shuttle_number], (err, shuttleResult) => {
                if (err) {
                    console.error('Error checking shuttle:', err);
                    return res.status(500).json({ error: 'Failed to check for existing shuttle' });
                }

                if (shuttleResult.length > 0) {
                    return res.status(400).json({ error: 'Shuttle ID or Shuttle Number already exists' });
                }

                // Insert the new shuttle into the database
                const insertShuttle = `
                    INSERT INTO shuttle_info 
                    (shuttle_id, shuttle_number, capacity, current_status, driver_id) 
                    VALUES (?, ?, ?, ?, ?)
                `;
                conn.query(insertShuttle, [shuttle_id, shuttle_number, capacity, current_status || 'Active', driver_id], (err, shuttleInsertResult) => {
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
                    const departure_time = '08:00:00'; // Example default, can be adjusted or taken from request
                    const arrival_time = '08:45:00';   // Example default, can be adjusted or taken from request
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

        // Check if the route exists
        const routeCheck = 'SELECT * FROM route_info WHERE route_id = ?';
        conn.query(routeCheck, [route_id], (err, routeResult) => {
            if (err) {
                console.error('Error checking route:', err);
                return res.status(500).json({ error: 'Failed to verify route' });
            }

            if (routeResult.length === 0) {
                return res.status(400).json({ error: 'Route does not exist' });
            }

            // Check if the shuttle exists
            const shuttleCheck = 'SELECT * FROM shuttle_info WHERE shuttle_id = ?';
            conn.query(shuttleCheck, [shuttleId], (err, shuttleResult) => {
                if (err) {
                    console.error('Error fetching shuttle:', err);
                    return res.status(500).json({ error: 'Failed to retrieve shuttle' });
                }

                if (shuttleResult.length === 0) {
                    return res.status(404).json({ error: 'Shuttle not found' });
                }

                // Check if the new shuttle_number is unique (if changed)
                const existingShuttle = 'SELECT * FROM shuttle_info WHERE shuttle_number = ? AND shuttle_id != ?';
                conn.query(existingShuttle, [shuttle_number, shuttleId], (err, existingShuttleResult) => {
                    if (err) {
                        console.error('Error checking shuttle number:', err);
                        return res.status(500).json({ error: 'Failed to verify shuttle number' });
                    }

                    if (existingShuttleResult.length > 0) {
                        return res.status(400).json({ error: 'Shuttle Number already exists for another shuttle' });
                    }

                    // Update the shuttle in the database
                    const updateShuttle = `
                        UPDATE shuttle_info 
                        SET shuttle_number = ?, capacity = ?, current_status = ?, driver_id = ?
                        WHERE shuttle_id = ?
                    `;
                    conn.query(updateShuttle, [shuttle_number, capacity, current_status, driver_id, shuttleId], (err, shuttleUpdateResult) => {
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

// GET /shuttle-schedules - Retrieve all shuttle schedules (Admin only)
app.get('/shuttle-schedules', isAuthenticated, isAdmin, (req, res) => {
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
    `;
    conn.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching shuttle schedules:', err);
            return res.status(500).json({ error: 'Failed to retrieve shuttle schedules' });
        }
        res.status(200).json({ shuttleSchedules: results });
    });
});

// GET /shuttle-schedules/:id - Retrieve a specific shuttle schedule (Admin only)
app.get('/shuttle-schedules/:id', isAuthenticated, isAdmin, (req, res) => {
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
            console.error('Error fetching shuttle schedule:', err);
            return res.status(500).json({ error: 'Failed to retrieve shuttle schedule' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Shuttle schedule not found' });
        }
        res.status(200).json({ shuttleSchedule: results[0] });
    });
});

// POST /shuttle-schedules - Add a new shuttle schedule (Admin only)
app.post('/shuttle-schedules', isAuthenticated, isAdmin, (req, res) => {
    const {shuttle_id, route_id, departure_time, arrival_time, days_of_operation} = req.body;

    // Validate required fields
    if (!shuttle_id || !route_id || !departure_time || !arrival_time || !days_of_operation || days_of_operation.length === 0) {
        return res.status(400).json({error: 'Missing required fields'});
    }

    // Convert days_of_operation array to comma-separated string
    const days = days_of_operation.join(',');

    // Validate time format
    const timePattern = /^([0-1]\d|2[0-3]):([0-5]\d)$/;
    if (!timePattern.test(departure_time) || !timePattern.test(arrival_time)) {
        return res.status(400).json({error: 'Invalid time format. Use HH:MM in 24-hour format.'});
    }

    // Check if shuttle exists
    const shuttleCheck = 'SELECT * FROM shuttle_info WHERE shuttle_id = ?';
    conn.query(shuttleCheck, [shuttle_id], (err, shuttleResult) => {
        if (err) {
            console.error('Error checking shuttle:', err);
            return res.status(500).json({error: 'Failed to verify shuttle'});
        }

        if (shuttleResult.length === 0) {
            return res.status(400).json({error: 'Shuttle does not exist'});
        }

        // Check if route exists
        const routeCheck = 'SELECT * FROM route_info WHERE route_id = ?';
        conn.query(routeCheck, [route_id], (err, routeResult) => {
            if (err) {
                console.error('Error checking route:', err);
                return res.status(500).json({error: 'Failed to verify route'});
            }

            if (routeResult.length === 0) {
                return res.status(400).json({error: 'Route does not exist'});
            }

            // Prevent scheduling conflicts
            const conflictQuery = `
                SELECT * FROM shuttle_schedules
                WHERE shuttle_id = ? 
                AND (
                    (departure_time < ? AND arrival_time > ?)
                    OR
                    (departure_time < ? AND arrival_time > ?)
                    OR
                    (departure_time >= ? AND departure_time < ?)
                )
                AND (
                    FIND_IN_SET('Monday', days_of_operation) OR
                    FIND_IN_SET('Tuesday', days_of_operation) OR
                    FIND_IN_SET('Wednesday', days_of_operation) OR
                    FIND_IN_SET('Thursday', days_of_operation) OR
                    FIND_IN_SET('Friday', days_of_operation) OR
                    FIND_IN_SET('Saturday', days_of_operation) OR
                    FIND_IN_SET('Sunday', days_of_operation)
                )
            `;
            conn.query(conflictQuery, [
                shuttle_id,
                arrival_time, departure_time,
                departure_time, arrival_time,
                departure_time, arrival_time
            ], (err, conflictResult) => {
                if (err) {
                    console.error('Error checking schedule conflicts:', err);
                    return res.status(500).json({error: 'Failed to check schedule conflicts'});
                }

                if (conflictResult.length > 0) {
                    return res.status(400).json({error: 'Scheduling conflict detected for this shuttle.'});
                }

                // Additional validation to prevent driver conflicts
                // Fetch the driver assigned to this shuttle
                const driverQuery = 'SELECT driver_id FROM shuttle_info WHERE shuttle_id = ?';
                conn.query(driverQuery, [shuttle_id], (err, driverResult) => {
                    if (err) {
                        console.error('Error fetching driver:', err);
                        return res.status(500).json({error: 'Failed to fetch driver for shuttle'});
                    }

                    if (driverResult.length === 0) {
                        return res.status(400).json({error: 'Driver not assigned to this shuttle'});
                    }

                    const driver_id = driverResult[0].driver_id;

                    // Check if driver is available at the given times on the selected days
                    const driverConflictQuery = `
                        SELECT ss.* FROM shuttle_schedules ss
                        JOIN shuttle_info s ON ss.shuttle_id = s.shuttle_id
                        WHERE s.driver_id = ?
                        AND (
                            (ss.departure_time < ? AND ss.arrival_time > ?)
                            OR
                            (ss.departure_time < ? AND ss.arrival_time > ?)
                            OR
                            (ss.departure_time >= ? AND ss.departure_time < ?)
                        )
                        AND (
                            FIND_IN_SET('Monday', ss.days_of_operation) OR
                            FIND_IN_SET('Tuesday', ss.days_of_operation) OR
                            FIND_IN_SET('Wednesday', ss.days_of_operation) OR
                            FIND_IN_SET('Thursday', ss.days_of_operation) OR
                            FIND_IN_SET('Friday', ss.days_of_operation) OR
                            FIND_IN_SET('Saturday', ss.days_of_operation) OR
                            FIND_IN_SET('Sunday', ss.days_of_operation)
                        )
                    `;
                    conn.query(driverConflictQuery, [
                        driver_id,
                        arrival_time, departure_time,
                        departure_time, arrival_time,
                        departure_time, arrival_time
                    ], (err, driverConflictResult) => {
                        if (err) {
                            console.error('Error checking driver schedule conflicts:', err);
                            return res.status(500).json({error: 'Failed to check driver schedule conflicts'});
                        }

                        if (driverConflictResult.length > 0) {
                            return res.status(400).json({error: 'Driver is already assigned to another shuttle at these times.'});
                        }

                        // All validations passed, insert the new schedule
                        const insertQuery = `
                            INSERT INTO shuttle_schedules 
                            (shuttle_id, route_id, departure_time, arrival_time, days_of_operation)
                            VALUES (?, ?, ?, ?, ?)
                        `;
                        conn.query(insertQuery, [shuttle_id, route_id, departure_time, arrival_time, days], (err, insertResult) => {
                            if (err) {
                                console.error('Error adding shuttle schedule:', err);
                                return res.status(500).json({error: 'Failed to add shuttle schedule'});
                            }

                            res.status(201).json({message: 'Shuttle schedule added successfully!'});
                        });
                    });
                });
            });
        });
    });
});

// PUT /shuttle-schedules/:id - Update an existing shuttle schedule (Admin only)
    app.put('/shuttle-schedules/:id', isAuthenticated, isAdmin, (req, res) => {
        const scheduleId = req.params.id;
        const {shuttle_id, route_id, departure_time, arrival_time, days_of_operation} = req.body;

        // Validate required fields
        if (!shuttle_id || !route_id || !departure_time || !arrival_time || !days_of_operation || days_of_operation.length === 0) {
            return res.status(400).json({error: 'Missing required fields'});
        }

        // Convert days_of_operation array to comma-separated string
        const days = days_of_operation.join(',');

        // Validate time format
        const timePattern = /^([0-1]\d|2[0-3]):([0-5]\d)$/;
        if (!timePattern.test(departure_time) || !timePattern.test(arrival_time)) {
            return res.status(400).json({error: 'Invalid time format. Use HH:MM in 24-hour format.'});
        }

        // Check if shuttle exists
        const shuttleCheck = 'SELECT * FROM shuttle_info WHERE shuttle_id = ?';
        conn.query(shuttleCheck, [shuttle_id], (err, shuttleResult) => {
            if (err) {
                console.error('Error checking shuttle:', err);
                return res.status(500).json({error: 'Failed to verify shuttle'});
            }

            if (shuttleResult.length === 0) {
                return res.status(400).json({error: 'Shuttle does not exist'});
            }

            // Check if route exists
            const routeCheck = 'SELECT * FROM route_info WHERE route_id = ?';
            conn.query(routeCheck, [route_id], (err, routeResult) => {
                if (err) {
                    console.error('Error checking route:', err);
                    return res.status(500).json({error: 'Failed to verify route'});
                }

                if (routeResult.length === 0) {
                    return res.status(400).json({error: 'Route does not exist'});
                }

                // Prevent scheduling conflicts
                const conflictQuery = `
                SELECT * FROM shuttle_schedules
                WHERE shuttle_id = ? 
                AND schedule_id != ?
                AND (
                    (departure_time < ? AND arrival_time > ?)
                    OR
                    (departure_time < ? AND arrival_time > ?)
                    OR
                    (departure_time >= ? AND departure_time < ?)
                )
                AND (
                    FIND_IN_SET('Monday', days_of_operation) OR
                    FIND_IN_SET('Tuesday', days_of_operation) OR
                    FIND_IN_SET('Wednesday', days_of_operation) OR
                    FIND_IN_SET('Thursday', days_of_operation) OR
                    FIND_IN_SET('Friday', days_of_operation) OR
                    FIND_IN_SET('Saturday', days_of_operation) OR
                    FIND_IN_SET('Sunday', days_of_operation)
                )
            `;
                conn.query(conflictQuery, [
                    shuttle_id,
                    scheduleId,
                    arrival_time, departure_time,
                    departure_time, arrival_time,
                    departure_time, arrival_time
                ], (err, conflictResult) => {
                    if (err) {
                        console.error('Error checking schedule conflicts:', err);
                        return res.status(500).json({error: 'Failed to check schedule conflicts'});
                    }

                    if (conflictResult.length > 0) {
                        return res.status(400).json({error: 'Scheduling conflict detected for this shuttle.'});
                    }

                    // Additional validation to prevent driver conflicts
                    // Fetch the driver assigned to this shuttle
                    const driverQuery = 'SELECT driver_id FROM shuttle_info WHERE shuttle_id = ?';
                    conn.query(driverQuery, [shuttle_id], (err, driverResult) => {
                        if (err) {
                            console.error('Error fetching driver:', err);
                            return res.status(500).json({error: 'Failed to fetch driver for shuttle'});
                        }

                        if (driverResult.length === 0) {
                            return res.status(400).json({error: 'Driver not assigned to this shuttle'});
                        }

                        const driver_id = driverResult[0].driver_id;

                        // Check if driver is available at the given times on the selected days
                        const driverConflictQuery = `
                        SELECT ss.* FROM shuttle_schedules ss
                        JOIN shuttle_info s ON ss.shuttle_id = s.shuttle_id
                        WHERE s.driver_id = ?
                        AND ss.schedule_id != ?
                        AND (
                            (ss.departure_time < ? AND ss.arrival_time > ?)
                            OR
                            (ss.departure_time < ? AND ss.arrival_time > ?)
                            OR
                            (ss.departure_time >= ? AND ss.departure_time < ?)
                        )
                        AND (
                            FIND_IN_SET('Monday', ss.days_of_operation) OR
                            FIND_IN_SET('Tuesday', ss.days_of_operation) OR
                            FIND_IN_SET('Wednesday', ss.days_of_operation) OR
                            FIND_IN_SET('Thursday', ss.days_of_operation) OR
                            FIND_IN_SET('Friday', ss.days_of_operation) OR
                            FIND_IN_SET('Saturday', ss.days_of_operation) OR
                            FIND_IN_SET('Sunday', ss.days_of_operation)
                        )
                    `;
                        conn.query(driverConflictQuery, [
                            driver_id,
                            scheduleId,
                            arrival_time, departure_time,
                            departure_time, arrival_time,
                            departure_time, arrival_time
                        ], (err, driverConflictResult) => {
                            if (err) {
                                console.error('Error checking driver schedule conflicts:', err);
                                return res.status(500).json({error: 'Failed to check driver schedule conflicts'});
                            }

                            if (driverConflictResult.length > 0) {
                                return res.status(400).json({error: 'Driver is already assigned to another shuttle at these times.'});
                            }

                            // All validations passed, update the schedule
                            const updateQuery = `
                            UPDATE shuttle_schedules 
                            SET shuttle_id = ?, route_id = ?, departure_time = ?, arrival_time = ?, days_of_operation = ?
                            WHERE schedule_id = ?
                        `;
                            conn.query(updateQuery, [shuttle_id, route_id, departure_time, arrival_time, days, scheduleId], (err, updateResult) => {
                                if (err) {
                                    console.error('Error updating shuttle schedule:', err);
                                    return res.status(500).json({error: 'Failed to update shuttle schedule'});
                                }

                                res.status(200).json({message: 'Shuttle schedule updated successfully!'});
                            });
                        });
                    });
                });
            });
        });
    });
// DELETE /shuttle-schedules/:id - Delete a shuttle schedule (Admin only)
        app.delete('/shuttle-schedules/:id', isAuthenticated, isAdmin, (req, res) => {
            const scheduleId = req.params.id;

            // Check if the schedule exists
            const checkQuery = 'SELECT * FROM shuttle_schedules WHERE schedule_id = ?';
            conn.query(checkQuery, [scheduleId], (err, result) => {
                if (err) {
                    console.error('Error fetching shuttle schedule:', err);
                    return res.status(500).json({ error: 'Failed to retrieve shuttle schedule' });
                }

                if (result.length === 0) {
                    return res.status(404).json({ error: 'Shuttle schedule not found' });
                }

                // Delete the shuttle schedule
                const deleteQuery = 'DELETE FROM shuttle_schedules WHERE schedule_id = ?';
                conn.query(deleteQuery, [scheduleId], (err, deleteResult) => {
                    if (err) {
                        console.error('Error deleting shuttle schedule:', err);
                        return res.status(500).json({ error: 'Failed to delete shuttle schedule' });
                    }

                    res.status(200).json({ message: 'Shuttle schedule deleted successfully!' });
                });
            });
        });
// GET /bookings - Retrieve all bookings (Admin only)
app.get('/bookings', isAuthenticated, isAdmin, (req, res) => {
    const query = `
        SELECT 
            ut.booking_id,
            ut.user_id,
            ua.full_name AS user_name,
            ut.schedule_id,
            ss.shuttle_id,
            s.shuttle_number,
            ss.route_id,
            r.route_name,
            ss.departure_time,
            ss.arrival_time,
            ut.booking_status,
            ut.booking_date,
            ut.number_of_passengers,
            ut.created_at,
            ut.updated_at
        FROM 
            user_trips ut
        JOIN 
            user_accounts ua ON ut.user_id = ua.user_id
        JOIN 
            shuttle_schedules ss ON ut.schedule_id = ss.schedule_id
        JOIN 
            shuttle_info s ON ss.shuttle_id = s.shuttle_id
        JOIN 
            route_info r ON ss.route_id = r.route_id
        ORDER BY ut.created_at DESC
    `;
    conn.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching bookings:', err);
            return res.status(500).json({ error: 'Failed to retrieve bookings' });
        }
        res.status(200).json({ bookings: results });
    });
});

// GET /bookings/:id - Retrieve a specific booking (Admin only)
app.get('/bookings/:id', isAuthenticated, isAdmin, (req, res) => {
    const bookingId = req.params.id;
    const query = `
        SELECT 
            ut.booking_id,
            ut.user_id,
            ua.full_name AS user_name,
            ut.schedule_id,
            ss.shuttle_id,
            s.shuttle_number,
            ss.route_id,
            r.route_name,
            ss.departure_time,
            ss.arrival_time,
            ut.booking_status,
            ut.booking_date,
            ut.number_of_passengers,
            ut.created_at,
            ut.updated_at
        FROM 
            user_trips ut
        JOIN 
            user_accounts ua ON ut.user_id = ua.user_id
        JOIN 
            shuttle_schedules ss ON ut.schedule_id = ss.schedule_id
        JOIN 
            shuttle_info s ON ss.shuttle_id = s.shuttle_id
        JOIN 
            route_info r ON ss.route_id = r.route_id
        WHERE 
            ut.booking_id = ?
    `;
    conn.query(query, [bookingId], (err, results) => {
        if (err) {
            console.error('Error fetching booking:', err);
            return res.status(500).json({ error: 'Failed to retrieve booking' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        res.status(200).json({ booking: results[0] });
    });
});

// PUT /bookings/:id - Update booking status (Admin only)
app.put('/bookings/:id', isAuthenticated, isAdmin, (req, res) => {
    const bookingId = req.params.id;
    const { booking_status } = req.body;

    // Validate booking_status
    const validStatuses = ['Pending', 'Approved', 'Rejected', 'Cancelled'];
    if (!booking_status || !validStatuses.includes(booking_status)) {
        return res.status(400).json({ error: 'Invalid or missing booking_status' });
    }

    // Check if booking exists
    const checkQuery = 'SELECT * FROM user_trips WHERE booking_id = ?';
    conn.query(checkQuery, [bookingId], (err, results) => {
        if (err) {
            console.error('Error checking booking:', err);
            return res.status(500).json({ error: 'Failed to retrieve booking' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Update booking_status
        const updateQuery = `
            UPDATE user_trips 
            SET booking_status = ?, updated_at = NOW() 
            WHERE booking_id = ?
        `;
        conn.query(updateQuery, [booking_status, bookingId], (err, updateResult) => {
            if (err) {
                console.error('Error updating booking status:', err);
                return res.status(500).json({ error: 'Failed to update booking status' });
            }

            res.status(200).json({ message: 'Booking status updated successfully!' });
        });
    });
});

// DELETE /bookings/:id - Delete a booking (Admin only)
app.delete('/bookings/:id', isAuthenticated, isAdmin, (req, res) => {
    const bookingId = req.params.id;

    // Check if booking exists
    const checkQuery = 'SELECT * FROM user_trips WHERE booking_id = ?';
    conn.query(checkQuery, [bookingId], (err, results) => {
        if (err) {
            console.error('Error fetching booking:', err);
            return res.status(500).json({ error: 'Failed to retrieve booking' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Delete the booking
        const deleteQuery = 'DELETE FROM user_trips WHERE booking_id = ?';
        conn.query(deleteQuery, [bookingId], (err, deleteResult) => {
            if (err) {
                console.error('Error deleting booking:', err);
                return res.status(500).json({ error: 'Failed to delete booking' });
            }

            res.status(200).json({ message: 'Booking deleted successfully!' });
        });
    });
});

// GET /settings - Retrieve user settings (Authenticated Users)
app.get('/settings', isAuthenticated, (req, res) => {
    const userId = req.session.user.user_id;
    const query = 'SELECT * FROM user_settings WHERE user_id = ?';
    conn.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching settings:', err);
            return res.status(500).json({ error: 'Failed to retrieve settings' });
        }
        if (results.length === 0) {
            // If settings do not exist, create default settings
            const insertDefault = `
                INSERT INTO user_settings (user_id) VALUES (?)
            `;
            conn.query(insertDefault, [userId], (err, insertResult) => {
                if (err) {
                    console.error('Error inserting default settings:', err);
                    return res.status(500).json({ error: 'Failed to create default settings' });
                }
                // Retrieve the newly created settings
                conn.query(query, [userId], (err, newResults) => {
                    if (err) {
                        console.error('Error fetching settings:', err);
                        return res.status(500).json({ error: 'Failed to retrieve settings' });
                    }
                    res.status(200).json({ settings: newResults[0] });
                });
            });
        } else {
            res.status(200).json({ settings: results[0] });
        }
    });
});

// PUT /settings - Update user settings (Authenticated Users)
app.put('/settings',
    isAuthenticated,
    [
        body('push_notifications').optional().isBoolean(),
        body('units').optional().isIn(['metric', 'imperial']),
        body('location_sharing').optional().isBoolean(),
        body('pickup_stop').optional().isString().isLength({ max: 100 }),
        body('dropoff_stop').optional().isString().isLength({ max: 100 })
    ],
    (req, res) => {
        const userId = req.session.user.user_id;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { push_notifications, units, location_sharing, pickup_stop, dropoff_stop } = req.body;

        // Build dynamic query based on provided fields
        let query = 'UPDATE user_settings SET ';
        const fields = [];
        const params = [];

        if (push_notifications !== undefined) {
            fields.push('push_notifications = ?');
            params.push(push_notifications);
        }
        if (units) {
            fields.push('units = ?');
            params.push(units);
        }
        if (location_sharing !== undefined) {
            fields.push('location_sharing = ?');
            params.push(location_sharing);
        }
        if (pickup_stop) {
            fields.push('pickup_stop = ?');
            params.push(pickup_stop);
        }
        if (dropoff_stop) {
            fields.push('dropoff_stop = ?');
            params.push(dropoff_stop);
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No valid fields provided for update' });
        }

        query += fields.join(', ') + ' WHERE user_id = ?';
        params.push(userId);

        conn.query(query, params, (err, result) => {
            if (err) {
                console.error('Error updating settings:', err);
                return res.status(500).json({ error: 'Failed to update settings' });
            }
            res.status(200).json({ message: 'Settings updated successfully!' });
        });
    }
);

// POST /settings/password-reset - Reset User Password (Authenticated Users)
app.post('/settings/password-reset',
    isAuthenticated,
    [
        body('currentPassword').isString().notEmpty(),
        body('newPassword').isString().isLength({ min: 6 })
    ],
    (req, res) => {
        const userId = req.session.user.user_id;
        const { currentPassword, newPassword } = req.body;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Fetch current hashed password
        const query = 'SELECT password FROM user_accounts WHERE user_id = ?';
        conn.query(query, [userId], (err, results) => {
            if (err) {
                console.error('Error fetching user password:', err);
                return res.status(500).json({ error: 'Failed to retrieve current password' });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const hashedPassword = results[0].password;

            // Compare currentPassword with hashedPassword
            bcrypt.compare(currentPassword, hashedPassword, (err, isMatch) => {
                if (err) {
                    console.error('Error comparing passwords:', err);
                    return res.status(500).json({ error: 'Failed to compare passwords' });
                }

                if (!isMatch) {
                    return res.status(400).json({ error: 'Current password is incorrect' });
                }

                // Hash newPassword
                bcrypt.hash(newPassword, 10, (err, newHashedPassword) => {
                    if (err) {
                        console.error('Error hashing new password:', err);
                        return res.status(500).json({ error: 'Failed to hash new password' });
                    }

                    // Update password in the database
                    const updateQuery = 'UPDATE user_accounts SET password = ? WHERE user_id = ?';
                    conn.query(updateQuery, [newHashedPassword, userId], (err, updateResult) => {
                        if (err) {
                            console.error('Error updating password:', err);
                            return res.status(500).json({ error: 'Failed to update password' });
                        }

                        res.status(200).json({ message: 'Password reset successfully!' });
                    });
                });
            });
        });
    }
);

// DELETE /settings/delete-account - Delete User Account (Authenticated Users)
app.delete('/settings/delete-account', isAuthenticated, (req, res) => {
    const userId = req.session.user.user_id;

    // Delete user account; cascades to user_settings and user_trips due to foreign key constraints
    const deleteQuery = 'DELETE FROM user_accounts WHERE user_id = ?';
    conn.query(deleteQuery, [userId], (err, result) => {
        if (err) {
            console.error('Error deleting user account:', err);
            return res.status(500).json({ error: 'Failed to delete account' });
        }

        // Destroy session
        req.session.destroy(err => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.status(500).json({ error: 'Account deleted but failed to log out' });
            }
            res.clearCookie('iub_bus_cookie'); // Correct cookie name
            res.status(200).json({ message: 'Account deleted successfully!' });
        });
    });
});

/**
 * Helper Function to Format Time from HH:MM:SS to HH:MM AM/PM
 * @param {string} timeStr - Time string in HH:MM:SS format
 * @returns {string} - Formatted time string in HH:MM AM/PM
 */
function formatTime(timeStr) {
    const [hour, minute, second] = timeStr.split(':');
    let period = 'AM';
    let formattedHour = parseInt(hour, 10);

    if (formattedHour >= 12) {
        period = 'PM';
        if (formattedHour > 12) {
            formattedHour -= 12;
        }
    }
    if (formattedHour === 0) {
        formattedHour = 12;
    }

    return `${formattedHour.toString().padStart(2, '0')}:${minute} ${period}`;
}

// GET /settings/offline-schedule - Download Offline Schedule as PDF (Authenticated Users)
app.get('/settings/offline-schedule', isAuthenticated, (req, res) => {
    const userId = req.session.user.user_id;

    // Fetch all shuttle schedules
    const query = `
        SELECT 
            ss.schedule_id, 
            s.shuttle_number, 
            r.route_name, 
            ss.departure_time, 
            ss.arrival_time, 
            ss.days_of_operation,
            s.current_status,
            r.start_location,
            r.end_location
        FROM 
            shuttle_schedules ss
        JOIN 
            shuttle_info s ON ss.shuttle_id = s.shuttle_id
        JOIN 
            route_info r ON ss.route_id = r.route_id
        ORDER BY 
            r.route_name, s.shuttle_number
    `;

    conn.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching shuttle schedules:', err);
            return res.status(500).json({ error: 'Failed to retrieve shuttle schedules' });
        }

        // Generate PDF
        const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 }); // Landscape with margins
        const filename = 'Offline_Schedule.pdf';
        res.setHeader('Content-disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        // Title
        doc
            .fontSize(20)
            .font('Helvetica-Bold')
            .text('IUB Smart Shuttle - Offline Schedule', {
                align: 'center',
            });
        doc.moveDown(2);

        // Table Configurations
        const tableTop = doc.y;
        const columnWidths = [100, 100, 120, 120, 90, 90, 180]; // Adjust widths as needed
        const rowHeight = 30; // Increased row height for wrapping
        const headerHeight = 20;
        const marginLeft = doc.page.margins.left;
        const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);

        // Table Headers
        const headers = [
            'Route Name',
            'Shuttle Number',
            'Start Location',
            'End Location',
            'Departure Time',
            'Arrival Time',
            'Days of Operation',
        ];
        let x = marginLeft;
        const headerY = tableTop;

        doc
            .fontSize(12)
            .font('Helvetica-Bold');

        headers.forEach((header, i) => {
            doc.text(header, x, headerY, {
                width: columnWidths[i],
                align: 'left',
                valign: 'middle',
            });
            x += columnWidths[i];
        });

        // Draw Header Line
        doc
            .moveTo(marginLeft, headerY + headerHeight)
            .lineTo(marginLeft + tableWidth, headerY + headerHeight)
            .stroke();

        let y = headerY + headerHeight + 10; // Add spacing after header

        // Table Rows
        doc.font('Helvetica').fontSize(10); // Reduced font size for data

        results.forEach((schedule) => {
            x = marginLeft;

            const rowData = [
                schedule.route_name,
                schedule.shuttle_number,
                schedule.start_location,
                schedule.end_location,
                formatTime(schedule.departure_time),
                formatTime(schedule.arrival_time),
                schedule.days_of_operation,
            ];

            rowData.forEach((data, i) => {
                const textOptions = {
                    width: columnWidths[i] - 20, // Add padding to the right
                    align: 'center',
                };

                // Calculate the height required for the text
                const textHeight = doc.heightOfString(data, textOptions);
                const requiredHeight = Math.max(rowHeight, textHeight + 5); // Add some padding

                doc.text(data, x, y, textOptions);
                x += columnWidths[i];
            });

            // Draw a horizontal line after each row
            doc
                .moveTo(marginLeft, y + rowHeight - 5)
                .lineTo(marginLeft + tableWidth, y + rowHeight - 5)
                .stroke();

            y += rowHeight + 10; // Add spacing between rows

            // Check for page break
            if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
                doc.addPage({ size: 'A4', layout: 'landscape', margin: 10 });
                y = doc.page.margins.top;
            }
        });

        // Finalize PDF
        doc.end();
    });
});


// GET /user/shuttle-schedules - Retrieve all available shuttle schedules for users
app.get('/user/shuttle-schedules', isUserAuthenticated, (req, res) => {
    const query = `
        SELECT 
            ss.schedule_id, 
            ss.shuttle_id, 
            s.shuttle_number,
            s.capacity,
            (
                SELECT COUNT(*) 
                FROM user_trips ut 
                WHERE ut.schedule_id = ss.schedule_id AND ut.booking_status IN ('Pending', 'Approved')
            ) AS booked_seats,
            ss.route_id, 
            r.route_name,
            r.start_location,
            r.end_location,
            ss.departure_time, 
            ss.arrival_time, 
            ss.days_of_operation
        FROM 
            shuttle_schedules ss
        JOIN 
            shuttle_info s ON ss.shuttle_id = s.shuttle_id
        JOIN 
            route_info r ON ss.route_id = r.route_id
        WHERE 
            s.current_status = 'Active'
        ORDER BY 
            ss.departure_time ASC
    `;
    conn.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching shuttle schedules:', err);
            return res.status(500).json({ error: 'Failed to retrieve shuttle schedules' });
        }
        res.status(200).json({ shuttleSchedules: results });
    });
});

// GET /user/bookings - Retrieve all bookings for the logged-in user
app.get('/user/bookings', isUserAuthenticated, (req, res) => {
    const userId = req.session.user.user_id;
    const query = `
        SELECT 
            ut.booking_id,
            ut.schedule_id,
            ss.shuttle_id,
            s.shuttle_number,
            ss.route_id,
            r.route_name,
            r.start_location,
            r.end_location,
            ss.departure_time,
            ss.arrival_time,
            ut.booking_status,
            ut.booking_date,
            ut.number_of_passengers,
            ut.created_at,
            ut.updated_at
        FROM 
            user_trips ut
        JOIN 
            shuttle_schedules ss ON ut.schedule_id = ss.schedule_id
        JOIN 
            shuttle_info s ON ss.shuttle_id = s.shuttle_id
        JOIN 
            route_info r ON ss.route_id = r.route_id
        WHERE 
            ut.user_id = ?
        ORDER BY 
            ss.departure_time ASC
    `;
    conn.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user bookings:', err);
            return res.status(500).json({ error: 'Failed to retrieve bookings' });
        }
        res.status(200).json({ bookings: results });
    });
});


// POST /user/bookings - Create a new booking for the logged-in user
app.post('/user/bookings', isUserAuthenticated, (req, res) => {
    const userId = req.session.user.user_id;
    const { schedule_id, number_of_passengers } = req.body;

    // Validate input
    if (!schedule_id || !number_of_passengers) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (number_of_passengers <= 0) {
        return res.status(400).json({ error: 'Number of passengers must be at least 1' });
    }

    // Check if the schedule exists and has available seats
    const scheduleQuery = `
        SELECT 
            ss.schedule_id,
            ss.shuttle_id,
            s.capacity,
            (
                SELECT COUNT(*) 
                FROM user_trips ut 
                WHERE ut.schedule_id = ss.schedule_id AND ut.booking_status IN ('Pending', 'Approved')
            ) AS booked_seats
        FROM 
            shuttle_schedules ss
        JOIN 
            shuttle_info s ON ss.shuttle_id = s.shuttle_id
        WHERE 
            ss.schedule_id = ?
    `;
    conn.query(scheduleQuery, [schedule_id], (err, scheduleResults) => {
        if (err) {
            console.error('Error fetching shuttle schedule:', err);
            return res.status(500).json({ error: 'Failed to verify shuttle schedule' });
        }

        if (scheduleResults.length === 0) {
            return res.status(404).json({ error: 'Shuttle schedule not found' });
        }

        const schedule = scheduleResults[0];
        const availableSeats = schedule.capacity - schedule.booked_seats;

        if (availableSeats < number_of_passengers) {
            return res.status(400).json({ error: 'Not enough available seats' });
        }

        // Insert the booking
        const insertQuery = `
            INSERT INTO user_trips 
            (user_id, schedule_id, booking_status, booking_date, number_of_passengers) 
            VALUES (?, ?, 'Pending', CURDATE(), ?)
        `;
        conn.query(insertQuery, [userId, schedule_id, number_of_passengers], (err, insertResult) => {
            if (err) {
                console.error('Error creating booking:', err);
                return res.status(500).json({ error: 'Failed to create booking' });
            }

            res.status(201).json({ message: 'Booking created successfully!', bookingId: insertResult.insertId });
        });
    });
});

// DELETE /user/bookings/:id - Cancel a booking (Users can cancel if status is Pending or Approved)
app.delete('/user/bookings/:id', isUserAuthenticated, (req, res) => {
    const userId = req.session.user.user_id;
    const bookingId = req.params.id;

    // Check if the booking exists and belongs to the user
    const checkQuery = `
        SELECT 
            booking_status 
        FROM 
            user_trips 
        WHERE 
            booking_id = ? AND user_id = ?
    `;
    conn.query(checkQuery, [bookingId, userId], (err, results) => {
        if (err) {
            console.error('Error fetching booking:', err);
            return res.status(500).json({ error: 'Failed to retrieve booking' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const bookingStatus = results[0].booking_status;
        if (!['Pending', 'Approved'].includes(bookingStatus)) {
            return res.status(400).json({ error: 'Only Pending or Approved bookings can be cancelled' });
        }

        // Update the booking status to 'Cancelled'
        const updateQuery = `
            UPDATE 
                user_trips 
            SET 
                booking_status = 'Cancelled', updated_at = NOW() 
            WHERE 
                booking_id = ?
        `;
        conn.query(updateQuery, [bookingId], (err, updateResult) => {
            if (err) {
                console.error('Error cancelling booking:', err);
                return res.status(500).json({ error: 'Failed to cancel booking' });
            }

            res.status(200).json({ message: 'Booking cancelled successfully!' });
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