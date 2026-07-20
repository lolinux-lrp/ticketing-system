import http from 'http';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function pollIngestRoute() {
  console.log(`[Local Cron] Checking for new support emails at ${new Date().toLocaleTimeString()}...`);

  http.get('http://localhost:3000/api/cron/ingest-gmail', (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const parsed = JSON.parse(data);
          if (parsed.processedCount !== undefined) {
            console.log(`[Local Cron] Processed ${parsed.processedCount} messages. New tickets:`, parsed.newTickets?.length || 0);
          } else {
            console.log(`[Local Cron] Success (200), response:`, data);
          }
        } catch {
          console.log(`[Local Cron] Success (200)`);
        }
      } else {
        console.error(`[Local Cron] Failed with status ${res.statusCode}:`, data);
      }
    });
  }).on('error', (err) => {
    console.error('[Local Cron] Request error:', err.message);
    console.error('[Local Cron] Ensure your local Next.js server is running on port 3000.');
  });
}

// Initial poll after 5 seconds to give server time to start
setTimeout(() => {
  pollIngestRoute();
  // Set up recurring poll
  setInterval(pollIngestRoute, POLL_INTERVAL_MS);
}, 5000);

console.log(`[Local Cron] Poller started. Will check every ${POLL_INTERVAL_MS / 1000 / 60} minutes.`);
