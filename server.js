const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servir archivos estáticos (tu frontend)
app.use(express.static('public'));

// ============ BASE DE DATOS SQLITE ============
const db = new sqlite3.Database('./catalogo.db', (err) => {
    if (err) {
        console.error('❌ Error al conectar a la base de datos:', err.message);
    } else {
        console.log('✅ Conectado a la base de datos SQLite');
        
        // Crear tabla de productos si no existe
        db.run(`CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            descripcion TEXT,
            precio REAL NOT NULL,
            icono TEXT DEFAULT 'fa-microchip',
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('❌ Error al crear tabla:', err.message);
            } else {
                console.log('✅ Tabla productos verificada/creada');
                
                // Insertar productos de ejemplo si la tabla está vacía
                db.get(`SELECT COUNT(*) as count FROM productos`, [], (err, row) => {
                    if (err) {
                        console.error('❌ Error al contar productos:', err.message);
                    } else if (row.count === 0) {
                        const productosEjemplo = [
                            { nombre: "Laptop Gamer Aorus i7", descripcion: "RTX 4060, 16GB RAM, 1TB SSD", precio: 22999, icono: "fa-laptop" },
                            { nombre: "PC Workstation Pro", descripcion: "Ryzen 7, 32GB RAM, SSD+HDD", precio: 16499, icono: "fa-desktop" },
                            { nombre: "Monitor Curvo 27\" 165Hz", descripcion: "Full HD, 1ms, FreeSync", precio: 3899, icono: "fa-tv" },
                            { nombre: "Teclado Mecánico RGB", descripcion: "Switch Red, anti-ghosting", precio: 1299, icono: "fa-keyboard" },
                            { nombre: "Mouse Inalámbrico 26K DPI", descripcion: "Ultraligero, 6 botones", precio: 899, icono: "fa-mouse" },
                            { nombre: "Audífonos 7.1 Surround", descripcion: "Micrófono noise-cancelling", precio: 1590, icono: "fa-headphones" },
                            { nombre: "SSD NVMe 1TB", descripcion: "Lectura 3500MB/s", precio: 1299, icono: "fa-hdd" },
                            { nombre: "Impresora EcoTank", descripcion: "Sistema continuo, wifi", precio: 4499, icono: "fa-print" }
                        ];
                        const stmt = db.prepare(`INSERT INTO productos (nombre, descripcion, precio, icono) VALUES (?, ?, ?, ?)`);
                        productosEjemplo.forEach(prod => {
                            stmt.run(prod.nombre, prod.descripcion, prod.precio, prod.icono);
                        });
                        stmt.finalize();
                        console.log('✅ Productos de ejemplo insertados');
                    }
                });
            }
        });
    }
});

// ============ API ENDPOINTS ============

// Obtener todos los productos
app.get('/api/productos', (req, res) => {
    db.all(`SELECT * FROM productos ORDER BY id ASC`, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Obtener un producto por ID
app.get('/api/productos/:id', (req, res) => {
    const { id } = req.params;
    db.get(`SELECT * FROM productos WHERE id = ?`, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Producto no encontrado' });
            return;
        }
        res.json(row);
    });
});

// Crear nuevo producto
app.post('/api/productos', (req, res) => {
    const { nombre, descripcion, precio, icono } = req.body;
    if (!nombre || !precio) {
        res.status(400).json({ error: 'Nombre y precio son requeridos' });
        return;
    }
    const iconoFinal = icono || 'fa-microchip';
    db.run(`INSERT INTO productos (nombre, descripcion, precio, icono) VALUES (?, ?, ?, ?)`,
        [nombre, descripcion || '', precio, iconoFinal],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json({ id: this.lastID, nombre, descripcion, precio, icono: iconoFinal });
        });
});

// Actualizar producto
app.put('/api/productos/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, precio, icono } = req.body;
    if (!nombre || !precio) {
        res.status(400).json({ error: 'Nombre y precio son requeridos' });
        return;
    }
    db.run(`UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, icono = ? WHERE id = ?`,
        [nombre, descripcion || '', precio, icono || 'fa-microchip', id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'Producto no encontrado' });
                return;
            }
            res.json({ message: 'Producto actualizado' });
        });
});

// Eliminar producto
app.delete('/api/productos/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM productos WHERE id = ?`, [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Producto no encontrado' });
            return;
        }
        res.json({ message: 'Producto eliminado' });
    });
});

// Ruta principal para el frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📡 API disponible en http://localhost:${PORT}/api/productos`);
    console.log(`🌐 Página web: http://localhost:${PORT}`);
});