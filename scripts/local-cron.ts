import http from 'http';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const SLA_POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

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
        console.error(`[Local Cron] Ingest Failed with status ${res.statusCode}:`, data);
      }
    });
  }).on('error', (err) => {
    console.error('[Local Cron] Request error:', err.message);
    console.error('[Local Cron] Ensure your local Next.js server is running on port 3000.');
  });
}

function pollCheckSlaRoute() {
  console.log(`[Local Cron] Checking SLAs at ${new Date().toLocaleTimeString()}...`);

  http.get('http://localhost:3000/api/cron/check-sla', (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const parsed = JSON.parse(data);
          console.log(`[Local Cron] SLA Check Success (200), processed ${parsed.processedCount} tickets.`);
        } catch {
          console.log(`[Local Cron] SLA Check Success (200)`);
        }
      } else {
        console.error(`[Local Cron] SLA Check Failed with status ${res.statusCode}:`, data);
      }
    });
  }).on('error', (err) => {
    console.error('[Local Cron] Request error:', err.message);
  });
}

// Initial poll after 5 seconds to give server time to start
setTimeout(() => {
  pollIngestRoute();
  pollCheckSlaRoute();
  
  // Set up recurring polls
  setInterval(pollIngestRoute, POLL_INTERVAL_MS);
  setInterval(pollCheckSlaRoute, SLA_POLL_INTERVAL_MS);
}, 5000);

console.log(`[Local Cron] Poller started. Ingest every 5 minutes. SLA every 10 minutes.`);
