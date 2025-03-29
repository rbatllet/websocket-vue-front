import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import HomeView from '../HomeView.vue'
import ChatClient from '../../components/ChatClient.vue'

// Mock setInterval and setTimeout to avoid timer issues
vi.useFakeTimers()

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = []
  onopen: Function | null = null
  onmessage: Function | null = null
  onerror: Function | null = null
  onclose: Function | null = null
  readyState: number = WebSocket.CONNECTING
  sent: any[] = []
  url: string
  
  constructor(url: string) {
    this.url = url
    this.readyState = WebSocket.CONNECTING
    MockWebSocket.instances.push(this)
  }
  
  send(data: string): void {
    this.sent.push(data)
  }
  
  close(): void {
    this.readyState = WebSocket.CLOSED
    if (this.onclose) this.onclose({ code: 1000, reason: 'Normal closure', wasClean: true })
  }

  // Helper methods for testing
  triggerOpen(): void {
    this.readyState = WebSocket.OPEN
    if (this.onopen) this.onopen(new Event('open'))
  }
  
  triggerMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage({ data: typeof data === 'string' ? data : JSON.stringify(data) })
    }
  }
  
  triggerError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }
  
  triggerClose(code: number = 1000, reason: string = 'Normal closure'): void {
    this.readyState = WebSocket.CLOSED
    if (this.onclose) {
      this.onclose({ code, reason, wasClean: true })
    }
  }
  
  static resetAll(): void {
    MockWebSocket.instances = []
  }
}

// Clear global intervals to prevent test interference
const clearAllIntervals = () => {
  // This is a workaround to clear all intervals since vi.clearAllTimers() 
  // might not catch existing intervals depending on how they were created
  for (let i = 0; i < 1000; i++) {
    clearInterval(i)
  }
}

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    protocol: 'http:',
    hostname: 'localhost',
    port: '3000',
    pathname: '/'
  },
  writable: true
})

// Mock environment variables
vi.stubGlobal('import.meta', {
  env: {
    VITE_INTEGRATED_MODE: 'false',
    VITE_WEBSOCKET_PROTOCOL: 'ws',
    VITE_WEBSOCKET_HOST: 'localhost',
    VITE_WEBSOCKET_PORT: '8080',
    VITE_WEBSOCKET_ENDPOINT: '/chat',
    VITE_WEBSOCKET_RECONNECT_TIMEOUT: '100',
    VITE_WEBSOCKET_PING_INTERVAL: '100',
    VITE_APP_NAME: 'Test App',
    VITE_APP_VERSION: '1.0.0'
  }
})

// Replace the real WebSocket with our mock
global.WebSocket = MockWebSocket as any

// Mock setInterval to prevent infinite timers
const realSetInterval = global.setInterval
global.setInterval = vi.fn().mockImplementation((callback, delay) => {
  // Return a fake timer ID
  return 999
})

describe('HomeView.vue', () => {
  let wrapper: any
  
  beforeEach(() => {
    // Clear mock WebSocket instances
    MockWebSocket.resetAll()
    
    // Clear intervals to avoid interference between tests
    clearAllIntervals()
    
    // Clear all mocks and timers
    vi.clearAllMocks()
    vi.clearAllTimers()
    
    // Create wrapper with all necessary mocks
    wrapper = mount(HomeView, {
      global: {
        stubs: {
          RouterLink: true
        },
        mocks: {
          setInterval: global.setInterval
        }
      }
    })
  })
  
  afterEach(() => {
    wrapper?.unmount()
    vi.clearAllMocks()
    vi.clearAllTimers()
    MockWebSocket.resetAll()
    clearAllIntervals()
  })

  it('renders the connection panel with disconnected status', () => {
    expect(wrapper.find('.connection-panel').exists()).toBe(true)
    expect(wrapper.find('.status-indicator').classes()).toContain('disconnected')
    expect(wrapper.find('.connection-status').text()).toContain('Disconnected')
    expect(wrapper.find('button').text()).toContain('Connect')
  })
  
  it('includes the ChatClient component with correct props', () => {
    // Check that ChatClient is rendered
    expect(wrapper.findComponent(ChatClient).exists()).toBe(true)
    
    // Check the props passed to ChatClient
    const chatClient = wrapper.findComponent(ChatClient)
    expect(chatClient.props('socket')).toBe(null)
    expect(chatClient.props('status')).toBe(0)
    expect(chatClient.props('messages')).toEqual([])
    expect(chatClient.props('username')).toMatch(/^Guest-\d+$/)
  })
  
  it('creates a WebSocket connection when clicking Connect button', async () => {
    // Click the connect button
    await wrapper.find('button').trigger('click')

    // Get the mock WebSocket instance
    expect(MockWebSocket.instances.length).toBe(1)
    const mockWs = MockWebSocket.instances[0]
    
    // Manually trigger the WebSocket open event
    mockWs.triggerOpen()
    await nextTick()
    
    // Now there should be two buttons: Update name and Disconnect
    const buttons = wrapper.findAll('button')
    let disconnectButton = null
    
    for (let i = 0; i < buttons.length; i++) {
      if (buttons[i].text().includes('Disconnect')) {
        disconnectButton = buttons[i]
        break
      }
    }
    
    // Verify we found the Disconnect button
    expect(disconnectButton).not.toBeNull()
    
    // Status should be updated to connected
    expect(wrapper.find('.status-indicator').classes()).toContain('connected')
  })
  
  it('sends a JOIN message upon successful connection', async () => {
    // Click connect button
    await wrapper.find('button').trigger('click')
    
    // Get the mock WebSocket instance
    const mockWs = MockWebSocket.instances[0]
    
    // Manually trigger the WebSocket open event
    mockWs.triggerOpen()
    await nextTick()
    
    // Check that a JOIN message was sent
    expect(mockWs.sent.length).toBeGreaterThan(0)
    
    // Find the JOIN message
    let joinMessage = null
    
    for (const msg of mockWs.sent) {
      const parsed = JSON.parse(msg)
      if (parsed.type === 'JOIN') {
        joinMessage = parsed
        break
      }
    }
    
    expect(joinMessage).not.toBeNull()
    expect(joinMessage.name).toMatch(/^Guest-\d+$/)
  })
  
  it('updates username when submitting the username form', async () => {
    // Connect first
    await wrapper.find('button').trigger('click')
    const mockWs = MockWebSocket.instances[0]
    mockWs.triggerOpen()
    await nextTick()
    
    // Find the username input (should only be visible when connected)
    const usernameInput = wrapper.find('.username-input input')
    expect(usernameInput.exists()).toBe(true)
    
    // Set a new username
    await usernameInput.setValue('NewTestUsername')
    
    // Clear sent messages to focus only on new ones
    mockWs.sent = []
    
    // Click the update name button
    const updateButton = wrapper.find('.username-input button')
    await updateButton.trigger('click')
    await nextTick()
    
    // Check that a JOIN message was sent with the new username
    let foundJoinWithNewName = false
    for (const msg of mockWs.sent) {
      const parsed = JSON.parse(msg)
      if (parsed.type === 'JOIN' && parsed.name === 'NewTestUsername') {
        foundJoinWithNewName = true
        break
      }
    }
    
    expect(foundJoinWithNewName).toBe(true)
  })
  
  it('updates user count when receiving USER_COUNT message', async () => {
    // Connect first
    await wrapper.find('button').trigger('click')
    const mockWs = MockWebSocket.instances[0]
    mockWs.triggerOpen()
    await nextTick()
    
    // Simulate receiving a USER_COUNT message
    mockWs.triggerMessage({
      type: 'USER_COUNT',
      name: 'System',
      message: '5',
      timestamp: new Date().toISOString()
    })
    await nextTick()
    
    // Check that user count is displayed
    expect(wrapper.find('.user-count').text()).toContain('5 user')
  })
  
  it('adds messages to the list when receiving CHAT messages', async () => {
    // Connect first
    await wrapper.find('button').trigger('click')
    const mockWs = MockWebSocket.instances[0]
    mockWs.triggerOpen()
    await nextTick()
    
    // Simulate receiving a CHAT message
    mockWs.triggerMessage({
      type: 'CHAT',
      name: 'TestUser',
      message: 'Hello, this is a test message!',
      timestamp: new Date().toISOString()
    })
    await nextTick()
    
    // Check that the ChatClient component received the message
    const chatClient = wrapper.findComponent(ChatClient)
    expect(chatClient.props('messages').length).toBe(1)
    expect(chatClient.props('messages')[0].name).toBe('TestUser')
    expect(chatClient.props('messages')[0].message).toBe('Hello, this is a test message!')
  })
  
  it('sends CHAT message when ChatClient emits send-message', async () => {
    // Connect first
    await wrapper.find('button').trigger('click')
    const mockWs = MockWebSocket.instances[0]
    mockWs.triggerOpen()
    await nextTick()
    
    // Get the ChatClient component
    const chatClient = wrapper.findComponent(ChatClient)
    
    // Clear sent messages to focus only on new ones
    mockWs.sent = []
    
    // Trigger the send-message event from ChatClient
    await chatClient.vm.$emit('send-message', 'Test message from client')
    await nextTick()
    
    // Check that a CHAT message was sent
    let foundChatMessage = false
    for (const msg of mockWs.sent) {
      const parsed = JSON.parse(msg)
      if (parsed.type === 'CHAT' && parsed.message === 'Test message from client') {
        foundChatMessage = true
        break
      }
    }
    
    expect(foundChatMessage).toBe(true)
  })
  
  it('closes WebSocket connection when clicking Disconnect button', async () => {
    // Connect first
    await wrapper.find('button').trigger('click')
    const mockWs = MockWebSocket.instances[0]
    mockWs.triggerOpen()
    await nextTick()
    
    // Find and click the Disconnect button
    let disconnectButton = null
    const buttons = wrapper.findAll('button')
    
    for (let i = 0; i < buttons.length; i++) {
      if (buttons[i].text().includes('Disconnect')) {
        disconnectButton = buttons[i]
        break
      }
    }
    
    expect(disconnectButton).not.toBeNull()
    await disconnectButton.trigger('click')
    await nextTick()
    
    // Status should be updated to 'closed'
    expect(wrapper.find('.status-indicator').classes()).toContain('closed')
    
    // Connect button should be shown again
    const connectButton = wrapper.find('button')
    expect(connectButton.text()).toContain('Connect')
  })
  
  it('handles PONG messages without adding them to the message list', async () => {
    // Connect first
    await wrapper.find('button').trigger('click')
    const mockWs = MockWebSocket.instances[0]
    mockWs.triggerOpen()
    await nextTick()
    
    // Get the current message count
    const initialMessageCount = wrapper.findComponent(ChatClient).props('messages').length
    
    // Simulate receiving a PONG message
    mockWs.triggerMessage({
      type: 'PONG',
      name: 'System',
      message: 'pong',
      timestamp: new Date().toISOString()
    })
    await nextTick()
    
    // The message count should not change
    const newMessageCount = wrapper.findComponent(ChatClient).props('messages').length
    expect(newMessageCount).toBe(initialMessageCount)
  })
})
