import { create } from 'zustand'

export interface DocItem {
  id: string
  title: string
  content: string
  authorName: string
  authorEmail?: string
  createdAt: string
  updatedAt: string
  starred?: boolean
  icon?: string
}

interface DocStore {
  docs: DocItem[]
  activeDoc: DocItem | null
  setActiveDoc: (doc: DocItem | null) => void
  loadDocs: () => void
  createDoc: (title?: string, content?: string, authorName?: string) => DocItem
  updateDoc: (id: string, updates: Partial<DocItem>) => void
  deleteDoc: (id: string) => void
  getDoc: (id: string) => DocItem | undefined
}

const STORAGE_KEY = 'taskflow_user_docs'

const DEFAULT_DOCS: DocItem[] = [
  {
    id: 'demo',
    title: 'demo',
    content: `# demo\n\nWelcome to your collaborative document! You can start writing notes, project requirements, architectural diagrams, or sprint wiki articles right here.\n\n### Key Highlights\n- Fully responsive and editable\n- Real-time automatic cloud saving\n- Seamless integration with tasks, boards, and chat\n\n### Next Steps\n- [ ] Review sprint deliverables\n- [ ] Align with engineering and product teams`,
    authorName: 'anandu',
    authorEmail: 'anandu2109@gmail.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    starred: true,
  },
]

export const useDocStore = create<DocStore>((set, get) => ({
  docs: DEFAULT_DOCS,
  activeDoc: null,
  setActiveDoc: (doc) => set({ activeDoc: doc }),

  loadDocs: () => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          set({ docs: parsed })
          return
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DOCS))
      set({ docs: DEFAULT_DOCS })
    } catch (e) {
      console.error('Failed to load docs from storage', e)
    }
  },

  createDoc: (title = 'Untitled Doc', content = '', authorName = 'You') => {
    const cleanId = title.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 30) || 'doc'
    const id = cleanId === 'demo' ? 'demo' : `${cleanId}-${Date.now().toString(36)}`
    
    const newDoc: DocItem = {
      id,
      title: title.trim() || 'Untitled Doc',
      content: content || `# ${title.trim() || 'Untitled Doc'}\n\nStart writing notes or specifications...`,
      authorName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      starred: false,
    }

    set((state) => {
      // If doc with id already exists, update it instead of duplicate
      const exists = state.docs.some((d) => d.id === id)
      const updated = exists ? state.docs.map((d) => (d.id === id ? newDoc : d)) : [newDoc, ...state.docs]
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      }
      return { docs: updated, activeDoc: newDoc }
    })

    return newDoc
  },

  updateDoc: (id, updates) => {
    set((state) => {
      const updated = state.docs.map((d) => {
        if (d.id === id) {
          const fresh = { ...d, ...updates, updatedAt: new Date().toISOString() }
          return fresh
        }
        return d
      })
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      }
      const active = state.activeDoc?.id === id ? { ...state.activeDoc, ...updates, updatedAt: new Date().toISOString() } : state.activeDoc
      return { docs: updated, activeDoc: active }
    })
  },

  deleteDoc: (id) => {
    set((state) => {
      const updated = state.docs.filter((d) => d.id !== id)
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      }
      const active = state.activeDoc?.id === id ? null : state.activeDoc
      return { docs: updated, activeDoc: active }
    })
  },

  getDoc: (id) => {
    return get().docs.find((d) => d.id === id)
  },
}))
