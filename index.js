const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
const mongoURI = 'mongodb+srv://yatharthpatel014:yatharth@cluster0.5uwjd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: 'TextEditor'
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

app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
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

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Here you would typically create and send a JWT token
    // For simplicity, we're just sending a success message
    res.json({ message: 'Logged in successfully' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/run-code', async (req, res) => {
    const { code, language } = req.body;
    
    try {
        switch (language) {
            case 'python':
                try {
                    const tempFilePath = path.join(os.tmpdir(), `tempCode_${Date.now()}.py`);
                    
                    await fs.writeFile(tempFilePath, code);
                    
                    exec(`python "${tempFilePath}"`, (error, stdout, stderr) => {
                        fs.unlink(tempFilePath).catch(console.error);
                        
                        if (error) {
                            return res.json({ error: stderr });
                        }
                        
                        res.json({ output: stdout });
                    });
                } catch (err) {
                    res.json({ error: err.message });
                }
                break;
            
            case 'html':
            case 'css':
                // For HTML/CSS, we'll just send the code back to be rendered on the client-side
                return res.json({ output: code });
            
            default:
                return res.json({ error: 'Unsupported language. Please use Python, HTML, or CSS.' });
        }
    } catch (error) {
        res.json({ error: 'An unexpected error occurred' });
    }
});
     

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});
