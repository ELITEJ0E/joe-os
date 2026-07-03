export type AgentId = 'cortana' | 'jarvis' | 'aura' | 'boss' | 'cash' | 'forge' | 'titan' | 'memory' | 'researcher' | 'planner' | 'coder' | 'reviewer';

export interface Agent {
  id: AgentId;
  name: string;
  icon: string;
  dotColor: string;
  model: string;
  description: string;
  status: 'idle' | 'thinking' | 'active' | 'completed' | 'error';
  enabled?: boolean;
  taskCount?: number;
  color?: string;
}

export interface PipelineNode {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error' | 'skipped';
}

export interface Message {
  id: string;
  sender: 'user' | AgentId | 'system';
  text: string;
  timestamp: string;
  rawOutput?: string;
  previousRawOutput?: string;
  isStreaming?: boolean;
}

export interface MemoryItem {
  id: string;
  title: string;
  summary: string;
  snippet: string;
  tags: string[];
  embedding?: number[];
  relevance?: number;
  timestamp: string;
}

export interface OllamaModelInfo {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

export type TaskStatus = 'queued' | 'in-progress' | 'review' | 'done';

export interface OpsTask {
  id: string;
  title: string;
  detail: string;
  agentSource: string;
  status: TaskStatus;
  createdAt: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ActivityEntry {
  id: string;
  agentName: string;
  agentColor: string;
  action: string;
  timestamp: string;
}

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  timestamp: string;
  agentSource: string;
}

export interface KpiMetric {
  label: string;
  value: string;
  change: string;
  changeDir: 'up' | 'down' | 'flat';
  sub?: string;
  sparkData?: number[];
}

