const { BlobServiceClient } = require('@azure/storage-blob');

// Returns the shared tracker state (steps + activity) for all users.
// Stored as a single JSON blob: container "tracker", blob "state.json".
module.exports = async function (context, req) {
    try {
          const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
          const client = BlobServiceClient.fromConnectionString(connStr);
          const container = client.getContainerClient('tracker');
          await container.createIfNotExists();

      const blob = container.getBlockBlobClient('state.json');
          const exists = await blob.exists();

      if (!exists) {
              // First read ever — return an empty state shape rather than 404.
            context.res = {
                      status: 200,
                      headers: { 'Content-Type': 'application/json' },
                      body: { steps: {}, activity: [], updatedAt: null }
            };
              return;
      }

      const download = await blob.download(0);
          const chunks = [];
          for await (const chunk of download.readableStreamBody) chunks.push(chunk);
          const content = Buffer.concat(chunks).toString('utf8');

      context.res = {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
              body: content
      };
    } catch (err) {
          context.log.error('getTrackerState error:', err.message);
          context.res = { status: 500, body: 'Storage error' };
    }
};
