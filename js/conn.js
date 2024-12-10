var mysql = require('mysql');

var conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password123',
    database: 'iub_smart_shuttle_db'
});

conn.connect(function(err) {
    if (err) {
        throw err;
    }
    console.log('Connected to the database!');

    var query = 'SHOW TABLES';
    conn.query(query, function(err, result) {
        if (err) throw err;
        console.log('Tables in the database:', result);
    });
// // Disconnect after successful connection
    // conn.end(function(err) {
    //     if (err) {
    //         console.log('Error while disconnecting:', err.message);
    //     } else {
    //         console.log('Disconnected from the database.');
    //     }
    // });
});
