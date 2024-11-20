// server.js
import express from 'express';
import fs from 'fs';
import { parseStringPromise } from 'xml2js';
import path from 'path';
import cors from 'cors';

const app = express();
app.use(cors()); // Allow cross-origin requests from your React app

// Define an endpoint to fetch and parse the OFAC XML data
app.get('/api/ofac-data', async (req, res) => {
  try {
    // Path to your XML file
    const xmlFilePath = path.join(__dirname, 'path/to/your/ofac.xml');
    const xmlData = fs.readFileSync(xmlFilePath, 'utf8');

    // Parse XML data into JSON
    const parsedData = await parseStringPromise(xmlData);
    res.json(parsedData); // Send the parsed data as JSON
  } catch (error) {
    console.error('Error loading or parsing XML:', error);
    res.status(500).send('Failed to load OFAC data');
  }
});

// Start the server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
