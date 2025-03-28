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
