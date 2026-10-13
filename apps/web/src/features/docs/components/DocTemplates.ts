export interface TableTemplate {
  id: string
  name: string
  description: string
  theme: 'word-corporate' | 'google-slate' | 'emerald-finance' | 'royal-violet' | 'amber-risk' | 'minimal-clean'
  headerBg: string
  headerText: string
  borderColor: string
  stripeBg: string
  headers: string[]
  rows: string[][]
}

export const TABLE_TEMPLATES: TableTemplate[] = [
  {
    id: 'word-corporate',
    name: 'Microsoft Word Corporate',
    description: 'Executive blue header with clean zebra stripes and structured field boundaries',
    theme: 'word-corporate',
    headerBg: '#1e3a8a',
    headerText: '#ffffff',
    borderColor: '#3b82f6',
    stripeBg: 'rgba(30, 58, 138, 0.08)',
    headers: ['Item / Feature', 'Owner', 'Status', 'Priority', 'Target Date'],
    rows: [
      ['Core API Integration', 'Anandu', 'In Progress', 'High', 'Oct 24, 2026'],
      ['Design System Polish', 'Team', 'Done', 'Medium', 'Oct 18, 2026'],
      ['Security & Penetration Test', 'Mon UN', 'In Progress', 'Critical', 'Nov 02, 2026'],
      ['E2E Testing & Verification', 'QA Team', 'Pending', 'High', 'Nov 10, 2026'],
    ],
  },
  {
    id: 'google-slate',
    name: 'Google Docs Modern Slate',
    description: 'Subtle slate gray header with minimal borders and contemporary typography',
    theme: 'google-slate',
    headerBg: '#334155',
    headerText: '#f8fafc',
    borderColor: '#475569',
    stripeBg: 'rgba(51, 65, 85, 0.08)',
    headers: ['Project Task', 'Assignee', 'Sprint', 'Progress', 'Notes'],
    rows: [
      ['User Onboarding Flow', 'Design Lead', 'Sprint 14', '90%', 'Ready for review'],
      ['Real-time Notification Bell', 'Frontend Eng', 'Sprint 14', '100%', 'Merged to main'],
      ['Voice Note Player Component', 'Audio Eng', 'Sprint 15', '75%', 'Testing fallback'],
      ['Whiteboard Flowchart Suite', 'Fullstack', 'Sprint 15', '60%', 'Figma standards'],
    ],
  },
  {
    id: 'emerald-finance',
    name: 'Executive Emerald (Finance & Deliverables)',
    description: 'Rich forest green header tailored for budgets, milestones, and deliverables',
    theme: 'emerald-finance',
    headerBg: '#065f46',
    headerText: '#ffffff',
    borderColor: '#059669',
    stripeBg: 'rgba(6, 95, 70, 0.08)',
    headers: ['Deliverable', 'Department', 'Budget Allocated', 'Status', 'Sign-Off'],
    rows: [
      ['Cloud Infrastructure Upgrade', 'DevOps / SRE', '$12,500', 'Approved', 'VP Engineering'],
      ['UX Redesign & Accessibility', 'Product Design', '$8,000', 'In Progress', 'Head of Product'],
      ['Automated QA Testing Suite', 'QA Automation', '$5,400', 'Completed', 'Tech Lead'],
    ],
  },
  {
    id: 'royal-violet',
    name: 'Royal Violet (Product Roadmap)',
    description: 'Vibrant purple header with modern rounded aesthetic for agile roadmaps',
    theme: 'royal-violet',
    headerBg: '#581c87',
    headerText: '#ffffff',
    borderColor: '#7c3aed',
    stripeBg: 'rgba(88, 28, 135, 0.08)',
    headers: ['Epic / Module', 'Lead Dev', 'Complexity', 'Health', 'Release Qtr'],
    rows: [
      ['Interactive Whiteboard', 'Mon UN', 'High', '🟢 On Track', 'Q4 2026'],
      ['Collaborative Doc Editor', 'Anandu', 'Medium', '🟢 On Track', 'Q4 2026'],
      ['Audio & Video Calling', 'WebRTC Team', 'High', '🟡 Monitoring', 'Q1 2027'],
    ],
  },
  {
    id: 'amber-risk',
    name: 'Amber Sunset (Risk & Issues Matrix)',
    description: 'High-contrast warm amber header designed for risk evaluation and audit trails',
    theme: 'amber-risk',
    headerBg: '#9a3412',
    headerText: '#ffffff',
    borderColor: '#ea580c',
    stripeBg: 'rgba(154, 52, 18, 0.08)',
    headers: ['Risk / Issue Description', 'Severity', 'Likelihood', 'Mitigation Plan', 'Owner'],
    rows: [
      ['Third-party API Latency Spikes', 'High', 'Medium', 'Implement Redis Cache fallback', 'Backend Team'],
      ['WebSocket Connection Dropoffs', 'Medium', 'Low', 'Auto-reconnect with exponential backoff', 'Realtime Team'],
      ['Cross-browser Audio Codec Mismatch', 'Medium', 'Medium', 'Add Web Audio synthesizer fallback', 'Audio Eng'],
    ],
  },
  {
    id: 'minimal-clean',
    name: 'Clean Minimalist Monochrome',
    description: 'Understated dark neutral header with subtle divider lines and high readability',
    theme: 'minimal-clean',
    headerBg: '#18181b',
    headerText: '#f4f4f5',
    borderColor: '#27272a',
    stripeBg: 'rgba(255, 255, 255, 0.03)',
    headers: ['Milestone', 'Description', 'Owner', 'Status'],
    rows: [
      ['Phase 1: Architecture', 'Database schema, auth validation, caching', 'Principal Architect', 'Done'],
      ['Phase 2: Visual Studio', 'Interactive table formatting, whiteboard tools', 'Lead Frontend', 'In Progress'],
      ['Phase 3: QA Release', 'Accessibility verification, stress load audit', 'QA Lead', 'Pending'],
    ],
  },
]
