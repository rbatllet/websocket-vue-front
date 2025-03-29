# WebSocket Vue Frontend

This is the frontend part of the WebSocket Demo application, built with Vue.js 3 and TypeScript.

## Features

- Real-time chat interface using WebSockets
- Structured message handling with different message types
- Username management and display
- User count and presence notifications
- Message timestamps with formatting
- Responsive design that works on desktop and mobile
- Automatic reconnection when connection is lost
- Ping/pong mechanism to keep connections alive
- Support for standalone, integrated, and Docker deployment modes

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Build for Integration with Spring Boot

```sh
npm run dist
```

This command builds the Vue.js application and places the output directly in the Spring Boot static resources directory. The output directory is automatically cleaned before each build to prevent issues with stale files.

## Testing

The application is thoroughly tested using Vitest, a Vite-based unit test framework with a Jest-compatible API.

### Running Tests

To run the tests, use the following npm command:

```bash
npm run test:unit
```

For continuous testing during development:

```bash
npm run test:unit -- --watch
```

To generate a coverage report:

```bash
npm run test:unit -- --coverage
```

### Test Structure

The tests are organized in a similar structure to the application:

- `/src/components/__tests__/` - Tests for Vue components
- `/src/views/__tests__/` - Tests for Vue views
- `/src/services/__tests__/` - Tests for services like WebSocket

### Test Coverage

The tests cover the following aspects of the application:

#### Component Tests (ChatClient.vue)

- Rendering of empty state when no messages
- Rendering of messages when they exist
- Input field behavior when connected/disconnected
- Sending messages via button click
- Sending messages via Enter key
- Format time display

#### View Tests (HomeView.vue)

- Status indicator for WebSocket connection
- Connection/Disconnection functionality
- Username update
- Message sending/receiving
- WebSocket auto-reconnection
- User count display
- Ping/Pong mechanism

#### Service Tests (websocket.js)

- WebSocket connection initialization
- Sending and receiving messages
- Automatic reconnection
- Manual connection closing
- Heartbeat mechanism
- Error handling

### Mocking Techniques

The tests use various mocking techniques to create reliable and controlled test environments:

1. **WebSocket Mock**: A custom mock implementation of the WebSocket API that allows controlled event triggering
2. **Environment Variables**: Import.meta.env variables are mocked to simulate different configurations
3. **Window Location**: Browser location is mocked for URL generation testing
4. **Timer Mocking**: Direct timer mocking to avoid infinite loops and make tests predictable
5. **Console Methods**: Console.log and console.error are spied on to verify error handling

### WebSocket Test Helpers

The WebSocket mock includes explicit trigger methods instead of relying on timers:

- `triggerOpen()`: Explicitly trigger the WebSocket open event
- `triggerMessage(data)`: Explicitly trigger a message received event
- `triggerError()`: Explicitly trigger an error event
- `triggerClose()`: Explicitly trigger a close event

This approach provides several advantages:
- No dependency on timers that can cause infinite loops
- Full control over the event sequence
- Tests are more readable and maintainable
- Consistent behavior across test runs

### Best Practices and Solutions for WebSocket Testing

These tests demonstrate several best practices for testing WebSocket applications:

1. **Explicit Event Triggering**: Using direct trigger methods instead of timers for WebSocket events
2. **Timer Function Replacement**: Replacing global timer functions to avoid infinite loops
   ```javascript
   // Instead of using vi.runAllTimers() which can cause infinite loops
   global.setInterval = vi.fn().mockImplementation(() => 999);
   ```

3. **Callback Execution Control**: Storing and manually executing timer callbacks
   ```javascript
   let timeoutCallbacks = [];
   global.setTimeout = vi.fn().mockImplementation((callback, delay) => {
     timeoutCallbacks.push({ callback, delay });
     return 888;
   });
   // Later in test: timeoutCallbacks[0].callback();
   ```

4. **Isolated Tests**: Each test focuses on a single aspect of behavior with proper cleanup
5. **Behavior Testing**: Testing behavior and outcomes rather than implementation details
6. **Mock Cleanup**: Thorough cleanup of mocks and timers between tests
   ```javascript
   afterEach(() => {
     vi.clearAllMocks();
     vi.clearAllTimers();
     MockWebSocket.resetAll();
     clearAllIntervals();
   });
   ```

7. **Async Testing**: Proper use of async/await and nextTick for Vue component updates
8. **Clear Assertions**: Direct assertions about component state and behavior

## Configuration

The application uses environment variables for configuration:

- `.env.development` - Used when running in development mode (`npm run dev`)
- `.env.production` - Used when building for production or integration

Key configuration options:

- `VITE_WEBSOCKET_HOST` - WebSocket server hostname
- `VITE_WEBSOCKET_PORT` - WebSocket server port
- `VITE_WEBSOCKET_ENDPOINT` - WebSocket endpoint path
- `VITE_INTEGRATED_MODE` - Flag indicating if running integrated with backend
- `VITE_WEBSOCKET_RECONNECT_TIMEOUT` - Timeout for reconnection attempts
- `VITE_WEBSOCKET_PING_INTERVAL` - Interval for ping messages

## Build Configuration

The build process is configured in `vite.config.ts`:

```typescript
// Output configuration for integrated mode
build: {
  outDir: path.resolve(__dirname, '../websocket-spring-back/src/main/resources/static'),
  emptyOutDir: true, // Clean the output directory before building
},
```

This ensures that when building for integration with Spring Boot, the output is placed directly in the Spring Boot static resources directory and the directory is cleaned before each build.

## Component Structure

- `HomeView.vue` - Main view that manages WebSocket connection and state
- `ChatClient.vue` - Chat UI component for displaying and sending messages
- `App.vue` - Root component with layout and routing

## Message Format

The application uses a structured message format for WebSocket communication:

```typescript
interface ChatMessage {
  name: string;
  message: string;
  timestamp: string;
  type: 'CHAT' | 'JOIN' | 'LEAVE' | 'ERROR' | 'USER_COUNT' | 'PING' | 'PONG';
}
```

This structured format allows for:
- Different styling for different message types
- System messages vs. user messages
- Formatted timestamps
- User presence notifications

## WebSocket Implementation

The application connects to a WebSocket server and provides the following features:

- Connection status indicator with user count
- Username input and management
- Message sending and receiving with different types
- Formatted message display with timestamps
- Automatic reconnection on connection loss
- Periodic ping messages to keep the connection alive

The WebSocket connection logic in `HomeView.vue` handles all deployment scenarios:

1. **Standalone Mode**: Connects to configured host/port (`ws://localhost:8080/api/chat`)
2. **Integrated Mode**: Connects to the current host with appropriate path (`ws://{current-host}/chat`)
3. **Docker Mode**: Also uses integrated mode configuration (paths are consistent across modes)

The application automatically detects the current hosting environment and configures the WebSocket connection URL accordingly using the `getWebSocketUrl()` function, which considers:
- Current protocol (WS or WSS)
- Current hostname
- Integrated vs. standalone mode
- Context path configuration

## Docker Support

This frontend can be built into a Docker image along with the Spring Boot backend using the Dockerfile in the project root:

```bash
# From the project root, with no context path
./build-docker.sh
docker-compose up

# Or with a context path
./build-docker.sh latest "/api"
docker-compose up
```

For Docker deployment, the Vue.js app is now built directly into the Spring Boot static resources directory within a single build stage. This improved approach:

1. Uses a single Docker build stage with both Node.js and Maven
2. Builds frontend directly to the backend's static resources directory
3. Avoids potential file copy issues between stages
4. Provides a more reliable and efficient build process

The build script still allows configuring the context path, making it possible to deploy with different configurations without manually editing config files:
- Without context path (simpler URLs, integrated mode)
- With context path (more structured URLs, typical for multi-application deployments)
