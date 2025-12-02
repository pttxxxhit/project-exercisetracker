const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Middleware (ayudantes para el servidor)
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

// Servir la página principal
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port);
});
// Esquema de Usuario
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    }
});

const User = mongoose.model('User', userSchema);

// Esquema de Ejercicio
const exerciseSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const Exercise = mongoose.model('Exercise', exerciseSchema);
app.post('/api/users', async (req, res) => {
    const username = req.body.username;

    try {
        // Crear un nuevo usuario
        const newUser = new User({ username: username });
        const savedUser = await newUser.save();

        // Responder con el usuario creado
        res.json({
            username: savedUser.username,
            _id: savedUser._id
        });
    } catch (error) {
        res.json({ error: 'Error creating user' });
    }
});
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}).select('_id username');
        res.json(users);
    } catch (error) {
        res.json({ error: 'Error fetching users' });
    }
});
app.post('/api/users/:_id/exercises', async (req, res) => {
    const userId = req.params._id;
    const { description, duration, date } = req.body;

    try {
        // Buscar el usuario
        const user = await User.findById(userId);
        if (!user) {
            return res.json({ error: 'User not found' });
        }

        // Crear el ejercicio
        const exerciseDate = date ? new Date(date) : new Date();

        const newExercise = new Exercise({
            userId: userId,
            description: description,
            duration: parseInt(duration),
            date: exerciseDate
        });

        const savedExercise = await newExercise.save();

        // Responder con el formato requerido
        res.json({
            username: user.username,
            description: savedExercise.description,
            duration: savedExercise.duration,
            date: savedExercise.date.toDateString(),
            _id: user._id
        });
    } catch (error) {
        res.json({ error: 'Error adding exercise' });
    }
});
app.get('/api/users/:_id/logs', async (req, res) => {
    const userId = req.params._id;
    const { from, to, limit } = req.query;

    try {
        // Buscar el usuario
        const user = await User.findById(userId);
        if (!user) {
            return res.json({ error: 'User not found' });
        }

        // Construir el filtro de búsqueda
        let filter = { userId: userId };

        // Si hay fecha "from" o "to", agregar filtro de fecha
        if (from || to) {
            filter.date = {};
            if (from) {
                filter.date.$gte = new Date(from);
            }
            if (to) {
                filter.date.$lte = new Date(to);
            }
        }

        // Buscar ejercicios
        let exercisesQuery = Exercise.find(filter).select('description duration date');

        // Si hay límite, aplicarlo
        if (limit) {
            exercisesQuery = exercisesQuery.limit(parseInt(limit));
        }

        const exercises = await exercisesQuery.exec();

        // Formatear la respuesta
        const log = exercises.map(ex => ({
            description: ex.description,
            duration: ex.duration,
            date: ex.date.toDateString()
        }));

        res.json({
            username: user.username,
            count: exercises.length,
            _id: user._id,
            log: log
        });
    } catch (error) {
        res.json({ error: 'Error fetching logs' });
    }
});
