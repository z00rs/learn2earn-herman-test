import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(join(__dirname, 'submissions.db'));

db.run(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    proof_link TEXT NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved BOOLEAN DEFAULT 0,
    approved_at DATETIME,
    moderator_notes TEXT
  )
`);

app.post('/api/submissions', async (req, res) => {
  const { walletAddress, name, proofLink } = req.body;

  if (!walletAddress || !name || !proofLink) {
    return res.status(400).json({ 
      message: 'Missing required fields: walletAddress, name, and proofLink are required' 
    });
  }

  try {
    const existingSubmission = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM submissions WHERE wallet_address = ?',
        [walletAddress],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingSubmission) {
      return res.status(400).json({ 
        message: 'You have already submitted a proof' 
      });
    }

    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO submissions (wallet_address, name, proof_link) VALUES (?, ?, ?)',
        [walletAddress, name, proofLink],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    res.status(201).json({ 
      message: 'Submission received successfully',
      walletAddress 
    });
  } catch (error) {
    console.error('Error saving submission:', error);
    res.status(500).json({ 
      message: 'Failed to save submission' 
    });
  }
});

app.get('/api/submissions/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;

  try {
    const submission = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM submissions WHERE wallet_address = ?',
        [walletAddress],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!submission) {
      return res.status(404).json({ 
        message: 'No submission found' 
      });
    }

    res.json({
      submitted: true,
      approved: submission.approved === 1,
      submittedAt: submission.submitted_at,
      approvedAt: submission.approved_at,
      name: submission.name,
      proofLink: submission.proof_link
    });
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ 
      message: 'Failed to fetch submission' 
    });
  }
});

app.get('/api/submissions', async (req, res) => {
  try {
    const submissions = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM submissions ORDER BY submitted_at DESC',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json(submissions.map(sub => ({
      id: sub.id,
      walletAddress: sub.wallet_address,
      name: sub.name,
      proofLink: sub.proof_link,
      submitted: true,
      approved: sub.approved === 1,
      submittedAt: sub.submitted_at,
      approvedAt: sub.approved_at,
      moderatorNotes: sub.moderator_notes
    })));
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ 
      message: 'Failed to fetch submissions' 
    });
  }
});

app.put('/api/submissions/:walletAddress/approve', async (req, res) => {
  const { walletAddress } = req.params;
  const { approved, moderatorNotes } = req.body;
  
  const moderatorKey = req.headers['x-moderator-key'];
  
  if (moderatorKey !== process.env.MODERATOR_KEY) {
    return res.status(401).json({ 
      message: 'Unauthorized' 
    });
  }

  try {
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE submissions 
         SET approved = ?, approved_at = ?, moderator_notes = ?
         WHERE wallet_address = ?`,
        [approved ? 1 : 0, new Date().toISOString(), moderatorNotes || null, walletAddress],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    res.json({ 
      message: 'Submission updated successfully',
      approved 
    });
  } catch (error) {
    console.error('Error updating submission:', error);
    res.status(500).json({ 
      message: 'Failed to update submission' 
    });
  }
});

app.get('/api/submissions/approved', async (req, res) => {
  try {
    const submissions = await new Promise((resolve, reject) => {
      db.all(
        'SELECT wallet_address, name FROM submissions WHERE approved = 1',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json(submissions);
  } catch (error) {
    console.error('Error fetching approved submissions:', error);
    res.status(500).json({ 
      message: 'Failed to fetch approved submissions' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});