const express = require('express');
const cors = require('cors');
const { igdl } = require('btch-downloader');

const app = express();
app.use(cors());

// health check
app.get('/', (req, res) => {
  res.json({ status: true, message: 'Not4You API is running' });
});

// main endpoint: GET /api/download?url=INSTAGRAM_LINK
app.get('/api/download', async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ status: false, message: 'Missing url parameter' });
  }

  const isInstagramLink = /instagram\.com/i.test(url);
  if (!isInstagramLink) {
    return res.status(400).json({ status: false, message: 'Please provide a valid Instagram link' });
  }

  try {
    const result = await igdl(url);

    if (!result || !Array.isArray(result) || result.length === 0) {
      return res.status(404).json({ status: false, message: 'No media found for this link' });
    }

    // normalize response shape
    const data = result.map((item) => ({
      url: item.url,
      thumbnail: item.thumbnail || null
    }));

    res.json({ status: true, data: data });
  } catch (err) {
    console.error('Fetch error:', err.message);
    res.status(500).json({ status: false, message: 'Failed to fetch media. Try again.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Not4You API running on port ' + PORT);
});
  
