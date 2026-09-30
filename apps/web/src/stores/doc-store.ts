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
  location?: string // e.g. "Team Space", "#General", "DM with user"
  channelId?: string
  recipientId?: string
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
  loadDocs: (workspaceId?: string) => Promise<void> | void
  createDoc: (
    title?: string,
    content?: string,
    authorName?: string,
    location?: string,
    extra?: { channelId?: string; recipientId?: string; docId?: string }
  ) => DocItem
  updateDoc: (id: string, updates: Partial<DocItem>) => void
  deleteDoc: (id: string, workspaceId?: string) => void
  getDoc: (id: string) => DocItem | undefined
  createSubpage: (docId: string, title?: string, content?: string) => SubPageItem
  updateSubpage: (docId: string, subpageId: string, updates: Partial<SubPageItem>) => void
  deleteSubpage: (docId: string, subpageId: string) => void
}

const STORAGE_KEY = 'taskflow_user_docs'

const getActiveWorkspaceId = (): string | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('taskflow_workspace_storage')
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed?.state?.currentWorkspace?.id || null
    }
  } catch {}
  return null
}

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('taskflow_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const useDocStore = create<DocStore>((set, get) => ({
  docs: [],
  activeDoc: null,
  activeSubpageId: null,
  setActiveDoc: (doc) => set({ activeDoc: doc }),
  setActiveSubpageId: (subpageId) => set({ activeSubpageId: subpageId }),

  loadDocs: async (workspaceId?: string) => {
    if (typeof window === 'undefined') return
    const wsId = workspaceId || getActiveWorkspaceId()
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      let localDocs: DocItem[] = []
      if (stored !== null) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          localDocs = parsed.filter((d: any) => d && typeof d === 'object' && d.id && d.title)
        }
      }

      set({ docs: localDocs })

      // Fetch from database if workspace ID is available
      if (wsId) {
        try {
          const res = await fetch(`/api/v1/workspaces/${wsId}/docs`, {
            headers: getAuthHeaders(),
          })
          if (res.ok) {
            const json = await res.json()
            const serverDocs: DocItem[] = json?.data || []
            if (Array.isArray(serverDocs)) {
              // Merge server docs with local docs (server docs take precedence)
              const mergedMap = new Map<string, DocItem>()
              localDocs.forEach((d) => mergedMap.set(d.id, d))
              serverDocs.forEach((d) => mergedMap.set(d.id, d))
              const merged = Array.from(mergedMap.values()).filter((d) => d && d.id && d.title)
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
              set({ docs: merged })
            }
          }
        } catch (apiErr) {
          console.warn('[docStore] remote loadDocs failed, using local:', apiErr)
        }
      }
    } catch (e) {
      console.error('Failed to load docs from storage', e)
      set({ docs: [] })
    }
  },

  createDoc: (
    title = 'Untitled Doc',
    content = '',
    authorName = 'anandu',
    location = 'Team Space',
    extra?: { channelId?: string; recipientId?: string; docId?: string }
  ) => {
    const trimmedTitle = (title || 'Untitled Doc').trim() || 'Untitled Doc'
    const existing = get().docs.find(
      (d) =>
        d &&
        ((extra?.docId && d.id === extra.docId) ||
          (d.id && d.id.toLowerCase() === trimmedTitle.toLowerCase()) ||
          (d.title && d.title.toLowerCase() === trimmedTitle.toLowerCase()))
    )
    if (existing) {
      if (location && location !== 'Team Space' && (!existing.location || existing.location === 'Team Space')) {
        get().updateDoc(existing.id, {
          location,
          channelId: extra?.channelId ?? existing.channelId,
          recipientId: extra?.recipientId ?? existing.recipientId,
        })
      }
      return existing
    }

    const cleanId = (extra?.docId || trimmedTitle)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30) || 'doc'
    const id = extra?.docId || `${cleanId}-${Date.now().toString(36)}`
    
    const newDoc: DocItem = {
      id,
      title: trimmedTitle,
      content: content || `# ${trimmedTitle}\n\nStart writing notes or specifications...`,
      authorName,
      location,
      channelId: extra?.channelId,
      recipientId: extra?.recipientId,
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
      const updated = [newDoc, ...state.docs.filter((d) => d && d.id !== id)]
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      }
      return { docs: updated, activeDoc: newDoc, activeSubpageId: null }
    })

    // Async persist to DB
    const wsId = getActiveWorkspaceId()
    if (wsId && typeof window !== 'undefined') {
      fetch(`/api/v1/workspaces/${wsId}/docs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(newDoc),
      }).catch((err) => console.warn('[docStore] async createDoc save error:', err))
    }

    return newDoc
  },

  updateDoc: (id, updates) => {
    set((state) => {
      const updated = state.docs.map((d) => {
        if (d && d.id === id) {
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

      // Async persist to DB
      const wsId = getActiveWorkspaceId()
      if (wsId && typeof window !== 'undefined') {
        const docToPersist = updated.find((d) => d && d.id === id)
        if (docToPersist) {
          fetch(`/api/v1/workspaces/${wsId}/docs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify(docToPersist),
          }).catch((err) => console.warn('[docStore] async updateDoc save error:', err))
        }
      }

      return { docs: updated, activeDoc: active }
    })
  },

  deleteDoc: (id, workspaceId?: string) => {
    const cleanId = (id || '').trim()
    if (!cleanId) return

    set((state) => {
      const updated = state.docs.filter(
        (d) => d && d.id !== cleanId && (d.title || '').toLowerCase() !== cleanId.toLowerCase()
      )
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      }
      const active = state.activeDoc?.id === cleanId ? null : state.activeDoc

      // Async delete from DB
      const wsId = workspaceId || getActiveWorkspaceId()
      if (wsId && typeof window !== 'undefined') {
        fetch(`/api/v1/workspaces/${wsId}/docs/${encodeURIComponent(cleanId)}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }).catch((err) => console.warn('[docStore] async deleteDoc from db error:', err))
      }

      return { docs: updated, activeDoc: active, activeSubpageId: null }
    })
  },

  getDoc: (id) => {
    if (!id) return undefined
    return get().docs.find(
      (d) =>
        d &&
        (d.id === id || (d.title && d.title.toLowerCase() === id.toLowerCase()))
    )
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
