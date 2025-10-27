import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { gradeSubmissionOnChain, isStudentRegistered } from './contractService.js';

// Load .env from parent directory (Learn2Earn/.env)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🔧 SERVER: Loading .env from:', join(__dirname, '..', '.env'));
console.log('🔑 SERVER: MODERATOR_KEY loaded:', process.env.MODERATOR_KEY ? 'YES' : 'NO');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const dbPath = join(__dirname, 'submissions.db');
console.log('📁 Using database at:', dbPath);

const db = new sqlite3.Database(dbPath);

db.run(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    proof_link TEXT NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved BOOLEAN DEFAULT 0,
    approved_at DATETIME,
    moderator_notes TEXT,
    claimed BOOLEAN DEFAULT 0,
    claimed_at DATETIME,
    transaction_hash TEXT
  )
`);

// Add the new columns if they don't exist (migration)
db.run(`ALTER TABLE submissions ADD COLUMN claimed BOOLEAN DEFAULT 0`, (err) => {
  if (err && !err.message.includes('duplicate column name')) {
    console.error('Error adding claimed column:', err.message);
  }
});

db.run(`ALTER TABLE submissions ADD COLUMN claimed_at DATETIME`, (err) => {
  if (err && !err.message.includes('duplicate column name')) {
    console.error('Error adding claimed_at column:', err.message);
  }
});

db.run(`ALTER TABLE submissions ADD COLUMN transaction_hash TEXT`, (err) => {
  if (err && !err.message.includes('duplicate column name')) {
    console.error('Error adding transaction_hash column:', err.message);
  }
});

app.post('/api/submissions', async (req, res) => {
  const { walletAddress, name, proofLink } = req.body;

  if (!walletAddress || !name || !proofLink) {
    return res.status(400).json({ 
      message: 'Missing required fields: walletAddress, name, and proofLink are required' 
    });
  }

  try {
    // ✅ NEW: Check if student is registered in the smart contract FIRST
    const isRegistered = await isStudentRegistered(walletAddress);
    
    if (!isRegistered) {
      return res.status(400).json({
        message: 'You must register in the smart contract first. Please complete registration with 1 VET payment before submitting proof.',
        error: 'NOT_REGISTERED_IN_CONTRACT'
      });
    }

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
      claimed: submission.claimed === 1,
      submittedAt: submission.submitted_at,
      approvedAt: submission.approved_at,
      claimedAt: submission.claimed_at,
      transactionHash: submission.transaction_hash,
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
  const moderatorKey = req.headers['x-moderator-key'];
  
  if (moderatorKey !== process.env.MODERATOR_KEY) {
    return res.status(401).json({ 
      message: 'Unauthorized' 
    });
  }

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
        [approved ? 1 : 0, new Date().toISOString(), moderatorNotes || null, walletAddress.toLowerCase()],
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

// NEW: Check if student is registered in smart contract
app.get('/api/check-registration/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;
  
  try {
    const isRegistered = await isStudentRegistered(walletAddress);
    
    res.json({
      walletAddress,
      isRegistered,
      message: isRegistered 
        ? 'Student is registered in the smart contract' 
        : 'Student is NOT registered in the smart contract'
    });
  } catch (error) {
    console.error('Error checking registration:', error);
    res.status(500).json({ 
      message: 'Failed to check registration',
      error: error.message
    });
  }
});

// NEW: Endpoint for students to claim rewards (calls smart contract as registrar)
app.post('/api/submissions/:walletAddress/claim', async (req, res) => {
  const { walletAddress } = req.params;
  
  try {
    // Check if submission is approved in database
    const submission = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM submissions WHERE wallet_address = ? AND approved = 1',
        [walletAddress.toLowerCase()],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!submission) {
      return res.status(404).json({ 
        message: 'No approved submission found for this wallet address' 
      });
    }

    // Check if already claimed
    if (submission.claimed) {
      return res.status(400).json({ 
        message: 'Reward has already been claimed' 
      });
    }

    console.log(`Processing reward claim for ${walletAddress}`);

    // ✅ NEW: Check if student is registered in the smart contract
    const isRegistered = await isStudentRegistered(walletAddress);
    
    if (!isRegistered) {
      return res.status(400).json({
        message: 'You must register in the smart contract first. Please complete registration with 1 VET payment.',
        error: 'NOT_REGISTERED_IN_CONTRACT'
      });
    }

    // Call the smart contract gradeSubmission function
    const contractResult = await gradeSubmissionOnChain(walletAddress, true);

    if (contractResult.success) {
      // Update database with transaction hash
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE submissions SET claimed = 1, claimed_at = ?, transaction_hash = ? WHERE wallet_address = ?',
          [new Date().toISOString(), contractResult.txId, walletAddress.toLowerCase()],
          function(err) {
            if (err) reject(err);
            else resolve(this.changes);
          }
        );
      });

      res.json({ 
        message: 'Reward successfully claimed! B3TR tokens have been distributed.',
        txId: contractResult.txId,
        success: true
      });
    } else {
      res.status(500).json({ 
        message: `Smart contract transaction failed: ${contractResult.error}`,
        error: contractResult.error
      });
    }

  } catch (error) {
    console.error('Error processing reward claim:', error);
    res.status(500).json({ 
      message: 'Failed to process reward claim' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});