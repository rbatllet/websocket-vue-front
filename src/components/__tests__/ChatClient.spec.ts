import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatClient from '../ChatClient.vue'

// Mock data for testing
const mockMessages = [
  {
    name: 'TestUser',
    message: 'Hello, world!',
    timestamp: '2023-01-01T12:00:00.000Z',
    type: 'CHAT'
  },
  {
    name: 'System',
    message: 'TestUser has joined the chat',
    timestamp: '2023-01-01T12:01:00.000Z',
    type: 'JOIN'
  },
  {
    name: 'OtherUser',
    message: 'Welcome!',
    timestamp: '2023-01-01T12:02:00.000Z',
    type: 'CHAT'
  }
]

describe('ChatClient.vue', () => {
  let wrapper: any

  // Setup default props before each test
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks()
    
    // Create wrapper with default props
    wrapper = mount(ChatClient, {
      props: {
        socket: null,
        status: 0,
        messages: [],
        username: 'TestUser'
      }
    })
  })

  it('renders empty state when there are no messages', () => {
    expect(wrapper.find('.no-messages').exists()).toBe(true)
    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('.empty-state').text()).toContain('No messages yet')
  })

  it('renders messages when there are some', async () => {
    // Update props to include messages
    await wrapper.setProps({
      messages: mockMessages
    })

    // Check that messages are rendered
    expect(wrapper.find('.no-messages').exists()).toBe(false)
    expect(wrapper.findAll('.message').length).toBe(3)
    
    // Check first message content
    const firstMessage = wrapper.findAll('.message')[0]
    expect(firstMessage.find('.message-name').text()).toBe('TestUser')
    expect(firstMessage.find('.message-content').text()).toBe('Hello, world!')
    
    // Check that message classes include the message type
    expect(firstMessage.classes()).toContain('chat')
    
    // Check second message type (JOIN)
    const secondMessage = wrapper.findAll('.message')[1]
    expect(secondMessage.classes()).toContain('join')
  })

  it('disables input when status is not connected', () => {
    // Status is 0 (disconnected) from beforeEach
    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('enables input when status is connected', async () => {
    // Update status to 1 (connected)
    await wrapper.setProps({
      status: 1
    })

    // Input should be enabled but button should still be disabled (empty input)
    expect(wrapper.find('input').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    
    // Type something in the input
    await wrapper.find('input').setValue('Test message')
    
    // Now button should be enabled
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
  })

  it('emits send-message event when sending a message', async () => {
    // Update status to 1 (connected)
    await wrapper.setProps({
      status: 1
    })
    
    // Type a message
    await wrapper.find('input').setValue('Test message')
    
    // Click send button
    await wrapper.find('button').trigger('click')
    
    // Check emitted events
    expect(wrapper.emitted('send-message')).toBeTruthy()
    expect(wrapper.emitted('send-message')[0]).toEqual(['Test message'])
    
    // Input should be cleared
    expect(wrapper.find('input').element.value).toBe('')
  })

  it('emits send-message event when pressing Enter', async () => {
    // Update status to 1 (connected)
    await wrapper.setProps({
      status: 1
    })
    
    // Type a message
    await wrapper.find('input').setValue('Test message')
    
    // Press Enter
    await wrapper.find('input').trigger('keyup.enter')
    
    // Check emitted events
    expect(wrapper.emitted('send-message')).toBeTruthy()
    expect(wrapper.emitted('send-message')[0]).toEqual(['Test message'])
    
    // Input should be cleared
    expect(wrapper.find('input').element.value).toBe('')
  })

  it('formats time correctly', async () => {
    // Add a message with a known timestamp
    await wrapper.setProps({
      messages: [{
        name: 'TestUser',
        message: 'Hello, world!',
        timestamp: '2023-01-01T12:34:56.000Z',
        type: 'CHAT'
      }]
    })
    
    // Get the formatted time
    const timeElement = wrapper.find('.message-time')
    
    // Check that time is formatted (format may vary depending on locale)
    // We'll just check that it's not the raw ISO string
    expect(timeElement.text()).not.toBe('2023-01-01T12:34:56.000Z')
    expect(timeElement.text().length).toBeLessThan('2023-01-01T12:34:56.000Z'.length)
  })
})
