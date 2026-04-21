const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async function (context, req) {
  try {
    const connStr   = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const client    = BlobServiceClient.fromConnectionString(connStr);
    const container = client.getContainerClient('progress');
    await container.createIfNotExists();

    const results = [];
    for await (const blob of container.listBlobsFlat()) {
      try {
        const blobClient = container.getBlockBlobClient(blob.name);
        const download   = await blobClient.download(0);
        const chunks     = [];
        for await (const chunk of download.readableStreamBody) chunks.push(chunk);
        const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        results.push({
          userId:     data.userId    || blob.name.replace('.json', ''),
          name:       data.name      || '(unknown)',
          dept:       data.dept      || '(unknown)',
          role:       data.role      || 'trainee',
          savedAt:    data.savedAt   || null,
          quizStates: data.quizStates || {}
        });
      } catch (e) {
        // Skip malformed blobs
      }
    }

    // Sort by name
    results.sort((a, b) => a.name.localeCompare(b.name));

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(results)
    };
  } catch (err) {
    context.log.error('listProgress error:', err.message);
    context.res = { status: 500, body: 'Storage error' };
  }
};
