const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async function (context, req) {
  if (req.method !== 'POST') {
    context.res = { status: 405, body: 'Method Not Allowed' };
    return;
  }

  const { userId, data } = req.body || {};
  if (!userId || !data) {
    context.res = { status: 400, body: 'Missing userId or data' };
    return;
  }

  // Sanitize userId to a safe blob name
  const blobName = userId.replace(/[^a-z0-9_\-]/gi, '_') + '.json';

  try {
    const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const client  = BlobServiceClient.fromConnectionString(connStr);
    const container = client.getContainerClient('progress');
    await container.createIfNotExists();

    const blob    = container.getBlockBlobClient(blobName);
    const content = JSON.stringify({ userId, ...data, savedAt: new Date().toISOString() });
    await blob.upload(content, Buffer.byteLength(content), {
      blobHTTPHeaders: { blobContentType: 'application/json' }
    });

    context.res = { status: 200, body: { ok: true } };
  } catch (err) {
    context.log.error('saveProgress error:', err.message);
    context.res = { status: 500, body: 'Storage error' };
  }
};
