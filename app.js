
const express = require('express');
const authenticateUser = require('./authMiddleware'); 
const requireAdmin = require('./roleMiddleware'); // Import the admin role middleware
const db = require('./db');
const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/usuarios', (req, res) => {
    db.query('SELECT * FROM usuarios', (err, results) => {
        if (err) {
            console.error('Error al obtener los datos:', err);
            res.status(500).send('Ocurrió un error');
            return;
        }
        res.json(results);
    });
});

app.post('/usuarios', (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    const query = 'INSERT INTO usuarios (username, email, password) VALUES (?, ?, ?)';
    db.query(query, [username, email, password], (err, results) => {
        if (err) {
            console.error('Error al insertar el usuario:', err);
            return res.status(500).json({ message: 'Ocurrió un error al crear el usuario' });
        }
        res.status(201).json({ message: 'Usuario creado exitosamente', userId: results.insertId });
    });
});

app.get('/libros', (req, res) => {
    db.query('SELECT * FROM libros', (err, results) => {
        if (err) {
            console.error('Error al obtener los libros:', err);
            res.status(500).send('Ocurrió un error');
            return;
        }
        res.json(results);
    });
});

app.post('/libros', (req, res) => {
    const { titulo, autor, anio, categoria, sinopsis, precio, cantidad } = req.body;

    if (!titulo || !autor || !anio || !precio || !cantidad) {
        return res.status(400).json({ message: 'Campos requeridos: titulo, autor, anio, precio, cantidad' });
    }

    const query = `
        INSERT INTO libros (titulo, autor, anio, categoria, sinopsis, precio, cantidad)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [titulo, autor, anio, categoria, sinopsis, precio, cantidad], (err, results) => {
        if (err) {
            console.error('Error al insertar el libro:', err);
            return res.status(500).json({ message: 'Ocurrió un error al crear el libro' });
        }
        res.status(201).json({ message: 'Libro creado exitosamente', bookId: results.insertId });
    });
});

app.get('/libros/:id', (req, res) => {
    const bookId = req.params.id;

    const query = 'SELECT * FROM libros WHERE id = ?';
    db.query(query, [bookId], (err, results) => {
        if (err) {
            console.error('Error al obtener el libro:', err);
            return res.status(500).json({ message: 'Ocurrió un error al obtener el libro' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Libro no encontrado' });
        }

        res.status(200).json(results[0]);
    });
});

let carts = {};

app.post('/carrito/add', (req, res) => {
    const { userId, bookId, quantity } = req.body;

    if (!userId || !bookId || !quantity || quantity < 1) {
        return res.status(400).json({ message: 'El ID de usuario, ID de libro y cantidad son requeridos, y la cantidad debe ser al menos 1' });
    }

    db.query('SELECT * FROM libros WHERE id = ?', [bookId], (err, results) => {
        if (err) {
            console.error('Error al obtener el libro:', err);
            return res.status(500).json({ message: 'Ocurrió un error al agregar el libro al carrito' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Libro no encontrado' });
        }

        const book = results[0];
        if (!carts[userId]) {
            carts[userId] = [];
        }
        carts[userId].push({ bookId, quantity, bookDetails: book });

        res.status(201).json({ message: 'Libro agregado al carrito', cart: carts[userId] });
    });
});

app.post('/carrito/checkout', (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'El ID de usuario debe ser proporcionado' });
    }

    if (!carts[userId] || carts[userId].length < 1) {
        return res.status(400).json({ message: 'Necesitas pedir al menos un libro para realizar un pedido' });
    }
    
    db.query('INSERT INTO carrito (user_id, books) VALUES (?, ?)', [userId, JSON.stringify(carts[userId])], (err, results) => {
        if (err) {
            console.error('Error al realizar el pedido:', err);
            return res.status(500).json({ message: 'Ocurrió un error al realizar el pedido' });
        }

        carts[userId] = [];

        res.status(201).json({ message: 'Pedido realizado exitosamente', orderId: results.insertId });
    });
});

app.post('/categorias', (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'El nombre de la categoría es requerido' });
    }

    const query = 'INSERT INTO categorias (name) VALUES (?)';
    db.query(query, [name], (err, results) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'La categoría ya existe' });
            }
            console.error('Error al crear la categoría:', err);
            return res.status(500).json({ message: 'Ocurrió un error al crear la categoría' });
        }
        res.status(201).json({ message: 'Categoría creada exitosamente', categoryId: results.insertId });
    });
});

app.get('/carrito', (req, res) => {
    const query = `
        SELECT 
            c.id AS order_id,
            c.created_at AS order_date,
            u.id AS user_id,
            u.username,
            u.email,
            c.books
        FROM carrito c
        JOIN usuarios u ON c.user_id = u.id
        ORDER BY c.created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener los pedidos:', err);
            return res.status(500).json({ message: 'Ocurrió un error al obtener los pedidos' });
        }

        const formattedOrders = results.map(order => ({
            orderId: order.order_id,
            orderDate: order.order_date,
            user: {
                userId: order.user_id,
                username: order.username,
                email: order.email,
            },
            books: JSON.parse(order.books) 
        }));

        res.status(200).json(formattedOrders);
    });
});

app.get('/admin/usuarios', authenticateUser, requireAdmin, (req, res) => {
    const query = 'SELECT id, username, email, role, created_at FROM usuarios';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener los usuarios:', err);
            return res.status(500).json({ message: 'Ocurrió un error al obtener los usuarios' });
        }
        res.status(200).json(results);
    });
});

app.get('/profile', authenticateUser, (req, res) => {
    const userId = req.user.id;

    const query = 'SELECT id, username, email, role, created_at FROM usuarios WHERE id = ?';
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error al obtener el perfil:', err);
            return res.status(500).json({ message: 'Ocurrió un error al obtener el perfil' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.status(200).json(results[0]);
    });
});

app.listen(PORT, () => {
    console.log(`El servidor está corriendo en http://localhost:${PORT}`);
});
