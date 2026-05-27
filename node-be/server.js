const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Enable JSON request body parsing
app.use(express.json());

// Log all incoming HTTP traffic
app.use((req, res, next) => {
  console.log(`[Express API] ${req.method} ${req.url}`);
  next();
});

// Inject a simulated 800ms network latency exclusively on validation POST requests
// to retain the stateful "Verifying..." animation sequences on the stepper UI.
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path.startsWith('/api/validate')) {
    setTimeout(next, 800);
  } else {
    next();
  }
});

// Dynamic configuration & profile endpoints
app.get('/profiles.json', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'profiles.json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(filePath);
});



// Stateful mock-backend validation API endpoint
app.post('/api/validate/:filename', (req, res) => {
  const { filename } = req.params;
  const { stepId, data = {}, profileId } = req.body;

  const filePath = path.join(__dirname, 'data', 'profiles.json');
  fs.readFile(filePath, 'utf8', (err, profilesData) => {
    let profiles = [];
    if (!err) {
      try {
        profiles = JSON.parse(profilesData);
      } catch (e) {
        console.error('Error parsing profiles database for validation:', e);
      }
    }

    const errors = {};

    // Case 1: Forced client testing errors
    if (filename.includes('error')) {
      if (filename.includes('step1')) {
        errors['email'] = 'This email address is already associated with an active account.';
        errors['lastName'] = 'First name and last name cannot be identical for security purposes.';
      } else if (filename.includes('step2')) {
        errors['username'] = 'The username has already been registered in our central database.';
      } else if (filename.includes('step3')) {
        errors['terms'] = 'You must explicitly consent to terms and conditions.';
      }

      return res.json({
        success: false,
        errors
      });
    }

    // Case 2: Standard step-by-step validations
    const targetStepId = stepId || (filename.includes('step1') ? 'step-1' : filename.includes('step2') ? 'step-2' : 'step-3');

    if (targetStepId === 'step-1') {
      const email = (data.email || '').trim().toLowerCase();
      const firstName = (data.firstName || '').trim().toLowerCase();
      const lastName = (data.lastName || '').trim().toLowerCase();

      // Check if email already exists in any other registered profile inside the database
      const emailExists = profiles.some(p => {
        if (profileId && p.id === profileId) return false; // Skip checking against own profile during edit
        const pEmail = (p.data?.['step-1']?.email || '').trim().toLowerCase();
        return pEmail === email;
      });

      if (emailExists) {
        errors['email'] = 'This email address is already associated with an active account.';
      } else if (email.endsWith('@blocked.com')) {
        errors['email'] = 'Registration using @blocked.com email addresses is restricted.';
      }

      if (firstName && lastName && firstName === lastName) {
        errors['lastName'] = 'First name and last name cannot be identical for security purposes.';
      }
    }

    if (targetStepId === 'step-2') {
      const username = (data.username || '').trim().toLowerCase();
      const experience = data.experience || '';

      // Check if username already exists in any other registered profile inside the database
      const usernameExists = profiles.some(p => {
        if (profileId && p.id === profileId) return false; // Skip checking against own profile during edit
        const pUsername = (p.data?.['step-2']?.username || '').trim().toLowerCase();
        return pUsername === username;
      });

      const reservedUsernames = ['admin', 'administrator', 'root', 'moderator', 'system'];
      if (reservedUsernames.includes(username)) {
        errors['username'] = `The username '${data.username}' is a reserved system identifier.`;
      } else if (usernameExists) {
        errors['username'] = `The username '${data.username}' is already in use by another profile.`;
      }

      if (username.includes('expert') && experience === 'junior') {
        errors['username'] = "A experience level of 'Junior' is inconsistent with a username containing 'expert'.";
      }
    }

    if (targetStepId === 'step-3') {
      const terms = !!data.terms;
      if (!terms) {
        errors['terms'] = 'You must explicitly consent to terms and conditions.';
      }
    }

    const hasErrors = Object.keys(errors).length > 0;
    if (hasErrors) {
      res.json({ success: false, errors });
    } else {
      res.json({ success: true });
    }
  });
});

// GET /api/profiles - Serve registered profiles dynamically from disk with no cache
app.get('/api/profiles', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'profiles.json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(filePath);
});

// GET /api/schemas - Serve the list of all available schemas dynamically with user-friendly labels
app.get('/api/schemas', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'schemas.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading schemas database:', err);
      return res.status(500).json({ success: false, error: 'Database read error' });
    }
    try {
      const schemas = JSON.parse(data);
      const schemaList = Object.keys(schemas).map(key => {
        let label = 'Custom Flow';
        if (key === 'form-schema-1.json') label = 'Standard Flow';
        else if (key === 'form-schema-2.json') label = 'Professional Flow';
        else {
          const cleanName = key.replace('.json', '').replace('form-schema-', '');
          label = cleanName.charAt(0).toUpperCase() + cleanName.slice(1) + ' Flow';
        }
        return { id: key, label };
      });
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.json(schemaList);
    } catch (e) {
      console.error('Error parsing schemas database:', e);
      res.status(500).json({ success: false, error: 'Database parse error' });
    }
  });
});

// GET /api/schemas/:id - Serve a specific schema dynamically from the combined schemas database
app.get('/api/schemas/:id', (req, res) => {
  const { id } = req.params;
  const filePath = path.join(__dirname, 'data', 'schemas.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading schemas database:', err);
      return res.status(500).json({ success: false, error: 'Database read error' });
    }

    try {
      const schemas = JSON.parse(data);
      const targetSchema = schemas[id];
      if (!targetSchema) {
        return res.status(404).json({ success: false, error: `Schema with ID '${id}' not found` });
      }
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.json(targetSchema);
    } catch (e) {
      console.error('Error parsing schemas database:', e);
      res.status(500).json({ success: false, error: 'Database parse error' });
    }
  });
});

// POST /api/profiles - Save a new profile or update an existing one in the JSON database
app.post('/api/profiles', (req, res) => {
  const profile = req.body;
  console.log('[Express API] POST /api/profiles payload:', JSON.stringify(profile));
  if (!profile || !profile.id) {
    return res.status(400).json({ success: false, error: 'Invalid profile data' });
  }

  const filePath = path.join(__dirname, 'data', 'profiles.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    let profiles = [];
    if (!err) {
      try {
        profiles = JSON.parse(data);
      } catch (e) {
        console.error('Error parsing profiles database:', e);
      }
    }

    const updatedProfile = {
      ...profile,
      timestamp: new Date().toISOString()
    };

    const index = profiles.findIndex(p => p.id === profile.id);
    if (index !== -1) {
      profiles[index] = updatedProfile;
    } else {
      profiles.push(updatedProfile);
    }

    fs.writeFile(filePath, JSON.stringify(profiles, null, 2), 'utf8', (writeErr) => {
      if (writeErr) {
        console.error('Error writing profiles database:', writeErr);
        return res.status(500).json({ success: false, error: 'Database write error' });
      }
      res.json({ success: true });
    });
  });
});

// DELETE /api/profiles/:id - Delete a profile from the JSON database
app.delete('/api/profiles/:id', (req, res) => {
  const { id } = req.params;
  const filePath = path.join(__dirname, 'data', 'profiles.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading profiles database:', err);
      return res.status(500).json({ success: false, error: 'Database read error' });
    }

    let profiles = [];
    try {
      profiles = JSON.parse(data);
    } catch (e) {
      console.error('Error parsing profiles database:', e);
      return res.status(500).json({ success: false, error: 'Database parse error' });
    }

    const updatedProfiles = profiles.filter(p => p.id !== id);
    fs.writeFile(filePath, JSON.stringify(updatedProfiles, null, 2), 'utf8', (writeErr) => {
      if (writeErr) {
        console.error('Error writing profiles database:', writeErr);
        return res.status(500).json({ success: false, error: 'Database write error' });
      }
      res.json({ success: true });
    });
  });
});

// Boot the server
app.listen(PORT, () => {
  console.log(`[Express BE] Server listening dynamically on http://localhost:${PORT}`);
});
