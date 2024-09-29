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

const getTempDirectory = () => {
    return os.tmpdir();
};

app.post('/run-code', async (req, res) => {
    const { code, language } = req.body;
    let command = '';
    const tempDir = getTempDirectory();
    let tempFileName = `tempCode_${Date.now()}`;
    let filePath = '';
    try {
        switch (language) {
            case 'python':
                filePath = path.join(tempDir, `${tempFileName}.py`);
                await fs.writeFile(filePath, code);
                command = `python "${filePath}"`;
                break;
            case 'java':
                const classMatch = code.match(/public\s+class\s+(\w+)/);
                if (classMatch) {
                    const className = classMatch[1];
                    filePath = path.join(tempDir, `${className}.java`);
                    await fs.writeFile(filePath, code);
                    command = `javac "${filePath}" && java -cp "${tempDir}" ${className}`;
                } else {
                    throw new Error('No public class found in Java code');
                }
                break;
            default:
                return res.json({ error: 'Unsupported language. Please use Java or Python.' });
        }
        // Execute the code
        exec(command, { cwd: tempDir }, async (error, stdout, stderr) => {
            try {
                // Cleanup temp files
                await fs.unlink(filePath);
                if (language === 'java') {
                    const className = path.parse(filePath).name;
                    await fs.unlink(path.join(tempDir, `${className}.class`)).catch(() => {});
                }
                if (error) {
                    return res.json({ error: stderr });
                }
                res.json({ output: stdout });
            } catch (cleanupError) {
                console.error('Error during cleanup:', cleanupError);
                res.json({ error: 'An error occurred during cleanup' });
            }
        });
    } catch (err) {
        console.error('Error:', err);
        res.json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});
