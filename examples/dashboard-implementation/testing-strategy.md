# Testing Strategy for PAI Business Dashboard

## Overview

Testing real-time, distributed systems requires a comprehensive strategy covering unit tests, integration tests, end-to-end tests, and specialized real-time testing patterns.

---

## 1. Unit Tests

### A. Component Testing with React Testing Library

```typescript
// ContactsTab.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ContactsTab } from './ContactsTab';
import { queryClient } from './dashboard-store';

describe('ContactsTab', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('renders contacts list', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ContactsTab />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/contacts/i)).toBeInTheDocument();
    });
  });

  it('filters contacts by search query', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ContactsTab />
      </QueryClientProvider>
    );

    const searchInput = screen.getByPlaceholderText(/search contacts/i);
    fireEvent.change(searchInput, { target: { value: 'john' } });

    await waitFor(() => {
      // Verify filtered results
      expect(screen.queryByText(/jane/i)).not.toBeInTheDocument();
    });
  });

  it('handles optimistic update for contact creation', async () => {
    const { getByText, getByRole } = render(
      <QueryClientProvider client={queryClient}>
        <ContactsTab />
      </QueryClientProvider>
    );

    fireEvent.click(getByText(/new contact/i));

    // Fill form
    const firstNameInput = getByRole('textbox', { name: /first name/i });
    fireEvent.change(firstNameInput, { target: { value: 'John' } });

    // Submit
    fireEvent.click(getByText(/save/i));

    // Contact should appear immediately (optimistic)
    await waitFor(() => {
      expect(screen.getByText(/john/i)).toBeInTheDocument();
    });
  });
});
```

### B. State Management Testing

```typescript
// dashboard-store.test.ts
import { renderHook, act } from '@testing-library/react';
import { useDashboardStore } from './dashboard-store';

describe('Dashboard Store', () => {
  beforeEach(() => {
    useDashboardStore.getState().reset();
  });

  it('updates active tab', () => {
    const { result } = renderHook(() => useDashboardStore());

    act(() => {
      result.current.setActiveTab('conversations');
    });

    expect(result.current.ui.activeTab).toBe('conversations');
  });

  it('manages item selection', () => {
    const { result } = renderHook(() => useDashboardStore());

    act(() => {
      result.current.selectItem('contact-1');
      result.current.selectItem('contact-2', true);
    });

    expect(result.current.ui.selectedItems.size).toBe(2);

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.ui.selectedItems.size).toBe(0);
  });

  it('handles filters correctly', () => {
    const { result } = renderHook(() => useDashboardStore());

    act(() => {
      result.current.setFilter('status', 'active');
      result.current.setFilter('tags', 'hot-lead');
    });

    expect(result.current.ui.filters).toEqual({
      status: 'active',
      tags: 'hot-lead',
    });

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.ui.filters).toEqual({});
  });
});
```

---

## 2. Integration Tests

### A. WebSocket Integration Testing

```typescript
// realtime-sync.test.ts
import { RealtimeSyncManager } from './realtime-sync-manager';
import { Server } from 'socket.io';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';

describe('RealtimeSyncManager', () => {
  let io: Server;
  let serverSocket: any;
  let clientSocket: ClientSocket;
  let syncManager: RealtimeSyncManager;

  beforeAll((done) => {
    // Create test server
    io = new Server(3001);

    io.on('connection', (socket) => {
      serverSocket = socket;
    });

    // Create client
    syncManager = new RealtimeSyncManager('http://localhost:3001');

    syncManager.on('connected', done);
  });

  afterAll(() => {
    io.close();
    syncManager.disconnect();
  });

  it('connects to server', () => {
    expect(syncManager.isConnected).toBe(true);
  });

  it('sends and receives sync events', (done) => {
    syncManager.on('remote:update', (event) => {
      expect(event.type).toBe('create');
      expect(event.entityType).toBe('contact');
      done();
    });

    // Server emits event
    serverSocket.emit('entity:created', {
      type: 'create',
      entityType: 'contact',
      entityId: 'test-id',
      data: { name: 'Test' },
      timestamp: Date.now(),
    });
  });

  it('handles optimistic updates with confirmation', async () => {
    const createPromise = syncManager.create('contact', { name: 'John' });

    // Server confirms
    setTimeout(() => {
      serverSocket.emit('update:confirmed', expect.stringContaining('optimistic_'));
    }, 100);

    const result = await createPromise;
    expect(result.id).toBeDefined();
  });

  it('handles conflicts with latest-wins strategy', (done) => {
    const localUpdate = {
      type: 'update' as const,
      entityType: 'contact' as const,
      entityId: 'contact-1',
      data: { name: 'Local Name' },
      timestamp: Date.now() - 1000, // Older
      source: 'local' as const,
    };

    const remoteUpdate = {
      type: 'update' as const,
      entityType: 'contact' as const,
      entityId: 'contact-1',
      data: { name: 'Remote Name' },
      timestamp: Date.now(), // Newer
      source: 'remote' as const,
    };

    // Apply local first
    syncManager.emit('optimistic:update', localUpdate);

    // Remote arrives
    syncManager.on('remote:update', (event) => {
      expect(event.data.name).toBe('Remote Name');
      done();
    });

    serverSocket.emit('entity:updated', remoteUpdate);
  });

  it('queues operations when offline', async () => {
    // Simulate offline
    syncManager.emit('offline');

    await syncManager.create('contact', { name: 'Offline Contact' });

    expect(syncManager['syncQueue'].length).toBe(1);

    // Simulate online
    syncManager.emit('online');
    syncManager.emit('connected');

    // Wait for queue to flush
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(syncManager['syncQueue'].length).toBe(0);
  });
});
```

### B. API Rate Limiting Tests

```typescript
// ghl-api-wrapper.test.ts
import { GoHighLevelAPI } from './ghl-api-wrapper';
import nock from 'nock';

describe('GoHighLevelAPI', () => {
  let api: GoHighLevelAPI;

  beforeEach(() => {
    api = new GoHighLevelAPI('test-api-key', {
      baseURL: 'http://localhost:3000',
      rateLimit: { capacity: 10, refillRate: 1 },
    });

    nock.cleanAll();
  });

  it('respects rate limits', async () => {
    // Mock API responses
    for (let i = 0; i < 15; i++) {
      nock('http://localhost:3000').get('/contacts').reply(200, []);
    }

    const startTime = Date.now();

    // Make 15 requests (exceeds capacity of 10)
    const promises = Array.from({ length: 15 }, () => api.getContacts());

    await Promise.all(promises);

    const duration = Date.now() - startTime;

    // Should take at least 5 seconds (15 - 10 = 5 tokens needed at 1/sec)
    expect(duration).toBeGreaterThan(4000);
  });

  it('retries failed requests with exponential backoff', async () => {
    let attempts = 0;

    nock('http://localhost:3000')
      .get('/contacts/test-id')
      .times(3)
      .reply(() => {
        attempts++;
        return attempts < 3 ? [500, 'Server Error'] : [200, { id: 'test-id' }];
      });

    const contact = await api.getContact('test-id');

    expect(attempts).toBe(3);
    expect(contact.id).toBe('test-id');
  });

  it('caches GET requests', async () => {
    nock('http://localhost:3000').get('/contacts/test-id').once().reply(200, { id: 'test-id' });

    // First request
    await api.getContact('test-id');

    // Second request should use cache (nock will fail if called twice)
    const contact = await api.getContact('test-id');

    expect(contact.id).toBe('test-id');
  });

  it('handles rate limit exceeded response', async () => {
    nock('http://localhost:3000')
      .get('/contacts')
      .reply(429, 'Rate Limit Exceeded', {
        'retry-after': '5',
      });

    const rateLimitPromise = new Promise((resolve) => {
      api.on('rate-limit:exceeded', (data) => {
        expect(data.retryAfter).toBe('5');
        resolve(true);
      });
    });

    try {
      await api.getContacts();
    } catch (error) {
      // Expected to fail
    }

    await rateLimitPromise;
  });
});
```

---

## 3. End-to-End Tests with Playwright

### A. Real-time Updates Test

```typescript
// e2e/realtime-sync.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Real-time Synchronization', () => {
  test('syncs contact updates across multiple tabs', async ({ browser }) => {
    // Open two tabs
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Navigate both to dashboard
    await page1.goto('http://localhost:3000/dashboard/contacts');
    await page2.goto('http://localhost:3000/dashboard/contacts');

    // Wait for connection
    await expect(page1.locator('.status-connected')).toBeVisible();
    await expect(page2.locator('.status-connected')).toBeVisible();

    // Create contact in first tab
    await page1.click('button:has-text("New Contact")');
    await page1.fill('input[name="firstName"]', 'John');
    await page1.fill('input[name="lastName"]', 'Doe');
    await page1.fill('input[name="email"]', 'john@example.com');
    await page1.click('button:has-text("Save")');

    // Verify it appears in both tabs (real-time sync)
    await expect(page1.locator('text=John Doe')).toBeVisible({ timeout: 5000 });
    await expect(page2.locator('text=John Doe')).toBeVisible({ timeout: 5000 });

    // Edit in second tab
    await page2.click('text=John Doe');
    await page2.click('button[aria-label="Edit"]');
    await page2.fill('input[name="firstName"]', 'Jane');
    await page2.click('button:has-text("Save")');

    // Verify update in both tabs
    await expect(page1.locator('text=Jane Doe')).toBeVisible({ timeout: 5000 });
    await expect(page2.locator('text=Jane Doe')).toBeVisible({ timeout: 5000 });
  });

  test('handles offline mode gracefully', async ({ page, context }) => {
    await page.goto('http://localhost:3000/dashboard/contacts');

    // Go offline
    await context.setOffline(true);

    await expect(page.locator('.status-disconnected')).toBeVisible();

    // Try to create contact while offline
    await page.click('button:has-text("New Contact")');
    await page.fill('input[name="firstName"]', 'Offline');
    await page.fill('input[name="email"]', 'offline@example.com');
    await page.click('button:has-text("Save")');

    // Should show in queue
    await expect(page.locator('.queue')).toContainText('1 queued');

    // Go back online
    await context.setOffline(false);

    // Wait for sync
    await expect(page.locator('.status-connected')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.queue')).not.toBeVisible({ timeout: 10000 });

    // Contact should be synced
    await expect(page.locator('text=Offline')).toBeVisible();
  });
});
```

### B. PAI Control Test

```typescript
// e2e/pai-control.spec.ts
import { test, expect } from '@playwright/test';

test.describe('PAI Dashboard Control', () => {
  test('PAI can observe and control dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');

    // Simulate PAI reading UI state
    const uiState = await page.evaluate(() => {
      return {
        activeTab: document.querySelector('[data-active-tab]')?.textContent,
        visibleContacts: document.querySelectorAll('.contact-row').length,
        filters: Object.fromEntries(
          Array.from(document.querySelectorAll('[data-filter]')).map((el) => [
            el.getAttribute('data-filter'),
            (el as HTMLInputElement).value,
          ])
        ),
      };
    });

    expect(uiState.activeTab).toBeTruthy();

    // Simulate PAI dispatching action
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('pai:action', {
          detail: {
            type: 'NAVIGATE',
            payload: { tab: 'conversations' },
          },
        })
      );
    });

    // Verify navigation
    await expect(page.locator('[data-active-tab="conversations"]')).toBeVisible();

    // Simulate PAI filling form
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('pai:action', {
          detail: {
            type: 'FILL_FORM',
            payload: {
              formId: 'contact-form',
              values: {
                firstName: 'PAI Created',
                email: 'pai@example.com',
              },
            },
          },
        })
      );
    });

    // Verify form filled
    await expect(page.locator('input[name="firstName"]')).toHaveValue('PAI Created');
  });
});
```

---

## 4. Performance Testing

### A. Load Testing with k6

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { WebSocket } from 'k6/experimental/websockets';

export const options = {
  stages: [
    { duration: '1m', target: 50 }, // Ramp up to 50 users
    { duration: '3m', target: 50 }, // Stay at 50 users
    { duration: '1m', target: 100 }, // Ramp to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    'websocket_messages_received': ['rate>0.9'], // 90% message delivery
  },
};

export default function () {
  // HTTP API Test
  const contacts = http.get('http://localhost:3000/api/contacts');
  check(contacts, {
    'contacts fetched': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500,
  });

  // WebSocket Test
  const ws = new WebSocket('ws://localhost:3001');

  ws.on('open', () => {
    ws.send(
      JSON.stringify({
        type: 'subscribe',
        channel: 'contacts',
      })
    );
  });

  ws.on('message', (data) => {
    console.log('Received:', data);
  });

  ws.on('close', () => {
    console.log('Disconnected');
  });

  sleep(1);
}
```

### B. React Component Performance

```typescript
// performance.test.tsx
import { render } from '@testing-library/react';
import { ContactsTab } from './ContactsTab';

describe('ContactsTab Performance', () => {
  it('renders 1000 contacts efficiently', () => {
    const contacts = Array.from({ length: 1000 }, (_, i) => ({
      id: `contact-${i}`,
      firstName: `First${i}`,
      lastName: `Last${i}`,
      email: `user${i}@example.com`,
      tags: [],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const startTime = performance.now();

    const { container } = render(<ContactsTab initialContacts={contacts} />);

    const renderTime = performance.now() - startTime;

    // Should render in under 1 second
    expect(renderTime).toBeLessThan(1000);

    // Should use virtualization for large lists
    const visibleRows = container.querySelectorAll('.contact-row');
    expect(visibleRows.length).toBeLessThan(100); // Only render visible rows
  });
});
```

---

## 5. Testing Tools & Libraries

### Recommended Stack

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@playwright/test": "^1.40.0",
    "vitest": "^1.0.0",
    "msw": "^2.0.0",
    "nock": "^13.0.0",
    "socket.io-client": "^4.6.0",
    "k6": "^0.48.0"
  }
}
```

### Test Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:load": "k6 run load-test.js",
    "test:watch": "vitest --watch"
  }
}
```

---

## Key Testing Principles

1. **Isolate Dependencies**: Mock external services (GHL API, WebSocket)
2. **Test Optimistic Updates**: Verify immediate UI updates and eventual consistency
3. **Test Conflict Resolution**: Simulate concurrent edits and verify resolution
4. **Test Offline Scenarios**: Verify queueing and sync on reconnection
5. **Performance Benchmarks**: Set thresholds for render time, API latency
6. **Real-time Assertions**: Use waitFor() with appropriate timeouts
7. **Mock Time**: Use fake timers for retry/backoff testing
8. **Integration Focus**: Test full flow from UI → WebSocket → API → DB
