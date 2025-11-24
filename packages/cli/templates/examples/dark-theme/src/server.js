import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`✓ Admin Dashboard running at http://localhost:${PORT}`);
  console.log(`✓ Open your browser to see the professional dashboard!`);
  console.log(`💡 Tutorial goal: Add dark theme support`);
});
