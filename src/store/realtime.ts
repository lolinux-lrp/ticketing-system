let sharedEventSource: EventSource | null = null;
let subscriberCount = 0;
const subscribers = new Set<(payload: Record<string, unknown>) => void>();

function getEventSource() {
  if (!sharedEventSource) {
    sharedEventSource = new EventSource('/api/realtime');
    sharedEventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        subscribers.forEach((cb) => cb(payload));
      } catch {}
    };
  }
  subscriberCount++;
  return sharedEventSource;
}

function releaseEventSource() {
  subscriberCount--;
  if (subscriberCount <= 0 && sharedEventSource) {
    sharedEventSource.close();
    sharedEventSource = null;
    subscriberCount = 0;
  }
}

export function subscribeToRealtime(
  cacheDataLoaded: Promise<unknown>,
  cacheEntryRemoved: Promise<void>,
  predicate: (payload: Record<string, unknown>) => boolean,
  onMatch: (payload: Record<string, unknown>) => void
) {
  return async () => {
    try {
      await cacheDataLoaded;
      
      const callback = (payload: Record<string, unknown>) => {
        if (predicate(payload)) {
          onMatch(payload);
        }
      };
      
      subscribers.add(callback);
      getEventSource();
      
      await cacheEntryRemoved;
      subscribers.delete(callback);
      releaseEventSource();
    } catch {}
  };
}
