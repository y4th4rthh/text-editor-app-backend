const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const prettier = require('prettier');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection (use environment variable for the URI)
const mongoURI = process.env.MONGODB_URI || 'your_mongodb_uri_here';
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: 'CodeFormatter'
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// User model
const Schema = mongoose.Schema;
const UserSchema = new Schema({
    email: String,
    password: String,
});
const User = mongoose.model('user', UserSchema);

// Registration endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // TODO: Implement JWT token generation here
    res.json({ message: 'Logged in successfully' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Code formatting endpoint
app.post('/format-code', async (req, res) => {
    const { code, language } = req.body;

    try {
        let formattedCode;
        let parser;

        switch (language.toLowerCase()) {
            case 'javascript':
            case 'js':
                parser = 'babel';
                break;
            case 'typescript':
            case 'ts':
                parser = 'typescript';
                break;
            case 'css':
                parser = 'css';
                break;
            case 'html':
                parser = 'html';
                break;
            case 'json':
                parser = 'json';
                break;
            case 'markdown':
            case 'md':
                parser = 'markdown';
                break;
            case 'yaml':
                parser = 'yaml';
                break;
            case 'python':
            case 'py':
                // For Python, we'll use a different approach
                formattedCode = await formatPython(code);
                return res.json({ formattedCode });
            case 'java':
            case 'c':
            case 'cpp':
                // For Java, C, and C++, we'll use a different approach
                formattedCode = await formatCFamily(code, language);
                return res.json({ formattedCode });
            default:
                return res.status(400).json({ error: 'Unsupported language' });
        }

        formattedCode = await prettier.format(code, { parser: parser });
        res.json({ formattedCode });
    } catch (error) {
        console.error('Formatting error:', error);
        res.status(500).json({ error: 'An error occurred during formatting' });
    }
});

async function formatPython(code) {
    // Here you would integrate with a Python formatter like Black
    // For now, we'll just return the original code
    return code;
}

async function formatCFamily(code, language) {
    // Here you would integrate with a formatter for C-family languages
    // For now, we'll just return the original code
    return code;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});
