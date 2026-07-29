export function subscribeToRealtime(
  cacheDataLoaded: Promise<unknown>,
  cacheEntryRemoved: Promise<void>,
  predicate: (payload: Record<string, unknown>) => boolean,
  onMatch: (payload: Record<string, unknown>) => void
) {
  return async () => {
    try {
      await cacheDataLoaded;
      const eventSource = new EventSource('/api/realtime');
      
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (predicate(payload)) {
            onMatch(payload);
          }
        } catch {}
      };
      
      await cacheEntryRemoved;
      eventSource.close();
    } catch {}
  };
}
