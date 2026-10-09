import { Task } from '@/stores/task-store'
import { TaskAttachment, Subtask } from '@/types'

export interface ProjectFileItem {
  id: string
  name: string
  size: number
  type: string
  dataUrl: string
  uploadedAt: string
  uploadedBy?: string
  projectId: string
  projectName: string
  projectColor?: string
  sourceType: 'project_file' | 'task_attachment' | 'subtask_attachment'
  taskId?: string
  taskTitle?: string
  subtaskId?: string
  subtaskTitle?: string
  notes?: string
}

const PROJECT_FILES_STORAGE_KEY_PREFIX = 'taskflow_project_files_'

// Custom event to notify components when direct project files are updated
export const emitProjectFilesChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('taskflow_project_files_updated'))
  }
}

/**
 * Reads directly uploaded project files from localStorage
 */
export function getDirectProjectFiles(projectId: string, projectName: string, projectColor?: string): ProjectFileItem[] {
  if (typeof window === 'undefined' || !projectId) return []
  try {
    const raw = localStorage.getItem(`${PROJECT_FILES_STORAGE_KEY_PREFIX}${projectId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => ({
      ...item,
      projectId,
      projectName: item.projectName || projectName,
      projectColor: item.projectColor || projectColor,
      sourceType: 'project_file' as const,
    }))
  } catch (err) {
    console.warn('Error reading direct project files:', err)
    return []
  }
}

/**
 * Saves directly uploaded project files to localStorage
 */
export function saveDirectProjectFiles(projectId: string, files: ProjectFileItem[]) {
  if (typeof window === 'undefined' || !projectId) return
  try {
    localStorage.setItem(`${PROJECT_FILES_STORAGE_KEY_PREFIX}${projectId}`, JSON.stringify(files))
    emitProjectFilesChanged()
  } catch (err) {
    console.error('Error saving direct project files:', err)
  }
}

/**
 * Extracts and aggregates all files for a specific project
 * (includes task attachments, subtask attachments, and directly uploaded project files)
 */
export function extractProjectFiles(
  project: { id: string; name: string; color?: string },
  tasks: Task[]
): ProjectFileItem[] {
  const result: ProjectFileItem[] = []
  const seenIds = new Set<string>()

  // 1. Direct project files
  const directFiles = getDirectProjectFiles(project.id, project.name, project.color)
  for (const df of directFiles) {
    if (!seenIds.has(df.id)) {
      seenIds.add(df.id)
      result.push(df)
    }
  }

  // 2. Project Task attachments & subtask attachments
  const projectTasks = tasks.filter((t) => t.projectId === project.id)

  for (const task of projectTasks) {
    // Top-level task attachments
    let taskAttachments: TaskAttachment[] = []
    if (task.attachments) {
      if (typeof task.attachments === 'string') {
        try {
          taskAttachments = JSON.parse(task.attachments)
        } catch {
          taskAttachments = []
        }
      } else if (Array.isArray(task.attachments)) {
        taskAttachments = task.attachments
      }
    }

    if (Array.isArray(taskAttachments)) {
      for (const att of taskAttachments) {
        if (!att || !att.id) continue
        const fileId = `task_${task.id}_att_${att.id}`
        if (!seenIds.has(fileId)) {
          seenIds.add(fileId)
          result.push({
            id: fileId,
            name: att.name || 'Untitled Attachment',
            size: att.size || 0,
            type: att.type || 'application/octet-stream',
            dataUrl: att.dataUrl || '',
            uploadedAt: att.uploadedAt || task.updatedAt || new Date().toISOString(),
            uploadedBy: (att as any).uploadedBy || task.assigneeName || task.createdBy,
            projectId: project.id,
            projectName: project.name,
            projectColor: project.color,
            sourceType: 'task_attachment',
            taskId: task.id,
            taskTitle: task.title,
            notes: (att as any).notes || '',
          })
        }
      }
    }

    // Subtask attachments
    let subtasks: Subtask[] = []
    if (task.subtasks) {
      if (typeof task.subtasks === 'string') {
        try {
          subtasks = JSON.parse(task.subtasks)
        } catch {
          subtasks = []
        }
      } else if (Array.isArray(task.subtasks)) {
        subtasks = task.subtasks
      }
    }

    if (Array.isArray(subtasks)) {
      for (const st of subtasks) {
        if (st.attachments && Array.isArray(st.attachments)) {
          for (const att of st.attachments) {
            if (!att || !att.id) continue
            const fileId = `subtask_${st.id}_att_${att.id}`
            if (!seenIds.has(fileId)) {
              seenIds.add(fileId)
              result.push({
                id: fileId,
                name: att.name || 'Untitled Attachment',
                size: att.size || 0,
                type: att.type || 'application/octet-stream',
                dataUrl: att.dataUrl || '',
                uploadedAt: att.uploadedAt || st.createdAt || new Date().toISOString(),
                uploadedBy: (att as any).uploadedBy || task.assigneeName || task.createdBy,
                projectId: project.id,
                projectName: project.name,
                projectColor: project.color,
                sourceType: 'subtask_attachment',
                taskId: task.id,
                taskTitle: task.title,
                subtaskId: st.id,
                subtaskTitle: st.title,
                notes: (att as any).notes || st.notes || '',
              })
            }
          }
        }
      }
    }
  }

  // Sort by uploadedAt descending
  return result.sort((a, b) => {
    const aTime = new Date(a.uploadedAt).getTime() || 0
    const bTime = new Date(b.uploadedAt).getTime() || 0
    return bTime - aTime
  })
}

/**
 * Extracts and aggregates files across all projects in the workspace
 */
export function extractAllWorkspaceProjectFiles(
  projects: Array<{ id: string; name: string; color?: string }>,
  tasks: Task[]
): ProjectFileItem[] {
  const allFiles: ProjectFileItem[] = []
  for (const proj of projects) {
    const projFiles = extractProjectFiles(proj, tasks)
    allFiles.push(...projFiles)
  }
  return allFiles.sort((a, b) => {
    const aTime = new Date(a.uploadedAt).getTime() || 0
    const bTime = new Date(b.uploadedAt).getTime() || 0
    return bTime - aTime
  })
}

/**
 * Adds a direct project file
 */
export function addDirectProjectFile(
  projectId: string,
  projectName: string,
  projectColor: string | undefined,
  file: {
    name: string
    size: number
    type: string
    dataUrl: string
    uploadedBy?: string
    notes?: string
  }
): ProjectFileItem {
  const directFiles = getDirectProjectFiles(projectId, projectName, projectColor)
  const newFileItem: ProjectFileItem = {
    id: `proj_file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: file.name,
    size: file.size,
    type: file.type,
    dataUrl: file.dataUrl,
    uploadedAt: new Date().toISOString(),
    uploadedBy: file.uploadedBy,
    projectId,
    projectName,
    projectColor,
    sourceType: 'project_file',
    notes: file.notes || '',
  }

  directFiles.unshift(newFileItem)
  saveDirectProjectFiles(projectId, directFiles)
  return newFileItem
}

/**
 * Updates a project file's metadata (rename, edit notes)
 */
export async function updateProjectFile(
  fileItem: ProjectFileItem,
  updates: { name?: string; notes?: string },
  tasks: Task[],
  updateTask: (id: string, data: Partial<Task>) => Promise<any>
): Promise<void> {
  const newName = updates.name?.trim() || fileItem.name
  const newNotes = updates.notes !== undefined ? updates.notes : (fileItem.notes || '')

  if (fileItem.sourceType === 'project_file') {
    const directFiles = getDirectProjectFiles(fileItem.projectId, fileItem.projectName, fileItem.projectColor)
    const updated = directFiles.map((f) =>
      f.id === fileItem.id ? { ...f, name: newName, notes: newNotes } : f
    )
    saveDirectProjectFiles(fileItem.projectId, updated)
    return
  }

  if (fileItem.sourceType === 'task_attachment' && fileItem.taskId) {
    const task = tasks.find((t) => t.id === fileItem.taskId)
    if (!task) return

    let attachments: TaskAttachment[] = []
    if (typeof task.attachments === 'string') {
      try {
        attachments = JSON.parse(task.attachments)
      } catch {
        attachments = []
      }
    } else if (Array.isArray(task.attachments)) {
      attachments = task.attachments
    }

    // Match attachment by parsed id from fileItem.id or name+size
    const originalAttId = fileItem.id.replace(`task_${fileItem.taskId}_att_`, '')
    const updatedAttachments = attachments.map((att) => {
      if (att.id === originalAttId || att.name === fileItem.name) {
        return {
          ...att,
          name: newName,
          notes: newNotes,
        }
      }
      return att
    })

    await updateTask(fileItem.taskId, {
      attachments: JSON.stringify(updatedAttachments),
    })
    return
  }

  if (fileItem.sourceType === 'subtask_attachment' && fileItem.taskId && fileItem.subtaskId) {
    const task = tasks.find((t) => t.id === fileItem.taskId)
    if (!task) return

    let subtasks: Subtask[] = []
    if (typeof task.subtasks === 'string') {
      try {
        subtasks = JSON.parse(task.subtasks)
      } catch {
        subtasks = []
      }
    } else if (Array.isArray(task.subtasks)) {
      subtasks = task.subtasks
    }

    const originalAttId = fileItem.id.replace(`subtask_${fileItem.subtaskId}_att_`, '')
    const updatedSubtasks = subtasks.map((st) => {
      if (st.id === fileItem.subtaskId && Array.isArray(st.attachments)) {
        return {
          ...st,
          attachments: st.attachments.map((att) => {
            if (att.id === originalAttId || att.name === fileItem.name) {
              return {
                ...att,
                name: newName,
                notes: newNotes,
              }
            }
            return att
          }),
        }
      }
      return st
    })

    await updateTask(fileItem.taskId, {
      subtasks: JSON.stringify(updatedSubtasks),
    })
    return
  }
}

/**
 * Deletes a project file across direct files, task attachments, or subtask attachments
 */
export async function deleteProjectFile(
  fileItem: ProjectFileItem,
  tasks: Task[],
  updateTask: (id: string, data: Partial<Task>) => Promise<any>
): Promise<void> {
  if (fileItem.sourceType === 'project_file') {
    const directFiles = getDirectProjectFiles(fileItem.projectId, fileItem.projectName, fileItem.projectColor)
    const updated = directFiles.filter((f) => f.id !== fileItem.id)
    saveDirectProjectFiles(fileItem.projectId, updated)
    return
  }

  if (fileItem.sourceType === 'task_attachment' && fileItem.taskId) {
    const task = tasks.find((t) => t.id === fileItem.taskId)
    if (!task) return

    let attachments: TaskAttachment[] = []
    if (typeof task.attachments === 'string') {
      try {
        attachments = JSON.parse(task.attachments)
      } catch {
        attachments = []
      }
    } else if (Array.isArray(task.attachments)) {
      attachments = task.attachments
    }

    const originalAttId = fileItem.id.replace(`task_${fileItem.taskId}_att_`, '')
    const updatedAttachments = attachments.filter((att) => att.id !== originalAttId && att.name !== fileItem.name)

    await updateTask(fileItem.taskId, {
      attachments: JSON.stringify(updatedAttachments),
    })
    return
  }

  if (fileItem.sourceType === 'subtask_attachment' && fileItem.taskId && fileItem.subtaskId) {
    const task = tasks.find((t) => t.id === fileItem.taskId)
    if (!task) return

    let subtasks: Subtask[] = []
    if (typeof task.subtasks === 'string') {
      try {
        subtasks = JSON.parse(task.subtasks)
      } catch {
        subtasks = []
      }
    } else if (Array.isArray(task.subtasks)) {
      subtasks = task.subtasks
    }

    const originalAttId = fileItem.id.replace(`subtask_${fileItem.subtaskId}_att_`, '')
    const updatedSubtasks = subtasks.map((st) => {
      if (st.id === fileItem.subtaskId && Array.isArray(st.attachments)) {
        return {
          ...st,
          attachments: st.attachments.filter((att) => att.id !== originalAttId && att.name !== fileItem.name),
        }
      }
      return st
    })

    await updateTask(fileItem.taskId, {
      subtasks: JSON.stringify(updatedSubtasks),
    })
    return
  }
}

/**
 * Download a file via dataUrl or blob
 */
export function downloadFile(name: string, dataUrl: string) {
  if (typeof window === 'undefined' || !dataUrl) return
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = name || 'download'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Format bytes into human readable KB / MB
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || isNaN(bytes) || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Categorize file based on extension and mime type
 */
export function getFileTypeCategory(name: string, mime?: string): 'doc' | 'sheet' | 'code' | 'image' | 'archive' | 'media' | 'other' {
  const ext = (name.split('.').pop() || '').toLowerCase()
  const m = (mime || '').toLowerCase()

  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'md'].includes(ext) || m.includes('pdf') || m.includes('word') || m.includes('document')) {
    return 'doc'
  }
  if (['xls', 'xlsx', 'csv', 'tsv'].includes(ext) || m.includes('spreadsheet') || m.includes('csv') || m.includes('excel')) {
    return 'sheet'
  }
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'json', 'html', 'css', 'sql', 'sh', 'yaml', 'yml', 'xml', 'go', 'rs', 'java', 'cpp', 'c'].includes(ext)) {
    return 'code'
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext) || m.startsWith('image/')) {
    return 'image'
  }
  if (['zip', 'tar', 'gz', '7z', 'rar'].includes(ext) || m.includes('zip') || m.includes('compressed')) {
    return 'archive'
  }
  if (['mp4', 'mov', 'webm', 'mp3', 'wav', 'ogg'].includes(ext) || m.startsWith('video/') || m.startsWith('audio/')) {
    return 'media'
  }
  return 'other'
}
