// db.js

const mysql = require('mysql2');

// Create a connection to the database
const connection = mysql.createConnection({
    host: 'localhost', // Replace with your database host
    user: 'root',      // Replace with your database username
    password: 'root', // Replace with your database password
    database: 'libreriaDB' // Replace with your database name
});

// Connect to the database
connection.connect(err => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database');
});

module.exports = connection;