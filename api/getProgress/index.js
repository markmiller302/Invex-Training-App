const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async function (context, req) {
  const userId = req.query.userId;
  if (!userId) {
    context.res = { status: 400, body: 'Missing userId' };
    return;
  }

  const blobName = userId.replace(/[^a-z0-9_\-]/gi, '_') + '.json';

  try {
    const connStr   = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const client    = BlobServiceClient.fromConnectionString(connStr);
    const container = client.getContainerClient('progress');
    const blob      = container.getBlockBlobClient(blobName);

    const exists = await blob.exists();
    if (!exists) {
      context.res = { status: 404, body: 'No progress found' };
      return;
    }

    const download = await blob.download(0);
    const chunks   = [];
    for await (const chunk of download.readableStreamBody) chunks.push(chunk);
    const content  = Buffer.concat(chunks).toString('utf8');

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: content
    };
  } catch (err) {
    context.log.error('getProgress error:', err.message);
    context.res = { status: 500, body: 'Storage error' };
  }
};
