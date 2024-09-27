const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const app = express();
app.use(cors());
app.use(bodyParser.json());

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

app.listen(3000, () => {
    console.log('Backend server is running on port 3000');
});