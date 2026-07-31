import http from 'http';


const SLA_POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

function pollCheckSlaRoute() {
  console.log(`[Local Cron] Checking SLAs at ${new Date().toLocaleTimeString()}...`);

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/cron/check-sla',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`
    }
  };

  http.get(options, (res) => {
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
  pollCheckSlaRoute();
  
  // Set up recurring polls
  setInterval(pollCheckSlaRoute, SLA_POLL_INTERVAL_MS);
}, 5000);

console.log(`[Local Cron] Poller started. SLA every 10 minutes.`);
