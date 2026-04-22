const { BlobServiceClient } = require('@azure/storage-blob');

// Writes the shared tracker state (steps + activity) for all users.
// Body shape: { steps: {...}, activity: [...] }
// Stored as a single JSON blob: container "tracker", blob "state.json".
//
// NOTE: This is last-write-wins. For light concurrent use (a few teammates
// updating different steps) it's fine; a high-contention setup should
// switch to ETag/If-Match or Table Storage per-row.
module.exports = async function (context, req) {
    if (req.method !== 'POST') {
          context.res = { status: 405, body: 'Method Not Allowed' };
          return;
    }

    const body = req.body || {};
    if (typeof body.steps !== 'object' || !Array.isArray(body.activity)) {
          context.res = { status: 400, body: 'Missing steps or activity' };
          return;
    }

    try {
          const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
          const client = BlobServiceClient.fromConnectionString(connStr);
          const container = client.getContainerClient('tracker');
          await container.createIfNotExists();

      const blob = container.getBlockBlobClient('state.json');
          const payload = {
                  steps: body.steps,
                  activity: body.activity,
                  updatedAt: new Date().toISOString()
          };
          const content = JSON.stringify(payload);
          await blob.upload(content, Buffer.byteLength(content), {
                  blobHTTPHeaders: { blobContentType: 'application/json' }
          });

      context.res = { status: 200, body: { ok: true, updatedAt: payload.updatedAt } };
    } catch (err) {
          context.log.error('saveTrackerState error:', err.message);
          context.res = { status: 500, body: 'Storage error' };
    }
};
