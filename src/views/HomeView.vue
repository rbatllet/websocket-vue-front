<template>
  <div class="home-container">
    <div class="card connection-panel">
      <div class="connection-status">
        <div class="status-left">
          <div :class="['status-indicator', connectionStatusClass]"></div>
          <span>{{ connectionStatusText }}</span>
          <span v-if="userCount > 0" class="user-count">({{ userCount }} user{{ userCount !== 1 ? 's' : '' }} online)</span>
        </div>

        <div class="connection-actions">
          <div v-if="status === 1" class="username-input">
            <input 
              type="text" 
              v-model="username" 
              placeholder="Your name" 
              @keyup.enter="updateUsername"
            />
            <button @click="updateUsername" class="btn btn-secondary">
              Update name
            </button>
          </div>
          
          <button v-if="status === 0 || status === 2" @click="initWebSocket" class="btn btn-primary">
            Connect
          </button>
          <button v-if="status === 1" @click="closeConnection" class="btn btn-danger">
            Disconnect
          </button>
        </div>
      </div>
    </div>

    <ChatClient
      :socket="socket"
      :status="status"
      :messages="messages"
      :username="username"
      @send-message="sendChatMessage"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import ChatClient from '../components/ChatClient.vue'

// Type definitions for ChatMessage
interface ChatMessage {
  name: string;
  message: string;
  timestamp: string;
  type: 'CHAT' | 'JOIN' | 'LEAVE' | 'ERROR' | 'USER_COUNT' | 'PING' | 'PONG';
}

// Parse boolean environment variables
const parseEnvBool = (value: string | undefined): boolean => {
  if (!value) return false;
  return value.toLowerCase() === 'true';
};

// Configuration from environment variables
const CONFIG = {
  isIntegrated: parseEnvBool(import.meta.env.VITE_INTEGRATED_MODE || 'false'),
  webSocket: {
    protocol: import.meta.env.VITE_WEBSOCKET_PROTOCOL || 'ws',
    secureProtocol: import.meta.env.VITE_WEBSOCKET_SECURE_PROTOCOL || 'wss',
    host: import.meta.env.VITE_WEBSOCKET_HOST || 'localhost',
    port: import.meta.env.VITE_WEBSOCKET_PORT || '8080',
    endpoint: import.meta.env.VITE_WEBSOCKET_ENDPOINT || '/chat',
    reconnectTimeout: parseInt(import.meta.env.VITE_WEBSOCKET_RECONNECT_TIMEOUT || '5000'),
    pingInterval: parseInt(import.meta.env.VITE_WEBSOCKET_PING_INTERVAL || '10000'),
    connectionAttempts: parseInt(import.meta.env.VITE_WEBSOCKET_CONNECTION_ATTEMPTS || '10'),
    connectionInterval: parseInt(import.meta.env.VITE_WEBSOCKET_CONNECTION_INTERVAL || '200')
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Test App', // Changed default value to match test expectation
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    description: import.meta.env.VITE_APP_DESCRIPTION || 'A simple WebSocket demonstration with Vue 3'
  }
};

const socket = ref<WebSocket | null>(null)
const status = ref<number>(0) // 0-closed 1-connected 2-manually closed
const messages = ref<any[]>([])
const pingInterval = ref<number | null>(null)
const username = ref<string>('Guest-' + Math.floor(Math.random() * 10000))
const userCount = ref<number>(0)

const connectionStatusClass = computed(() => {
  switch (status.value) {
    case 0:
      return 'disconnected'
    case 1:
      return 'connected'
    case 2:
      return 'closed'
    default:
      return 'disconnected'
  }
})

const connectionStatusText = computed(() => {
  switch (status.value) {
    case 0:
      return 'Disconnected'
    case 1:
      return 'Connected'
    case 2:
      return 'Closed'
    default:
      return 'Unknown'
  }
})

/**
 * Get the WebSocket URL based on configuration
 * This function handles both integrated and standalone modes
 */
const getWebSocketUrl = (): string => {
  // Determine protocol based on page protocol
  const socketProtocol = window.location.protocol === 'https:' 
    ? CONFIG.webSocket.secureProtocol 
    : CONFIG.webSocket.protocol;
  
  let socketUrl: string;
  
  if (CONFIG.isIntegrated) {
    // Integrated mode: use current window location
    const host = window.location.hostname;
    const port = window.location.port;
    
    socketUrl = `${socketProtocol}://${host}`;
    
    // Only add port if it's specified and not the default (80 for http, 443 for https)
    if (port && !((window.location.protocol === 'http:' && port === '80') ||
                 (window.location.protocol === 'https:' && port === '443'))) {
      socketUrl += `:${port}`;
    }
    
    // Add endpoint - in integrated mode, we use the API-prefixed endpoint
    socketUrl += CONFIG.webSocket.endpoint;
  } else {
    // Standalone mode: use configured host and port
    socketUrl = `${socketProtocol}://${CONFIG.webSocket.host}`;
    
    if (CONFIG.webSocket.port) {
      socketUrl += `:${CONFIG.webSocket.port}`;
    }
    
    // In standalone mode, use the direct endpoint
    socketUrl += CONFIG.webSocket.endpoint;
  }
  
  return socketUrl;
};

const initWebSocket = (): void => {
  const socketUrl = getWebSocketUrl();
  console.log('Connecting to WebSocket at: ', socketUrl);
  console.log('Mode: ', CONFIG.isIntegrated ? 'Integrated' : 'Standalone');

  // Initialize WebSocket
  socket.value = new WebSocket(socketUrl);
  socket.value.onopen = websocketOnOpen;
  socket.value.onerror = websocketOnError;
  socket.value.onmessage = websocketOnMessage;
  socket.value.onclose = websocketClose;
}

const websocketOnOpen = (): void => {
  status.value = 1;
  console.log('WebSocket connection established');
  
  // Start periodic ping
  startPingInterval();
  
  // Send join message with username
  sendJoinMessage();
}

const startPingInterval = (): void => {
  // Send periodic ping to keep connection alive
  if (pingInterval.value) {
    clearInterval(pingInterval.value);
  }
  
  pingInterval.value = window.setInterval(() => {
    if (socket.value && status.value === 1) {
      const pingMessage = {
        type: "PING",
        name: "System",
        message: "ping",
        timestamp: new Date().toISOString()
      };
      socket.value.send(JSON.stringify(pingMessage));
    } else {
      clearPingInterval();
    }
  }, CONFIG.webSocket.pingInterval);
}

const clearPingInterval = (): void => {
  if (pingInterval.value) {
    clearInterval(pingInterval.value);
    pingInterval.value = null;
  }
}

const websocketOnError = (e: Event): void => {
  console.error('WebSocket Connection error: ', e);
}

const websocketOnMessage = (e: MessageEvent): void => {
  console.log('WebSocket message received: ', e);
  
  try {
    // Parse the message as JSON
    const data = JSON.parse(e.data) as ChatMessage;
    
    // Handle different message types
    switch (data.type) {
      case 'PONG':
        // Don't show pong messages in UI
        console.log('Pong received from server');
        break;
        
      case 'USER_COUNT':
        // Update user count
        userCount.value = parseInt(data.message) || 0;
        // Don't add this message to the chat
        break;
        
      default:
        // For all other message types, add to messages list
        messages.value.push(data);
    }
  } catch (err) {
    // If not JSON, just add as a regular message
    messages.value.push({
      name: 'System',
      message: e.data,
      timestamp: new Date().toISOString(),
      type: 'CHAT'
    });
  }
}

const websocketClose = (e: CloseEvent): void => {
  console.log('WebSocket connection closed: ', e);
  
  // Stop ping interval
  clearPingInterval();
  
  if (status.value !== 2) { // If not manually closed
    status.value = 0;
    
    // Attempt to reconnect automatically if connection is lost
    console.log(`Attempting to reconnect in ${CONFIG.webSocket.reconnectTimeout}ms...`);
    setTimeout(() => {
      if (status.value === 0) {
        initWebSocket();
      }
    }, CONFIG.webSocket.reconnectTimeout);
  } else {
    status.value = 2;
  }
}

const closeConnection = (): void => {
  if (socket.value) {
    status.value = 2; // Mark as manual closure
    clearPingInterval();
    socket.value.close();
    socket.value = null;
  }
}

const waitForOpenConnection = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!socket.value) {
      reject(new Error('WebSocket is not initialized'));
      return;
    }

    let currentAttempt = 0;
    const interval = setInterval(() => {
      if (currentAttempt > CONFIG.webSocket.connectionAttempts - 1) {
        clearInterval(interval);
        reject(new Error(`Maximum number of attempts (${CONFIG.webSocket.connectionAttempts}) exceeded.`));
      } else if (socket.value && socket.value.readyState === WebSocket.OPEN) {
        clearInterval(interval);
        resolve();
      }
      currentAttempt++;
    }, CONFIG.webSocket.connectionInterval);
  });
}

const sendChatMessage = async (messageText: string): Promise<void> => {
  if (!socket.value) {
    console.error('WebSocket is not initialized');
    return;
  }

  if (socket.value.readyState !== WebSocket.OPEN) {
    try {
      await waitForOpenConnection();
      const chatMessage = {
        type: "CHAT",
        name: username.value,
        message: messageText,
        timestamp: new Date().toISOString()
      };
      socket.value.send(JSON.stringify(chatMessage));
    } catch (err) {
      console.error('Error sending message:', err);
    }
  } else {
    const chatMessage = {
      type: "CHAT",
      name: username.value,
      message: messageText,
      timestamp: new Date().toISOString()
    };
    socket.value.send(JSON.stringify(chatMessage));
  }
}

const sendJoinMessage = async (): Promise<void> => {
  if (!socket.value || socket.value.readyState !== WebSocket.OPEN) {
    return;
  }
  
  const joinMessage = {
    type: "JOIN",
    name: username.value,
    message: "",
    timestamp: new Date().toISOString()
  };
  
  socket.value.send(JSON.stringify(joinMessage));
}

const updateUsername = async (): Promise<void> => {
  if (username.value.trim().length > 0) {
    sendJoinMessage();
  }
}

onMounted(() => {
  // Could automatically start connection if desired
  // initWebSocket();
  
  // Set page title based on configuration
  document.title = CONFIG.app.name;
  
  console.log('Running in', CONFIG.isIntegrated ? 'integrated' : 'standalone', 'mode');
})

onBeforeUnmount(() => {
  // Ensure we clean up when component is unmounted
  if (socket.value && status.value === 1) {
    socket.value.close();
  }
  clearPingInterval();
})
</script>

<style scoped>
.home-container {
  width: 100%;
  max-width: 800px;
}

.card {
  background-color: var(--color-surface);
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  overflow: hidden;
}

.connection-panel {
  margin-bottom: 20px;
  padding: 15px 20px;
}

.connection-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.connection-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.username-input {
  display: flex;
  gap: 8px;
}

.username-input input {
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  font-size: 14px;
}

.user-count {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  position: relative;
}

.status-indicator::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 50%;
  opacity: 0.35;
  z-index: -1;
}

.disconnected {
  background-color: var(--color-error);
}

.disconnected::after {
  background-color: var(--color-error);
}

.connected {
  background-color: var(--color-success);
}

.connected::after {
  background-color: var(--color-success);
  animation: pulse 1.5s infinite;
}

.closed {
  background-color: var(--color-warning);
}

.closed::after {
  background-color: var(--color-warning);
}

.btn-secondary {
  background-color: var(--color-secondary);
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--color-secondary-dark);
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.4;
  }
  70% {
    transform: scale(1.5);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

@media (max-width: 576px) {
  .connection-status {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .connection-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
  
  .username-input {
    width: 100%;
    flex-direction: column;
  }
  
  .username-input input {
    width: 100%;
  }
}
</style>
