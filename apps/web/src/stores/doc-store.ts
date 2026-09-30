import { create } from 'zustand'

export interface SubPageItem {
  id: string
  title: string
  content: string
  authorName?: string
  createdAt: string
  updatedAt: string
}

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
  location?: string // e.g. "Team Space"
  tags?: string[]
  viewedAt?: string
  subpages?: SubPageItem[]
  isProtected?: boolean
  isPublic?: boolean
  isWiki?: boolean
}

interface DocStore {
  docs: DocItem[]
  activeDoc: DocItem | null
  activeSubpageId: string | null
  setActiveDoc: (doc: DocItem | null) => void
  setActiveSubpageId: (subpageId: string | null) => void
  loadDocs: () => void
  createDoc: (title?: string, content?: string, authorName?: string, location?: string) => DocItem
  updateDoc: (id: string, updates: Partial<DocItem>) => void
  deleteDoc: (id: string) => void
  getDoc: (id: string) => DocItem | undefined
  createSubpage: (docId: string, title?: string, content?: string) => SubPageItem
  updateSubpage: (docId: string, subpageId: string, updates: Partial<SubPageItem>) => void
  deleteSubpage: (docId: string, subpageId: string) => void
}

const STORAGE_KEY = 'taskflow_user_docs'

export const useDocStore = create<DocStore>((set, get) => ({
  docs: [],
  activeDoc: null,
  activeSubpageId: null,
  setActiveDoc: (doc) => set({ activeDoc: doc }),
  setActiveSubpageId: (subpageId) => set({ activeSubpageId: subpageId }),

  loadDocs: () => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          // Filter out dummy/mock docs if user had them before
          const filtered = parsed.filter((d: DocItem) => d && d.id && d.title)
          set({ docs: filtered })
          return
        }
      }
      // If nothing saved yet, keep empty (no dummy datas per user request)
      set({ docs: [] })
    } catch (e) {
      console.error('Failed to load docs from storage', e)
      set({ docs: [] })
    }
  },

  createDoc: (title = 'Untitled Doc', content = '', authorName = 'anandu', location = 'Team Space') => {
    const trimmedTitle = title.trim() || 'Untitled Doc'
    const cleanId = trimmedTitle
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30) || 'doc'
    const id = `${cleanId}-${Date.now().toString(36)}`
    
    const newDoc: DocItem = {
      id,
      title: trimmedTitle,
      content: content || `# ${trimmedTitle}\n\nStart writing notes or specifications...`,
      authorName,
      location,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewedAt: new Date().toISOString(),
      starred: false,
      subpages: [],
      isProtected: false,
      isPublic: false,
      isWiki: false,
    }

    set((state) => {
      const updated = [newDoc, ...state.docs.filter((d) => d.id !== id)]
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      }
      return { docs: updated, activeDoc: newDoc, activeSubpageId: null }
    })

    return newDoc
  },

  updateDoc: (id, updates) => {
    set((state) => {
      const updated = state.docs.map((d) => {
        if (d.id === id) {
          return {
            ...d,
            ...updates,
            updatedAt: new Date().toISOString(),
            viewedAt: new Date().toISOString(),
          }
        }
        return d
      })
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      }
      const active = state.activeDoc?.id === id 
        ? { ...state.activeDoc, ...updates, updatedAt: new Date().toISOString() } 
        : state.activeDoc
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
      return { docs: updated, activeDoc: active, activeSubpageId: null }
    })
  },

  getDoc: (id) => {
    return get().docs.find((d) => d.id === id)
  },

  createSubpage: (docId, title = 'Untitled Page', content = '') => {
    const subpageId = `sub-${Date.now().toString(36)}`
    const newSubpage: SubPageItem = {
      id: subpageId,
      title: title.trim() || 'Untitled Page',
      content: content || `# ${title.trim() || 'Untitled Page'}\n\nStart writing notes or specifications...`,
      authorName: 'anandu',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    set((state) => {
      const updated = state.docs.map((d) => {
        if (d.id === docId) {
          const currentSubs = d.subpages || []
          return {
            ...d,
            subpages: [...currentSubs, newSubpage],
            updatedAt: new Date().toISOString(),
          }
        }
        return d
      })
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      }
      const active = state.activeDoc?.id === docId ? updated.find((d) => d.id === docId) || null : state.activeDoc
      return { docs: updated, activeDoc: active, activeSubpageId: subpageId }
    })

    return newSubpage
  },

  updateSubpage: (docId, subpageId, updates) => {
    set((state) => {
      const updated = state.docs.map((d) => {
        if (d.id === docId && d.subpages) {
          const updatedSubs = d.subpages.map((s) => (s.id === subpageId ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s))
          return {
            ...d,
            subpages: updatedSubs,
            updatedAt: new Date().toISOString(),
          }
        }
        return d
      })
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      }
      const active = state.activeDoc?.id === docId ? updated.find((d) => d.id === docId) || null : state.activeDoc
      return { docs: updated, activeDoc: active }
    })
  },

  deleteSubpage: (docId, subpageId) => {
    set((state) => {
      const updated = state.docs.map((d) => {
        if (d.id === docId && d.subpages) {
          const filteredSubs = d.subpages.filter((s) => s.id !== subpageId)
          return {
            ...d,
            subpages: filteredSubs,
            updatedAt: new Date().toISOString(),
          }
        }
        return d
      })
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      }
      const active = state.activeDoc?.id === docId ? updated.find((d) => d.id === docId) || null : state.activeDoc
      const nextActiveSubId = state.activeSubpageId === subpageId ? null : state.activeSubpageId
      return { docs: updated, activeDoc: active, activeSubpageId: nextActiveSubId }
    })
  },
}))
