import { create } from 'zustand'
import { UIMessage } from 'ai'

interface ChatState {
  messages: UIMessage[]
  setMessages: (messages: UIMessage[]) => void
  addMessage: (message: UIMessage) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  clearMessages: () => set({ messages: [] })
}))
