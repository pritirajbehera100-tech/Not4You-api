// force redeploy v2
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
app.use(cors());

app.get('/', (req, res) => {
  res.json({ status: true, message: 'Not4You API is running' });
});

function runYtDlp(targetUrl) {
  return new Promise((resolve, reject) => {
    const args = ['-j', '--no-warnings', '--skip-download', '--no-playlist', targetUrl];
    const proc = spawn('yt-dlp', args);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    proc.on('error', (err) => reject(err));

    proc.on('close', (code) => {
      if (code !== 0 || !stdout.trim()) {
        reject(new Error(stderr || 'yt-dlp exited with code ' + code));
        return;
      }
      try {
        const firstLine = stdout.trim().split('\n')[0];
        const parsed = JSON.parse(firstLine);
        resolve(parsed);
      } catch (e) {
        reject(e);
      }
    });
  });
}

function pickMediaUrl(info) {
  if (info.url) return info.url;
  if (Array.isArray(info.formats) && info.formats.length) {
    const combined = info.formats.filter(f => f.vcodec && f.vcodec !== 'none' && f.acodec && f.acodec !== 'none');
    const pool = combined.length ? combined : info.formats;
    const best = pool[pool.length - 1];
    return best ? best.url : null;
  }
  return null;
}

function pickThumbnail(info) {
  if (info.thumbnail) return info.thumbnail;
  if (Array.isArray(info.thumbnails) && info.thumbnails.length) {
    return info.thumbnails[info.thumbnails.length - 1].url;
  }
  return null;
}

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
    const info = await runYtDlp(url);
    const mediaUrl = pickMediaUrl(info);
    const thumbnail = pickThumbnail(info);

    if (!mediaUrl) {
      return res.status(404).json({ status: false, message: 'No media found for this link' });
    }

    const imageExts = ['jpg', 'jpeg', 'png', 'webp'];
    const type = imageExts.includes((info.ext || '').toLowerCase()) ? 'image' : 'video';

    res.json({
      status: true,
      data: [{ url: mediaUrl, thumbnail: thumbnail, type: type }]
    });
  } catch (err) {
    console.error('yt-dlp error:', err.message);
    res.status(500).json({ status: false, message: 'Failed to fetch media. Try again.', debug: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Not4You API running on port ' + PORT);
});
