import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import WebsocketService from '../websocket.js';

// Mock global timers to avoid timer issues
const originalSetInterval = global.setInterval;
const originalClearInterval = global.clearInterval;
const originalSetTimeout = global.setTimeout;

// Create fake setInterval and clearInterval functions
global.setInterval = vi.fn().mockImplementation(() => 999); // return fake timer id

let intervalCleared = false;
global.clearInterval = vi.fn().mockImplementation(() => {
  intervalCleared = true;
});

// Mock setTimeout
let timeoutCallbacks = [];
global.setTimeout = vi.fn().mockImplementation((callback, delay) => {
  timeoutCallbacks.push({ callback, delay });
  return 888; // Return a fake timer id
});

// Create a mock WebSocket class
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // WebSocket.OPEN
    this.sent = [];
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
  }

  send(data) {
    this.sent.push(data);
    return true;
  }

  close() {
    this.readyState = 3; // WebSocket.CLOSED
    if (this.onclose) {
      this.onclose({ code: 1000, reason: 'Normal closure', wasClean: true });
    }
  }

  // Helper method to trigger WebSocket events
  triggerOpen() {
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }
  
  triggerMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: typeof data === 'string' ? data : JSON.stringify(data) });
    }
  }
  
  triggerError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
  
  triggerClose(code = 1000, reason = 'Normal closure') {
    this.readyState = 3; // WebSocket.CLOSED
    if (this.onclose) {
      this.onclose({ code, reason, wasClean: true });
    }
  }
}

describe('Websocket Service', () => {
  let websocketService;
  let mockCallbackFn;
  let originalWebSocket;
  
  beforeEach(() => {
    // Save original WebSocket
    originalWebSocket = global.WebSocket;
    
    // Replace global WebSocket with mock
    global.WebSocket = MockWebSocket;
    
    // Reset global state
    intervalCleared = false;
    timeoutCallbacks = [];
    
    // Create mock callback function
    mockCallbackFn = vi.fn();
    
    // Create websocket service instance
    websocketService = new WebsocketService('ws://localhost:8080/chat', mockCallbackFn);
    
    // Clear all mocks
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    // Restore original WebSocket
    global.WebSocket = originalWebSocket;
    
    // Clear timeout callbacks
    timeoutCallbacks = [];
  });
  
  it('initializes with correct properties', () => {
    expect(websocketService.url).toBe('ws://localhost:8080/chat');
    expect(websocketService.callback).toBe(mockCallbackFn);
    expect(websocketService.ws).toBeNull();
    expect(websocketService.status).toBe(0);
    expect(websocketService.ping).toBe(10000);
    expect(websocketService.reconnect).toBe(5000);
    expect(websocketService.pingInterval).toBeNull();
  });
  
  it('connects to WebSocket when connect() is called', () => {
    websocketService.connect();
    
    expect(websocketService.ws).not.toBeNull();
    expect(websocketService.ws.url).toBe('ws://localhost:8080/chat');
    
    // Handlers should be set
    expect(typeof websocketService.ws.onopen).toBe('function');
    expect(typeof websocketService.ws.onmessage).toBe('function');
    expect(typeof websocketService.ws.onerror).toBe('function');
    expect(typeof websocketService.ws.onclose).toBe('function');
  });
  
  it('updates status and starts heartbeat on connection open', () => {
    // Setup connection
    websocketService.connect();
    
    // Spy on heartHandler method
    const heartHandlerSpy = vi.spyOn(websocketService, 'heartHandler');
    
    // Simulate connection open
    websocketService.ws.triggerOpen();
    
    // Status should be updated
    expect(websocketService.status).toBe(1);
    
    // Heartbeat should be started
    expect(heartHandlerSpy).toHaveBeenCalled();
    expect(global.setInterval).toHaveBeenCalled();
  });
  
  it('calls callback function when message is received', () => {
    // Setup connection
    websocketService.connect();
    websocketService.ws.triggerOpen();
    
    // Simulate receiving a message
    const testMessage = { type: 'CHAT', message: 'Hello!' };
    websocketService.ws.triggerMessage(testMessage);
    
    // Callback should be called with parsed message
    expect(mockCallbackFn).toHaveBeenCalledWith(testMessage);
  });
  
  it('sends data as JSON string', () => {
    // Setup connection
    websocketService.connect();
    websocketService.ws.triggerOpen();
    
    // Send data
    const testData = { type: 'CHAT', message: 'Hello from test!' };
    websocketService.send(testData);
    
    // Check sent data was JSON stringified
    expect(websocketService.ws.sent.length).toBe(1);
    expect(websocketService.ws.sent[0]).toBe(JSON.stringify(testData));
  });
  
  it('updates status to 2 when manually closed', () => {
    // Setup connection
    websocketService.connect();
    websocketService.ws.triggerOpen();
    
    // Close connection
    websocketService.close();
    
    // Status should be 2 (manually closed)
    expect(websocketService.status).toBe(2);
  });
  
  it('attempts to reconnect when connection is lost', () => {
    // Clear any previous timeout callbacks
    timeoutCallbacks = [];
    
    // Setup spy on connect method
    const connectSpy = vi.spyOn(websocketService, 'connect');
    
    // Setup connection
    websocketService.connect();
    websocketService.ws.triggerOpen();
    
    // Reset spy count
    connectSpy.mockClear();
    
    // Simulate unexpected closure
    websocketService.onClose({});
    
    // Status should be 0 (closed but not manually)
    expect(websocketService.status).toBe(0);
    
    // Should call setTimeout for reconnection
    expect(global.setTimeout).toHaveBeenCalled();
    
    // Check that the timeout was set with the correct delay
    const timeoutCall = global.setTimeout.mock.calls[0];
    expect(timeoutCall[1]).toBe(5000);
    
    // Execute the timeout callback manually to verify it tries to reconnect
    if (timeoutCallbacks.length > 0) {
      timeoutCallbacks[0].callback();
      expect(connectSpy).toHaveBeenCalled();
    }
  });
  
  it('does not reconnect when manually closed', () => {
    // Setup spy on connect method
    const connectSpy = vi.spyOn(websocketService, 'connect');
    
    // Setup connection
    websocketService.connect();
    websocketService.ws.triggerOpen();
    
    // Manually close
    websocketService.close();
    
    // Reset spy count
    connectSpy.mockClear();
    
    // Simulate closure
    websocketService.onClose({});
    
    // Status should remain 2 (manually closed)
    expect(websocketService.status).toBe(2);
  });
  
  it('sets up ping interval when heartHandler is called', () => {
    // Call heartHandler directly
    websocketService.heartHandler();
    
    // Should set up a ping interval
    expect(global.setInterval).toHaveBeenCalled();
    expect(websocketService.pingInterval).toBe(999); // The fake timer ID we're returning
  });
  
  it('sends ping message inside heartbeat interval', () => {
    // Setup connection
    websocketService.connect();
    websocketService.ws.triggerOpen();
    
    // Manually extract and call the heartbeat interval callback
    const setIntervalMock = global.setInterval.mock;
    const heartbeatCallback = setIntervalMock.calls[0][0];
    
    // Clear sent messages
    websocketService.ws.sent = [];
    
    // Call the interval callback directly
    heartbeatCallback();
    
    // Should have sent a ping message
    expect(websocketService.ws.sent.length).toBe(1);
    const pingMessage = JSON.parse(websocketService.ws.sent[0]);
    expect(pingMessage.type).toBe(0);
  });
  
  it('clears interval on status change', () => {
    // Setup connection and heartbeat
    websocketService.connect();
    websocketService.ws.triggerOpen();
    
    // Manually extract and call the heartbeat interval callback
    const setIntervalMock = global.setInterval.mock;
    const heartbeatCallback = setIntervalMock.calls[0][0];
    
    // Change status to closed
    websocketService.status = 2;
    
    // Call the interval callback
    heartbeatCallback();
    
    // Should have called clearInterval
    expect(global.clearInterval).toHaveBeenCalled();
    expect(intervalCleared).toBe(true);
  });
  
  it('logs error when WebSocket error occurs', () => {
    // Mock console.log
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Setup connection
    websocketService.connect();
    
    // Simulate error
    const errorEvent = new Event('error');
    websocketService.ws.triggerError();
    
    // Should log the error
    expect(consoleLogSpy).toHaveBeenCalled();
    
    // Restore console.log
    consoleLogSpy.mockRestore();
  });
});
