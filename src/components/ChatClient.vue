<template>
  <div class="chat-container card">
    <div class="chat-header">
      <h2>Chat</h2>
      <div class="chat-info" v-if="status === 1">
        <span class="active-badge">Live</span>
      </div>
    </div>
    
    <div class="messages-area">
      <div v-if="messages.length === 0" class="no-messages">
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <p>No messages yet</p>
          <p class="hint">Start the conversation!</p>
        </div>
      </div>
      <div
        v-else
        v-for="(msg, index) in messages"
        :key="index"
        :class="['message', msg.type.toLowerCase()]"
      >
        <div class="message-header">
          <span class="message-name">{{ msg.name }}</span>
          <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
        </div>
        <div class="message-content">{{ msg.message }}</div>
      </div>
    </div>
    
    <div class="input-area">
      <input 
        type="text" 
        v-model="messageInput" 
        placeholder="Type your message here..." 
        @keyup.enter="send" 
        :disabled="status !== 1"
      />
      <button 
        @click="send()" 
        :disabled="status !== 1 || !messageInput.length"
        class="btn btn-primary send-button"
      >
        Send message
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue';

// Define props that the parent component will pass
const props = defineProps<{
  socket: WebSocket | null;
  status: number;
  messages: any[];
  username: string;
}>();

// Define emits to communicate with the parent component
const emit = defineEmits<{
  (e: 'send-message', message: string): void;
}>();

// Local state for the input field
const messageInput = ref<string>('');

// Function to send a message
const send = (): void => {
  if (messageInput.value.length > 0 && props.status === 1) {
    emit('send-message', messageInput.value);
    messageInput.value = '';
  }
};

// Format timestamp to a readable time
const formatTime = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
};
</script>

<style scoped>
.chat-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  height: 500px;
}

.chat-header {
  padding: 15px 20px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-secondary);
  margin: 0;
}

.active-badge {
  background-color: var(--color-success);
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.messages-area {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: var(--color-background);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
}

.empty-state svg {
  margin-bottom: 15px;
  opacity: 0.5;
}

.empty-state p {
  margin: 5px 0;
}

.empty-state .hint {
  font-size: 14px;
  opacity: 0.7;
}

.message {
  margin-bottom: 12px;
  padding: 12px 16px;
  background-color: var(--color-surface);
  border-radius: var(--border-radius);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  word-break: break-word;
  border-left: 3px solid var(--color-primary);
  animation: slideIn 0.3s ease;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 14px;
}

.message-name {
  font-weight: 600;
  color: var(--color-secondary);
}

.message-time {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.message-content {
  line-height: 1.4;
}

/* Message type styling */
.message.join, .message.leave {
  background-color: rgba(53, 73, 94, 0.05);
  border-left-color: var(--color-secondary);
}

.message.error {
  background-color: rgba(217, 83, 79, 0.05);
  border-left-color: var(--color-error);
}

.input-area {
  display: flex;
  padding: 15px;
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border);
}

.input-area input {
  flex-grow: 1;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  font-size: 14px;
  transition: all 0.2s;
}

.input-area input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.2);
}

.input-area input:disabled {
  background-color: var(--color-background);
  cursor: not-allowed;
}

.send-button {
  margin-left: 10px;
  white-space: nowrap;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 576px) {
  .chat-container {
    height: 400px;
  }
  
  .input-area {
    flex-direction: column;
  }
  
  .input-area input {
    margin-bottom: 10px;
  }
  
  .send-button {
    margin-left: 0;
    width: 100%;
  }
}
</style>
