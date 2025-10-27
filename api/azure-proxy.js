// Vercel Serverless Function to proxy Azure Blob Storage requests
// This function handles fetching MIDI files from Azure Blob Storage

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Extract blob path from query parameter or URL path
    // URL format: /api/azure-proxy?path=path/to/blob.mid
    // or /api/azure-proxy/path/to/blob.mid
    let blobPath = req.query.path;
    let urlPath = req.url.split('?')[0];  // Define urlPath outside the if block

    if (!blobPath) {
      // Fallback: try to extract from URL path
      console.log('[azure-proxy] Original URL path:', urlPath);

      // Handle both /api/azure-proxy/... and /azure-proxy/...
      blobPath = urlPath
        .replace(/^\/api\/azure-proxy\//, '')
        .replace(/^\/azure-proxy\//, '')
        .replace(/^\/api\/azure-proxy/, '')
        .replace(/^\/azure-proxy/, '');
    }

    if (!blobPath || blobPath === urlPath) {
      console.error('[azure-proxy] Failed to extract blob path from:', req.url);
      res.status(400).json({
        error: 'No blob path provided',
        requestUrl: req.url,
        extractedPath: blobPath
      });
      return;
    }

    console.log('[azure-proxy] Fetching blob:', blobPath);

    // Construct Azure Blob Storage URL
    const azureAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'kaiyolaustorageaccount';
    const containerName = 'dawify-output';
    const azureUrl = `https://${azureAccountName}.blob.core.windows.net/${containerName}/${blobPath}`;


    // Fetch from Azure Blob Storage
    const response = await fetch(azureUrl);

    if (!response.ok) {
      console.error('[azure-proxy] Azure fetch failed:', response.status, response.statusText);
      res.status(response.status).json({
        error: `Failed to fetch from Azure: ${response.status} ${response.statusText}`,
        azureUrl: azureUrl
      });
      return;
    }

    // Get the blob data as array buffer
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);


    // Set appropriate headers
    res.setHeader('Content-Type', 'audio/midi');
    res.setHeader('Content-Length', uint8Array.length);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // Send the MIDI file as buffer
    res.status(200).send(Buffer.from(uint8Array));
  } catch (error) {
    console.error('[azure-proxy] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
