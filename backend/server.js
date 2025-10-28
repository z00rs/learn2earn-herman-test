import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { gradeSubmissionOnChain, isStudentRegistered, hasStudentBeenRewarded, checkTransactionStatus } from './contractService.js';

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

db.run(`ALTER TABLE submissions ADD COLUMN claim_attempted_at DATETIME`, (err) => {
  if (err && !err.message.includes('duplicate column name')) {
    console.error('Error adding claim_attempted_at column:', err.message);
  }
});

// Helper function to get submission from database
function getSubmission(walletAddress) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM submissions WHERE wallet_address = ?',
      [walletAddress],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
}

// Cache for statuses to avoid frequent contract requests
const statusCache = new Map();
const CACHE_DURATION = 5000; // 5 seconds

function getCachedStatus(walletAddress) {
  const cached = statusCache.get(walletAddress.toLowerCase());
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`📦 Using cached status for ${walletAddress}`);
    return cached.data;
  }
  return null;
}

function setCachedStatus(walletAddress, data) {
  statusCache.set(walletAddress.toLowerCase(), {
    data,
    timestamp: Date.now()
  });
}

function clearCachedStatus(walletAddress) {
  statusCache.delete(walletAddress.toLowerCase());
  console.log(`🧹 Cleared cache for ${walletAddress}`);
}

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
        message: 'Student must be registered in the smart contract before submitting proof' 
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
      // Update existing submission if it's a placeholder or allow proof_link update
      if (existingSubmission.proof_link === 'PLACEHOLDER' || !existingSubmission.proof_link) {
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE submissions SET name = ?, proof_link = ?, submitted_at = CURRENT_TIMESTAMP WHERE wallet_address = ?',
            [name, proofLink, walletAddress],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        
        return res.json({ 
          message: 'Submission updated successfully',
          walletAddress,
          status: 'updated'
        });
      } else {
        return res.status(400).json({ 
          message: 'Submission already exists for this wallet address' 
        });
      }
    }

    // Create new submission
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO submissions (wallet_address, name, proof_link) VALUES (?, ?, ?)',
        [walletAddress, name, proofLink],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.status(201).json({ 
      message: 'Submission received successfully',
      walletAddress,
      status: 'created'
    });
  } catch (error) {
    console.error('Error saving submission:', error);
    res.status(500).json({ 
      message: 'Failed to save submission' 
    });
  }
});// Endpoint to get submission information
app.get('/api/submissions/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;
  
  try {
    const submission = await getSubmission(walletAddress);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    res.json(submission);
  } catch (error) {
    console.error('❌ Error getting submission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to check full student status
app.get('/api/submissions/:walletAddress/status', async (req, res) => {
  const { walletAddress } = req.params;
  
  try {
    // Check cache first
    const cachedStatus = getCachedStatus(walletAddress);
    if (cachedStatus) {
      return res.json(cachedStatus);
    }

    console.log(`🔍 Checking full status for: ${walletAddress}`);
    
    // Check registration in contract
    const isRegistered = await isStudentRegistered(walletAddress);
    
    // Check reward status
    const isRewarded = await hasStudentBeenRewarded(walletAddress);
    
    // Check submission in database
    const submission = await getSubmission(walletAddress);
    
    const status = {
      walletAddress,
      isRegistered,
      isRewarded,
      hasSubmission: !!submission,
      submission: submission || null,
      canClaimReward: isRegistered && !isRewarded && submission && submission.approved && !submission.claimed
    };
    
    // Cache the result
    setCachedStatus(walletAddress, status);
    
    console.log(`📊 Status for ${walletAddress}:`, status);
    res.json(status);
  } catch (error) {
    console.error('❌ Error checking status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});app.get('/api/submissions', async (req, res) => {
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

// NEW: Clear cache for wallet address (used after registration)
app.post('/api/clear-cache/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;
  
  try {
    clearCachedStatus(walletAddress);
    res.json({ 
      message: 'Cache cleared successfully',
      walletAddress 
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ 
      message: 'Failed to clear cache' 
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

// NEW: Sync registration state - if user is registered in contract but not in DB, create entry
app.post('/api/sync-registration', async (req, res) => {
  const { walletAddress, name } = req.body;

  if (!walletAddress || !name) {
    return res.status(400).json({ 
      message: 'Missing required fields: walletAddress and name are required' 
    });
  }

  try {
    // Check if student is registered in the smart contract
    const isRegistered = await isStudentRegistered(walletAddress);
    
    if (!isRegistered) {
      return res.status(400).json({
        message: 'Student is not registered in the smart contract. Please complete registration first.',
        error: 'NOT_REGISTERED_IN_CONTRACT'
      });
    }

    // Check if already exists in our database
    const existingSubmission = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM submissions WHERE wallet_address = ?',
        [walletAddress.toLowerCase()],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingSubmission) {
      return res.json({
        message: 'Registration already synced',
        walletAddress,
        status: 'already_exists',
        canSubmitProof: true
      });
    }

    // Create a placeholder entry for registered student (without proof yet)
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO submissions (wallet_address, name, proof_link) VALUES (?, ?, ?)',
        [walletAddress.toLowerCase(), name, 'SYNC_PLACEHOLDER'], // Placeholder proof link
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    res.status(201).json({ 
      message: 'Registration state synced successfully! You can now submit your proof.',
      walletAddress,
      status: 'synced',
      canSubmitProof: true
    });

  } catch (error) {
    console.error('Error syncing registration:', error);
    res.status(500).json({ 
      message: 'Failed to sync registration state' 
    });
  }
});

// NEW: Endpoint for students to claim rewards (calls smart contract as registrar)
app.post('/api/submissions/:walletAddress/claim', async (req, res) => {
  const { walletAddress } = req.params;
  
  try {
    // ✅ First check if student has already been rewarded in the contract
    const hasBeenRewarded = await hasStudentBeenRewarded(walletAddress);
    
    if (hasBeenRewarded) {
      return res.status(400).json({
        message: 'You have already successfully claimed your reward! Tokens were distributed to your wallet.',
        error: 'ALREADY_REWARDED',
        alreadyClaimed: true
      });
    }

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

    console.log(`Processing reward claim for ${walletAddress}`);

    // ✅ Check if student is registered in the smart contract
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
      // ⚠️ IMPORTANT: Don't mark as claimed yet - transaction might revert!
      // Only save the transaction hash for tracking
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE submissions SET transaction_hash = ?, claim_attempted_at = ? WHERE wallet_address = ?',
          [contractResult.txId, new Date().toISOString(), walletAddress.toLowerCase()],
          function(err) {
            if (err) reject(err);
            else resolve(this.changes);
          }
        );
      });

      res.json({ 
        message: 'Transaction submitted! Please check the transaction status on VeChain Explorer.',
        txId: contractResult.txId,
        explorerUrl: `https://explore-testnet.vechain.org/transactions/${contractResult.txId}`,
        success: true,
        note: 'If transaction succeeds, you will receive 10 B3TR tokens. Please verify on explorer.',
        canRetryIfFailed: true
      });
    } else {
      res.status(500).json({ 
        message: `Smart contract transaction failed: ${contractResult.error}`,
        error: contractResult.error,
        canRetryIfFailed: true
      });
    }

  } catch (error) {
    console.error('Error processing reward claim:', error);
    res.status(500).json({ 
      message: 'Failed to process reward claim',
      canRetryIfFailed: true
    });
  }
});

// NEW: Endpoint to check transaction status
app.get('/api/submissions/:walletAddress/claim-status', async (req, res) => {
  const { walletAddress } = req.params;
  
  try {
    // Check if student has been rewarded in the contract
    const hasBeenRewarded = await hasStudentBeenRewarded(walletAddress);
    
    // Get submission data including transaction hash
    const submission = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM submissions WHERE wallet_address = ?',
        [walletAddress.toLowerCase()],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!submission) {
      return res.status(404).json({ 
        message: 'No submission found for this wallet address' 
      });
    }

    let transactionStatus = null;
    
    // If there's a transaction hash, check its status
    if (submission.transaction_hash) {
      transactionStatus = await checkTransactionStatus(submission.transaction_hash);
    }

    res.json({
      walletAddress,
      hasBeenRewarded,
      canClaim: submission.approved === 1 && !hasBeenRewarded,
      lastTransactionHash: submission.transaction_hash,
      lastAttemptAt: submission.claim_attempted_at,
      transactionStatus,
      explorerUrl: submission.transaction_hash ? 
        `https://explore-testnet.vechain.org/transactions/${submission.transaction_hash}` : null
    });

  } catch (error) {
    console.error('Error checking claim status:', error);
    res.status(500).json({ 
      message: 'Failed to check claim status' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});