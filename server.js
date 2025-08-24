// Import dependensi
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

// Import Model
const User = require('./models/User');
const Order = require('./models/Order');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Koneksi ke MongoDB ATLAS (INI YANG BARU)
mongoose.connect(process.env.MONGO_URI, {})
  .then(() => console.log('MongoDB Atlas Connected'))
  .catch(err => console.log(err));

// Konfigurasi Nodemailer untuk SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

// Middleware untuk otentikasi token
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (e) {
        res.status(400).json({ msg: 'Token is not valid' });
    }
};

// --- API Routes ---

// Rute Registrasi dengan Verifikasi Email
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'Email sudah terdaftar.' });
        }

        const emailToken = crypto.randomBytes(32).toString('hex');
        user = new User({ username, email, password, emailToken });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        const verificationLink = `https://carwash-1-23p3.onrender.com/api/verify-email?token=${emailToken}`;
        const mailOptions = {
            from: `"SpeedyClean Carwash" <${process.env.GMAIL_USER}>`,
            to: user.email,
            subject: 'Verifikasi Akun Anda',
            html: `<h2>Halo ${username},</h2><p>Terima kasih telah mendaftar. Silakan klik link di bawah ini untuk mengaktifkan akun Anda:</p><a href="${verificationLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verifikasi Email</a>`,
        };

        await transporter.sendMail(mailOptions);
        res.status(201).json({ msg: 'Registrasi berhasil! Silakan periksa email Anda untuk link verifikasi.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Rute Verifikasi Email
app.get('/api/verify-email', async (req, res) => {
    try {
        const token = req.query.token;
        const user = await User.findOne({ emailToken: token });

        if (!user) {
            return res.status(400).send('<h1>Error</h1><p>Token verifikasi tidak valid atau sudah kedaluwarsa.</p>');
        }

        user.isVerified = true;
        user.emailToken = undefined;
        await user.save();

        res.redirect('/login.html?verified=true');
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Rute Login dengan Pengecekan Verifikasi
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Kredensial tidak valid' });
        }

        if (!user.isVerified) {
            return res.status(401).json({ msg: 'Akun belum diverifikasi. Silakan periksa email Anda.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Kredensial tidak valid' });
        }

       const payload = { user: { id: user.id } };
       jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
    if (err) throw err;
    // Kirim token DAN role pengguna
    res.json({ 
        token, 
        user: {
            role: user.role 
        }
    }); 
     });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Rute Get User Profile (Protected)
app.get('/api/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Rute Update User Profile (Protected)
app.put('/api/profile', auth, async (req, res) => {
    const { username, email } = req.body;
    try {
        let user = await User.findByIdAndUpdate(req.user.id, { username, email }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Rute Submit Order (Protected)
app.post('/api/orders', auth, async (req, res) => {
    const { customerName, plateNumber, vehicleBrand, vehicleCategory, service, price } = req.body;
    try {
        const newOrder = new Order({ user: req.user.id, customerName, plateNumber, vehicleBrand, vehicleCategory, service, price });
        const order = await newOrder.save();
        res.json(order);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Rute Get All Orders (For Admin - Protected)
app.get('/api/orders', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.email !== 'admin@carwash.com') {
            return res.status(403).json({ msg: 'Access denied. Admins only.' });
        }
        const orders = await Order.find().sort({ date: -1 });
        res.json(orders);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// server.js

// Rute Get All Users (For Admin - Protected)
app.get('/api/users', auth, async (req, res) => {
    try {
        // Lakukan pengecekan role admin
        const requester = await User.findById(req.user.id);
        if (requester.role !== 'admin') {
            return res.status(403).json({ msg: 'Akses ditolak. Hanya untuk Admin.' });
        }

        // Ambil semua pengguna dari database, HAPUS password dari hasilnya
        const users = await User.find().select('-password').sort({ date: -1 });
        res.json(users);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Jalankan server
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
