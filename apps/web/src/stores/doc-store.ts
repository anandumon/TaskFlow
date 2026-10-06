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

const DEFAULT_STARTER_DOCS: DocItem[] = [
  {
    id: 'doc-arch-spec',
    title: 'System Architecture & API Specifications v2.0',
    content: `# System Architecture & API Specifications v2.0\n\n## Overview\nTaskFlow 2.0 provides sub-millisecond state synchronization across distributed engineering teams.\n\n### Core Tenets\n- **Zero-Latency In-Memory State**: Synchronized via WebSockets and optimistic Zustand updates.\n- **Universal Document Vault**: Cryptographically signed assets with AES-256 at rest.\n- **Multi-Tenant Isolation**: Strict tenant scoping on all SQL queries and storage buckets.\n\n### Microservices & Endpoints\n- \`/api/v1/auth\`: JWT issuance with httpOnly cookie rotation.\n- \`/api/v1/workspaces\`: Tenant isolation boundaries.\n- \`/api/v1/tasks\`: Real-time Kanban cards, subtasks, and dependency graphs.\n- \`/api/v1/docs\`: Markdown, code snippets, and binary attachment streams.`,
    authorName: 'Alex Rivera',
    location: 'Engineering Space',
    tags: ['Architecture', 'API', 'v2.0'],
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    viewedAt: new Date().toISOString(),
    starred: true,
    isWiki: true,
    subpages: [
      {
        id: 'sub-api-gateway',
        title: 'API Gateway & Rate Limiting Guidelines',
        content: `### Token Bucket Algorithm\nEach tenant is rate-limited to 1,200 req/min with a burst allowance of 100 req/sec.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'doc-sprint-roadmap',
    title: 'Sprint 24 Engineering Deliverables & Roadmap',
    content: `# Sprint 24 Roadmap & Milestones\n\n## Objectives\n1. Deliver Universal Document Vault with instant previews.\n2. Enable drag-and-drop workspace task rearrangement.\n3. Implement cryptographically verified team invitation pipelines.\n\n## Deliverables\n- [x] Fixed sticky header navigation\n- [x] Custom calligraphic TF brand favicon deployment\n- [x] Organization signout redirect guard\n- [ ] Multi-region Redis cluster failover tests`,
    authorName: 'Sarah Chen',
    location: 'Product Roadmap',
    tags: ['Sprint-24', 'Deliverables', 'Milestones'],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    viewedAt: new Date().toISOString(),
    starred: true,
    isWiki: false,
    subpages: [],
  },
  {
    id: 'doc-security-rbac',
    title: 'Security Compliance & RBAC Policies',
    content: `# Security Compliance & RBAC Policies\n\n## Role Definitions\n- **Owner**: Full workspace authority, billing, organization deletion.\n- **Admin**: Member management, team creation, project deletion, webhook configuration.\n- **Member**: Create and manage tasks, upload vault documents, start sprint cycles.\n- **Viewer**: Read-only access to boards, documents, and audit logs.\n\n## Audit Logging\nAll sensitive operations generate immutable cryptographic logs streamed to cold storage.`,
    authorName: 'Security Team',
    location: 'Security & Governance',
    tags: ['Security', 'RBAC', 'Compliance'],
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    viewedAt: new Date().toISOString(),
    starred: false,
    isWiki: true,
    subpages: [],
  },
  {
    id: 'doc-design-tokens',
    title: 'Design System Tokens & Component Standards',
    content: `# Design System Tokens & Component Standards\n\n## Color Palette\n- Surface Obsidian: \`#000000\`\n- Deep Charcoal: \`#141414\`\n- Border Subtle: \`#2B2B2B\`\n- Brand Primary: \`#00638E\`\n- Deep Teal Accent: \`#004A6B\`\n- Ice Blue Tint: \`#BFD8E3\`\n- Muted Cyan: \`#8CB9CC\`\n\n## Typography\n- Display: Outfit (800 / 900)\n- Body: Inter (400 / 500 / 600)\n- Code: JetBrains Mono`,
    authorName: 'Marcus Vance',
    location: 'Design System',
    tags: ['UI/UX', 'Design', 'Tokens'],
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    viewedAt: new Date().toISOString(),
    starred: false,
    isWiki: false,
    subpages: [],
  },
]

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
        if (Array.isArray(parsed) && parsed.length > 0) {
          localDocs = parsed.filter((d: any) => d && typeof d === 'object' && d.id && d.title)
        }
      }

      if (localDocs.length === 0) {
        localDocs = DEFAULT_STARTER_DOCS
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localDocs))
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
            if (Array.isArray(serverDocs) && serverDocs.length > 0) {
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
      set({ docs: DEFAULT_STARTER_DOCS })
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
