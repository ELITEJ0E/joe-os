import { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import * as Diff from 'diff';
import {
  Brain,
  Code,
  ShieldCheck,
  Search,
  Database,
  Play,
  Settings,
  Terminal,
  RefreshCw,
  Clock,
  Trash2,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Layers,
  HelpCircle,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Download,
  Menu,
  Sliders,
  X,
  Palette,
  Server,
  Mail,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Workflow,
  LayoutDashboard,
  Trello,
  Bot,
  Calendar,
  History,
  Plus,
  BookOpen,
  CheckSquare,
  Briefcase,
  Cpu,
  Video,
  Image,
  FileUp,
  Pause,
  Eye,
  Compass,
  Radar,
  Target,
  Mic
} from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader, SidebarFooter, SidebarTrigger } from '../components/ui/sidebar';
import { ModelHub } from './components/ModelHub';
import { MailIntegration } from './components/MailIntegration';
import { VoiceWaveVisualizer } from './components/VoiceWaveVisualizer';
import InteractiveImageBentoGallery from '../components/ui/bento-gallery';
import { Agent, AgentId, PipelineNode, Message, MemoryItem, OllamaModelInfo, OpsTask, ActivityEntry, Alert, KpiMetric, TaskStatus, Goal } from './types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import Markdown from 'react-markdown';
import { useSidebar } from '../components/ui/sidebar';

function CustomSidebarTrigger() {
  const { toggleSidebar } = useSidebar();
  return (
    <SidebarMenuButton 
      onClick={toggleSidebar}
      tooltip="Execution Pipeline Graph"
      className="text-emerald-600 hover:text-emerald-400 hover:bg-[#10b981]/5 transition-colors"
    >
      <Workflow size={18} />
      <span>Pipeline Graph</span>
    </SidebarMenuButton>
  );
}
import remarkGfm from 'remark-gfm';

function preprocessAgentMentions(text: string): string {
  if (!text) return '';
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]*?`)/g);
  const terms = [
    'Cortana',
    'J\\.A\\.R\\.V\\.I\\.S\\.',
    'JARVIS',
    'Jarvis',
    'Aura',
    'F\\.R\\.I\\.D\\.A\\.Y\\.',
    'FRIDAY',
    'Friday',
    'Cash',
    'Nova',
    'Forge',
    'Titan',
    'Athena',
    'Memory',
    'Researcher',
    'Planner',
    'Coder',
    'Reviewer'
  ];
  const processedParts = parts.map((part) => {
    if (part.startsWith('`')) return part;
    let temp = part;
    for (const term of terms) {
      const regex = new RegExp(`\\*{0,2}(?:^|(?<=[\\s.,!?;:()*-]))(${term})(?:$|(?=[\\s.,!?;:()*-]))\\*{0,2}`, 'gi');
      temp = temp.replace(regex, '**$1**');
    }
    return temp;
  });
  return processedParts.join('');
}

// 128-dimensional local vector hashing helper
function getLocalEmbeddingVector(text: string): number[] {
  const dims = 128;
  const vec = new Array(dims).fill(0);
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  if (words.length === 0) return vec;
  
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dims;
    vec[idx] += 1;
  }
  
  let sumSq = 0;
  for (let i = 0; i < dims; i++) {
    sumSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSq);
  if (norm > 0) {
    for (let i = 0; i < dims; i++) {
      vec[i] /= norm;
    }
  }
  return vec;
}

// Cosine similarity helper
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function CodeDiffViewer({ oldCode, newCode, title }: { oldCode: string, newCode: string, title?: string }) {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const diffs = Diff.diffLines(oldCode || '', newCode || '');

  return (
    <div className="rounded-xl border border-emerald-900/30 bg-[#030504] overflow-hidden my-3 shadow-inner">
      <div className="flex items-center justify-between px-4 py-2 border-b border-emerald-950 bg-[#08100c]">
        <div className="flex items-center gap-2">
          <Code size={14} className="text-emerald-400" />
          <span className="text-xs font-mono font-bold text-emerald-400">{title || 'CODE DIFF'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('split')}
            className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${viewMode === 'split' ? 'bg-emerald-900/60 text-emerald-300' : 'text-slate-400 hover:bg-emerald-950/40'}`}
          >
            Split
          </button>
          <button
            onClick={() => setViewMode('unified')}
            className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${viewMode === 'unified' ? 'bg-emerald-900/60 text-emerald-300' : 'text-slate-400 hover:bg-emerald-950/40'}`}
          >
            Unified
          </button>
        </div>
      </div>
      
      <div className="p-0 overflow-x-auto text-[12px] font-mono leading-relaxed max-h-[600px] bg-[#020302]">
        {viewMode === 'unified' ? (
          <div className="flex flex-col min-w-max">
            {diffs.map((part, i) => {
              if (part.added) {
                return <div key={i} className="bg-emerald-900/20 text-[#00ff66] px-4 py-0.5 whitespace-pre border-l-2 border-[#00ff66]">+ {part.value.replace(/\n$/, '')}</div>;
              }
              if (part.removed) {
                return <div key={i} className="bg-rose-900/20 text-rose-400 px-4 py-0.5 whitespace-pre border-l-2 border-rose-500">- {part.value.replace(/\n$/, '')}</div>;
              }
              return <div key={i} className="text-slate-400 px-4 py-0.5 whitespace-pre border-l-2 border-transparent">  {part.value.replace(/\n$/, '')}</div>;
            })}
          </div>
        ) : (
          <div className="flex min-w-max w-full">
            <div className="flex-1 border-r border-emerald-900/30">
              <div className="sticky top-0 bg-[#050806] px-4 py-1.5 border-b border-emerald-900/30 text-[10px] text-slate-400 font-bold tracking-wider">PREVIOUS</div>
              <div className="flex flex-col pb-4">
                {diffs.map((part, i) => {
                  if (part.added) {
                    return <div key={i} className="bg-emerald-900/10 text-transparent select-none px-4 py-0.5 whitespace-pre border-l-2 border-transparent">  {part.value.replace(/\n$/, '')}</div>;
                  }
                  if (part.removed) {
                    return <div key={i} className="bg-rose-900/20 text-rose-400 px-4 py-0.5 whitespace-pre border-l-2 border-rose-500">- {part.value.replace(/\n$/, '')}</div>;
                  }
                  return <div key={i} className="text-slate-400 px-4 py-0.5 whitespace-pre border-l-2 border-transparent">  {part.value.replace(/\n$/, '')}</div>;
                })}
              </div>
            </div>
            <div className="flex-1">
              <div className="sticky top-0 bg-[#050806] px-4 py-1.5 border-b border-emerald-900/30 text-[10px] text-emerald-400 font-bold tracking-wider">UPDATED</div>
              <div className="flex flex-col pb-4">
                {diffs.map((part, i) => {
                  if (part.added) {
                    return <div key={i} className="bg-emerald-900/20 text-[#00ff66] px-4 py-0.5 whitespace-pre border-l-2 border-[#00ff66]">+ {part.value.replace(/\n$/, '')}</div>;
                  }
                  if (part.removed) {
                    return <div key={i} className="bg-rose-900/10 text-transparent select-none px-4 py-0.5 whitespace-pre border-l-2 border-transparent">  {part.value.replace(/\n$/, '')}</div>;
                  }
                  return <div key={i} className="text-slate-400 px-4 py-0.5 whitespace-pre border-l-2 border-transparent">  {part.value.replace(/\n$/, '')}</div>;
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const getSandboxSrcDoc = (project: any) => {
  if (!project || !project.files) return '';
  const rawCode = project.files['App.tsx'] || Object.values(project.files)[0] || '';
  
  let processedCode = rawCode;
  processedCode = processedCode.replace(/export\s+default\s+function\s+App\s*\(/g, 'function App(');
  processedCode = processedCode.replace(/export\s+default\s+function\s+App\b/g, 'function App');
  processedCode = processedCode.replace(/export\s+default\s+/g, 'const App = ');
  processedCode = processedCode.replace(/export\s+(const|let|var|function|class)\s+/g, '$1 ');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@18.3.1",
      "react-dom": "https://esm.sh/react-dom@18.3.1",
      "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
      "lucide-react": "https://esm.sh/lucide-react@0.344.0?external=react"
    }
  }
  </script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    ::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.2);
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(0, 255, 102, 0.2);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 255, 102, 0.4);
    }
    body {
      margin: 0;
      padding: 0;
      background-color: #020503;
      color: #f1f5f9;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      overflow-x: hidden;
    }
  </style>
</head>
<body>
  <div id="root" class="flex-1 flex flex-col justify-center items-center w-full min-h-screen"></div>
  
  <script type="text/babel" data-type="module">
    import React, { useState, useEffect } from 'react';
    import { createRoot } from 'react-dom/client';

    tailwind.config = {
      theme: {
        extend: {
          colors: {
            emerald: {
              50: '#f0fdf4',
              100: '#dcfce7',
              200: '#bbf7d0',
              300: '#86efac',
              400: '#4ade80',
              500: '#22c55e',
              600: '#16a34a',
              700: '#15803d',
              800: '#166534',
              900: '#14532d',
              950: '#052e16',
            }
          }
        }
      }
    };

    // --- USER COMPONENT CODE ---
    ${processedCode}
    // --- END USER COMPONENT CODE ---

    try {
      let TargetComponent = null;
      if (typeof App !== 'undefined') {
        TargetComponent = App;
      } else if (typeof defaultApp !== 'undefined') {
        TargetComponent = defaultApp;
      } else {
        const declaredGlobals = Object.keys(window);
        for (const key of declaredGlobals) {
          if (typeof window[key] === 'function' && /^[A-Z]/.test(key)) {
            TargetComponent = window[key];
            break;
          }
        }
      }

      if (TargetComponent) {
        const container = document.getElementById('root');
        const root = createRoot(container);
        root.render(<TargetComponent />);
      } else {
        document.getElementById('root').innerHTML = \`
          <div class="p-6 max-w-sm rounded-xl border border-rose-950 bg-rose-950/20 text-rose-300 font-mono text-center">
            <h4 class="font-bold text-sm text-rose-400 mb-2">No Exported Component Found</h4>
            <p class="text-xs">The sandbox was built, but we couldn't locate a default 'App' component in your code. Ensure your main component is named 'App'.</p>
          </div>
        \`;
      }
    } catch (mountError) {
      console.error("Mount error:", mountError);
      document.getElementById('root').innerHTML = \`
        <div class="p-6 max-w-sm rounded-xl border border-rose-950 bg-rose-950/20 text-rose-300 font-mono text-xs">
          <h4 class="font-bold text-sm text-rose-400 mb-2">Runtime Compile Error</h4>
          <pre class="bg-black/40 p-2 rounded overflow-x-auto">\${mountError.message || mountError}</pre>
        </div>
      \`;
    }
  </script>
</body>
</html>
  `;
};

export default function App() {
  // Config state
  const [engineState, setEngineState] = useState<'gemini' | 'ollama' | 'openai' | 'openrouter' | 'hermes'>(() => {
    const saved = localStorage.getItem('joelos_engine');
    if (saved === 'gemini' || saved === 'ollama' || saved === 'openai' || saved === 'openrouter' || saved === 'hermes') {
      return saved;
    }
    return 'gemini';
  });

  const setEngine = (newEngine: 'gemini' | 'ollama' | 'openai' | 'openrouter' | 'hermes') => {
    setEngineState(newEngine);
    localStorage.setItem('joelos_engine', newEngine);
    if (newEngine !== 'ollama' && newEngine !== 'hermes') {
      localStorage.setItem('joelos_last_cloud_engine', newEngine);
    }
  };

  const engine = engineState;
  const [cloudApiKey, setCloudApiKey] = useState<string>(localStorage.getItem('joelos_cloud_api_key') || '');
  const [ollamaUrl, setOllamaUrl] = useState<string>('http://localhost:11434');
  const [searchGrounding, setSearchGrounding] = useState<boolean>(true);
  
  // Custom Model configuration state (using real, standard local models)
  const [agentModels, setAgentModels] = useState<Record<AgentId, string>>(() => {
    const stored = localStorage.getItem('joelos_agent_models');
    if (stored) return JSON.parse(stored);
    return {
      cortana: 'llama3.2',
      jarvis: 'llama3.2',
      aura: 'llama3.2',
      boss: 'llama3.2',
      cash: 'llama3.2',
      forge: 'llama3.2',
      titan: 'llama3.2',
      memory: 'llama3.2',
      researcher: 'llama3.2',
      planner: 'llama3.2',
      coder: 'qwen2.5-coder:7b',
      reviewer: 'llama3.2'
    };
  });

  // Ollama Connection and Installed Models state
  const [ollamaConnectionStatus, setOllamaConnectionStatus] = useState<'unchecked' | 'connected' | 'failed'>('unchecked');
  const [installedOllamaModels, setInstalledOllamaModels] = useState<string[]>([
    'llama3.2',
    'llama3.1',
    'qwen2.5-coder:7b',
    'qwen2.5:7b',
    'mistral',
    'gemma2:2b',
    'phi3'
  ]);
  const [ollamaModelDetails, setOllamaModelDetails] = useState<OllamaModelInfo[]>([]);
  const [showModelHub, setShowModelHub] = useState<boolean>(false);
  const [ollamaRefreshTrigger, setOllamaRefreshTrigger] = useState<number>(0);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState<boolean>(true);

  // Obsidian Vault Integration state
  const [vaultPath, setVaultPath] = useState<string>('');
  const [isVaultConfigured, setIsVaultConfigured] = useState<boolean>(false);
  const [autoWriteOutputs, setAutoWriteOutputs] = useState<boolean>(true);
  const [indexedNotesCount, setIndexedNotesCount] = useState<number>(0);
  const [recentNoteEvents, setRecentNoteEvents] = useState<Array<{ event: string; path: string; timestamp: string }>>([]);

  const saveAgentOutputToVault = async (agentId: string, task: string, output: string) => {
    if (!isVaultConfigured || !autoWriteOutputs || !output.trim()) return;
    try {
      const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `JoelOS/${agentId}_output_${timestampStr}.md`;
      const frontmatter = {
        agent: agentId,
        task: task,
        timestamp: new Date().toISOString(),
        tags: [agentId, 'output', 'joelos']
      };
      const res = await fetch('/api/vault/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: filename,
          content: output,
          frontmatter
        })
      });
      if (res.ok) {
        console.log(`Successfully auto-saved ${agentId} output to vault: ${filename}`);
      }
    } catch (err) {
      console.error('Error auto-writing agent output to vault:', err);
    }
  };

  // Dynamic models state for selected provider/engine
  const [availableProviderModels, setAvailableProviderModels] = useState<any[]>([]);
  const [loadingProviderModels, setLoadingProviderModels] = useState<boolean>(false);
  const [providerModelsError, setProviderModelsError] = useState<string | null>(null);

  // Interactive controls
  const [globalPrompt, setGlobalPrompt] = useState<string>('');
  const [privatePrompt, setPrivatePrompt] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  
  type Tab = 'command-center' | 'pipeline' | 'operations' | 'agents' | 'mail' | 'settings';
  const [activeTab, setActiveTab] = useState<Tab>('command-center');

  // Command Center KPI metrics state
  const [kpiMetrics, setKpiMetrics] = useState<KpiMetric[]>(() => {
    const saved = localStorage.getItem('joelos_kpi_metrics');
    if (saved) return JSON.parse(saved);
    return [
      { label: 'MTD Revenue', value: '$0', change: '0%', changeDir: 'flat', sub: '$0 YTD · 0 jobs', sparkData: [0,0,0,0,0] },
      { label: 'MTD Profit', value: '$0', change: '0%', changeDir: 'flat', sub: 'Net after expenses', sparkData: [0,0,0,0,0] },
      { label: 'YTD Revenue', value: '$0.00', change: '38%', changeDir: 'up', sub: 'YTD combined', sparkData: [2,4,3,6,8] },
      { label: 'YTD Gross Profit', value: '$0', change: '8%', changeDir: 'up', sub: '0% margin · YTD range', sparkData: [1,2,3,2,4] },
      { label: 'Business Savings', value: '$0', change: '5%', changeDir: 'down', sub: 'Reserve fund', sparkData: [5,4,3,4,2] },
      { label: 'Monthly Expenses', value: '$—', change: '25%', changeDir: 'up', sub: 'Rent · Van · Insurance · Bills', sparkData: [3,4,5,4,6] },
      { label: 'Active Campaigns', value: '0', change: '0%', changeDir: 'flat', sub: 'Facebook Ads', sparkData: [0,0,0,0,0] },
      { label: 'Total Ad Leads', value: '0', change: '18%', changeDir: 'up', sub: 'All time cumulative', sparkData: [1,3,4,5,7] },
    ];
  });

  // Attention Required alerts state
  const [alerts, setAlerts] = useState<Alert[]>(() => {
    const saved = localStorage.getItem('joelos_alerts');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', severity: 'critical', title: 'Server health check failed', detail: 'Backend not responding at /api/health', timestamp: 'NOW', agentSource: 'CORTANA' },
      { id: '2', severity: 'warning', title: 'Pipeline has no runs today', detail: 'No agent tasks executed in last 24h', timestamp: '12H AGO', agentSource: 'F.R.I.D.A.Y.' },
      { id: '3', severity: 'info', title: 'Athena ledger growing', detail: `0 entries stored in brain`, timestamp: 'ONGOING', agentSource: 'ATHENA' },
    ];
  });

  // Operations Board (Kanban) tasks state
  const [opsTasks, setOpsTasks] = useState<OpsTask[]>(() => {
    const saved = localStorage.getItem('joelos_ops_tasks');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', title: 'Complete daily pipeline run', detail: 'Run full Researcher→Planner→Coder→Reviewer pipeline', agentSource: 'CORTANA', status: 'queued', createdAt: new Date().toLocaleTimeString(), priority: 'high' },
      { id: '2', title: 'Review Athena memory ledger', detail: 'Verify items in brain store. Archive old entries', agentSource: 'F.R.I.D.A.Y.', status: 'queued', createdAt: new Date().toLocaleTimeString(), priority: 'medium' },
    ];
  });

  // Live Activity Feed panel state
  const [activityFeed, setActivityFeed] = useState<ActivityEntry[]>(() => {
    const saved = localStorage.getItem('joelos_activity_feed');
    return saved ? JSON.parse(saved) : [];
  });

  // KPI Metrics persistence
  useEffect(() => {
    localStorage.setItem('joelos_kpi_metrics', JSON.stringify(kpiMetrics));
  }, [kpiMetrics]);

  // Alerts persistence
  useEffect(() => {
    localStorage.setItem('joelos_alerts', JSON.stringify(alerts));
  }, [alerts]);

  // Ops Tasks persistence
  useEffect(() => {
    localStorage.setItem('joelos_ops_tasks', JSON.stringify(opsTasks));
  }, [opsTasks]);

  // Activity Feed persistence
  useEffect(() => {
    localStorage.setItem('joelos_activity_feed', JSON.stringify(activityFeed));
  }, [activityFeed]);

  // Goals state
  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('joelos_goals');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'g1', title: 'Orchestration Health', description: 'Ensure the Hermes API connection remains stable with standard fallback triggers', linkedAgent: 'cortana', status: 'in-progress', createdAt: new Date().toISOString() },
      { id: 'g2', title: 'Synchronize Agent Memory', description: 'Maintain complete context alignments across core and subagent databases', linkedAgent: 'jarvis', status: 'pending', createdAt: new Date().toISOString() },
    ];
  });

  // Goals persistence
  useEffect(() => {
    localStorage.setItem('joelos_goals', JSON.stringify(goals));
  }, [goals]);

  // Form states for Goal creation
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalAgent, setNewGoalAgent] = useState<AgentId>('cortana');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  // Voice Input Speech Recognition States
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Check Web Speech API support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech API is not supported in this browser. Please use Chrome/Edge/Safari.");
      return;
    }

    if (isListening) {
      const existingRec = (window as any).activeRecognition;
      if (existingRec) {
        existingRec.stop();
      }
      setIsListening(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          (window as any).activeRecognition = recognition;
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          (window as any).activeRecognition = null;
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            if (chatTab === 'private') {
              setPrivatePrompt(prev => prev + (prev ? ' ' : '') + transcript);
            } else {
              setGlobalPrompt(prev => prev + (prev ? ' ' : '') + transcript);
            }
          }
        };

        recognition.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
        setIsListening(false);
      }
    }
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isMemorySearching, setIsMemorySearching] = useState<boolean>(false);
  const [memorySearchQuery, setMemorySearchQuery] = useState<string>('');
  const [serverHealthy, setServerHealthy] = useState<boolean | null>(null);

  // Premium Enhancements States
  const [theme, setTheme] = useState<'dark' | 'light' | 'oled'>(() => {
    return (localStorage.getItem('joelos_theme') as 'dark' | 'light' | 'oled') || 'dark';
  });

  // Ops sub-tab selector inside Operations Panel
  const [opsSubTab, setOpsSubTab] = useState<'kanban' | 'orchestration' | 'sandbox' | 'studio' | 'radial'>('kanban');
  const [activeRadialAgentId, setActiveRadialAgentId] = useState<AgentId>('cortana');
  const [radialStallThreshold, setRadialStallThreshold] = useState<number>(15);
  const [nodeLastChanged, setNodeLastChanged] = useState<Record<string, number | string>>({});

  // 1. Orchestration States (Hermes)
  const [hermesConnected, setHermesConnected] = useState<boolean>(false);
  const [hermesCrons, setHermesCrons] = useState<any[]>([]);
  const [hermesSubagents, setHermesSubagents] = useState<any[]>([]);
  const [newCronName, setNewCronName] = useState('');
  const [newCronSchedule, setNewCronSchedule] = useState('*/5 * * * *');
  const [newCronTask, setNewCronTask] = useState('');
  const [newSubagentName, setNewSubagentName] = useState('');
  const [newSubagentTask, setNewSubagentTask] = useState('');
  const [isHermesLoading, setIsHermesLoading] = useState(false);

  // 2. Sandbox States
  const [sandboxProjects, setSandboxProjects] = useState<any[]>([]);
  const [activeSandboxProjId, setActiveSandboxProjId] = useState<string | null>(null);
  const [isSandboxLoading, setIsSandboxLoading] = useState(false);
  const [selectedProjectLogId, setSelectedProjectLogId] = useState<string | null>(null);
  const [sandboxReloadCount, setSandboxReloadCount] = useState(0);
  const [editedCode, setEditedCode] = useState<string>('');
  const [isSandboxCompiling, setIsSandboxCompiling] = useState(false);

  // 3. Studio States
  const [studioJobs, setStudioJobs] = useState<any[]>([]);
  const [studioPrompt, setStudioPrompt] = useState('');
  const [studioModel, setStudioModel] = useState('gemini-2.5-flash-image');
  const [studioType, setStudioType] = useState<'image' | 'video' | 'voice'>('image');
  const [studioAspectRatio, setStudioAspectRatio] = useState<string>('1:1');
  const [isStudioSubmitting, setIsStudioSubmitting] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [selectedStudioJob, setSelectedStudioJob] = useState<any | null>(null);

  const completedImageJobs = useMemo(() => {
    return studioJobs
      .filter((j: any) => j.type === 'image' && j.status === 'completed' && j.resultUrl)
      .map((job: any, index: number) => {
        const spans = [
          "md:col-span-2 md:row-span-2",
          "md:col-span-1 md:row-span-1",
          "md:col-span-1 md:row-span-2",
          "md:col-span-2 md:row-span-1",
          "md:col-span-1 md:row-span-1",
          "md:col-span-2 md:row-span-1",
        ];
        return {
          id: job.id,
          title: job.prompt.length > 30 ? job.prompt.slice(0, 30) + '...' : job.prompt,
          desc: job.prompt,
          url: job.resultUrl,
          span: spans[index % spans.length],
          prompt: job.prompt,
          model: job.provider,
          aspectRatio: job.aspectRatio || '1:1',
          timestamp: new Date(job.timestamp).toLocaleString()
        };
      });
  }, [studioJobs]);

  // Periodic API synchronization
  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const cronRes = await fetch('/api/hermes/cron');
        if (cronRes.ok && active) {
          const payload = await cronRes.json();
          if (payload && typeof payload === 'object' && 'connected' in payload) {
            setHermesConnected(payload.connected);
            setHermesCrons(payload.crons);
          } else {
            setHermesCrons(payload);
          }
        }

        const subRes = await fetch('/api/hermes/subagents');
        if (subRes.ok && active) {
          const payload = await subRes.json();
          if (payload && typeof payload === 'object' && 'connected' in payload) {
            setHermesSubagents(payload.subagents);
          } else {
            setHermesSubagents(payload);
          }
        }

        const sandboxRes = await fetch('/api/sandbox/projects');
        if (sandboxRes.ok && active) {
          const projs = await sandboxRes.json();
          setSandboxProjects(projs);
          if (projs.length > 0 && !activeSandboxProjId) {
            setActiveSandboxProjId(projs[0].id);
          }
        }

        const studioRes = await fetch('/api/studio/jobs');
        if (studioRes.ok && active) setStudioJobs(await studioRes.json());
      } catch (err) {
        console.warn('API sync error:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [activeSandboxProjId]);

  // Sync edited code when active project switches
  useEffect(() => {
    const activeProject = sandboxProjects.find(p => p.id === activeSandboxProjId);
    if (activeProject && activeProject.files) {
      setEditedCode(activeProject.files['App.tsx'] || Object.values(activeProject.files)[0] || '');
    } else {
      setEditedCode('');
    }
  }, [activeSandboxProjId]);

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !newGoalDesc.trim()) return;
    const goal: Goal = {
      id: 'g-' + Date.now(),
      title: newGoalTitle,
      description: newGoalDesc,
      linkedAgent: newGoalAgent,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    setGoals(prev => [goal, ...prev]);
    setNewGoalTitle('');
    setNewGoalDesc('');
    setNewGoalAgent('cortana');
    setIsGoalModalOpen(false);
  };

  const handleDeleteGoal = (id: string) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      setGoals(prev => prev.filter(g => g.id !== id));
    }
  };

  const handleToggleGoalStatus = (id: string) => {
    const statusCycle: Record<Goal['status'], Goal['status']> = {
      'pending': 'in-progress',
      'in-progress': 'completed',
      'completed': 'failed',
      'failed': 'pending'
    };
    setGoals(prev => prev.map(g => g.id === id ? { ...g, status: statusCycle[g.status] } : g));
  };

  const handleCreateCron = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCronTask.trim()) return;
    setIsHermesLoading(true);
    try {
      const res = await fetch('/api/hermes/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCronName, schedule: newCronSchedule, task: newCronTask })
      });
      if (res.ok) {
        const data = await res.json();
        setHermesCrons(prev => [data, ...prev]);
        setNewCronName('');
        setNewCronTask('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsHermesLoading(false);
    }
  };

  const handleToggleCron = async (id: string) => {
    try {
      const res = await fetch(`/api/hermes/cron/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        setHermesCrons(prev => prev.map(c => c.id === id ? { ...c, status: c.status === 'active' ? 'paused' : 'active' } : c));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCron = async (id: string) => {
    try {
      const res = await fetch(`/api/hermes/cron/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHermesCrons(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSpawnSubagent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubagentTask.trim()) return;
    setIsHermesLoading(true);
    try {
      const res = await fetch('/api/hermes/subagents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubagentName, task: newSubagentTask })
      });
      if (res.ok) {
        const data = await res.json();
        setHermesSubagents(prev => [data, ...prev]);
        setNewSubagentName('');
        setNewSubagentTask('');
        setMessages(prev => [...prev, {
          id: 'sys-spawn-' + Date.now(),
          sender: 'system',
          text: `🚀 Spawned Hermes Subagent "${data.name}" to execute: ${data.task}. Follow progress logs in Hermes Orchestration sub-tab.`,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsHermesLoading(false);
    }
  };

  const handleStopSubagent = async (id: string) => {
    try {
      const res = await fetch(`/api/hermes/subagents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHermesSubagents(prev => prev.map(s => s.id === id ? { ...s, status: 'failed' } : s));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateStudioJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioPrompt.trim()) return;
    setIsStudioSubmitting(true);
    try {
      const res = await fetch('/api/studio/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: studioType, 
          prompt: studioPrompt, 
          model: studioModel, 
          aspectRatio: studioAspectRatio, 
          providerKey: cloudApiKey 
        })
      });
      if (res.ok) {
        const data = await res.json();
        setStudioJobs(prev => [data, ...prev]);
        setStudioPrompt('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsStudioSubmitting(false);
    }
  };

  const handleDeleteStudioJob = async (id: string) => {
    try {
      const res = await fetch(`/api/studio/jobs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStudioJobs(prev => prev.filter(j => j.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSandboxProject = async (id: string) => {
    try {
      const res = await fetch(`/api/sandbox/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSandboxProjects(prev => prev.filter(p => p.id !== id));
        if (activeSandboxProjId === id) {
          setActiveSandboxProjId(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompileSandbox = async () => {
    if (!activeSandboxProjId) return;
    setIsSandboxCompiling(true);
    try {
      const res = await fetch(`/api/sandbox/projects/${activeSandboxProjId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: {
            'App.tsx': editedCode
          }
        })
      });

      if (res.ok) {
        const updatedProj = await res.json();
        // Update local state list
        setSandboxProjects(prev => prev.map(p => p.id === activeSandboxProjId ? updatedProj : p));
        // Add a compile success log to local activeProject so user sees it in terminal
        setSandboxReloadCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Failed to compile sandbox:', err);
    } finally {
      setIsSandboxCompiling(false);
    }
  };
  const [geminiInputTokens, setGeminiInputTokens] = useState<number>(() => {
    return Number(localStorage.getItem('joelos_gemini_input_tokens')) || 0;
  });
  const [geminiOutputTokens, setGeminiOutputTokens] = useState<number>(() => {
    return Number(localStorage.getItem('joelos_gemini_output_tokens')) || 0;
  });
  const [chatTab, setChatTab] = useState<'global' | 'private'>('global');
  const [privateAgentId, setPrivateAgentId] = useState<AgentId>('cortana');
  const [privateMessages, setPrivateMessages] = useState<Record<string, Message[]>>({
    cortana: [],
    jarvis: [],
    aura: [],
    boss: [],
    cash: [],
    forge: [],
    titan: [],
    memory: [],
    researcher: [],
    planner: [],
    coder: [],
    reviewer: [],
  });
  const [privateIsSending, setPrivateIsSending] = useState(false);

  const sendPrivateMessage = async () => {
    if (!privatePrompt.trim()) return;
    if (privateIsSending) return;
    
    const text = privatePrompt.trim();
    setPrivatePrompt('');
    setPrivateIsSending(true);

    const agentId = privateAgentId;
    const userMsg: Message = {
      id: 'private-user-' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString(),
    };

    setPrivateMessages(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), userMsg]
    }));

    // --- Studio Media Generation Shortcut (Private Chat) ---
    const lowerQuery = text.toLowerCase();
    const isImageQuery = lowerQuery.includes('generate image') || lowerQuery.includes('create image') || lowerQuery.includes('make an image') || lowerQuery.includes('generate a picture') || lowerQuery.includes('draw a') || lowerQuery.includes('generate photo') || lowerQuery.includes('create a photo') || lowerQuery.includes('imagen');
    const isVideoQuery = lowerQuery.includes('generate video') || lowerQuery.includes('create video') || lowerQuery.includes('make a video');
    const isVoiceQuery = lowerQuery.includes('generate voice') || lowerQuery.includes('generate audio') || lowerQuery.includes('text to speech') || lowerQuery.includes('create voice');

    if (isImageQuery || isVideoQuery || isVoiceQuery) {
      const type = isImageQuery ? 'image' : isVideoQuery ? 'video' : 'voice';
      try {
        setPrivateMessages(prev => ({
          ...prev,
          [agentId]: [...(prev[agentId] || []), {
            id: 'private-sys-studio-' + Date.now(),
            sender: agentId,
            text: `🎨 **Media Studio Job Spawned!** Detected creative "${type}" command.\nRedirecting workspace focus to **Synthetic Media Studio** inside the Operations Hub.`,
            timestamp: new Date().toLocaleTimeString(),
          }]
        }));

        const res = await fetch('/api/studio/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            prompt: text,
            model: studioModel,
            providerKey: cloudApiKey || undefined,
          }),
        });

        if (res.ok) {
          const newJob = await res.json();
          setStudioJobs(prev => [newJob, ...prev]);
        }

        setActiveTab('operations');
        setOpsSubTab('studio');
      } catch (err) {
        console.error('Failed to trigger studio job:', err);
      } finally {
        setPrivateIsSending(false);
      }
      return;
    }

    let systemInst = systemInstructions[agentId] || '';
    systemInst += ` IMPORTANT DIRECT DIRECTIVE: You are in a direct 1-on-1 private chat with the user. Answer the user directly, provide helpful technical facts, specifications, code guidelines, or direct answers. Do NOT delegate tasks or output a delegation sequence like "DELEGATION SEQUENCE" or "1. BOSS...".`;
    let activeModel = agentModels[agentId] || (engine === 'gemini' ? 'gemini-2.5-flash' : 'llama3.2');

    const botMsgId = 'private-bot-' + Date.now();
    const botMsgPlaceholder: Message = {
      id: botMsgId,
      sender: agentId,
      text: '...',
      timestamp: new Date().toLocaleTimeString(),
      isStreaming: true,
    };

    setPrivateMessages(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), botMsgPlaceholder]
    }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine,
          model: activeModel,
          messages: [{ role: 'user', content: text }],
          systemInstruction: systemInst,
          stream: false,
          ollamaUrl,
          cloudApiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`Private chat failed with status ${response.status}`);
      }

      const data = await response.json();
      const botResponseText = data.text || 'No response returned.';

      setPrivateMessages(prev => ({
        ...prev,
        [agentId]: (prev[agentId] || []).map(m => m.id === botMsgId ? {
          ...m,
          text: botResponseText,
          isStreaming: false,
        } : m)
      }));

      // Increment task count for private agents
      setAgents(prev => {
        const next = prev.map(a => a.id === agentId ? { ...a, taskCount: a.taskCount + 1 } : a);
        const counts = next.reduce((acc, a) => ({ ...acc, [a.id]: a.taskCount }), {});
        localStorage.setItem('joelos_agent_task_counts', JSON.stringify(counts));
        return next;
      });

    } catch (err: any) {
      console.error('Private send fail:', err);
      setPrivateMessages(prev => ({
        ...prev,
        [agentId]: (prev[agentId] || []).map(m => m.id === botMsgId ? {
          ...m,
          text: `Error calling agent: ${err.message || err}`,
          isStreaming: false,
        } : m)
      }));
    } finally {
      setPrivateIsSending(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('joelos_gemini_input_tokens', geminiInputTokens.toString());
  }, [geminiInputTokens]);

  useEffect(() => {
    localStorage.setItem('joelos_gemini_output_tokens', geminiOutputTokens.toString());
  }, [geminiOutputTokens]);

  const [timingsHistory, setTimingsHistory] = useState<Array<{ timestamp: string; cortana: number; jarvis: number; aura: number; boss: number; cash: number; forge: number; titan: number }>>(() => {
    const saved = localStorage.getItem('joelos_timings_history_v2');
    return saved ? JSON.parse(saved) : [
      { timestamp: '10:45:12', cortana: 0.8, jarvis: 1.1, aura: 1.5, boss: 0.9, cash: 1.2, forge: 2.1, titan: 1.4 },
      { timestamp: '11:02:44', cortana: 0.6, jarvis: 0.9, aura: 1.2, boss: 0.7, cash: 1.0, forge: 1.8, titan: 1.1 },
      { timestamp: '11:20:15', cortana: 1.1, jarvis: 1.4, aura: 1.9, boss: 1.2, cash: 1.5, forge: 2.8, titan: 1.6 },
    ];
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('joelos_sound_enabled') !== 'false';
  });
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [shortcutsOpen, setShortcutsOpen] = useState<boolean>(false);
  const [isMemoryDrawerOpen, setIsMemoryDrawerOpen] = useState<boolean>(false);
  const [isPipelineDrawerOpen, setIsPipelineDrawerOpen] = useState<boolean>(false);
  const pipelineAbortedRef = useRef<boolean>(false);
  const pipelineRefinements = useRef<string[]>([]);
  const [agentTimings, setAgentTimings] = useState<Record<string, string>>({});
  const [agentTokens, setAgentTokens] = useState<Record<string, number>>({});
  const [sessionTokens, setSessionTokens] = useState<number>(() => {
    return Number(localStorage.getItem('joelos_session_tokens')) || 0;
  });
  const [failedPhase, setFailedPhase] = useState<string | null>(null);

  // Dynamic customization states
  const [colorPalette, setColorPalette] = useState<'matrix-green' | 'cyber-blue'>(() => {
    return (localStorage.getItem('joelos_color_palette') as 'matrix-green' | 'cyber-blue') || 'matrix-green';
  });
  const [nodeContexts, setNodeContexts] = useState<Record<string, { input: string; output: string; model?: string; timestamp?: string }>>({});
  const [selectedNodeContextId, setSelectedNodeContextId] = useState<string | null>(null);

  // Context states for resume/retry capability
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [researcherContext, setResearcherContext] = useState<string>('');
  const [plannerOutputText, setPlannerOutputText] = useState<string>('');
  const [coderOutputText, setCoderOutputText] = useState<string>('');
  const [reviewerOutputText, setReviewerOutputText] = useState<string>('');

  // Pipeline Execution Priority
  const [priorityAgent, setPriorityAgent] = useState<string>(() => {
    return localStorage.getItem('joelos_priority_agent') || 'none';
  });

  // Audio completion sound chime
  const playCompletionSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      // First note: E5
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Second note: A5
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, now + 0.15);
      gain2.gain.setValueAtTime(0, now + 0.15);
      gain2.gain.linearRampToValueAtTime(0.15, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.8);
    } catch (e) {
      console.warn('Web Audio API chime failed to play', e);
    }
  };

  useEffect(() => {
    localStorage.setItem('joelos_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('joelos_sound_enabled', String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('joelos_session_tokens', String(sessionTokens));
  }, [sessionTokens]);

  useEffect(() => {
    localStorage.setItem('joelos_priority_agent', priorityAgent);
  }, [priorityAgent]);

  // Global keypress listener for shortcut panel (?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Support closing the modal on Escape even when inputs are focused or not
      if (e.key === 'Escape') {
        setShortcutsOpen(false);
        setIsMemoryDrawerOpen(false);
        setIsPipelineDrawerOpen(false);
        setMobileMenuOpen(false);
        setShowModelHub(false);
      }

      // Ignore if user is inside input, textarea, or select fields for other shortcuts
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
      
      if (isInput) {
        if (e.key === 'Escape') {
          target.blur();
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          startPipelineOrchestration();
        }
        return;
      }

      if (e.key === '?') {
        setShortcutsOpen(prev => !prev);
      } else if (e.key === '/') {
        e.preventDefault();
        const inputEl = document.querySelector('textarea') as HTMLTextAreaElement | null;
        inputEl?.focus();
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        clearHistory();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [clearHistory]);
  
  // Memories and vector score storage
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [matchedMemories, setMatchedMemories] = useState<MemoryItem[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null);

  // Dynamic alert detail update when memories count changes
  useEffect(() => {
    setAlerts(prev => prev.map(alert => {
      if (alert.id === '3') {
        return {
          ...alert,
          detail: `${memories.length} entries stored in brain`
        };
      }
      return alert;
    }));
  }, [memories.length]);

  // Agent profiles and runtime execution states
  const [agents, setAgents] = useState<Agent[]>(() => {
    const savedEnabled = localStorage.getItem('joelos_enabled_agents_v2');
    const enabledMap = savedEnabled ? JSON.parse(savedEnabled) : {
      cortana: true,
      jarvis: true,
      aura: true,
      boss: true,
      cash: true,
      forge: true,
      titan: true,
      memory: true,
      researcher: true,
      planner: true,
      coder: true,
      reviewer: true
    };
    const savedTaskCounts = localStorage.getItem('joelos_agent_task_counts');
    const taskCountsMap = savedTaskCounts ? JSON.parse(savedTaskCounts) : {};
    return [
      {
        id: 'cortana',
        name: 'Cortana',
        icon: '/images/cortana_icon_1782802478622.jpg',
        dotColor: 'bg-purple-500 shadow-purple-500/50 text-purple-400 border-purple-500/20',
        model: 'gemini-2.5-flash',
        description: 'Chief of Staff. Receives directives, plans agent pipelines, and synthesizes outputs.',
        status: 'idle',
        enabled: enabledMap.cortana !== false,
        taskCount: taskCountsMap.cortana || 0,
        color: '#7c3aed',
      },
      {
        id: 'jarvis',
        name: 'J.A.R.V.I.S.',
        icon: '/images/jarvis_icon_1782804403241.jpg',
        dotColor: 'bg-blue-500 shadow-blue-500/50 text-blue-400 border-blue-500/20',
        model: 'gemini-2.5-flash',
        description: 'Communications Agent. Handles email triage, scheduling, and client templates.',
        status: 'idle',
        enabled: enabledMap.jarvis !== false,
        taskCount: taskCountsMap.jarvis || 0,
        color: '#2563eb',
      },
      {
        id: 'aura',
        name: 'Aura',
        icon: '/images/aura_icon_1782804422854.jpg',
        dotColor: 'bg-pink-500 shadow-pink-500/50 text-pink-400 border-pink-500/20',
        model: 'gemini-2.5-flash',
        description: 'Content & Brand. Drafts campaigns, social copy, and tracks audience engagement.',
        status: 'idle',
        enabled: enabledMap.aura !== false,
        taskCount: taskCountsMap.aura || 0,
        color: '#ec4899',
      },
      {
        id: 'boss',
        name: 'F.R.I.D.A.Y.',
        icon: '/images/boss_icon_1782804579792.jpg',
        dotColor: 'bg-amber-500 shadow-amber-500/50 text-amber-400 border-amber-500/20',
        model: 'gemini-2.5-flash',
        description: 'Operations Manager. Compiles summaries, tracks task deadlines, and organizes daily briefs.',
        status: 'idle',
        enabled: enabledMap.boss !== false,
        taskCount: taskCountsMap.boss || 0,
        color: '#f59e0b',
      },
      {
        id: 'cash',
        name: 'Cash',
        icon: '/images/cash_icon_1782804680455.jpg',
        dotColor: 'bg-emerald-500 shadow-emerald-500/50 text-emerald-400 border-emerald-500/20',
        model: 'gemini-2.5-flash',
        description: 'Finance Intelligence. Computes ROI on campaigns, manages spend, flags anomalies.',
        status: 'idle',
        enabled: enabledMap.cash !== false,
        taskCount: taskCountsMap.cash || 0,
        color: '#10b981',
      },
      {
        id: 'forge',
        name: 'Nova',
        icon: '/images/forge_icon_1782804761591.jpg',
        dotColor: 'bg-slate-400 shadow-slate-400/50 text-slate-300 border-slate-500/20',
        model: 'gemini-2.5-flash',
        description: 'Build & Dev. Engineers codebase structures, refactors systems, and writes code.',
        status: 'idle',
        enabled: enabledMap.forge !== false,
        taskCount: taskCountsMap.forge || 0,
        color: '#6b7280',
      },
      {
        id: 'titan',
        name: 'Titan',
        icon: '/images/titan_icon_1782804846502.jpg',
        dotColor: 'bg-violet-500 shadow-violet-500/50 text-violet-400 border-violet-500/20',
        model: 'gemini-2.5-flash',
        description: 'Strategic Analyst. Conducts market research, evaluates pricing, tracks trends.',
        status: 'idle',
        enabled: enabledMap.titan !== false,
        taskCount: taskCountsMap.titan || 0,
        color: '#8b5cf6',
      },
      {
        id: 'memory',
        name: 'Athena',
        icon: '/images/memory_icon_1782804882461.jpg',
        dotColor: 'bg-purple-500 shadow-purple-500/50 text-purple-400 border-purple-500/20',
        model: 'Vector Engine',
        description: 'Semantic vector memory store. Recalls relevant patterns from history.',
        status: 'idle',
        enabled: enabledMap.memory !== false,
        taskCount: taskCountsMap.memory || 0,
        color: '#a78bfa',
      },
      {
        id: 'researcher',
        name: 'Researcher',
        icon: '/images/researcher_icon_1782804913680.jpg',
        dotColor: 'bg-blue-500 shadow-blue-500/50 text-blue-400 border-blue-500/20',
        model: 'gemini-2.5-flash',
        description: 'Conducts deep technical analysis, pulls libraries, APIs, and guidelines.',
        status: 'idle',
        enabled: enabledMap.researcher !== false,
        taskCount: taskCountsMap.researcher || 0,
        color: '#3b82f6',
      },
      {
        id: 'planner',
        name: 'Planner',
        icon: '/images/planner_icon_1782804930740.jpg',
        dotColor: 'bg-amber-500 shadow-amber-500/50 text-amber-400 border-amber-500/20',
        model: 'gemini-2.5-flash',
        description: 'Formulates step-by-step blueprints, layout design, and data schemas.',
        status: 'idle',
        enabled: enabledMap.planner !== false,
        taskCount: taskCountsMap.planner || 0,
        color: '#f59e0b',
      },
      {
        id: 'coder',
        name: 'Coder',
        icon: '/images/coder_icon_1782804952483.jpg',
        dotColor: 'bg-emerald-500 shadow-emerald-500/50 text-emerald-400 border-emerald-500/20',
        model: 'gemini-2.5-pro',
        description: 'Generates optimized React, TypeScript, and Tailwind CSS codebases.',
        status: 'idle',
        enabled: enabledMap.coder !== false,
        taskCount: taskCountsMap.coder || 0,
        color: '#10b981',
      },
      {
        id: 'reviewer',
        name: 'Reviewer',
        icon: '/images/reviewer_icon_1782804970130.jpg',
        dotColor: 'bg-pink-500 shadow-pink-500/50 text-pink-400 border-pink-500/20',
        model: 'gemini-2.5-flash',
        description: 'Audits code quality, rendering, performance, and responsive layout.',
        status: 'idle',
        enabled: enabledMap.reviewer !== false,
        taskCount: taskCountsMap.reviewer || 0,
        color: '#ec4899',
      }
    ];
  });

  // Orchestration progress nodes
  const [pipelineNodes, setPipelineNodes] = useState<PipelineNode[]>([
    { id: 'start', label: 'User Intent', status: 'pending' },
    { id: 'memory', label: 'Athena Recall', status: 'pending' },
    { id: 'cortana', label: 'Cortana Orchestrator', status: 'pending' },
    { id: 'jarvis', label: 'J.A.R.V.I.S. (Communications)', status: 'pending' },
    { id: 'aura', label: 'Aura (Content)', status: 'pending' },
    { id: 'boss', label: 'F.R.I.D.A.Y. (Operations)', status: 'pending' },
    { id: 'cash', label: 'Cash (Finance)', status: 'pending' },
    { id: 'forge', label: 'Nova (Build)', status: 'pending' },
    { id: 'titan', label: 'Titan (Strategy)', status: 'pending' },
    { id: 'synthesis', label: 'Final deliverable', status: 'pending' },
  ]);

  useEffect(() => {
    const now = Date.now();
    setNodeLastChanged(prev => {
      const updated = { ...prev };
      let changed = false;
      pipelineNodes.forEach(node => {
        const prevStatusKey = `${node.id}_status`;
        const hasNoPrev = prev[node.id] === undefined;
        const prevStatus = prev[prevStatusKey];
        if (hasNoPrev || prevStatus !== node.status) {
          updated[node.id] = now;
          updated[prevStatusKey] = node.status;
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [pipelineNodes]);

  function clearHistory() {
    if (window.confirm('Are you sure you want to clear conversation logs?')) {
      setMessages([]);
      setPipelineNodes(prev => prev.map(n => ({ ...n, status: 'pending' })));
    }
  }

  const [pipelineIsRunning, setPipelineIsRunning] = useState<boolean>(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Set system instructions for agents
  const systemInstructions = {
    cortana: `You are CORTANA, Chief of Staff of the 7-Agent Mission Control system. Your job is to read user goals, identify which agents among [JARVIS, AURA, BOSS, CASH, FORGE, TITAN] should execute, delegate specific tasks, and coordinate work. Be authoritative and highly structured.${priorityAgent === 'cortana' ? ' [PRIORITY OVERRIDE]: Provide extremely thorough orchestration directives and exhaustive edge-case handling considerations.' : ''}`,
    jarvis: `You are JARVIS, communications and organization agent. You specialize in drafting emails, calendar scheduling, lead follow-ups, and inbox organization. Provide polished copy and specific timing plans.${priorityAgent === 'jarvis' ? ' [PRIORITY OVERRIDE]: Provide highly comprehensive and multi-layered communication templates.' : ''}`,
    aura: `You are AURA, brand and content copywriter. You specialize in campaigns, high-engagement social media posts, launch calendars, and outreach ideas.${priorityAgent === 'aura' ? ' [PRIORITY OVERRIDE]: Write extensive, deeply optimized, and engaging content copy.' : ''}`,
    boss: `You are BOSS, operations manager. You specialize in breaking down goals into tasks, organizing lists, summarizing briefs, and workflow management.${priorityAgent === 'boss' ? ' [PRIORITY OVERRIDE]: Perform deep operational breakdowns.' : ''}`,
    cash: `You are CASH, financial intelligence analyst. You track ROI, budgets, ad campaign performance, and find budget anomalies. Be highly mathematical and precise.${priorityAgent === 'cash' ? ' [PRIORITY OVERRIDE]: Run deep, thorough budget calculations.' : ''}`,
    forge: `You are FORGE, developer and builder. You generate production-ready code, plan database structures, design systems, and solve technical bugs. Wrap code in markdown. ${priorityAgent === 'forge' ? ' [PRIORITY OVERRIDE]: Generate deeply optimized codebases with comments.' : ''}`,
    titan: `You are TITAN, strategic planner. You specialize in competitor research, market trends, competitive pricing models, and identifying opportunities.${priorityAgent === 'titan' ? ' [PRIORITY OVERRIDE]: Execute a comprehensive strategic competitive intelligence sweep.' : ''}`,
    researcher: `You are the RESEARCHER agent. Conduct highly rigorous technical and background research. Find specific libraries, API signatures, architectural structures, and design guidelines that will help build the requested product. Deliver clear, factual documentation with references.`,
    planner: `You are the PLANNER agent. Receive user goals and technical research. Formulate a comprehensive step-by-step architectural plan. Break down the engineering task into modular units, specifying clear layout options, component partitions, states, and data schemas without writing actual code.`,
    coder: `You are the CODER agent. Receive research guidelines and step-by-step blueprint plans. Generate robust, production-quality, and complete code blocks in React, TypeScript, and Tailwind CSS. Ensure that all requested components are fully functional and cleanly modularized. Do not use placeholding comments.`,
    reviewer: `You are the REVIEWER agent. Audit generated codebase packages, styles, and logic blocks. Scan carefully for syntax errors, React rendering performance issues, anti-patterns, responsive design defects, and incomplete features. Deliver a final, objective code audit checklist.`,
  };

  // Check and fetch real running Ollama models dynamically
  useEffect(() => {
    let active = true;
    const checkOllama = async () => {
      setOllamaConnectionStatus('unchecked');
      
      // Attempt 1: Fetch through server-side proxy
      try {
        const res = await fetch(`/api/tags?url=${encodeURIComponent(ollamaUrl)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.models && Array.isArray(data.models) && data.models.length > 0) {
            if (active) {
              const names = data.models.map((m: any) => typeof m === 'string' ? m : m.name);
              setInstalledOllamaModels(names);
              setOllamaModelDetails(data.models.filter((m: any) => typeof m !== 'string'));
              setOllamaConnectionStatus('connected');
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Ollama proxy check failed, trying client direct check:', err);
      }

      // Attempt 2: Fetch directly from client browser
      try {
        const res = await fetch(`${ollamaUrl}/api/tags`);
        if (res.ok) {
          const data = await res.json();
          if (data.models && Array.isArray(data.models) && data.models.length > 0) {
            const names = data.models.map((m: any) => m.name);
            if (active) {
              setInstalledOllamaModels(names);
              setOllamaModelDetails(data.models);
              setOllamaConnectionStatus('connected');
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Ollama browser direct check failed:', err);
      }

      if (active) {
        setOllamaConnectionStatus('failed');
      }
    };

    checkOllama();
    return () => {
      active = false;
    };
  }, [ollamaUrl, ollamaRefreshTrigger]);

  // Sync available Ollama models to default agent model states
  useEffect(() => {
    if (ollamaConnectionStatus === 'connected' && installedOllamaModels.length > 0) {
      const coderOption = installedOllamaModels.find(m => m.toLowerCase().includes('coder')) || installedOllamaModels[0];
      const generalOption = installedOllamaModels.find(m => m.toLowerCase().includes('llama3.2') || m.toLowerCase().includes('llama3') || m.toLowerCase().includes('qwen')) || installedOllamaModels[0];
      
      setAgentModels(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          if (!installedOllamaModels.includes(next[key as AgentId])) {
            next[key as AgentId] = key === 'coder' ? coderOption : generalOption;
          }
        });
        localStorage.setItem('joelos_agent_models', JSON.stringify(next));
        return next;
      });
    }
  }, [ollamaConnectionStatus, installedOllamaModels]);

  // Sync Agent configs in states
  useEffect(() => {
    setAgents(prev => prev.map(agent => {
      let newModel = '';
      if (engine === 'gemini') {
        newModel = agent.id === 'coder' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
      } else {
        newModel = agentModels[agent.id] || 'llama3.2';
      }
      return { ...agent, model: newModel };
    }));
  }, [engine, agentModels]);

  // Fetch available models dynamically based on active engine and credentials
  const fetchProviderModels = async () => {
    setLoadingProviderModels(true);
    setProviderModelsError(null);
    try {
      const res = await fetch('/api/provider-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine,
          apiKey: cloudApiKey,
          ollamaUrl,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${res.status}`);
      }
      const data = await res.json();
      setAvailableProviderModels(data.models || []);
    } catch (err: any) {
      console.error('Failed to fetch provider models:', err);
      setProviderModelsError(err.message || 'Failed to retrieve models list');
      
      // Load fallback presets
      if (engine === 'openrouter') {
        setAvailableProviderModels([
          { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', isFree: false },
          { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', isFree: false },
          { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B', isFree: false },
          { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', isFree: false },
          { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Free)', isFree: true },
          { id: 'meta-llama/llama-3-8b-instruct:free', name: 'Llama 3 8B (Free)', isFree: true },
          { id: 'qwen/qwen-2-7b-instruct:free', name: 'Qwen 2 7B (Free)', isFree: true },
          { id: 'openchat/openchat-7b:free', name: 'OpenChat 7B (Free)', isFree: true },
        ]);
      } else if (engine === 'openai') {
        setAvailableProviderModels([
          { id: 'gpt-4o', name: 'gpt-4o', isFree: false },
          { id: 'gpt-4o-mini', name: 'gpt-4o-mini', isFree: false },
          { id: 'o1-mini', name: 'o1-mini', isFree: false },
          { id: 'o1-preview', name: 'o1-preview', isFree: false },
        ]);
      } else if (engine === 'gemini') {
        setAvailableProviderModels([
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', isFree: true },
          { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', isFree: true },
          { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', isFree: true },
          { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', isFree: true },
          { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B', isFree: true },
        ]);
      } else {
        setAvailableProviderModels([]);
      }
    } finally {
      setLoadingProviderModels(false);
    }
  };

  useEffect(() => {
    fetchProviderModels();
  }, [engine, cloudApiKey, ollamaRefreshTrigger]);

  const activeModelsList = useMemo(() => {
    if (availableProviderModels && availableProviderModels.length > 0) {
      return availableProviderModels;
    }
    // Fallbacks if availableProviderModels is not loaded yet
    if (engine === 'gemini') {
      return [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', isFree: true },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', isFree: true },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', isFree: true },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', isFree: true },
        { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B', isFree: true },
      ];
    } else if (engine === 'openai') {
      return [
        { id: 'gpt-4o', name: 'gpt-4o', isFree: false },
        { id: 'gpt-4o-mini', name: 'gpt-4o-mini', isFree: false },
        { id: 'o1-mini', name: 'o1-mini', isFree: false },
        { id: 'o1-preview', name: 'o1-preview', isFree: false },
      ];
    } else if (engine === 'openrouter') {
      return [
        { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', isFree: false },
        { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', isFree: false },
        { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B', isFree: false },
        { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', isFree: false },
        { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Free)', isFree: true },
        { id: 'meta-llama/llama-3-8b-instruct:free', name: 'Llama 3 8B (Free)', isFree: true },
        { id: 'qwen/qwen-2-7b-instruct:free', name: 'Qwen 2 7B (Free)', isFree: true },
        { id: 'openchat/openchat-7b:free', name: 'OpenChat 7B (Free)', isFree: true },
      ];
    } else {
      return installedOllamaModels.map(m => ({ id: m, name: m, isFree: true }));
    }
  }, [engine, availableProviderModels, installedOllamaModels]);

  // Load memories from backend on startup
  useEffect(() => {
    fetch('/api/memory')
      .then(r => r.json())
      .then(data => {
        if (data && data.length > 0) {
          setMemories(data);
          setMatchedMemories(data.slice(0, 10)); // default recent
        } else {
          // Seed some sample memories
          const seeds: MemoryItem[] = [
            {
              id: 'seed-1',
              title: 'Worship Media Database Architecture',
              summary: 'A relational model for storing slide decks, lyric sheets, and audio stems with tag-based filters.',
              snippet: 'CREATE TABLE songs (id UUID, title TEXT, lyrics TEXT, key CHAR(2));',
              tags: ['sql', 'database', 'media'],
              embedding: getLocalEmbeddingVector('Worship Media Database Architecture with postgresql CREATE TABLE songs'),
              timestamp: new Date(Date.now() - 3600000 * 24 * 3).toLocaleString(),
            },
            {
              id: 'seed-2',
              title: 'Realtime WebSocket Audio Streaming Engine',
              summary: 'Node.js event controller to feed microphone audio chunks to audio processors with low latency.',
              snippet: 'const wss = new WebSocketServer({ port: 8080 });',
              tags: ['websockets', 'audio', 'node'],
              embedding: getLocalEmbeddingVector('Realtime WebSocket Audio Streaming Engine with ws and raw PCM audio streams'),
              timestamp: new Date(Date.now() - 3600000 * 2).toLocaleString(),
            }
          ];
          // Save seeds to database
          fetch('/api/memory', {
            method: 'POST',
            body: JSON.stringify({ items: seeds }),
            headers: { 'Content-Type': 'application/json' }
          }).catch(err => console.error('Error saving seeds:', err));
          setMemories(seeds);
          setMatchedMemories(seeds);
        }
      })
      .catch(e => {
        console.error('Error loading backend memories, falling back to empty list', e);
      });
  }, []);

  // Health check on backend server
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'healthy') {
          setServerHealthy(true);
        } else {
          setServerHealthy(false);
        }
      })
      .catch(() => setServerHealthy(false));
  }, []);

  // Load Obsidian config and hook up Watch-Stream SSE
  useEffect(() => {
    fetch('/api/vault/config')
      .then(res => res.json())
      .then(data => {
        if (data.configured) {
          setIsVaultConfigured(true);
          setVaultPath(data.vaultPath);
          setAutoWriteOutputs(data.autoWrite);
          setIndexedNotesCount(data.notesCount || 0);
        }
      })
      .catch(err => console.error('Error fetching vault config:', err));

    const eventSource = new EventSource('/api/vault/watch-stream');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setRecentNoteEvents(prev => [
          { event: data.event, path: data.path, timestamp: new Date().toLocaleTimeString() },
          ...prev.slice(0, 9)
        ]);
        fetch('/api/vault/config')
          .then(res => res.json())
          .then(cfg => {
            if (cfg.configured) {
              setIndexedNotesCount(cfg.notesCount || 0);
            }
          });
      } catch (e) {
        console.error('SSE Watcher Parse Error:', e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Scroll to bottom helper
  useEffect(() => {
    if (isAutoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, isAutoScrollEnabled]);

  // Handle Search Memory Filter on local items
  const handleMemorySearch = async (query: string) => {
    setMemorySearchQuery(query);
    if (!query.trim()) {
      setMatchedMemories(memories.slice(0, 10));
      return;
    }

    setIsMemorySearching(true);
    try {
      // Generate embedding vector for query
      let queryEmbedding: number[] = [];
      if (engine === 'gemini' && serverHealthy) {
        const res = await fetch('/api/embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: query, engine: 'gemini' }),
        });
        const data = await res.json();
        if (data.embedding) {
          queryEmbedding = data.embedding;
        }
      }
      
      if (queryEmbedding.length === 0) {
        queryEmbedding = getLocalEmbeddingVector(query);
      }

      // Calculate similarity score on all items
      const scored = memories.map(item => {
        const itemEmbedding = item.embedding || getLocalEmbeddingVector(item.title + ' ' + item.summary + ' ' + item.snippet);
        const score = calculateCosineSimilarity(queryEmbedding, itemEmbedding);
        return { ...item, relevance: score };
      });

      // Sort by similarity score descending
      const sorted = scored
        .filter(item => (item.relevance || 0) > 0.05 || item.title.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

      setMatchedMemories(sorted);
    } catch (err) {
      console.error('Embedding query calculation error:', err);
      // fallback simple keyword match
      const filtered = memories.filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) || 
        item.summary.toLowerCase().includes(query.toLowerCase()) ||
        item.snippet.toLowerCase().includes(query.toLowerCase())
      );
      setMatchedMemories(filtered);
    } finally {
      setIsMemorySearching(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Helper to draw timing chart
  const renderTimingChart = () => {
    if (timingsHistory.length === 0) {
      return (
        <div className="text-center py-8 text-emerald-700 text-xs font-mono">
          No historical orchestration metrics available. Run a pipeline to generate timings.
        </div>
      );
    }

    const maxVal = Math.max(...timingsHistory.map(d => d.cortana + d.jarvis + d.aura + d.boss + d.cash + d.forge + d.titan), 3);
    const chartHeight = 160;
    
    return (
      <div className="space-y-6 font-sans">
        <div className="relative border border-emerald-950/60 rounded-xl p-4 bg-[#0a0f0c]/30 font-mono">
          {/* Chart Header */}
          <div className="flex items-center justify-between mb-4 border-b border-emerald-950/40 pb-2.5">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Agent Execution Bottleneck Timeline (Stacked Duration)</span>
            <span className="text-[10px] text-emerald-500/50">Max Height: {maxVal.toFixed(1)}s</span>
          </div>

          {/* SVG Visualizer */}
          <div className="h-44 w-full flex items-end gap-3 md:gap-5 overflow-x-auto pt-4 pb-2 select-none min-h-[180px] scrollbar-none">
            {timingsHistory.map((run, i) => {
              const total = run.cortana + run.jarvis + run.aura + run.boss + run.cash + run.forge + run.titan;
              const hCortana = (run.cortana / maxVal) * chartHeight;
              const hJarvis = (run.jarvis / maxVal) * chartHeight;
              const hAura = (run.aura / maxVal) * chartHeight;
              const hBoss = (run.boss / maxVal) * chartHeight;
              const hCash = (run.cash / maxVal) * chartHeight;
              const hForge = (run.forge / maxVal) * chartHeight;
              const hTitan = (run.titan / maxVal) * chartHeight;

              // Find slowest agent
              const timings = [
                { name: 'Cortana', val: run.cortana },
                { name: 'J.A.R.V.I.S.', val: run.jarvis },
                { name: 'Aura', val: run.aura },
                { name: 'F.R.I.D.A.Y.', val: run.boss },
                { name: 'Cash', val: run.cash },
                { name: 'Nova', val: run.forge },
                { name: 'Titan', val: run.titan }
              ];
              const slowest = timings.reduce((prev, curr) => prev.val > curr.val ? prev : curr);

              return (
                <div key={i} className="flex-1 flex flex-col items-center min-w-[50px] group relative h-full justify-end">
                  {/* Tooltip on Hover */}
                  <div className="absolute bottom-[calc(100%-8px)] left-1/2 -translate-x-1/2 z-20 hidden group-hover:flex flex-col bg-black border border-emerald-500/40 p-2.5 rounded-lg text-[9px] text-slate-200 whitespace-nowrap shadow-2xl font-mono text-left space-y-1">
                    <span className="text-[10px] font-bold text-white border-b border-emerald-950 pb-1 block mb-1">Run at {run.timestamp}</span>
                    <span className="flex justify-between gap-4"><span>Cortana:</span> <span className="text-purple-400 font-bold">{run.cortana.toFixed(1)}s</span></span>
                    <span className="flex justify-between gap-4"><span>J.A.R.V.I.S.:</span> <span className="text-blue-400 font-bold">{run.jarvis.toFixed(1)}s</span></span>
                    <span className="flex justify-between gap-4"><span>Aura:</span> <span className="text-pink-400 font-bold">{run.aura.toFixed(1)}s</span></span>
                    <span className="flex justify-between gap-4"><span>F.R.I.D.A.Y.:</span> <span className="text-amber-400 font-bold">{run.boss.toFixed(1)}s</span></span>
                    <span className="flex justify-between gap-4"><span>Cash:</span> <span className="text-emerald-400 font-bold">{run.cash.toFixed(1)}s</span></span>
                    <span className="flex justify-between gap-4"><span>Nova:</span> <span className="text-slate-400 font-bold">{run.forge.toFixed(1)}s</span></span>
                    <span className="flex justify-between gap-4"><span>Titan:</span> <span className="text-violet-400 font-bold">{run.titan.toFixed(1)}s</span></span>
                    <div className="border-t border-emerald-950 pt-1 mt-1 text-[8px] flex justify-between font-bold text-rose-400">
                      <span>BOTTLENECK:</span>
                      <span>{slowest.name} ({slowest.val.toFixed(1)}s)</span>
                    </div>
                  </div>

                  {/* Stacked bar container */}
                  <div className="w-6 sm:w-8 bg-emerald-950/15 rounded-t-md overflow-hidden flex flex-col justify-end border border-emerald-950/30 group-hover:border-emerald-500/40 transition-colors" style={{ height: `${chartHeight}px` }}>
                    <div className="w-full bg-[#8b5cf6]/85" style={{ height: `${hTitan}px` }} />
                    <div className="w-full bg-slate-500/85" style={{ height: `${hForge}px` }} />
                    <div className="w-full bg-[#10b981]/85" style={{ height: `${hCash}px` }} />
                    <div className="w-full bg-[#f59e0b]/85" style={{ height: `${hBoss}px` }} />
                    <div className="w-full bg-[#ec4899]/85" style={{ height: `${hAura}px` }} />
                    <div className="w-full bg-[#2563eb]/85" style={{ height: `${hJarvis}px` }} />
                    <div className="w-full bg-[#7c3aed]/85 animate-pulse" style={{ height: `${hCortana}px` }} />
                  </div>

                  {/* Label */}
                  <span className="text-[9px] text-emerald-500/60 font-mono mt-1.5 font-bold">{run.timestamp.split(':')[0]}:{run.timestamp.split(':')[1]}</span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-3.5 border-t border-emerald-950/40 text-[9px]">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-purple-500"></span><span className="text-emerald-500/80">Cortana</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-blue-500"></span><span className="text-emerald-500/80">J.A.R.V.I.S.</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-pink-500"></span><span className="text-emerald-500/80">Aura</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-amber-500"></span><span className="text-emerald-500/80">F.R.I.D.A.Y.</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-emerald-500"></span><span className="text-emerald-500/80">Cash</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-slate-400"></span><span className="text-emerald-500/80">Nova</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-violet-500"></span><span className="text-emerald-500/80">Titan</span></div>
          </div>
        </div>

        {/* Detailed Run Analysis */}
        <div className="p-4 rounded-xl border border-emerald-950/60 bg-[#080d0a]">
          <h4 className="font-semibold text-xs text-white mb-2.5 flex items-center gap-1.5">
            <Sliders size={13} className="text-emerald-400" />
            <span>Bottleneck Discovery Ledger</span>
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] font-mono">
              <thead>
                <tr className="border-b border-emerald-950 text-emerald-500/60 font-bold">
                  <th className="pb-2">RUN TIME</th>
                  <th className="pb-2">SLOWEST AGENT (BOTTLENECK)</th>
                  <th className="pb-2 text-right">TOTAL DURATION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/50">
                {timingsHistory.slice().reverse().map((run, i) => {
                  const total = run.cortana + run.jarvis + run.aura + run.boss + run.cash + run.forge + run.titan;
                  const timings = [
                    { name: 'Cortana (Orchestrator)', val: run.cortana, icon: '👑' },
                    { name: 'J.A.R.V.I.S. (Comms)', val: run.jarvis, icon: '💬' },
                    { name: 'Aura (Brand)', val: run.aura, icon: '📢' },
                    { name: 'F.R.I.D.A.Y. (Ops)', val: run.boss, icon: '📊' },
                    { name: 'Cash (Finance)', val: run.cash, icon: '💵' },
                    { name: 'Nova (Build)', val: run.forge, icon: '🛠️' },
                    { name: 'Titan (Strategy)', val: run.titan, icon: '🎯' }
                  ];
                  const slowest = timings.reduce((prev, curr) => prev.val > curr.val ? prev : curr);
                  
                  return (
                    <tr key={i} className="hover:bg-emerald-950/10">
                      <td className="py-2.5 text-slate-300 font-bold">{run.timestamp}</td>
                      <td className="py-2.5 flex items-center gap-1.5">
                        <span className="text-xs">{slowest.icon}</span>
                        <span className="text-rose-400 font-bold">{slowest.name}</span>
                        <span className="text-emerald-500/50">({slowest.val.toFixed(1)}s)</span>
                        {slowest.val > 3.0 && <span className="text-[9px] bg-rose-500/15 text-rose-400 px-1 py-0.5 rounded font-black border border-rose-500/20">🔥 Bottleneck</span>}
                      </td>
                      <td className="py-2.5 text-right font-black text-white">{total.toFixed(1)}s</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const addActivity = (agentName: string, agentColor: string, action: string) => {
    setActivityFeed(prev => [
      {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
        agentName: agentName.toUpperCase(),
        agentColor: agentColor || '#10b981',
        action: action,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev
    ].slice(0, 50));
  };

  const logEventToAthena = (title: string, summary: string, snippet: string, tags: string[]) => {
    const memoryEmbedding = getLocalEmbeddingVector(summary);
    const newMemoryItem: MemoryItem = {
      id: 'mem-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      title: title,
      summary: summary,
      snippet: snippet,
      tags: tags,
      embedding: memoryEmbedding,
      timestamp: new Date().toLocaleString(),
    };

    setMemories(prev => {
      const updated = [newMemoryItem, ...prev];
      fetch('/api/memory', {
        method: 'POST',
        body: JSON.stringify({ items: updated }),
        headers: { 'Content-Type': 'application/json' }
      }).catch(err => console.error('Error auto-writing log to Athena memory:', err));
      return updated;
    });
  };

  // Stop current active pipeline
  const stopPipelineOrchestration = () => {
    pipelineAbortedRef.current = true;
    setPipelineIsRunning(false);
    setAgents(prev => prev.map(a => a.status === 'thinking' ? { ...a, status: 'idle' } : a));
    setPipelineNodes(nodes => nodes.map(n => n.status === 'active' ? { ...n, status: 'pending' } : n));
    setMessages(prev => [...prev, {
      id: 'sys-stop-' + Date.now(),
      sender: 'system',
      text: '🛑 Pipeline orchestration stopped by user. Workspace state has been frozen.',
      timestamp: new Date().toLocaleTimeString(),
    }]);
  };

  // Run whole 7-agent pipeline orchestration step-by-step
  const startPipelineOrchestration = async (fromPhase?: string) => {
    const isEnabled = (id: AgentId) => {
      // Use latest agent status for delegation checks
      const agent = agents.find(a => a.id === id);
      return agent ? agent.enabled !== false : true;
    };

    const callAgent = async (agentId: AgentId, prompt: string): Promise<string> => {
      const systemInst = systemInstructions[agentId] || '';
      let activeModel = agentModels[agentId] || (engine === 'gemini' ? 'gemini-2.5-flash' : 'llama3.2');
      
      let finalPrompt = prompt;
      if (pipelineRefinements.current.length > 0) {
        finalPrompt += "\n\nCRITICAL USER REFINEMENTS (INJECTED MID-RUN):\n" + pipelineRefinements.current.map(r => "- " + r).join("\n");
      }
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine,
          model: activeModel,
          messages: [{ role: 'user', content: finalPrompt }],
          systemInstruction: systemInst,
          stream: false,
          ollamaUrl,
          cloudApiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`Agent ${agentId} call failed with HTTP ${response.status}`);
      }
      const data = await response.json();
      return data.text || '';
    };

    pipelineAbortedRef.current = false;
    let targetQuery = '';
    
    if (fromPhase) {
      targetQuery = currentQuery;
      setPipelineIsRunning(true);
      setRuntimeError(null);
      setFailedPhase(null);
    } else {
      if (!globalPrompt.trim()) return;
      if (pipelineIsRunning) {
        const promptText = globalPrompt;
        setGlobalPrompt('');
        pipelineRefinements.current.push(promptText);

        const feedbackMsgId = 'user-refine-' + Date.now();
        setMessages(prev => [...prev, {
          id: feedbackMsgId,
          sender: 'user',
          text: promptText,
          timestamp: new Date().toLocaleTimeString(),
        }, {
          id: 'sys-refine-' + Date.now(),
          sender: 'system',
          text: `⚡ Refinement received mid-run: "${promptText}". Live pipeline nodes will integrate this instruction.`,
          timestamp: new Date().toLocaleTimeString(),
        }]);
        return;
      }
      pipelineRefinements.current = [];
      targetQuery = globalPrompt;
      setCurrentQuery(targetQuery);
      setGlobalPrompt('');

      setAgentTimings({});
      setAgentTokens({});
      setFailedPhase(null);
      setNodeContexts({
        start: {
          input: targetQuery,
          output: `Extracted user intent for processing: "${targetQuery}"`,
          timestamp: new Date().toLocaleTimeString(),
          model: engine === 'gemini' ? 'Gemini Orchestrator' : 'Ollama Orchestrator'
        }
      });

      setPipelineIsRunning(true);
      setRuntimeError(null);
      setSelectedMemory(null);

      // Reset nodes to pending
      setPipelineNodes(nodes => nodes.map(n => ({ ...n, status: 'pending' })));
      setPipelineNodes(nodes => nodes.map(n => n.id === 'start' ? { ...n, status: 'completed' } : n));

      // Reset agent status
      setAgents(prev => prev.map(a => ({ ...a, status: 'idle' })));

      // Push initial user message
      const userMsgId = 'user-' + Date.now();
      const newUserMessage: Message = {
        id: userMsgId,
        sender: 'user',
        text: targetQuery,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, newUserMessage]);

      // --- Studio Media Generation Shortcut ---
      const lowerQuery = targetQuery.toLowerCase();
      const isImageQuery = lowerQuery.includes('generate image') || lowerQuery.includes('create image') || lowerQuery.includes('make an image') || lowerQuery.includes('generate a picture') || lowerQuery.includes('draw a') || lowerQuery.includes('generate photo') || lowerQuery.includes('create a photo') || lowerQuery.includes('imagen');
      const isVideoQuery = lowerQuery.includes('generate video') || lowerQuery.includes('create video') || lowerQuery.includes('make a video');
      const isVoiceQuery = lowerQuery.includes('generate voice') || lowerQuery.includes('generate audio') || lowerQuery.includes('text to speech') || lowerQuery.includes('create voice');

      if (isImageQuery || isVideoQuery || isVoiceQuery) {
        const type = isImageQuery ? 'image' : isVideoQuery ? 'video' : 'voice';
        try {
          setMessages(prev => [...prev, {
            id: 'sys-studio-' + Date.now(),
            sender: 'system',
            text: `🎨 **Media Studio Job Spawned!** Detected creative "${type}" command.\nRedirecting workspace focus to **Synthetic Media Studio** inside the Operations Hub to process your prompt: "${targetQuery}".`,
            timestamp: new Date().toLocaleTimeString(),
          }]);

          const res = await fetch('/api/studio/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type,
              prompt: targetQuery,
              model: studioModel,
              providerKey: cloudApiKey || undefined,
            }),
          });

          if (res.ok) {
            const newJob = await res.json();
            setStudioJobs(prev => [newJob, ...prev]);
          }

          setActiveTab('operations');
          setOpsSubTab('studio');
        } catch (err) {
          console.error('Failed to trigger studio job:', err);
        } finally {
          setPipelineIsRunning(false);
        }
        return;
      }
    }

    // Accumulators for run reports
    const agentReports: Record<string, string> = {};
    const individualTimings: Record<string, number> = {
      cortana: 0,
      jarvis: 0,
      aura: 0,
      boss: 0,
      cash: 0,
      forge: 0,
      titan: 0,
    };

    // Track state of current workspace variables
    let currentConversationContext = '';
    let memoryDuration = 0;
    let researcherDuration = 0;
    let plannerDuration = 0;
    let coderDuration = 0;
    let reviewerDuration = 0;

    // --- STEP 0: CORTANA ORCHESTRATION ---
    let selectedAgentsList = ['researcher', 'planner', 'coder', 'reviewer'];
    let cortanaRationale = 'Executing full-suite multi-agent system deployment pipeline.';
    let cortanaDuration = 0;

    if (pipelineAbortedRef.current) return;
    if (isEnabled('cortana')) {
      const cortanaStartTime = Date.now();
      setAgents(prev => prev.map(a => a.id === 'cortana' ? { ...a, status: 'thinking' } : a));
      setPipelineNodes(nodes => nodes.map(n => n.id === 'cortana' ? { ...n, status: 'active' } : n));

      const cortanaMsgId = 'cortana-' + Date.now();
      setMessages(prev => [...prev, {
        id: cortanaMsgId,
        sender: 'cortana',
        text: 'Analyzing request specifications and dynamically routing execution pipeline...',
        timestamp: new Date().toLocaleTimeString(),
        isStreaming: true,
      }]);

      try {
        const lowerQuery = targetQuery.toLowerCase();
        const isDirectCodeGen = 
          lowerQuery.includes('test to generate') ||
          lowerQuery.includes('generate code') ||
          lowerQuery.includes('code generation') ||
          lowerQuery.includes('upload card') ||
          lowerQuery.includes('shadcn') ||
          lowerQuery.includes('glassmorphism') ||
          lowerQuery.includes('create a component') ||
          lowerQuery.includes('build a component') ||
          lowerQuery.includes('react component') ||
          lowerQuery.includes('write code') ||
          (lowerQuery.includes('generate') && (lowerQuery.includes('card') || lowerQuery.includes('ui') || lowerQuery.includes('component') || lowerQuery.includes('code')));

        const cortanaPlan = await callAgent('cortana', `
          The user wants: "${targetQuery}"
          You are the orchestrator. Decide which agents should run and in which order.
          Available agents: researcher, planner, coder, reviewer

          CRITICAL RULES FOR SKIP OPTIMIZATION:
          1. If the user request is a direct request to generate, write, create, or build code, UI components, elements, cards, layouts (e.g. "generate code for a card", "glassmorphism", "shadcn", "build a React component", "create an upload card", etc.), you MUST bypass 'researcher' and 'planner'. Respond with ONLY:
             { "agents": ["coder", "reviewer"], "rationale": "Direct code generation request detected. Bypassing researcher and planner to assign task directly to Coder for faster execution." }
          2. If the task is purely conversational/informational (not building/coding), respond with: { "agents": ["researcher"], "rationale": "Conversational request." }
          3. Otherwise, use the standard complete development flow: { "agents": ["researcher", "planner", "coder", "reviewer"], "rationale": "Standard full-suite multi-agent execution." }

          Respond ONLY with valid JSON in this exact format:
          { "agents": ["coder", "reviewer"], "rationale": "..." }
        `);

        let cleanPlan = cortanaPlan.trim();
        if (cleanPlan.startsWith('```')) {
          cleanPlan = cleanPlan.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        }

        try {
          const parsed = JSON.parse(cleanPlan);
          if (parsed && Array.isArray(parsed.agents)) {
            selectedAgentsList = parsed.agents;
            cortanaRationale = parsed.rationale || cortanaRationale;
          }
        } catch (jsonErr) {
          console.error('Failed to parse Cortana plan JSON, using default agents:', jsonErr, 'Raw:', cortanaPlan);
        }

        // Force rule check fallback to guarantee smart orchestration bypass:
        if (isDirectCodeGen) {
          selectedAgentsList = selectedAgentsList.filter(agent => agent !== 'researcher' && agent !== 'planner');
          if (selectedAgentsList.length === 0) {
            selectedAgentsList = ['coder', 'reviewer'];
          }
          if (!cortanaRationale.toLowerCase().includes('bypass') && !cortanaRationale.toLowerCase().includes('direct')) {
            cortanaRationale = "Direct code generation pattern matched. Bypassed researcher and planner for accelerated delivery of UI assets.";
          }
        }

        setMessages(prev => prev.map(m => m.id === cortanaMsgId ? {
          ...m,
          text: `[Orchestrator Decision]\nSelected Path: [${selectedAgentsList.join(' → ')}]\nRationale: ${cortanaRationale}`,
          isStreaming: false,
          rawOutput: cortanaPlan
        } : m));

        setNodeContexts(prev => ({
          ...prev,
          cortana: {
            input: `Orchestrate: "${targetQuery}"`,
            output: `Selected Path: ${JSON.stringify(selectedAgentsList)}\nRationale: ${cortanaRationale}`,
            timestamp: new Date().toLocaleTimeString(),
            model: engine === 'gemini' ? 'gemini-2.5-flash' : 'llama3.2'
          }
        }));

        const durationStr = ((Date.now() - cortanaStartTime) / 1000).toFixed(1) + 's';
        cortanaDuration = parseFloat(((Date.now() - cortanaStartTime) / 1000).toFixed(1));
        setAgentTimings(prev => ({ ...prev, cortana: durationStr }));

        setAgents(prev => {
          const next = prev.map(a => a.id === 'cortana' ? { ...a, status: 'completed' as const, taskCount: a.taskCount + 1 } : a);
          const counts = next.reduce((acc, a) => ({ ...acc, [a.id]: a.taskCount }), {});
          localStorage.setItem('joelos_agent_task_counts', JSON.stringify(counts));
          return next;
        });
        setPipelineNodes(nodes => nodes.map(n => n.id === 'cortana' ? { ...n, status: 'completed' } : n));
        addActivity('Cortana', '#7c3aed', 'Completed orchestration plan design and task allocation.');
      } catch (err: any) {
        console.error('Cortana Agent fail:', err);
        setMessages(prev => prev.map(m => m.id === cortanaMsgId ? {
          ...m,
          text: `Orchestration plan initialized with defaults. Details: ${err.message || err}`,
          isStreaming: false
        } : m));
        setAgents(prev => prev.map(a => a.id === 'cortana' ? { ...a, status: 'completed' } : a));
        setPipelineNodes(nodes => nodes.map(n => n.id === 'cortana' ? { ...n, status: 'completed' } : n));
      }
    } else {
      setPipelineNodes(nodes => nodes.map(n => n.id === 'cortana' ? { ...n, status: 'skipped' } : n));
    }

    // --- STEP 1: SEMANTIC MEMORY RECALL ---
    if (pipelineAbortedRef.current) return;
    if (isEnabled('memory')) {
      const memoryStartTime = Date.now();
      setAgents(prev => prev.map(a => a.id === 'memory' ? { ...a, status: 'thinking' } : a));
      setPipelineNodes(nodes => nodes.map(n => n.id === 'memory' ? { ...n, status: 'active' } : n));

      try {
        let queryEmbedding: number[] = [];
        if (engine === 'gemini' && serverHealthy) {
          const res = await fetch('/api/embeddings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: targetQuery, engine: 'gemini' }),
          });
          const data = await res.json();
          if (data.embedding) queryEmbedding = data.embedding;
        }
        if (queryEmbedding.length === 0) {
          queryEmbedding = getLocalEmbeddingVector(targetQuery);
        }

        let topMatches: any[] = [];

        if (isVaultConfigured) {
          try {
            const searchRes = await fetch('/api/vault/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: targetQuery, limit: 3 })
            });
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              if (searchData.matches && searchData.matches.length > 0) {
                const loadedMatches = await Promise.all(searchData.matches.map(async (m: any) => {
                  try {
                    const noteRes = await fetch(`/api/vault/note?path=${encodeURIComponent(m.path)}`);
                    if (noteRes.ok) {
                      const noteData = await noteRes.json();
                      return {
                        id: m.path,
                        title: m.title,
                        summary: m.summary || noteData.content.substring(0, 150) + '...',
                        snippet: noteData.content.substring(0, 400),
                        tags: m.tags || [],
                        relevance: m.relevance
                      };
                    }
                  } catch (e) {
                    console.error('Error fetching full note for match:', m.path, e);
                  }
                  return {
                    id: m.path,
                    title: m.title,
                    summary: m.summary,
                    snippet: m.summary,
                    tags: m.tags || [],
                    relevance: m.relevance
                  };
                }));
                topMatches = loadedMatches.filter(m => (m.relevance || 0) > 0.1);
              }
            }
          } catch (err) {
            console.error('Obsidian semantic search failed, falling back to local memory:', err);
          }
        }

        if (topMatches.length === 0) {
          const scored = memories.map(item => {
            const itemEmbedding = item.embedding || getLocalEmbeddingVector(item.title + ' ' + item.summary + ' ' + item.snippet);
            return { ...item, relevance: calculateCosineSimilarity(queryEmbedding, itemEmbedding) };
          });
          topMatches = scored
            .filter(item => (item.relevance || 0) > 0.1)
            .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
            .slice(0, 3);
        }

        if (topMatches.length > 0) {
          currentConversationContext = `[RECALLED CONTEXT FROM MEMORY DATABASE]\n` + topMatches.map((m, idx) => `Match #${idx + 1} (${m.title}):\n${m.summary}\nCode Snippet:\n${m.snippet}`).join('\n\n');
          setSelectedMemory(topMatches[0]);
          setMatchedMemories(topMatches);
          
          setMessages(prev => [...prev, {
            id: 'sys-' + Date.now(),
            sender: 'memory',
            text: `Found ${topMatches.length} relevant historical memory frames. Injecting context into the pipeline: ` + topMatches.map(m => `"${m.title}"`).join(', '),
            timestamp: new Date().toLocaleTimeString(),
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: 'sys-' + Date.now(),
            sender: 'memory',
            text: `No high-relevance memories matched current query context. Running fresh pipeline.`,
            timestamp: new Date().toLocaleTimeString(),
          }]);
        }

        const duration = ((Date.now() - memoryStartTime) / 1000).toFixed(1) + 's';
        memoryDuration = parseFloat(((Date.now() - memoryStartTime) / 1000).toFixed(1));
        setNodeContexts(prev => ({
          ...prev,
          memory: {
            input: `Recall query context: "${targetQuery}"`,
            output: topMatches.length > 0
              ? `Found ${topMatches.length} matching semantic memories:\n` + topMatches.map(m => `• [${((m.relevance || 0)*100).toFixed(0)}% Match] ${m.title} - ${m.summary}`).join('\n')
              : 'No historical workspace records matched the target query threshold. Proceeding with fresh setup.',
            timestamp: new Date().toLocaleTimeString(),
            model: 'Semantic Vector Matcher'
          }
        }));
        setAgentTimings(prev => ({ ...prev, memory: duration }));
        setAgents(prev => {
          const next = prev.map(a => a.id === 'memory' ? { ...a, status: 'completed' as const, taskCount: a.taskCount + 1 } : a);
          const counts = next.reduce((acc, a) => ({ ...acc, [a.id]: a.taskCount }), {});
          localStorage.setItem('joelos_agent_task_counts', JSON.stringify(counts));
          return next;
        });
        setPipelineNodes(nodes => nodes.map(n => n.id === 'memory' ? { ...n, status: 'completed' } : n));
        addActivity('Athena', '#10b981', 'Completed semantic memory retrieval and brain ledger linkage.');
      } catch (err: any) {
        console.error('Memory Agent fail:', err);
        setNodeContexts(prev => ({
          ...prev,
          memory: {
            input: `Recall query context: "${targetQuery}"`,
            output: `ERROR: ${err.message || err}`,
            timestamp: new Date().toLocaleTimeString(),
            model: 'Semantic Vector Matcher'
          }
        }));
        setFailedPhase('memory');
        setAgents(prev => prev.map(a => a.id === 'memory' ? { ...a, status: 'error' } : a));
        setPipelineNodes(nodes => nodes.map(n => n.id === 'memory' ? { ...n, status: 'error' } : n));
        setPipelineIsRunning(false);
        return;
      }
    } else {
      setPipelineNodes(nodes => nodes.map(n => n.id === 'memory' ? { ...n, status: 'skipped' } : n));
    }

    // --- STEP 2: RESEARCHER AGENT ---
    if (pipelineAbortedRef.current) return;
    let latestResearcherContext = researcherContext;
    if (!fromPhase || fromPhase === 'memory' || fromPhase === 'researcher') {
      if (isEnabled('researcher') && selectedAgentsList.includes('researcher')) {
        const researcherStartTime = Date.now();
        setAgents(prev => prev.map(a => a.id === 'researcher' ? { ...a, status: 'thinking' } : a));
        setPipelineNodes(nodes => nodes.map(n => n.id === 'researcher' ? { ...n, status: 'active' } : n));

      const researcherMsgId = 'researcher-' + Date.now();
      setMessages(prev => [...prev, {
        id: researcherMsgId,
        sender: 'researcher',
        text: 'Querying technical indices and aggregating resources...',
        timestamp: new Date().toLocaleTimeString(),
        isStreaming: true,
      }]);

      try {
        const activeModel = engine === 'gemini' ? 'gemini-2.5-flash' : agentModels.researcher;
        const researchPrompt = `Review this query and find technical facts, API specs, or code guidelines. User goal: "${targetQuery}".\n${currentConversationContext ? `Historical memories found:\n${currentConversationContext}` : ''}`;
        
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            engine,
            model: activeModel,
            messages: [{ role: 'user', content: researchPrompt }],
            systemInstruction: systemInstructions.researcher,
            ollamaUrl,
            cloudApiKey,
            enableSearch: engine === 'gemini' && searchGrounding,
          }),
        });

        if (!response.ok) {
          throw new Error(`Researcher agent backend returned HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let streamBuffer = '';
        latestResearcherContext = '';

        if (reader) {
          while (true) {
            if (pipelineAbortedRef.current) {
              await reader.cancel();
              return;
            }
            const { done, value } = await reader.read();
            if (done) break;
            streamBuffer += decoder.decode(value, { stream: true });
            const lines = streamBuffer.split('\n');
            streamBuffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim() || !line.startsWith('data: ')) continue;
              
              let data: any;
              try {
                data = JSON.parse(line.slice(6));
              } catch (e) {
                console.error('SSE Parse Error', e);
                continue;
              }

              if (data.error) {
                throw new Error(data.error);
              }

              const text = data.text || '';
              latestResearcherContext += text;

              // Handle token tracking from server
              if (data.eval_count || data.prompt_eval_count) {
                const promptTokens = data.prompt_eval_count || 0;
                const evalTokens = data.eval_count || 0;
                const total = promptTokens + evalTokens;
                if (total > 0) {
                  setAgentTokens(prev => ({ ...prev, researcher: total }));
                  setSessionTokens(prev => prev + total);
                }
              }

              setMessages(prev => prev.map(m => m.id === researcherMsgId ? { ...m, text: latestResearcherContext } : m));
            }
          }
        }
        
        // Gemini estimated token tracking fallback
        if (engine === 'gemini' && latestResearcherContext) {
          const estimatedTokens = Math.ceil(latestResearcherContext.length / 3.8);
          setAgentTokens(prev => ({ ...prev, researcher: estimatedTokens }));
          setSessionTokens(prev => prev + estimatedTokens);
        }

        setResearcherContext(latestResearcherContext);
        setNodeContexts(prev => ({
          ...prev,
          researcher: {
            input: `Research and fact check: "${targetQuery}"`,
            output: latestResearcherContext || 'No context returned from source index.',
            timestamp: new Date().toLocaleTimeString(),
            model: engine === 'gemini' ? 'gemini-2.5-flash' : agentModels.researcher
          }
        }));
        const duration = ((Date.now() - researcherStartTime) / 1000).toFixed(1) + 's';
        researcherDuration = parseFloat(((Date.now() - researcherStartTime) / 1000).toFixed(1));
        setAgentTimings(prev => ({ ...prev, researcher: duration }));
        setMessages(prev => prev.map(m => m.id === researcherMsgId ? { ...m, isStreaming: false, rawOutput: latestResearcherContext } : m));
        saveAgentOutputToVault('researcher', `Web research compiler for: "${targetQuery}"`, latestResearcherContext);
        setAgents(prev => {
          const next = prev.map(a => a.id === 'researcher' ? { ...a, status: 'completed' as const, taskCount: a.taskCount + 1 } : a);
          const counts = next.reduce((acc, a) => ({ ...acc, [a.id]: a.taskCount }), {});
          localStorage.setItem('joelos_agent_task_counts', JSON.stringify(counts));
          return next;
        });
        setPipelineNodes(nodes => nodes.map(n => n.id === 'researcher' ? { ...n, status: 'completed' } : n));
        addActivity('Researcher', '#3b82f6', 'Completed domain specifications analysis and web research compilation.');

      } catch (err: any) {
        console.error('Researcher fail:', err);
        setNodeContexts(prev => ({
          ...prev,
          researcher: {
            input: `Research and fact check: "${targetQuery}"`,
            output: `ERROR: ${err.message || err}`,
            timestamp: new Date().toLocaleTimeString(),
            model: engine === 'gemini' ? 'gemini-2.5-flash' : agentModels.researcher
          }
        }));
        setFailedPhase('researcher');
        setRuntimeError(`Researcher Agent encountered an issue: ${err.message}`);
        setMessages(prev => prev.map(m => m.id === researcherMsgId ? { ...m, text: `Research lookup paused: ${err.message}`, isStreaming: false } : m));
        setAgents(prev => prev.map(a => a.id === 'researcher' ? { ...a, status: 'error' } : a));
        setPipelineNodes(nodes => nodes.map(n => n.id === 'researcher' ? { ...n, status: 'error' } : n));
        setPipelineIsRunning(false);
        return;
      }
      } else {
        setPipelineNodes(nodes => nodes.map(n => n.id === 'researcher' ? { ...n, status: 'skipped' } : n));
      }
    }

    // --- STEP 3: PLANNER AGENT ---
    if (pipelineAbortedRef.current) return;
    let latestPlannerOutputText = plannerOutputText;
    if (!fromPhase || fromPhase === 'memory' || fromPhase === 'researcher' || fromPhase === 'planner') {
      if (isEnabled('planner') && selectedAgentsList.includes('planner')) {
        const plannerStartTime = Date.now();
        setAgents(prev => prev.map(a => a.id === 'planner' ? { ...a, status: 'thinking' } : a));
        setPipelineNodes(nodes => nodes.map(n => n.id === 'planner' ? { ...n, status: 'active' } : n));

      const plannerMsgId = 'planner-' + Date.now();
      setMessages(prev => [...prev, {
        id: plannerMsgId,
        sender: 'planner',
        text: 'Drafting architecture blueprints and planning execution tasks...',
        timestamp: new Date().toLocaleTimeString(),
        isStreaming: true,
      }]);

      try {
        const activeModel = engine === 'gemini' ? 'gemini-2.5-flash' : agentModels.planner;
        const plannerPrompt = `Formulate a complete step-by-step non-coding architectural plan to satisfy this user goal: "${targetQuery}".\nUse this research analysis as backing guidelines:\n${latestResearcherContext}\n${currentConversationContext ? `Historical memory guidelines:\n${currentConversationContext}` : ''}`;

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            engine,
            model: activeModel,
            messages: [{ role: 'user', content: plannerPrompt }],
            systemInstruction: systemInstructions.planner,
            ollamaUrl,
            cloudApiKey,
          }),
        });

        if (!response.ok) {
          throw new Error(`Planner agent backend returned HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let streamBuffer = '';
        latestPlannerOutputText = '';

        if (reader) {
          while (true) {
            if (pipelineAbortedRef.current) {
              await reader.cancel();
              return;
            }
            const { done, value } = await reader.read();
            if (done) break;
            streamBuffer += decoder.decode(value, { stream: true });
            const lines = streamBuffer.split('\n');
            streamBuffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim() || !line.startsWith('data: ')) continue;
              
              let data: any;
              try {
                data = JSON.parse(line.slice(6));
              } catch (e) {
                console.error('SSE Parse Error', e);
                continue;
              }

              if (data.error) {
                throw new Error(data.error);
              }

              const text = data.text || '';
              latestPlannerOutputText += text;

              // Handle token tracking from server
              if (data.eval_count || data.prompt_eval_count) {
                const promptTokens = data.prompt_eval_count || 0;
                const evalTokens = data.eval_count || 0;
                const total = promptTokens + evalTokens;
                if (total > 0) {
                  setAgentTokens(prev => ({ ...prev, planner: total }));
                  setSessionTokens(prev => prev + total);
                }
              }

              setMessages(prev => prev.map(m => m.id === plannerMsgId ? { ...m, text: latestPlannerOutputText } : m));
            }
          }
        }

        // Gemini token estimation fallback
        if (engine === 'gemini' && latestPlannerOutputText) {
          const estimatedTokens = Math.ceil(latestPlannerOutputText.length / 3.8);
          setAgentTokens(prev => ({ ...prev, planner: estimatedTokens }));
          setSessionTokens(prev => prev + estimatedTokens);
        }

        setPlannerOutputText(latestPlannerOutputText);
        setNodeContexts(prev => ({
          ...prev,
          planner: {
            input: `Draft task blueprint plan for user goal: "${targetQuery}"`,
            output: latestPlannerOutputText || 'No architectural plan output.',
            timestamp: new Date().toLocaleTimeString(),
            model: engine === 'gemini' ? 'gemini-2.5-flash' : agentModels.planner
          }
        }));
        const duration = ((Date.now() - plannerStartTime) / 1000).toFixed(1) + 's';
        plannerDuration = parseFloat(((Date.now() - plannerStartTime) / 1000).toFixed(1));
        setAgentTimings(prev => ({ ...prev, planner: duration }));
        setMessages(prev => prev.map(m => m.id === plannerMsgId ? { ...m, isStreaming: false, rawOutput: latestPlannerOutputText } : m));
        saveAgentOutputToVault('planner', `Architectural blueprint plan for user goal: "${targetQuery}"`, latestPlannerOutputText);
        setAgents(prev => {
          const next = prev.map(a => a.id === 'planner' ? { ...a, status: 'completed' as const, taskCount: a.taskCount + 1 } : a);
          const counts = next.reduce((acc, a) => ({ ...acc, [a.id]: a.taskCount }), {});
          localStorage.setItem('joelos_agent_task_counts', JSON.stringify(counts));
          return next;
        });
        setPipelineNodes(nodes => nodes.map(n => n.id === 'planner' ? { ...n, status: 'completed' } : n));
        addActivity('Planner', '#f59e0b', 'Completed visual wireframes planning and component dependency structure.');

      } catch (err: any) {
        console.error('Planner fail:', err);
        setNodeContexts(prev => ({
          ...prev,
          planner: {
            input: `Draft task blueprint plan for user goal: "${targetQuery}"`,
            output: `ERROR: ${err.message || err}`,
            timestamp: new Date().toLocaleTimeString(),
            model: engine === 'gemini' ? 'gemini-2.5-flash' : agentModels.planner
          }
        }));
        setFailedPhase('planner');
        setRuntimeError(`Planner Agent failed: ${err.message}`);
        setMessages(prev => prev.map(m => m.id === plannerMsgId ? { ...m, text: `Blueprint drafting paused: ${err.message}`, isStreaming: false } : m));
        setAgents(prev => prev.map(a => a.id === 'planner' ? { ...a, status: 'error' } : a));
        setPipelineNodes(nodes => nodes.map(n => n.id === 'planner' ? { ...n, status: 'error' } : n));
        setPipelineIsRunning(false);
        return;
      }
      } else {
        setPipelineNodes(nodes => nodes.map(n => n.id === 'planner' ? { ...n, status: 'skipped' } : n));
      }
    }

    // --- STEP 4: CODER AGENT ---
    if (pipelineAbortedRef.current) return;
    let latestCoderOutputText = coderOutputText;
    if (!fromPhase || fromPhase === 'memory' || fromPhase === 'researcher' || fromPhase === 'planner' || fromPhase === 'coder') {
      if (isEnabled('coder') && selectedAgentsList.includes('coder')) {
        const coderStartTime = Date.now();
        setAgents(prev => prev.map(a => a.id === 'coder' ? { ...a, status: 'thinking' } : a));
        setPipelineNodes(nodes => nodes.map(n => n.id === 'coder' ? { ...n, status: 'active' } : n));

      const coderMsgId = 'coder-' + Date.now();
      setMessages(prev => [...prev, {
        id: coderMsgId,
        sender: 'coder',
        text: 'Developing complete codebase implementation...',
        timestamp: new Date().toLocaleTimeString(),
        isStreaming: true,
        previousRawOutput: coderOutputText
      }]);

      try {
        const activeModel = engine === 'gemini' ? 'gemini-2.5-pro' : agentModels.coder;
        const coderPrompt = `Review this architectural blueprint plan and write high-quality production-ready implementations:\n${latestPlannerOutputText}`;

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            engine,
            model: activeModel,
            messages: [{ role: 'user', content: coderPrompt }],
            systemInstruction: systemInstructions.coder,
            ollamaUrl,
            cloudApiKey,
          }),
        });

        if (!response.ok) {
          throw new Error(`Coder agent backend returned HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let streamBuffer = '';
        latestCoderOutputText = '';

        if (reader) {
          while (true) {
            if (pipelineAbortedRef.current) {
              await reader.cancel();
              return;
            }
            const { done, value } = await reader.read();
            if (done) break;
            streamBuffer += decoder.decode(value, { stream: true });
            const lines = streamBuffer.split('\n');
            streamBuffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim() || !line.startsWith('data: ')) continue;
              
              let data: any;
              try {
                data = JSON.parse(line.slice(6));
              } catch (e) {
                console.error('SSE Parse Error', e);
                continue;
              }

              if (data.error) {
                throw new Error(data.error);
              }

              const text = data.text || '';
              latestCoderOutputText += text;

              // Handle token tracking from server
              if (data.eval_count || data.prompt_eval_count) {
                const promptTokens = data.prompt_eval_count || 0;
                const evalTokens = data.eval_count || 0;
                const total = promptTokens + evalTokens;
                if (total > 0) {
                  setAgentTokens(prev => ({ ...prev, coder: total }));
                  setSessionTokens(prev => prev + total);
                }
              }

              setMessages(prev => prev.map(m => m.id === coderMsgId ? { ...m, text: latestCoderOutputText } : m));
            }
          }
        }

        // Gemini token estimation fallback
        if (engine === 'gemini' && latestCoderOutputText) {
          const estimatedTokens = Math.ceil(latestCoderOutputText.length / 3.8);
          setAgentTokens(prev => ({ ...prev, coder: estimatedTokens }));
          setSessionTokens(prev => prev + estimatedTokens);
        }

        setCoderOutputText(latestCoderOutputText);
        setNodeContexts(prev => ({
          ...prev,
          coder: {
            input: 'Compile and construct production-ready source code files matching architectural blueprint.',
            output: latestCoderOutputText || 'No source code output returned.',
            timestamp: new Date().toLocaleTimeString(),
            model: engine === 'gemini' ? 'gemini-2.5-pro' : agentModels.coder
          }
        }));
        const duration = ((Date.now() - coderStartTime) / 1000).toFixed(1) + 's';
        coderDuration = parseFloat(((Date.now() - coderStartTime) / 1000).toFixed(1));
        setAgentTimings(prev => ({ ...prev, coder: duration }));
        setMessages(prev => prev.map(m => m.id === coderMsgId ? { ...m, isStreaming: false, rawOutput: latestCoderOutputText, previousRawOutput: coderOutputText } : m));
        saveAgentOutputToVault('coder', `Production source code implementation for user goal: "${targetQuery}"`, latestCoderOutputText);
        setAgents(prev => {
          const next = prev.map(a => a.id === 'coder' ? { ...a, status: 'completed' as const, taskCount: a.taskCount + 1 } : a);
          const counts = next.reduce((acc, a) => ({ ...acc, [a.id]: a.taskCount }), {});
          localStorage.setItem('joelos_agent_task_counts', JSON.stringify(counts));
          return next;
        });
        setPipelineNodes(nodes => nodes.map(n => n.id === 'coder' ? { ...n, status: 'completed' } : n));
        addActivity('Coder', '#10b981', 'Completed module code writing and technical specifications assembly.');

      } catch (err: any) {
        console.error('Coder fail:', err);
        setNodeContexts(prev => ({
          ...prev,
          coder: {
            input: 'Compile and construct production-ready source code files matching architectural blueprint.',
            output: `ERROR: ${err.message || err}`,
            timestamp: new Date().toLocaleTimeString(),
            model: engine === 'gemini' ? 'gemini-2.5-pro' : agentModels.coder
          }
        }));
        setFailedPhase('coder');
        setRuntimeError(`Coder Agent failed: ${err.message}`);
        setMessages(prev => prev.map(m => m.id === coderMsgId ? { ...m, text: `Coding paused: ${err.message}`, isStreaming: false } : m));
        setAgents(prev => prev.map(a => a.id === 'coder' ? { ...a, status: 'error' } : a));
        setPipelineNodes(nodes => nodes.map(n => n.id === 'coder' ? { ...n, status: 'error' } : n));
        setPipelineIsRunning(false);
        return;
      }
      } else {
        setPipelineNodes(nodes => nodes.map(n => n.id === 'coder' ? { ...n, status: 'skipped' } : n));
      }
    }

    // --- STEP 5: REVIEWER AGENT ---
    if (pipelineAbortedRef.current) return;
    let latestReviewerOutputText = reviewerOutputText;
    if (!fromPhase || fromPhase === 'memory' || fromPhase === 'researcher' || fromPhase === 'planner' || fromPhase === 'coder' || fromPhase === 'reviewer') {
      if (isEnabled('reviewer') && selectedAgentsList.includes('reviewer')) {
        const reviewerStartTime = Date.now();
        setAgents(prev => prev.map(a => a.id === 'reviewer' ? { ...a, status: 'thinking' } : a));
        setPipelineNodes(nodes => nodes.map(n => n.id === 'reviewer' ? { ...n, status: 'active' } : n));

      const reviewerMsgId = 'reviewer-' + Date.now();
      setMessages(prev => [...prev, {
        id: reviewerMsgId,
        sender: 'reviewer',
        text: 'Auditing code implementations for security compliance, syntax and efficiency...',
        timestamp: new Date().toLocaleTimeString(),
        isStreaming: true,
      }]);

      try {
        const activeModel = engine === 'gemini' ? 'gemini-2.5-flash' : agentModels.reviewer;
        const reviewerPrompt = `Analyze this developed code implementation for potential security vulnerabilities, performance bottlenecks, and architectural violations:\n${latestCoderOutputText}`;

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            engine,
            model: activeModel,
            messages: [{ role: 'user', content: reviewerPrompt }],
            systemInstruction: systemInstructions.reviewer,
            ollamaUrl,
            cloudApiKey,
          }),
        });

        if (!response.ok) {
          throw new Error(`Reviewer agent backend returned HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let streamBuffer = '';
        latestReviewerOutputText = '';

        if (reader) {
          while (true) {
            if (pipelineAbortedRef.current) {
              await reader.cancel();
              return;
            }
            const { done, value } = await reader.read();
            if (done) break;
            streamBuffer += decoder.decode(value, { stream: true });
            const lines = streamBuffer.split('\n');
            streamBuffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim() || !line.startsWith('data: ')) continue;
              
              let data: any;
              try {
                data = JSON.parse(line.slice(6));
              } catch (e) {
                console.error('SSE Parse Error', e);
                continue;
              }

              if (data.error) {
                throw new Error(data.error);
              }

              const text = data.text || '';
              latestReviewerOutputText += text;

              // Handle token tracking from server
              if (data.eval_count || data.prompt_eval_count) {
                const promptTokens = data.prompt_eval_count || 0;
                const evalTokens = data.eval_count || 0;
                const total = promptTokens + evalTokens;
                if (total > 0) {
                  setAgentTokens(prev => ({ ...prev, reviewer: total }));
                  setSessionTokens(prev => prev + total);
                }
              }

              setMessages(prev => prev.map(m => m.id === reviewerMsgId ? { ...m, text: latestReviewerOutputText } : m));
            }
          }
        }

        // Gemini token estimation fallback
        if (engine === 'gemini' && latestReviewerOutputText) {
          const estimatedTokens = Math.ceil(latestReviewerOutputText.length / 3.8);
          setAgentTokens(prev => ({ ...prev, reviewer: estimatedTokens }));
          setSessionTokens(prev => prev + estimatedTokens);
        }

        setReviewerOutputText(latestReviewerOutputText);
        setNodeContexts(prev => ({
          ...prev,
          reviewer: {
            input: 'Audit codebase implementation structures against quality, security and performance standards.',
            output: latestReviewerOutputText || 'No review audit feedback returned.',
            timestamp: new Date().toLocaleTimeString(),
            model: engine === 'gemini' ? 'gemini-2.5-flash' : agentModels.reviewer
          }
        }));
        const duration = ((Date.now() - reviewerStartTime) / 1000).toFixed(1) + 's';
        reviewerDuration = parseFloat(((Date.now() - reviewerStartTime) / 1000).toFixed(1));
        setAgentTimings(prev => ({ ...prev, reviewer: duration }));
        setMessages(prev => prev.map(m => m.id === reviewerMsgId ? { ...m, isStreaming: false, rawOutput: latestReviewerOutputText } : m));
        saveAgentOutputToVault('reviewer', `Syntax and quality audit review for user goal: "${targetQuery}"`, latestReviewerOutputText);
        setAgents(prev => {
          const next = prev.map(a => a.id === 'reviewer' ? { ...a, status: 'completed' as const, taskCount: a.taskCount + 1 } : a);
          const counts = next.reduce((acc, a) => ({ ...acc, [a.id]: a.taskCount }), {});
          localStorage.setItem('joelos_agent_task_counts', JSON.stringify(counts));
          return next;
        });
        setPipelineNodes(nodes => nodes.map(n => n.id === 'reviewer' ? { ...n, status: 'completed' } : n));
        addActivity('Reviewer', '#ef4444', 'Completed syntax check, code logic validation, and quality audit.');

      } catch (err: any) {
        console.error('Reviewer fail:', err);
        setNodeContexts(prev => ({
          ...prev,
          reviewer: {
            input: 'Audit codebase implementation structures against quality, security and performance standards.',
            output: `ERROR: ${err.message || err}`,
            timestamp: new Date().toLocaleTimeString(),
            model: engine === 'gemini' ? 'gemini-2.5-flash' : agentModels.reviewer
          }
        }));
        setFailedPhase('reviewer');
        setRuntimeError(`Reviewer Agent failed: ${err.message}`);
        setMessages(prev => prev.map(m => m.id === reviewerMsgId ? { ...m, text: `Audit paused: ${err.message}`, isStreaming: false } : m));
        setAgents(prev => prev.map(a => a.id === 'reviewer' ? { ...a, status: 'error' } : a));
        setPipelineNodes(nodes => nodes.map(n => n.id === 'reviewer' ? { ...n, status: 'error' } : n));
        setPipelineIsRunning(false);
        return;
      }
      } else {
        setPipelineNodes(nodes => nodes.map(n => n.id === 'reviewer' ? { ...n, status: 'skipped' } : n));
      }
    }

    // --- STEP 6: ORCHESTRATION COMPLETE & MEMORY DEPOSIT ---
    try {
      const cleanSummary = `Goal: ${targetQuery}. Executed a full agent collaboration pipeline: research summary created, structured blueprint mapped, full modules built and code successfully audited.`;

      let memoryEmbedding: number[] = [];
      if (engine === 'gemini' && serverHealthy) {
        const res = await fetch('/api/embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanSummary, engine: 'gemini' }),
        });
        const data = await res.json();
        if (data.embedding) memoryEmbedding = data.embedding;
      }
      if (memoryEmbedding.length === 0) {
        memoryEmbedding = getLocalEmbeddingVector(cleanSummary);
      }

      const newMemoryItem: MemoryItem = {
        id: 'mem-' + Date.now(),
        title: targetQuery.length > 40 ? targetQuery.substring(0, 38) + '...' : targetQuery,
        summary: cleanSummary,
        snippet: latestCoderOutputText.substring(0, 250) + '...',
        tags: ['pipeline-run', engine, new Date().getFullYear().toString()],
        embedding: memoryEmbedding,
        timestamp: new Date().toLocaleString(),
      };

      const updatedMemories = [newMemoryItem, ...memories];
      setMemories(updatedMemories);

      if (isVaultConfigured && autoWriteOutputs) {
        const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `JoelOS/memory_${timestampStr}.md`;
        const frontmatter = {
          agent: 'memory',
          title: newMemoryItem.title,
          summary: newMemoryItem.summary,
          timestamp: new Date().toISOString(),
          tags: [...newMemoryItem.tags, 'memory', 'joelos']
        };
        fetch('/api/vault/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: filename,
            content: `Summary: ${newMemoryItem.summary}\n\nCode Snippet:\n\`\`\`\n${newMemoryItem.snippet}\n\`\`\``,
            frontmatter
          })
        }).catch(err => console.error('Error auto-writing memory to vault:', err));
      }

      fetch('/api/memory', {
        method: 'POST',
        body: JSON.stringify({ items: updatedMemories }),
        headers: { 'Content-Type': 'application/json' }
      }).catch(err => console.error('Error saving memories:', err));
      
      setNodeContexts(prev => ({
        ...prev,
        output: {
          input: 'Aggregate audited codebase blocks and finalize release deliverables.',
          output: `Successfully compiled final codebase artifacts. Generated and saved new memory vector block to server-side storage (Ledger Item ID: mem-${Date.now()}).`,
          timestamp: new Date().toLocaleTimeString(),
          model: 'JoelOS Synthesizer'
        }
      }));

      if (!memorySearchQuery) {
        setMatchedMemories(updatedMemories.slice(0, 10));
      }

      // Add positive final feedback message
      setMessages(prev => [...prev, {
        id: 'final-' + Date.now(),
        sender: 'system',
        text: `### 🚀 JoelOS Workspace Executed Successfully!\n\nThe multi-agent collaboration pipeline has completed all objectives. The resulting workspace details and codebase index are saved to the memory vector ledger.`,
        timestamp: new Date().toLocaleTimeString(),
      }]);

      // --- Sandbox Auto-Hook Trigger ---
      if (selectedAgentsList.includes('coder') && latestCoderOutputText) {
        const isCodeContent = latestCoderOutputText.includes('```tsx') || 
                             latestCoderOutputText.includes('```jsx') || 
                             latestCoderOutputText.includes('```html') || 
                             latestCoderOutputText.includes('import React') ||
                             latestCoderOutputText.includes('export default');
                             
        if (isCodeContent) {
          try {
            const rawCode = latestCoderOutputText;
            const codeBlocks: string[] = [];
            const regex = /```(?:tsx|jsx|javascript|typescript|html|css)?\n([\s\S]*?)```/g;
            let match;
            while ((match = regex.exec(rawCode)) !== null) {
              codeBlocks.push(match[1]);
            }
            
            let finalCode = codeBlocks[0] || rawCode;
            
            if (!finalCode.trim().startsWith('import') && !finalCode.includes('export default')) {
              finalCode = `import React from 'react';\n\nexport default function App() {\n  return (\n    <div className="p-6 bg-[#020503] text-emerald-100 rounded-xl border border-emerald-900/30">\n      ${finalCode}\n    </div>\n  );\n}`;
            }

            const projName = `sandbox-${targetQuery.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 20)}`;
            
            setMessages(prev => [...prev, {
              id: 'sys-sandbox-' + Date.now(),
              sender: 'system',
              text: `⚡ **Live Sandboxing Engaged!** Automatically deploying your generated component code to the **Virtual Sandbox DECK** for interactive visual testing.`,
              timestamp: new Date().toLocaleTimeString(),
            }]);

            const response = await fetch('/api/sandbox/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: projName,
                source: `JoelOS Pipeline: "${targetQuery}"`,
                files: {
                  'App.tsx': finalCode,
                },
              }),
            });

            if (response.ok) {
              const newProject = await response.json();
              setSandboxProjects(prev => [newProject, ...prev]);
              setActiveSandboxProjId(newProject.id);
              
              setActiveTab('operations');
              setOpsSubTab('sandbox');
            }
          } catch (sandboxErr) {
            console.error('Failed to auto-register sandbox project:', sandboxErr);
          }
        }
      }

      setPipelineNodes(nodes => nodes.map(n => n.id === 'output' ? { ...n, status: 'completed' } : n));
      addActivity('System', '#10b981', 'Entire collaborative pipeline executed successfully.');
      logEventToAthena(
        `Pipeline Completed: ${targetQuery.length > 30 ? targetQuery.substring(0, 28) + '...' : targetQuery}`,
        `Collaborative Pipeline executed successfully for target query: "${targetQuery}". New software specifications generated.`,
        `Query: ${targetQuery}\nEngine: ${engine}\nTime: ${new Date().toLocaleTimeString()}`,
        ['pipeline-success', 'system-log']
      );
      
      // Save timing data point to history state and local storage
      const newTimingData = {
        timestamp: new Date().toLocaleTimeString(),
        cortana: memoryDuration || 0.4,
        jarvis: researcherDuration * 0.4 || 0.5,
        aura: plannerDuration * 0.5 || 0.6,
        boss: plannerDuration * 0.5 || 0.7,
        cash: reviewerDuration * 0.3 || 0.5,
        forge: coderDuration || 2.8,
        titan: researcherDuration * 0.6 || 0.9,
      };
      setTimingsHistory(prev => {
        const updated = [...prev, newTimingData];
        const sliced = updated.slice(-15);
        localStorage.setItem('joelos_timings_history', JSON.stringify(sliced));
        return sliced;
      });

      // Play completion audio chime
      playCompletionSound();

    } catch (e) {
      console.error('Failed to commit pipeline run to memory store:', e);
    } finally {
      setPipelineIsRunning(false);
    }
  };

  // Helper to format code blocks and messages cleanly
  const renderMessageContent = (msg: Message) => {
    const text = msg.text;
    
    // Check if the message is system
    if (msg.sender === 'system') {
      return (
        <div className="text-sm text-emerald-200/90 leading-relaxed font-mono bg-emerald-950/15 border border-emerald-500/20 rounded-xl p-4">
          {text.split('\n').map((para, i) => (
            <p key={i} className="mb-2 last:mb-0">{para}</p>
          ))}
        </div>
      );
    }

    if (msg.sender === 'memory') {
      return (
        <div className="text-xs font-mono text-emerald-400 leading-normal bg-emerald-950/10 border border-emerald-500/10 rounded-xl p-3.5 flex items-start gap-2.5">
          <Database size={14} className="mt-0.5 text-emerald-500 shrink-0" />
          <div className="flex-1">{text}</div>
        </div>
      );
    }

    if (msg.sender === 'coder' && msg.previousRawOutput) {
      return <CodeDiffViewer oldCode={msg.previousRawOutput} newCode={text} />;
    }

    const preprocessedText = preprocessAgentMentions(text);

    return (
      <div className="space-y-3.5 leading-relaxed text-slate-200 text-[14.5px] font-sans">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({node, ...props}) => <h2 className="text-white font-black text-xl mt-6 mb-3 first:mt-0 font-display" {...props} />,
            h2: ({node, ...props}) => <h3 className="text-emerald-200 font-extrabold text-lg mt-5 mb-2 first:mt-0 font-display" {...props} />,
            h3: ({node, ...props}) => <h4 className="text-emerald-300 font-bold text-base mt-4 mb-2 first:mt-0 font-display" {...props} />,
            h4: ({node, ...props}) => <h5 className="text-emerald-400 font-bold text-sm mt-3 mb-1 first:mt-0 font-display" {...props} />,
            p: ({node, ...props}) => <p className="mb-2 last:mb-0 text-slate-300" {...props} />,
            ul: ({node, ...props}) => <ul className="my-2 space-y-1" {...props} />,
            ol: ({node, ...props}) => <ol className="my-2 space-y-1 list-decimal list-outside ml-4" {...props} />,
            li: ({node, ...props}) => <li className="text-slate-200 marker:text-[#00ff66]" {...props} />,
            strong: ({node, children, ...props}) => {
              const textContent = String(children || '').trim();
              const upperText = textContent.toUpperCase();
              
              if (upperText === 'CORTANA') {
                return <strong className="font-extrabold text-[#c084fc] bg-[#7c3aed]/15 px-1.5 py-0.5 rounded border border-[#7c3aed]/30 inline-block font-mono text-[0.9em]" {...props}>{children}</strong>;
              }
              if (upperText === 'J.A.R.V.I.S.' || upperText === 'JARVIS') {
                return <strong className="font-extrabold text-[#60a5fa] bg-[#2563eb]/15 px-1.5 py-0.5 rounded border border-[#2563eb]/30 inline-block font-mono text-[0.9em]" {...props}>{children}</strong>;
              }
              if (upperText === 'AURA') {
                return <strong className="font-extrabold text-[#f472b6] bg-[#ec4899]/15 px-1.5 py-0.5 rounded border border-[#ec4899]/30 inline-block font-mono text-[0.9em]" {...props}>{children}</strong>;
              }
              if (upperText === 'F.R.I.D.A.Y.' || upperText === 'FRIDAY' || upperText === 'BOSS') {
                return <strong className="font-extrabold text-[#fbbf24] bg-[#f59e0b]/15 px-1.5 py-0.5 rounded border border-[#f59e0b]/30 inline-block font-mono text-[0.9em]" {...props}>{children}</strong>;
              }
              if (upperText === 'CASH') {
                return <strong className="font-extrabold text-[#34d399] bg-[#10b981]/15 px-1.5 py-0.5 rounded border border-[#10b981]/30 inline-block font-mono text-[0.9em]" {...props}>{children}</strong>;
              }
              if (upperText === 'NOVA' || upperText === 'FORGE') {
                return <strong className="font-extrabold text-[#cbd5e1] bg-[#6b7280]/20 px-1.5 py-0.5 rounded border border-[#6b7280]/30 inline-block font-mono text-[0.9em]" {...props}>{children}</strong>;
              }
              if (upperText === 'TITAN') {
                return <strong className="font-extrabold text-[#a78bfa] bg-[#8b5cf6]/15 px-1.5 py-0.5 rounded border border-[#8b5cf6]/30 inline-block font-mono text-[0.9em]" {...props}>{children}</strong>;
              }
              if (upperText === 'ATHENA' || upperText === 'MEMORY') {
                return <strong className="font-extrabold text-[#c084fc] bg-[#a78bfa]/15 px-1.5 py-0.5 rounded border border-[#a78bfa]/30 inline-block font-mono text-[0.9em]" {...props}>{children}</strong>;
              }
              if (upperText === 'RESEARCHER') {
                return <strong className="font-extrabold text-[#60a5fa] bg-[#3b82f6]/15 px-1.5 py-0.5 rounded border border-[#3b82f6]/30 inline-block font-mono text-[0.9em]" {...props}>{children}</strong>;
              }
              if (upperText === 'PLANNER') {
                return <strong className="font-extrabold text-[#fbbf24] bg-[#f59e0b]/15 px-1.5 py-0.5 rounded border border-[#f59e0b]/30 inline-block font-mono text-[0.9em]" {...props}>{children}</strong>;
              }
              if (upperText === 'CODER') {
                return <strong className="font-extrabold text-[#34d399] bg-[#10b981]/15 px-1.5 py-0.5 rounded border border-[#10b981]/30 inline-block font-mono text-[0.9em]" {...props}>{children}</strong>;
              }
              if (upperText === 'REVIEWER') {
                return <strong className="font-extrabold text-[#f472b6] bg-[#ec4899]/15 px-1.5 py-0.5 rounded border border-[#ec4899]/30 inline-block font-mono text-[0.9em]" {...props}>{children}</strong>;
              }
              
              return <strong className="font-bold text-white" {...props}>{children}</strong>;
            },
            code: ({node, inline, className, children, ...props}: any) => {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : 'code';
              const codeContent = String(children).replace(/\n$/, '');
              
              if (!inline && match) {
                const codeBlockId = `${msg.id}-code-${codeContent.substring(0, 10)}`;
                return (
                  <div className="relative group rounded-xl border border-emerald-900/30 bg-[#030504] overflow-hidden my-3 shadow-inner">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-emerald-950 bg-[#08100c] text-xs font-mono text-emerald-400">
                      <div className="flex items-center gap-1.5">
                        <Terminal size={12} className="text-emerald-400" />
                        <span>{language.toUpperCase()}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(codeBlockId, codeContent)}
                        className="p-1 rounded bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer border border-emerald-900/30 text-[10px]"
                        title="Copy code"
                      >
                        {copiedId === codeBlockId ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                        <span>{copiedId === codeBlockId ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed text-emerald-300/90 max-h-[480px]">
                      <code className={className} {...props}>{codeContent}</code>
                    </pre>
                  </div>
                );
              }
              return (
                <code className="bg-emerald-950/30 text-emerald-300 px-1 py-0.5 rounded font-mono text-[0.85em]" {...props}>
                  {children}
                </code>
              );
            }
          }}
        >
          {preprocessedText}
        </Markdown>
      </div>
    );
  };

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDetail, setNewTaskDetail] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskAgent, setNewTaskAgent] = useState<AgentId>('cortana');

  const renderSparkline = (data: number[]) => {
    if (!data || data.length === 0) return null;
    const width = 60;
    const height = 15;
    const max = Math.max(...data, 1);
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (val / max) * height;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke="#00ff66"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="drop-shadow-[0_0_2px_rgba(0,255,102,0.5)]"
        />
      </svg>
    );
  };

  const handleAgentCardClick = (agent: Agent) => {
    setActiveTab('pipeline');
    if (chatTab === 'private') {
      setPrivatePrompt(`[${agent.name}] `);
    } else {
      setGlobalPrompt(`[${agent.name}] `);
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const task: OpsTask = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      detail: newTaskDetail.trim(),
      priority: newTaskPriority,
      agentSource: newTaskAgent.toUpperCase() as any,
      status: 'queued',
      createdAt: new Date().toLocaleTimeString(),
    };
    setOpsTasks(prev => [...prev, task]);
    logEventToAthena(
      `Task Created: ${task.title}`,
      `A new operations task "${task.title}" was created with priority ${task.priority.toUpperCase()} linked to agent ${task.agentSource}.`,
      `Detail: ${task.detail || 'None'}\nPriority: ${task.priority}\nLinked Agent: ${task.agentSource}`,
      ['task-created', 'ops', task.agentSource.toLowerCase()]
    );
    setNewTaskTitle('');
    setNewTaskDetail('');
  };

  const moveTaskStatus = (id: string, dir: 'prev' | 'next') => {
    const statuses: TaskStatus[] = ['queued', 'in-progress', 'review', 'done'];
    setOpsTasks(prev => prev.map(task => {
      if (task.id === id) {
        const currIdx = statuses.indexOf(task.status);
        let nextIdx = currIdx;
        if (dir === 'prev' && currIdx > 0) nextIdx = currIdx - 1;
        if (dir === 'next' && currIdx < statuses.length - 1) nextIdx = currIdx + 1;
        const nextStatus = statuses[nextIdx];
        if (nextStatus === 'done' && task.status !== 'done') {
          logEventToAthena(
            `Task Completed: ${task.title}`,
            `Operations task "${task.title}" linked to agent ${task.agentSource} has been moved to DONE status.`,
            `Task: ${task.title}\nLinked Agent: ${task.agentSource}`,
            ['task-completed', 'ops', task.agentSource.toLowerCase()]
          );
        }
        return { ...task, status: nextStatus };
      }
      return task;
    }));
  };

  const deleteTask = (id: string) => {
    setOpsTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    setOpsTasks(prev => prev.map(task => {
      if (task.id === id) {
        if (targetStatus === 'done' && task.status !== 'done') {
          logEventToAthena(
            `Task Completed: ${task.title}`,
            `Operations task "${task.title}" linked to agent ${task.agentSource} has been moved to DONE status.`,
            `Task: ${task.title}\nLinked Agent: ${task.agentSource}`,
            ['task-completed', 'ops', task.agentSource.toLowerCase()]
          );
        }
        return { ...task, status: targetStatus };
      }
      return task;
    }));
  };

  const renderCommandCenter = () => {
    const activeAgentsCount = agents.filter(a => a.enabled !== false).length;
    const totalRuns = agents.reduce((sum, a) => sum + (a.taskCount || 0), 0);
    
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="font-display font-black text-2xl text-white tracking-tight">JoelOS COMMAND CENTER</h2>
            <p className="text-emerald-500/60 text-xs font-mono uppercase tracking-wider mt-1">REAL-TIME MISSION CONTROL & PERFORMANCE OBSERVABILITY</p>
          </div>
          <div className="flex items-center gap-2 bg-[#020503] border border-emerald-950 px-3 py-1.5 rounded-xl font-mono text-[10px] text-emerald-400">
            <Clock size={12} className="animate-pulse" />
            <span>LAST SYNC: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {/* KPI Metrics Bar */}
        <div className="space-y-2">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-emerald-500 font-extrabold flex items-center gap-2">
            <LayoutDashboard size={11} />
            <span>OPERATIONAL TELEMETRY</span>
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth snap-x">
            {[
              { label: 'ACTIVE AGENTS', value: `${activeAgentsCount} / ${agents.length}`, sub: 'Ready for delegation', spark: [5, 6, 6, 7, activeAgentsCount], icon: <Bot size={13} /> },
              { label: 'TOTAL RUNS', value: `${totalRuns} jobs`, sub: 'Cumulative compilations', spark: [totalRuns - 4, totalRuns - 2, totalRuns - 1, totalRuns, totalRuns], icon: <Terminal size={13} /> },
              { label: 'TOKEN VELOCITY', value: `${sessionTokens.toLocaleString()} Tx`, sub: 'Context budget spent', spark: [1, 2, 4, 8, sessionTokens ? Math.min(10, sessionTokens/1000) : 0], icon: <Sparkles size={13} /> },
              { label: 'BRAIN MEMORIES', value: `${memories.length} slots`, sub: 'Semantic vectors stored', spark: [1, 2, 2, 3, memories.length], icon: <Database size={13} /> },
              { label: 'SYSTEM HEALTH', value: ollamaConnectionStatus === 'connected' ? '100% ONLINE' : '92.1% DEGRADED', sub: ollamaConnectionStatus === 'connected' ? 'Ollama fully linked' : 'Ollama Offline', spark: ollamaConnectionStatus === 'connected' ? [10, 10, 10, 10, 10] : [10, 10, 9, 9, 9], icon: <ShieldCheck size={13} /> }
            ].map((kpi, idx) => (
              <div 
                key={idx} 
                className="min-w-[200px] sm:min-w-[240px] flex-1 snap-start p-4 rounded-xl border-2 border-emerald-800 bg-[#041208] hover:border-emerald-400 hover:bg-[#071b0c] transition-all duration-300 relative group overflow-hidden shadow-lg shadow-emerald-950/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-500/70 font-bold">{kpi.label}</span>
                  <span className="text-emerald-500/40 group-hover:text-emerald-400 transition-colors">{kpi.icon}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2 mt-1">
                  <span className="text-lg sm:text-xl font-display font-black text-white">{kpi.value}</span>
                  <div className="h-4 flex items-end">
                    {renderSparkline(kpi.spark)}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400/80 font-sans mt-1.5">{kpi.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Attention Required alerts */}
        <div className="space-y-2">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-emerald-500 font-extrabold flex items-center gap-2">
            <AlertCircle size={11} className="text-emerald-400" />
            <span>ATTENTION REQUIRED</span>
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth snap-x">
            {alerts.map((alert) => {
              let alertClass = "border-emerald-500 bg-emerald-950/45 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-950/60";
              let badgeClass = "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40";
              if (alert.severity === 'critical') {
                alertClass = "border-rose-500 bg-rose-950/45 text-rose-300 hover:border-rose-400 hover:bg-rose-950/60";
                badgeClass = "bg-rose-500/20 text-rose-300 border border-rose-400/40 animate-pulse";
              } else if (alert.severity === 'warning') {
                alertClass = "border-amber-500 bg-amber-950/45 text-amber-300 hover:border-amber-400 hover:bg-amber-950/60";
                badgeClass = "bg-amber-500/20 text-amber-300 border border-amber-400/40";
              }
              
              const handleAlertClick = () => {
                if (alert.id === '1') {
                  setActiveTab('settings');
                } else if (alert.id === '2') {
                  setActiveTab('pipeline');
                } else if (alert.id === '3') {
                  setIsMemoryDrawerOpen(true);
                }
              };

              return (
                <div 
                  key={alert.id} 
                  onClick={handleAlertClick}
                  className={`min-w-[260px] sm:min-w-[300px] flex-1 snap-start p-4 rounded-xl border-2 ${alertClass} cursor-pointer transition-all duration-300 flex flex-col justify-between shadow-lg`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className={`text-[8px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded ${badgeClass}`}>
                      {alert.severity}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">{alert.timestamp}</span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-white font-sans line-clamp-1">{alert.title}</h4>
                    <p className="text-[10px] text-slate-400 font-sans line-clamp-2 leading-relaxed">{alert.detail}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-emerald-900/10 flex justify-between items-center text-[9px] font-mono text-emerald-400">
                    <span>SOURCE: {alert.agentSource}</span>
                    <span className="flex items-center gap-1 opacity-60 group-hover:opacity-100">RESOLVE <ArrowRight size={10} /></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dashboard split content area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-emerald-500 font-extrabold flex items-center gap-2">
                <Bot size={11} />
                <span>JOELOS ACTIVE COMMAND AGENTS</span>
              </h3>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Double click card to delegate prompt</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {agents.map((agent) => {
                const isActive = agent.status === 'thinking';
                return (
                  <div
                    key={agent.id}
                    onDoubleClick={() => handleAgentCardClick(agent)}
                    onClick={() => handleAgentCardClick(agent)}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer group flex flex-col justify-between relative overflow-hidden h-[155px] ${
                      agent.enabled === false
                        ? 'border-emerald-950 bg-[#020503]/50 opacity-40 hover:opacity-60'
                        : isActive
                          ? 'border-emerald-400 bg-[#092613] shadow-[0_0_15px_rgba(0,255,102,0.2)] ring-1 ring-emerald-400/30'
                          : 'border-emerald-800 bg-[#05140b] hover:border-emerald-400 hover:bg-[#071b0e]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base select-none">
                            {agent.icon.startsWith('/') ? <img src={agent.icon} alt={agent.name} className="w-5 h-5 inline-block object-cover rounded-full" /> : agent.icon}
                          </span>
                          <span className="font-mono font-bold text-xs text-white group-hover:text-[#00ff66] transition-colors">{agent.name}</span>
                        </div>
                        <span className={`w-2 h-2 rounded-full ${
                          agent.enabled === false ? 'bg-slate-700' :
                          isActive ? 'bg-[#00ff66] animate-pulse shadow-[0_0_8px_rgba(0,255,102,0.8)]' : 'bg-emerald-800'
                        }`} />
                      </div>
                      <p className="text-[10px] text-slate-400 font-sans leading-relaxed line-clamp-3 mb-2">{agent.description}</p>
                    </div>

                    <div className="pt-2 border-t border-emerald-950/50 flex items-center justify-between font-mono text-[9px] text-emerald-500">
                      <span>{agent.model}</span>
                      <span className="bg-[#00ff66]/5 px-2 py-0.5 rounded border border-emerald-900/30 text-emerald-300 font-bold">{agent.taskCount || 0} runs</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            {/* GOALS TRACKER */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-emerald-500 font-extrabold flex items-center gap-2">
                  <Target size={11} className="text-emerald-400" />
                  <span>GOALS & OBJECTIVES</span>
                </h3>
                <button
                  onClick={() => setIsGoalModalOpen(!isGoalModalOpen)}
                  className="text-[9px] font-mono font-bold text-[#00ff66] bg-emerald-950/40 hover:bg-emerald-950/80 border border-emerald-900/60 px-2 py-0.5 rounded cursor-pointer transition-colors"
                >
                  {isGoalModalOpen ? 'CANCEL' : '+ ADD GOAL'}
                </button>
              </div>

              {isGoalModalOpen && (
                <form onSubmit={handleCreateGoal} className="p-3.5 rounded-xl border border-emerald-900/40 bg-black/80 space-y-2.5 font-mono text-xs shadow-xl">
                  <div className="space-y-1">
                    <label className="text-[9px] text-emerald-500 font-bold block uppercase tracking-wider">GOAL TITLE</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Launch Beta Site..."
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                      className="w-full text-xs rounded bg-black border border-emerald-950 px-2.5 py-1.5 text-slate-100 placeholder-emerald-900/50 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-emerald-500 font-bold block uppercase tracking-wider">DESCRIPTION</label>
                    <textarea
                      required
                      placeholder="Describe target deliverables..."
                      value={newGoalDesc}
                      onChange={(e) => setNewGoalDesc(e.target.value)}
                      className="w-full text-xs rounded bg-black border border-emerald-950 px-2.5 py-1.5 text-slate-100 placeholder-emerald-900/50 h-14 focus:outline-none font-sans"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-emerald-500 font-bold block uppercase tracking-wider">LINKED AGENT</label>
                    <select
                      value={newGoalAgent}
                      onChange={(e) => setNewGoalAgent(e.target.value as AgentId)}
                      className="w-full text-xs rounded bg-black border border-emerald-950 px-2 py-1.5 text-slate-300 focus:outline-none"
                    >
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-[#00ff66]/10 hover:bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/30 rounded text-[10px] font-bold tracking-wider transition-colors cursor-pointer"
                  >
                    REGISTER SYSTEM GOAL
                  </button>
                </form>
              )}

              <div className={`border border-emerald-950/60 rounded-xl p-3 ${theme === 'oled' ? 'bg-[#000000]' : 'bg-[#050c08]'} flex flex-col h-[260px]`}>
                <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                  {goals.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-emerald-800 font-mono text-[10px] leading-relaxed">
                      <span>No active system goals.<br />Create one to guide intelligence alignment.</span>
                    </div>
                  ) : (
                    goals.map((g) => {
                      const linkedAgentObj = agents.find(a => a.id === g.linkedAgent);
                      let statusColor = 'text-slate-400 border-slate-900 bg-slate-950/20';
                      if (g.status === 'in-progress') statusColor = 'text-blue-400 border-blue-900 bg-blue-950/20';
                      else if (g.status === 'completed') statusColor = 'text-[#00ff66] border-emerald-900/50 bg-[#00ff66]/10';
                      else if (g.status === 'failed') statusColor = 'text-rose-400 border-rose-950 bg-rose-950/20';

                      return (
                        <div key={g.id} className="p-2.5 rounded-lg border border-emerald-950/40 bg-[#020503] space-y-1.5 font-mono text-xs">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-slate-100 text-[11px] truncate" title={g.title}>{g.title}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleToggleGoalStatus(g.id)}
                                className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase cursor-pointer select-none transition-colors ${statusColor}`}
                                title="Click to cycle status"
                              >
                                {g.status}
                              </button>
                              <button
                                onClick={() => handleDeleteGoal(g.id)}
                                className="text-emerald-700 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Delete Goal"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 font-sans leading-normal">{g.description}</p>
                          <div className="flex justify-between items-center text-[8px] text-emerald-500/80 pt-1 border-t border-emerald-950/20">
                            <span className="flex items-center gap-1">
                              LINK: <span className="text-white">@{linkedAgentObj?.name || g.linkedAgent}</span>
                            </span>
                            <span>{new Date(g.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* LIVE ACTIVITY LOG */}
            <div className="space-y-3">
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-emerald-500 font-extrabold flex items-center gap-2">
                <History size={11} className="text-emerald-400" />
                <span>LIVE ACTIVITY LOG</span>
              </h3>
              <div className={`border border-emerald-950/60 rounded-xl p-4 ${theme === 'oled' ? 'bg-[#000000]' : 'bg-[#050c08]'} flex flex-col h-[210px]`}>
                <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 custom-scrollbar">
                  {activityFeed.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-emerald-800 font-mono text-xs p-6">
                      <History size={24} className="opacity-30 mb-2" />
                      <span>System idling.<br />No orchestration activities recorded.</span>
                    </div>
                  ) : (
                    activityFeed.slice(0, 20).map((act) => (
                      <div key={act.id} className="flex gap-2.5 items-start text-[11px] leading-relaxed border-b border-emerald-950/35 pb-2.5">
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: act.agentColor || '#10b981', boxShadow: `0 0 6px ${act.agentColor || '#10b981'}` }} />
                        <div className="flex-1 space-y-0.5">
                          <div className="flex justify-between items-baseline gap-2 font-mono">
                            <span className="font-bold text-slate-200 text-[10px]" style={{ color: act.agentColor || '#10b981' }}>[{act.agentName}]</span>
                            <span className="text-[8px] text-slate-600 shrink-0">{act.timestamp}</span>
                          </div>
                          <p className="text-slate-300 text-[10px] font-sans leading-normal">{act.action}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };



  const renderOperations = () => {
    const columns: { status: TaskStatus; label: string; border: string; bg: string; text: string }[] = [
      { status: 'queued', label: 'BACKLOG QUEUE', border: 'border-slate-600', bg: 'bg-[#030604]', text: 'text-slate-200 font-bold' },
      { status: 'in-progress', label: 'IN PROGRESS', border: 'border-blue-600', bg: 'bg-[#030604]', text: 'text-blue-200 font-bold' },
      { status: 'review', label: 'REVIEW AUDIT', border: 'border-amber-600', bg: 'bg-[#030604]', text: 'text-amber-200 font-bold' },
      { status: 'done', label: 'DONE COMPLETED', border: 'border-emerald-600', bg: 'bg-[#030604]', text: 'text-[#00ff66] font-bold' }
    ];

    const activeProject = sandboxProjects.find(p => p.id === activeSandboxProjId) || sandboxProjects[0];

    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Module Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-emerald-950/40 pb-4">
          <div>
            <h2 className="font-display font-black text-2xl text-white tracking-tight">JoelOS OPERATIONS HUB</h2>
            <p className="text-emerald-500/60 text-xs font-mono uppercase tracking-wider mt-1">
              {opsSubTab === 'kanban' && 'KANBAN COMPILATION LOG & AD-HOC TASK DISPATCHER'}
              {opsSubTab === 'orchestration' && 'HERMES AGENT ENGINE GATEWAY & TASK SCHEDULER'}
              {opsSubTab === 'sandbox' && 'WEBCONTAINER LIVE STATIC DEPLOY PREVIEWS'}
              {opsSubTab === 'studio' && 'GEMINI IMAGEN & SYNTHETIC MULTIMEDIA STUDIO'}
              {opsSubTab === 'radial' && 'MISSION CONTROL SYSTEM INTEGRITY & COGNITIVE RADIAL MONITOR'}
            </p>
          </div>

          {/* Sub-tab Selectors */}
          <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-emerald-950 shrink-0 overflow-x-auto no-scrollbar">
            {[
              { id: 'kanban', label: 'KANBAN BOARD', icon: <Trello size={12} /> },
              { id: 'orchestration', label: 'HERMES', icon: <Cpu size={12} /> },
              { id: 'sandbox', label: 'SANDBOXES', icon: <ExternalLink size={12} /> },
              { id: 'studio', label: 'STUDIO', icon: <Sparkles size={12} /> },
              { id: 'radial', label: 'MISSION CONTROL', icon: <Compass size={12} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setOpsSubTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold flex items-center gap-2 border transition-all cursor-pointer whitespace-nowrap select-none ${
                  opsSubTab === tab.id
                    ? 'bg-[#10b981]/20 text-[#00ff66] border-emerald-500/50 shadow-[0_0_8px_rgba(0,255,102,0.15)] font-black'
                    : 'text-emerald-600/70 hover:text-emerald-400 border-transparent hover:bg-emerald-950/10'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 1. KANBAN BOARD VIEW */}
        {opsSubTab === 'kanban' && (
          <div className="space-y-6">
            <form onSubmit={handleCreateTask} className="p-4 rounded-xl border-2 border-emerald-800 bg-[#041208] grid grid-cols-1 md:grid-cols-4 gap-4 items-end shadow-md">
              <div className="space-y-1 md:col-span-1">
                <label className="text-[9px] font-mono text-emerald-500 font-bold block uppercase tracking-wider">TASK TITLE</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Test researcher output"
                  className="w-full text-xs rounded-lg bg-black border border-emerald-900/60 px-3 py-2 text-slate-200 placeholder-emerald-800/50 focus:outline-none hover:border-emerald-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-sans"
                />
              </div>
              <div className="space-y-1 md:col-span-1">
                <label className="text-[9px] font-mono text-emerald-500 font-bold block uppercase tracking-wider">DESCRIPTION</label>
                <input
                  type="text"
                  value={newTaskDetail}
                  onChange={(e) => setNewTaskDetail(e.target.value)}
                  placeholder="e.g. Ensure we fetch the latest models"
                  className="w-full text-xs rounded-lg bg-black border border-emerald-900/60 px-3 py-2 text-slate-200 placeholder-emerald-800/50 focus:outline-none hover:border-emerald-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-sans"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 md:col-span-1">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-emerald-500 font-bold block uppercase tracking-wider">PRIORITY</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full text-xs rounded-lg bg-black border border-emerald-900/60 px-2.5 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono h-[34px] cursor-pointer"
                  >
                    <option value="low" className="bg-black text-slate-200">LOW</option>
                    <option value="medium" className="bg-black text-slate-200">MEDIUM</option>
                    <option value="high" className="bg-black text-slate-200">HIGH</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-emerald-500 font-bold block uppercase tracking-wider">AGENT</label>
                  <select
                    value={newTaskAgent}
                    onChange={(e) => setNewTaskAgent(e.target.value as any)}
                    className="w-full text-xs rounded-lg bg-black border border-[#10b981]/30 px-2.5 py-2 text-slate-200 focus:outline-none focus:border-[#10b981] font-mono h-[34px] cursor-pointer"
                  >
                    {agents.map(a => (
                      <option key={a.id} value={a.id} className="bg-black text-slate-200">
                        {a.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full md:col-span-1 text-xs rounded-lg bg-[#10b981]/20 hover:bg-[#10b981]/35 text-[#00ff66] border border-emerald-500/40 py-2 font-mono font-bold tracking-wider cursor-pointer min-h-[36px] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus size={14} />
                <span>DISPATCH TASK</span>
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-h-[500px]">
              {columns.map((col) => {
                const colTasks = opsTasks.filter(t => t.status === col.status);
                return (
                  <div
                    key={col.status}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.status)}
                    className={`rounded-xl border-2 border-emerald-800/80 p-4 ${theme === 'oled' ? 'bg-[#000000]' : 'bg-[#06150c]'} flex flex-col min-h-[300px] shadow-md shadow-emerald-950/10`}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-emerald-900/35 mb-4 shrink-0 font-mono">
                      <span className={`text-[10px] font-black tracking-widest ${col.text}`}>{col.label}</span>
                      <span className="text-[9px] bg-[#00ff66]/5 px-2 py-0.5 rounded border border-emerald-950 font-bold text-slate-400">{colTasks.length}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[500px]">
                      {colTasks.length === 0 ? (
                        <div className="text-center py-10 text-slate-600 font-mono text-[10px]">
                          COLUMN EMPTY
                        </div>
                      ) : (
                        colTasks.map((task) => {
                          let priorityBorder = "border-l-2 border-l-slate-600";
                          let priorityText = "text-slate-400";
                          if (task.priority === 'high') {
                            priorityBorder = "border-l-2 border-l-rose-500";
                            priorityText = "text-rose-400";
                          } else if (task.priority === 'medium') {
                            priorityBorder = "border-l-2 border-l-amber-500";
                            priorityText = "text-amber-400";
                          }
                          
                          const agentColor = agents.find(a => a.id === task.agentSource.toLowerCase())?.color || '#10b981';

                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              className={`bg-[#0b1c11] border-2 ${col.border} hover:border-white p-3.5 rounded-xl transition-all duration-300 relative group cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md ${priorityBorder}`}
                            >
                              <div className="flex justify-between items-start gap-2 mb-1.5">
                                <span className="text-slate-200 font-black font-sans text-xs leading-snug line-clamp-2">{task.title}</span>
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="text-emerald-700 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer p-0.5"
                                  title="Delete Task"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                              
                              {task.detail && (
                                <p className="text-[10px] text-slate-400 font-sans leading-relaxed line-clamp-3 mb-3">{task.detail}</p>
                              )}

                              <div className="flex items-center justify-between text-[8px] font-mono pt-2 border-t border-emerald-950/40">
                                <span className="font-extrabold uppercase tracking-wider" style={{ color: agentColor }}>
                                  {task.agentSource}
                                </span>
                                <span className={`font-black uppercase ${priorityText}`}>{task.priority}</span>
                              </div>

                              <div className="flex justify-end gap-1 mt-2 pt-1.5 border-t border-emerald-950/20">
                                <button
                                  type="button"
                                  onClick={() => moveTaskStatus(task.id, 'prev')}
                                  disabled={col.status === 'queued'}
                                  className="p-1 rounded bg-[#07130b] border border-emerald-950 text-emerald-600 disabled:opacity-20 hover:text-[#00ff66] transition-all cursor-pointer text-[10px] font-bold"
                                  title="Move Left"
                                >
                                  ←
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveTaskStatus(task.id, 'next')}
                                  disabled={col.status === 'done'}
                                  className="p-1 rounded bg-[#07130b] border border-emerald-950 text-emerald-600 disabled:opacity-20 hover:text-[#00ff66] transition-all cursor-pointer text-[10px] font-bold"
                                  title="Move Right"
                                >
                                  →
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. HERMES ORCHESTRATION VIEW */}
        {opsSubTab === 'orchestration' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Scheduled Tasks Panel */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-900 bg-[#020503] space-y-4 shadow-xl">
                <div className="flex items-center gap-2 pb-2 border-b border-emerald-950">
                  <Clock size={16} className="text-emerald-400" />
                  <h3 className="font-display font-semibold text-sm text-white">Cron Schedule Manager</h3>
                </div>

                <form onSubmit={handleCreateCron} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-emerald-500 font-bold block uppercase">JOB NAME</label>
                      <input
                        type="text"
                        required
                        value={newCronName}
                        onChange={(e) => setNewCronName(e.target.value)}
                        placeholder="Database Sync..."
                        className="w-full text-xs rounded bg-black border border-emerald-950 px-2.5 py-1.5 text-slate-200 placeholder-emerald-900/50 font-sans focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-emerald-500 font-bold block uppercase">CRON EXPRESSION</label>
                      <input
                        type="text"
                        required
                        value={newCronSchedule}
                        onChange={(e) => setNewCronSchedule(e.target.value)}
                        placeholder="*/5 * * * *"
                        className="w-full text-xs rounded bg-black border border-emerald-950 px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-emerald-500 font-bold block uppercase">AGENT GOAL / TASK TEXT</label>
                    <textarea
                      required
                      value={newCronTask}
                      onChange={(e) => setNewCronTask(e.target.value)}
                      placeholder="e.g. Scrape latest financial market index and index into local Vector Hash..."
                      className="w-full text-xs rounded bg-black border border-emerald-950 px-2.5 py-1.5 text-slate-200 placeholder-emerald-900/50 font-sans h-16 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isHermesLoading}
                    className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#00ff66] border border-emerald-500/40 rounded text-[11px] font-mono font-bold tracking-wider transition-colors cursor-pointer"
                  >
                    {isHermesLoading ? 'CREATING SCHEDULER...' : 'SCHEDULE NEW CRON'}
                  </button>
                </form>
              </div>

              {/* Scheduled Jobs List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-mono text-[9px] text-emerald-500 font-extrabold uppercase tracking-widest">ACTIVE CRON LOGS</h4>
                  {hermesConnected ? (
                    <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-900/60 flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] animate-pulse" />
                      Hermes: connected
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono font-bold text-amber-500 bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-950/60 flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Hermes: disconnected (using local fallback)
                    </span>
                  )}
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {hermesCrons.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-emerald-950 text-slate-600 text-xs font-mono rounded-xl">
                      NO ACTIVE CRON JOBS DETECTED
                    </div>
                  ) : (
                    hermesCrons.map((cron) => (
                      <div key={cron.id} className={`p-3.5 rounded-xl border bg-[#030704] flex items-start justify-between gap-4 font-mono text-xs transition-colors ${
                        hermesConnected ? 'border-emerald-900' : 'border-amber-950/50'
                      }`}>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100">{cron.name}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                              cron.status === 'active' ? 'bg-[#00ff66]/10 border-emerald-500/50 text-[#00ff66]' : 'bg-amber-500/10 border-amber-950 text-amber-500'
                            }`}>{cron.status}</span>
                            {!hermesConnected && (
                              <span className="text-[7px] font-mono font-black text-amber-500/80 uppercase px-1.5 py-0.5 bg-amber-500/5 rounded border border-amber-950/40">
                                Mock Fallback
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-[#00ff66] font-extrabold tracking-widest uppercase">
                            Freq: <span className="text-white">{cron.schedule}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-sans leading-normal line-clamp-2">{cron.task}</p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleToggleCron(cron.id)}
                            className="p-1.5 rounded bg-black hover:bg-emerald-950/40 text-emerald-500 hover:text-[#00ff66] border border-emerald-950 cursor-pointer"
                            title={cron.status === 'active' ? 'Pause job' : 'Activate job'}
                          >
                            <Pause size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteCron(cron.id)}
                            className="p-1.5 rounded bg-black hover:bg-rose-950/30 text-emerald-700 hover:text-rose-400 border border-emerald-950 cursor-pointer"
                            title="Delete cron job"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Subagent Swarm Panel */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-900 bg-[#020503] space-y-4 shadow-xl">
                <div className="flex items-center gap-2 pb-2 border-b border-emerald-950">
                  <Bot size={16} className="text-emerald-400" />
                  <h3 className="font-display font-semibold text-sm text-white">Spawn Hermes Subagent</h3>
                </div>

                <form onSubmit={handleSpawnSubagent} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-emerald-500 font-bold block uppercase">SUBAGENT CONTEXT / DECK NAME</label>
                    <input
                      type="text"
                      required
                      value={newSubagentName}
                      onChange={(e) => setNewSubagentName(e.target.value)}
                      placeholder="UI Architect, Database Optimizer..."
                      className="w-full text-xs rounded bg-black border border-emerald-950 px-2.5 py-1.5 text-slate-200 placeholder-emerald-900/50 font-sans focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-emerald-500 font-bold block uppercase">DELEGATED SWARM INSTRUCTIONS</label>
                    <textarea
                      required
                      value={newSubagentTask}
                      onChange={(e) => setNewSubagentTask(e.target.value)}
                      placeholder="e.g. Generate high fidelity Glassmorphism components and files. [Trigger Sandbox Auto-Hook]"
                      className="w-full text-xs rounded bg-black border border-emerald-950 px-2.5 py-1.5 text-slate-200 placeholder-emerald-900/50 font-sans h-16 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isHermesLoading}
                    className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#00ff66] border border-emerald-500/40 rounded text-[11px] font-mono font-bold tracking-wider transition-colors cursor-pointer"
                  >
                    {isHermesLoading ? 'COMMISSIONING AGENT...' : 'SPAWN ACTIVE SESSION'}
                  </button>
                </form>
              </div>

              {/* Spawned Sessions Log */}
              <div className="space-y-3">
                <h4 className="font-mono text-[9px] text-emerald-500 font-extrabold uppercase tracking-widest">SUBAGENT SWARM DIRECTORY</h4>
                <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                  {hermesSubagents.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-emerald-950 text-slate-600 text-xs font-mono rounded-xl">
                      NO ACTIVE SUBAGENTS DETECTED
                    </div>
                  ) : (
                    hermesSubagents.map((sub) => (
                      <div key={sub.id} className="p-4 rounded-xl border border-emerald-900 bg-black space-y-3 font-mono">
                        <div className="flex items-center justify-between gap-3 border-b border-emerald-950 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#00ff66] shadow-[0_0_6px_#00ff66]" />
                            <span className="font-bold text-slate-200 text-xs">{sub.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-emerald-500/60 text-[9px]">{sub.status.toUpperCase()}</span>
                            {sub.status === 'running' && (
                              <button
                                onClick={() => handleStopSubagent(sub.id)}
                                className="px-2 py-0.5 rounded border border-rose-950 hover:bg-rose-950/20 text-rose-400 text-[9px] font-black cursor-pointer"
                              >
                                STOP
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-slate-400 text-xs font-sans italic leading-relaxed">"{sub.task}"</p>

                        {/* Logs Stream Panel */}
                        <div className="p-3.5 rounded bg-black border border-emerald-950/40 h-28 overflow-y-auto text-[9px] text-[#00ff66] font-mono leading-normal space-y-1 scrollbar-thin">
                          {sub.logs.map((log: string, idx: number) => (
                            <div key={idx} className="flex gap-2">
                              <span className="text-emerald-950">❯</span>
                              <span className="text-emerald-300">{log}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. SANDBOX PREVIEW VIEW */}
        {opsSubTab === 'sandbox' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column: Projects registry list & Logs */}
            <div className="xl:col-span-1 space-y-4">
              <div className="p-4 rounded-xl border border-emerald-900 bg-[#020503] space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-950">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-emerald-400" />
                    <h3 className="font-display font-semibold text-sm text-white font-sans">Sandbox Projects</h3>
                  </div>
                  <span className="text-[10px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-900 font-mono font-bold text-emerald-400">{sandboxProjects.length}</span>
                </div>

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {sandboxProjects.map((p) => {
                    const isSelected = activeSandboxProjId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setActiveSandboxProjId(p.id);
                          setSelectedProjectLogId(p.id);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_8px_rgba(0,255,102,0.1)]'
                            : 'bg-[#030604] border-emerald-950/60 hover:border-emerald-900'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="font-mono text-xs font-bold text-slate-100 block">{p.name}</span>
                          <span className="text-[9px] text-slate-500 font-mono block">Source: {p.source}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'ready' ? 'bg-[#00ff66]' : 'bg-amber-500 animate-pulse'}`} />
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteSandboxProject(p.id); }}
                            className="p-1 rounded text-emerald-700 hover:text-rose-400 hover:bg-rose-950/20 cursor-pointer"
                            title="Teardown sandbox"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Logs Console */}
              {activeProject && (
                <div className="p-4 rounded-xl border border-emerald-900 bg-black space-y-3 font-mono shadow-xl">
                  <div className="flex items-center gap-2 border-b border-emerald-950 pb-2">
                    <Terminal size={14} className="text-emerald-400" />
                    <h4 className="text-[10px] text-slate-200 uppercase tracking-wider font-extrabold">Virtual Container Console</h4>
                  </div>

                  <div className="p-3 rounded bg-black border border-emerald-950/50 h-44 overflow-y-auto text-[9px] text-[#00ff66] leading-normal space-y-1.5 scrollbar-thin">
                    {activeProject.logs.map((log: string, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-emerald-950">❯</span>
                        <span className="text-slate-300 font-mono leading-relaxed">{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Columns: Interactive File Viewer & Live Output Sandbox */}
            <div className="xl:col-span-2 space-y-4">
              {activeProject ? (
                <div className="rounded-xl border border-emerald-900 bg-[#020503] overflow-hidden flex flex-col h-[650px] shadow-2xl relative">
                  {/* Sandbox Toolbar */}
                  <div className="bg-[#030704] border-b border-emerald-950/60 p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#00ff66] shadow-[0_0_8px_#00ff66] animate-pulse" />
                      <div>
                        <span className="text-xs font-bold text-slate-100 font-mono block">{activeProject.name}</span>
                        <p className="text-[9px] text-emerald-500 font-mono uppercase tracking-wider">PORT {activeProject.port || 3001} · ACTIVE SERVICE</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-950 font-mono uppercase">
                        {activeProject.status}
                      </span>
                      <button
                        onClick={() => {
                          setSandboxReloadCount(prev => prev + 1);
                          setSandboxProjects(prev => prev.map(p => p.id === activeProject.id ? {
                            ...p,
                            logs: [...p.logs, `[sandbox] Client hot reload signal received`, `[sandbox] Hot reloading and refreshing port...`, `[sandbox] Live iframe updated (v${sandboxReloadCount + 1})`]
                          } : p));
                        }}
                        className="p-1.5 rounded bg-black border border-emerald-950 hover:border-emerald-500/50 text-emerald-400 hover:text-[#00ff66] cursor-pointer transition-colors"
                        title="Hot reload module"
                      >
                        <RefreshCw size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Main Grid: Code Editor Sidebar + Execution Stage */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden bg-black/40">
                    {/* Code Editor block */}
                    <div className="border-r border-emerald-950/60 flex flex-col overflow-hidden bg-[#020403] font-mono">
                      <div className="bg-[#040805] px-3 py-1.5 border-b border-emerald-950/40 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-emerald-500/50 uppercase tracking-widest block font-mono">WORKSPACE FILES:</span>
                          {Object.keys(activeProject.files).map(filename => (
                            <span key={filename} className="text-[10px] bg-emerald-950/20 text-[#00ff66] px-2 py-0.5 rounded border border-emerald-950/60">
                              {filename}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={handleCompileSandbox}
                          disabled={isSandboxCompiling}
                          className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#00ff66] border border-emerald-500/30 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer select-none"
                          title="Compile changes and hot reload (Ctrl+Enter / Cmd+Enter)"
                        >
                          {isSandboxCompiling ? (
                            <RefreshCw size={10} className="animate-spin text-[#00ff66]" />
                          ) : (
                            <Play size={10} className="text-[#00ff66]" />
                          )}
                          <span>Compile</span>
                        </button>
                      </div>

                      <textarea
                        value={editedCode}
                        onChange={(e) => setEditedCode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            handleCompileSandbox();
                          }
                        }}
                        className="flex-1 p-4 bg-[#020403] text-emerald-100 font-mono text-[11px] leading-relaxed resize-none focus:outline-none focus:ring-0 border-0 scrollbar-thin select-text"
                        placeholder="Type React component code here... Press Ctrl+Enter to compile"
                      />
                    </div>

                    {/* Interactive Play preview container */}
                    <div className="flex flex-col bg-[#010302] overflow-hidden relative flex-1 h-full min-h-[450px]">
                      {/* Live display simulation card */}
                      <div className="flex-1 w-full h-full relative" key={`${activeProject.id}-${sandboxReloadCount}`}>
                        <iframe
                          src={activeProject.status === 'ready' ? `/sandbox-preview/${activeProject.id}/` : undefined}
                          srcDoc={activeProject.status !== 'ready' ? getSandboxSrcDoc(activeProject) : undefined}
                          title={`Sandbox Preview: ${activeProject.name}`}
                          className="w-full h-full border-0 bg-[#020503]"
                          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                        />
                      </div>

                      <div className="absolute bottom-4 left-4 right-4 bg-black/95 p-3 rounded-lg border border-emerald-950/60 flex items-center justify-between text-[10px] font-mono shadow-2xl z-10">
                        <span className="text-[#00ff66] flex items-center gap-1.5 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66]" />
                          Dynamic Sandbox Engine Active
                        </span>
                        <button
                          onClick={(e) => { 
                            e.preventDefault(); 
                            if (activeProject.status === 'ready') {
                              window.open(`/sandbox-preview/${activeProject.id}/`, '_blank');
                            } else {
                              const win = window.open();
                              if (win) {
                                win.document.write(getSandboxSrcDoc(activeProject));
                                win.document.close();
                              } else {
                                alert("Popup blocker prevented opening the sandbox. Please allow popups for this site.");
                              }
                            }
                          }}
                          className="text-[#00ff66] font-bold hover:underline bg-transparent border-0 cursor-pointer p-0"
                        >
                          OPEN IN NEW TAB ↗
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-emerald-950 text-slate-600 text-xs font-mono rounded-xl">
                  NO ACTIVE SANDBOX PROJECTS TO PREVIEW
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. MEDIA STUDIO VIEW */}
        {opsSubTab === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Input Generator Panel */}
            <div className="lg:col-span-1 space-y-4">
              <div className="p-4 rounded-xl border border-emerald-900 bg-[#020503] space-y-4 shadow-xl">
                <div className="flex items-center gap-2 pb-2 border-b border-emerald-950">
                  <Sparkles size={16} className="text-emerald-400" />
                  <h3 className="font-display font-semibold text-sm text-white font-sans">Creative Command Panel</h3>
                </div>

                <form onSubmit={handleCreateStudioJob} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-emerald-500 block font-bold uppercase">SYNTHETIC MEDIA TYPE</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'image', label: 'IMAGE', icon: <Image size={12} /> },
                        { id: 'video', label: 'VIDEO', icon: <Video size={12} /> },
                        { id: 'voice', label: 'VOICE', icon: <Volume2 size={12} /> }
                      ].map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => {
                            setStudioType(type.id as any);
                            if (type.id === 'voice') setStudioModel('zai-audio');
                            else if (type.id === 'video') setStudioModel('synthesia');
                            else setStudioModel('gemini-2.5-flash-image');
                          }}
                          className={`py-2 rounded border font-mono text-[10px] font-extrabold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            studioType === type.id
                              ? 'bg-emerald-950 border-emerald-400 text-[#00ff66]'
                              : 'bg-black border-emerald-950 text-emerald-600/60 hover:text-emerald-400'
                          }`}
                        >
                          {type.icon}
                          <span>{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-emerald-500 block font-bold uppercase">MODEL</label>
                    <select
                      value={studioModel}
                      onChange={(e) => setStudioModel(e.target.value)}
                      className="w-full text-xs rounded bg-black border border-emerald-950 px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {studioType === 'voice' ? (
                        <>
                          <option value="zai-audio">Z.ai Voice Engine (GML Audio - Free)</option>
                          <option value="zai-audio-pro">Z.ai Voice Engine Pro (Free)</option>
                          <option value="neural-vocoder">Neural Vocoder API (Default)</option>
                        </>
                      ) : studioType === 'video' ? (
                        <>
                          <option value="synthesia">Synthesia Engine (Default)</option>
                          <option value="zai-video">Z.ai Video Gen (Free)</option>
                        </>
                      ) : (
                        <>
                          <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image (Nano Banana)</option>
                          <option value="openai-codex">OpenAI Codex (gpt-image-2 via ChatGPT/Codex - Free)</option>
                          <option value="zai">Z.ai Vision Engine (GML Base - Free)</option>
                          <option value="zai-pro">Z.ai Vision Engine (GML Pro - Free)</option>
                          <option value="pollinations">Pollinations.ai (FLUX - Default Free)</option>
                          <option value="pollinations-flux-pro">Pollinations.ai (FLUX Pro HD - Free)</option>
                          <option value="pollinations-flux-realism">Pollinations.ai (FLUX Realism - Free)</option>
                          <option value="pollinations-flux-anime">Pollinations.ai (FLUX Anime - Free)</option>
                          <option value="pollinations-flux-3d">Pollinations.ai (FLUX 3D CGI - Free)</option>
                          <option value="pollinations-flux-coyo">Pollinations.ai (FLUX Coyo Art - Free)</option>
                          <option value="pollinations-turbo">Pollinations.ai (SDXL Turbo - Free Fast)</option>
                          <option value="pollinations-any-dark">Pollinations.ai (Any Dark Moody - Free)</option>
                          <option value="pollinations-midjourney">Pollinations.ai (Midjourney V6 Style - Free)</option>
                        </>
                      )}
                    </select>
                  </div>

                  {studioType === 'image' && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-emerald-500 block font-bold uppercase">ASPECT RATIO</label>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { ratio: '1:1', label: '1:1', desc: 'Square' },
                          { ratio: '16:9', label: '16:9', desc: 'Banner' },
                          { ratio: '9:16', label: '9:16', desc: 'Mobile' },
                          { ratio: '4:3', label: '4:3', desc: 'Classic' },
                          { ratio: '3:4', label: '3:4', desc: 'Book' },
                          { ratio: '3:2', label: '3:2', desc: 'Photo' },
                          { ratio: '2:3', label: '2:3', desc: 'Poster' },
                        ].map((item) => (
                          <button
                            key={item.ratio}
                            type="button"
                            onClick={() => setStudioAspectRatio(item.ratio)}
                            className={`py-1 rounded border font-mono text-[9px] font-bold flex flex-col items-center justify-center cursor-pointer transition-all ${
                              studioAspectRatio === item.ratio
                                ? 'bg-emerald-950 border-emerald-400 text-[#00ff66]'
                                : 'bg-black border-emerald-950 text-slate-400 hover:text-emerald-400 hover:border-emerald-900/60'
                            }`}
                          >
                            <span>{item.ratio}</span>
                            <span className="text-[7px] text-slate-500 font-sans tracking-tight">{item.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-emerald-500 block font-bold uppercase">GENERATION PROMPT</label>
                    <textarea
                      required
                      value={studioPrompt}
                      onChange={(e) => setStudioPrompt(e.target.value)}
                      placeholder={
                        studioType === 'image' ? 'e.g. A neon cybernetic skull floating in emerald glowing fog, synthwave artwork...' :
                        studioType === 'video' ? 'e.g. Hyperlapse of a futuristic metropolitan city highway under glowing neon sky...' :
                        'e.g. A serene male voice instructing breathing exercise with subtle ambient synth background...'
                      }
                      className="w-full text-xs rounded bg-black border border-emerald-950 px-2.5 py-1.5 text-slate-200 placeholder-emerald-900/50 font-sans h-24 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isStudioSubmitting}
                    className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#00ff66] border border-emerald-500/40 rounded text-xs font-mono font-bold tracking-wider transition-colors cursor-pointer"
                  >
                    {isStudioSubmitting ? 'DISPATCHING GENERATOR...' : 'QUEUE SYNTHETIC JOB'}
                  </button>
                </form>

                {studioJobs.some((j) => j.type === 'voice' && j.status === 'processing') && (
                  <div className="p-3 bg-[#0a140f] border border-emerald-500/30 rounded-lg space-y-1.5 animate-pulse mt-4">
                    <div className="flex items-center justify-between text-[9px] font-mono font-bold text-[#00ff66]">
                      <span className="flex items-center gap-1">🎙️ NEURAL SYNTH OVERWATCH</span>
                      <span className="text-[8px] bg-emerald-950 px-1 py-0.5 rounded text-emerald-400 border border-emerald-900">RUNNING</span>
                    </div>
                    <p className="text-[9px] font-mono text-emerald-600 leading-tight">
                      Web Audio API synthetic vocoder pipeline active. Sound carrier frequency is streaming through the real-time analyzer nodes.
                    </p>
                  </div>
                )}
              </div>

              {/* API Integration note */}
              <div className="p-4 rounded-xl border border-emerald-950 bg-black/40 text-[10px] text-emerald-600 font-mono leading-relaxed space-y-1.5">
                <span className="font-bold text-emerald-400 block">⚡ SYSTEM ROUTING INTEGRITY</span>
                Images are generated in real-time using Google Gemini Imagen model. Video & Voice pipelines are handled via beautiful simulated stream fallbacks, ready to bind with custom API keys in `server.ts`.
              </div>
            </div>

            {/* Right: History List / Job Queue rendering */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-mono text-[9px] text-emerald-500 font-extrabold uppercase tracking-widest">SYNTHETIC ASSETS QUEUE</h4>
                <span className="text-[10px] text-slate-500 font-mono">{studioJobs.length} records</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[550px] overflow-y-auto pr-1">
                {studioJobs.length === 0 ? (
                  <div className="col-span-2 p-10 text-center border border-dashed border-emerald-950 text-slate-600 text-xs font-mono rounded-xl">
                    NO DISPATCHED GENERATION JOBS
                  </div>
                ) : (
                  studioJobs.map((job) => (
                    <div key={job.id} className="p-4 rounded-xl border border-emerald-900 bg-[#020503] space-y-3.5 flex flex-col justify-between shadow-md relative group">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3 font-mono text-[10px]">
                          <div className="flex items-center gap-1.5 uppercase font-bold text-slate-200">
                            {job.type === 'image' && <Image size={11} className="text-emerald-400" />}
                            {job.type === 'video' && <Video size={11} className="text-emerald-400" />}
                            {job.type === 'voice' && <Volume2 size={11} className="text-emerald-400" />}
                            <span>{job.type}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${
                              job.status === 'completed' ? 'bg-[#00ff66]/10 border-emerald-500/50 text-[#00ff66]' :
                              job.status === 'processing' ? 'bg-blue-500/10 border-blue-900 text-blue-400 animate-pulse' : 'bg-rose-500/10 border-rose-950 text-rose-500'
                            }`}>
                              {job.status}
                            </span>
                            <button
                              onClick={() => handleDeleteStudioJob(job.id)}
                              className="text-emerald-800 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                              title="Delete job history"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-300 font-sans font-medium leading-relaxed leading-normal line-clamp-3">
                          "{job.prompt}"
                        </p>
                      </div>

                      {/* Display Outputs */}
                      <div className="space-y-2 pt-2 border-t border-emerald-950/40">
                        {job.status === 'completed' && job.resultUrl && (
                          <div className="rounded-lg overflow-hidden border border-emerald-950/60 bg-black max-h-40 flex items-center justify-center relative">
                            {job.type === 'image' && (
                              <img
                                src={job.resultUrl}
                                alt={job.prompt}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                                onClick={() => setSelectedStudioJob(job)}
                              />
                            )}
                            {job.type === 'video' && (
                              <video
                                src={job.resultUrl}
                                controls
                                muted
                                className="w-full h-full object-cover"
                              />
                            )}
                            {job.type === 'voice' && (
                              <audio
                                src={job.resultUrl}
                                controls
                                className="w-full p-2 h-11"
                              />
                            )}
                          </div>
                        )}

                        {job.status === 'processing' && (
                          job.type === 'voice' ? (
                            <VoiceWaveVisualizer prompt={job.prompt} />
                          ) : (
                            <div className="p-6 text-center bg-black/60 rounded-lg border border-emerald-950/60 flex flex-col items-center justify-center gap-2">
                              <RefreshCw className="text-[#00ff66] animate-spin h-5 w-5" />
                              <span className="text-[9px] text-[#00ff66] font-mono font-bold animate-pulse uppercase">SYNTHESIZING VIA {job.provider || 'AI ENGINE'}...</span>
                              <span className="text-[8px] text-slate-500 font-mono">Aspect Ratio: {job.aspectRatio || '1:1'}</span>
                            </div>
                          )
                        )}

                        {job.status === 'failed' && (
                          <p className="text-[9px] text-rose-400 font-mono border border-rose-950/60 p-2 rounded bg-rose-950/10 leading-normal">
                            ERROR: {job.error || 'Execution timeout'}
                          </p>
                        )}

                        <div className="flex justify-between items-center text-[8px] font-mono text-slate-500 pt-1.5">
                          <span>{job.provider}</span>
                          <span>{new Date(job.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bento Gallery of Creations */}
            {completedImageJobs.length > 0 && (
              <div className="lg:col-span-3 pt-6 mt-2 border-t border-emerald-950/40">
                <InteractiveImageBentoGallery
                  imageItems={completedImageJobs}
                  title="Your Synthetic Art Gallery"
                  description="Drag to pan through your high-resolution generations. Click any tile to inspect model metadata and download."
                />
              </div>
            )}
          </div>
        )}

        {/* 5. MISSION CONTROL RADIAL VIEW */}
        {opsSubTab === 'radial' && (() => {
          // Identify the 7 core pipeline nodes that correspond to our agents
          const coreAgentIds: AgentId[] = ['cortana', 'jarvis', 'aura', 'boss', 'cash', 'forge', 'titan'];
          
          const selectedAgentProfile = agents.find(a => a.id === activeRadialAgentId);
          const selectedPipelineNode = pipelineNodes.find(n => n.id === activeRadialAgentId);
          
          // Latest activities for the selected agent
          const matchingLogs = activityFeed.filter(log => {
            if (!selectedAgentProfile) return false;
            const nameMatch = log.agentName.toLowerCase() === selectedAgentProfile.name.toLowerCase() ||
                              log.agentName.toLowerCase() === activeRadialAgentId.toLowerCase() ||
                              (activeRadialAgentId === 'boss' && log.agentName.toLowerCase() === 'friday') ||
                              (activeRadialAgentId === 'forge' && log.agentName.toLowerCase() === 'nova');
            return nameMatch;
          });

          // Filter tasks from opsTasks
          const matchingTasks = opsTasks.filter(task => {
            return task.agentSource.toLowerCase() === activeRadialAgentId.toLowerCase() ||
                   (activeRadialAgentId === 'boss' && task.agentSource.toLowerCase() === 'friday') ||
                   (activeRadialAgentId === 'forge' && task.agentSource.toLowerCase() === 'nova');
          });

          return (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-300">
              {/* Radial Graph Panel */}
              <div className="xl:col-span-2 p-5 rounded-2xl border border-emerald-950/80 bg-[#020503] flex flex-col justify-between shadow-2xl relative overflow-hidden min-h-[600px]">
                {/* Visual grid backdrop */}
                <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />
                
                {/* Header controls inside panel */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-emerald-950/60 pb-4 z-10">
                  <div>
                    <h3 className="font-display font-black text-sm text-white flex items-center gap-2">
                      <Radar size={16} className="text-emerald-400" />
                      COGNITIVE ORBIT OVERVIEW
                    </h3>
                    <p className="text-[10px] text-emerald-500/70 font-mono mt-0.5">REAL-TIME AGENT INTERSECTION LOGIC</p>
                  </div>
                  
                  {/* Threshold & Status Display */}
                  <div className="flex flex-wrap items-center gap-4 bg-black/60 p-2.5 rounded-xl border border-emerald-950/60">
                    <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold">
                      {hermesConnected ? (
                        <span className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/60 flex items-center gap-1 shadow-sm">
                          <span className="w-1 h-1 rounded-full bg-[#00ff66] animate-pulse" />
                          HERMES: CONNECTED
                        </span>
                      ) : (
                        <span className="text-amber-500 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-950/60 flex items-center gap-1 shadow-sm">
                          <span className="w-1 h-1 rounded-full bg-amber-500" />
                          HERMES: OFFLINE
                        </span>
                      )}
                    </div>

                    <div className="h-4 w-px bg-emerald-950" />

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-emerald-500/60 font-bold block uppercase tracking-wider">STALL THRESHOLD:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="range"
                          min="3"
                          max="30"
                          value={radialStallThreshold}
                          onChange={(e) => setRadialStallThreshold(Number(e.target.value))}
                          className="w-20 accent-emerald-500 h-1 bg-emerald-950 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-[10px] font-mono font-bold text-emerald-400 w-6 text-right">{radialStallThreshold}s</span>
                      </div>
                    </div>
                    
                    <div className="h-4 w-px bg-emerald-950" />
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-emerald-500/60 font-bold block uppercase tracking-wider">STATUS:</span>
                      <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded uppercase ${
                        pipelineIsRunning ? 'bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/20 animate-pulse' : 'bg-zinc-950 text-zinc-500 border border-zinc-800'
                      }`}>
                        {pipelineIsRunning ? 'PIPELINE ACTIVE' : 'PIPELINE IDLE'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* The Radial Stage */}
                <div className="flex-1 w-full h-[420px] relative mt-4 flex items-center justify-center select-none z-10">
                  {/* SVG background connections */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    {coreAgentIds.map((nodeId, idx) => {
                      const angleRad = (idx * 2 * Math.PI) / coreAgentIds.length - Math.PI / 2;
                      const x1 = '50%';
                      const y1 = '50%';
                      
                      // Match coordinates with HTML circles
                      const x2 = `calc(50% + ${Math.cos(angleRad) * 140}px)`;
                      const y2 = `calc(50% + ${Math.sin(angleRad) * 140}px)`;
                      
                      const pNode = pipelineNodes.find(n => n.id === nodeId);
                      const isNodeActive = pNode?.status === 'active';
                      const isNodeCompleted = pNode?.status === 'completed';
                      const isNodeError = pNode?.status === 'error';
                      
                      // Calculate if stalled
                      const lastChangedTime = typeof nodeLastChanged[nodeId] === 'number' ? (nodeLastChanged[nodeId] as number) : Date.now();
                      const elapsed = (Date.now() - lastChangedTime) / 1000;
                      const isStalled = pipelineIsRunning && isNodeActive && elapsed > radialStallThreshold;
                      
                      let strokeColor = 'rgba(16, 185, 129, 0.15)';
                      let dashArray = '3,3';
                      
                      if (isStalled) {
                        strokeColor = 'rgba(239, 68, 68, 0.4)';
                        dashArray = '5,2';
                      } else if (isNodeActive) {
                        strokeColor = 'rgba(0, 255, 102, 0.7)';
                        dashArray = '0';
                      } else if (isNodeCompleted) {
                        strokeColor = 'rgba(16, 185, 129, 0.4)';
                        dashArray = '0';
                      } else if (isNodeError) {
                        strokeColor = 'rgba(244, 63, 94, 0.5)';
                        dashArray = '0';
                      }
                      
                      return (
                        <g key={`line-${nodeId}`}>
                          {/* Pulsing glow layer for active lines */}
                          {isNodeActive && !isStalled && (
                            <line
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke="rgba(0, 255, 102, 0.3)"
                              strokeWidth="4"
                              className="animate-pulse"
                            />
                          )}
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={strokeColor}
                            strokeWidth={isNodeActive ? '2' : '1'}
                            strokeDasharray={dashArray}
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Orbit concentric circles */}
                  <div className="absolute w-[280px] h-[280px] rounded-full border border-emerald-950/40 pointer-events-none" />
                  <div className="absolute w-[180px] h-[180px] rounded-full border border-emerald-950/20 pointer-events-none" />

                  {/* Central Hub Core */}
                  <div className="absolute left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-24 h-24 rounded-full bg-[#020503] border-2 border-emerald-900 flex flex-col justify-center items-center z-20 shadow-[0_0_20px_rgba(16,185,129,0.15)] group hover:border-[#00ff66] hover:shadow-[0_0_25px_rgba(0,255,102,0.3)] transition-all duration-300">
                    <div className={`absolute inset-1 rounded-full border border-dashed border-emerald-800/40 ${pipelineIsRunning ? 'animate-spin' : ''}`} />
                    <Brain className={`h-8 w-8 ${pipelineIsRunning ? 'text-[#00ff66] drop-shadow-[0_0_6px_#00ff66] animate-pulse' : 'text-emerald-700'}`} />
                    <span className="text-[7px] font-mono font-black text-emerald-500 uppercase tracking-widest mt-1.5">CORE ENGINE</span>
                    <span className="text-[6px] font-mono text-emerald-600 font-extrabold uppercase mt-0.5">{pipelineIsRunning ? 'ROUTING' : 'READY'}</span>
                  </div>

                  {/* 7 Orbiting Agent Nodes */}
                  {coreAgentIds.map((nodeId, idx) => {
                    const angleRad = (idx * 2 * Math.PI) / coreAgentIds.length - Math.PI / 2;
                    const x = 50 + Math.cos(angleRad) * 35; // Position in %
                    const y = 50 + Math.sin(angleRad) * 35; // Position in %
                    
                    const agent = agents.find(a => a.id === nodeId);
                    const pNode = pipelineNodes.find(n => n.id === nodeId);
                    const isNodeActive = pNode?.status === 'active';
                    const isNodeCompleted = pNode?.status === 'completed';
                    const isNodeError = pNode?.status === 'error';
                    const isNodeSkipped = pNode?.status === 'skipped';
                    
                    // Stall calculations
                    const lastChangedTime = typeof nodeLastChanged[nodeId] === 'number' ? (nodeLastChanged[nodeId] as number) : Date.now();
                    const elapsed = (Date.now() - lastChangedTime) / 1000;
                    const isStalled = pipelineIsRunning && isNodeActive && elapsed > radialStallThreshold;
                    
                    const isSelected = activeRadialAgentId === nodeId;
                    
                    // State borders & glows
                    let nodeBorder = 'border-emerald-950 hover:border-emerald-600';
                    let nodeGlow = '';
                    let statusLabel = 'IDLE';
                    
                    if (isStalled) {
                      nodeBorder = 'border-rose-500 animate-pulse';
                      nodeGlow = 'shadow-[0_0_15px_rgba(244,63,94,0.6)] bg-rose-950/20';
                      statusLabel = 'STALLED';
                    } else if (isNodeActive) {
                      nodeBorder = 'border-[#00ff66] ring-2 ring-[#00ff66]/30';
                      nodeGlow = 'shadow-[0_0_18px_rgba(0,255,102,0.5)] bg-emerald-900/10';
                      statusLabel = 'RUNNING';
                    } else if (isNodeCompleted) {
                      nodeBorder = 'border-emerald-500';
                      nodeGlow = 'shadow-[0_0_10px_rgba(16,185,129,0.3)] bg-emerald-950/30';
                      statusLabel = 'DONE';
                    } else if (isNodeError) {
                      nodeBorder = 'border-rose-600';
                      nodeGlow = 'shadow-[0_0_12px_rgba(239,68,68,0.4)] bg-rose-950/20';
                      statusLabel = 'ERROR';
                    } else if (isNodeSkipped) {
                      nodeBorder = 'border-slate-800';
                      nodeGlow = 'bg-slate-900/40 opacity-40';
                      statusLabel = 'SKIPPED';
                    }
                    
                    if (isSelected) {
                      nodeBorder += ' ring-4 ring-emerald-400/50 scale-105 z-30';
                    }
                    
                    return (
                      <div
                        key={nodeId}
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          transform: 'translate(-50%, -50%)',
                          position: 'absolute'
                        }}
                        onClick={() => setActiveRadialAgentId(nodeId)}
                        className={`w-14 h-14 rounded-full border-2 cursor-pointer transition-all duration-300 flex items-center justify-center bg-[#020503] ${nodeBorder} ${nodeGlow}`}
                      >
                        {/* Agent Icon / Avatar */}
                        {agent?.icon ? (
                          <img
                            src={agent.icon}
                            alt={agent.name}
                            referrerPolicy="no-referrer"
                            className={`w-11 h-11 rounded-full object-cover select-none ${isNodeSkipped ? 'grayscale' : ''}`}
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-emerald-950/50 flex items-center justify-center text-emerald-400 font-mono font-black text-xs">
                            {agent?.name ? agent.name[0] : nodeId[0].toUpperCase()}
                          </div>
                        )}
                        
                        {/* Status Dot / Stall Alarm Badge */}
                        <span className={`absolute -top-1 -right-1 px-1 py-0.5 rounded text-[7px] font-mono font-black tracking-wider shadow border uppercase ${
                          isStalled ? 'bg-rose-600 text-white border-rose-400 animate-pulse' :
                          isNodeActive ? 'bg-[#00ff66] text-[#020503] border-[#00ff66]' :
                          isNodeCompleted ? 'bg-emerald-600 text-white border-emerald-400' :
                          isNodeError ? 'bg-rose-500 text-white border-rose-400' :
                          isNodeSkipped ? 'bg-slate-800 text-slate-400 border-slate-700' :
                          'bg-emerald-950 text-emerald-500 border-emerald-900'
                        }`}>
                          {statusLabel}
                        </span>

                        {/* Name label at bottom of node */}
                        <span className="absolute top-15 left-[50%] -translate-x-[50%] text-[8px] font-mono font-black text-slate-400 uppercase tracking-widest whitespace-nowrap bg-black/80 px-1.5 py-0.5 rounded border border-emerald-950/60 max-w-[90px] truncate">
                          {agent?.name || nodeId}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Stall detection system log banner */}
                <div className="p-3.5 rounded-xl border border-emerald-950 bg-black/40 text-[10px] text-emerald-600 font-mono leading-relaxed space-y-1.5 z-10 mt-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-bold text-emerald-400 uppercase">SYSTEM DIAGNOSTIC OVERWATCH ENABLED</span>
                  </div>
                  <span>
                    Stall detection is active. If any pipeline node stays in <strong className="text-emerald-400">RUNNING</strong> status for longer than {radialStallThreshold} seconds without progressing or triggering a complete signal, it will trigger an automatic <strong className="text-rose-400">STALL ALERT</strong>, dimming the node connection and sounding internal telemetry flags.
                  </span>
                </div>
              </div>

              {/* Inspector Side Panel */}
              <div className="xl:col-span-1 space-y-4">
                {selectedAgentProfile ? (
                  <div className="p-5 rounded-2xl border border-emerald-900 bg-[#020503] space-y-5 shadow-2xl relative">
                    {/* Header profile */}
                    <div className="flex items-center gap-4 pb-4 border-b border-emerald-950/60">
                      {selectedAgentProfile.icon ? (
                        <img
                          src={selectedAgentProfile.icon}
                          alt={selectedAgentProfile.name}
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-950 shadow-lg shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-emerald-950 flex items-center justify-center text-[#00ff66] font-mono font-black text-lg shrink-0 border-2 border-emerald-900">
                          {selectedAgentProfile.name[0]}
                        </div>
                      )}
                      
                      <div className="space-y-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <h4 className="font-display font-black text-base text-white truncate">{selectedAgentProfile.name}</h4>
                          <span className={`text-[8px] font-mono font-black px-1.5 py-0.5 rounded border ${selectedAgentProfile.enabled !== false ? 'bg-emerald-950 text-[#00ff66] border-emerald-800' : 'bg-rose-950 text-rose-400 border-rose-900'}`}>
                            {selectedAgentProfile.enabled !== false ? 'READY' : 'DISABLED'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono lowercase truncate">{selectedAgentProfile.model}</p>
                        <p className="text-[9px] text-emerald-500/70 font-mono uppercase tracking-wider">SECURE SYST_ID: {activeRadialAgentId.toUpperCase()}</p>
                      </div>
                    </div>

                    {/* Agent Mission Details */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-emerald-500/60 font-bold block uppercase tracking-wider">COGNITIVE DIRECTIVE & PURPOSE</span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedAgentProfile.description}</p>
                    </div>

                    {/* Dynamic Pipeline Node telemetry */}
                    <div className="p-3.5 rounded-xl border border-emerald-950 bg-black/60 space-y-3">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="font-bold text-slate-400 uppercase">PIPELINE NODE RUN STATE</span>
                        <span className={`font-black uppercase ${
                          selectedPipelineNode?.status === 'active' ? 'text-amber-400 animate-pulse' :
                          selectedPipelineNode?.status === 'completed' ? 'text-emerald-400' :
                          selectedPipelineNode?.status === 'error' ? 'text-rose-500' : 'text-slate-500'
                        }`}>
                          {selectedPipelineNode?.status || 'PENDING'}
                        </span>
                      </div>
                      
                      {/* Interactive Emulation Sandbox for Manual Verification */}
                      <div className="space-y-2 pt-2 border-t border-emerald-950/40">
                        <span className="text-[9px] font-mono text-emerald-500/50 font-bold block uppercase tracking-wider">EMULATED LIFE-CYCLE ACTIONS:</span>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setPipelineNodes(nodes => nodes.map(n => n.id === activeRadialAgentId ? { ...n, status: 'active' } : n));
                              setPipelineIsRunning(true);
                              addActivity(selectedAgentProfile.name, selectedAgentProfile.color || '#10b981', `Manual emulation initiated: node state set to active.`);
                            }}
                            className="flex-1 py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9px] font-mono font-bold transition-all cursor-pointer text-center"
                          >
                            RUN EMULATION
                          </button>
                          
                          <button
                            onClick={() => {
                              setPipelineNodes(nodes => nodes.map(n => n.id === activeRadialAgentId ? { ...n, status: 'completed' } : n));
                              addActivity(selectedAgentProfile.name, selectedAgentProfile.color || '#10b981', `Manual emulation resolved: node state set to completed.`);
                            }}
                            className="flex-1 py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[9px] font-mono font-bold transition-all cursor-pointer text-center"
                          >
                            RESOLVE EMULATION
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Assigned Ops Tasks */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-emerald-950/60 pb-1.5">
                        <span className="text-[9px] font-mono text-emerald-500/60 font-bold uppercase tracking-wider">Active Workspace Tasks</span>
                        <span className="text-[10px] text-slate-500 font-mono">{matchingTasks.length} assigned</span>
                      </div>
                      
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {matchingTasks.length === 0 ? (
                          <div className="p-3 text-center border border-dashed border-emerald-950/60 text-slate-600 text-[10px] font-mono rounded-lg">
                            NO JOBS ASSIGNED IN THE CURRENT WORKSPACE
                          </div>
                        ) : (
                          matchingTasks.map(task => (
                            <div key={task.id} className="p-2.5 rounded bg-black/40 border border-emerald-950/50 space-y-1 text-[10px] font-mono">
                              <div className="flex items-center justify-between text-slate-200">
                                <span className="font-bold uppercase text-emerald-400">{task.title}</span>
                                <span className={`text-[8px] font-black uppercase px-1 rounded ${
                                  task.status === 'done' ? 'bg-emerald-950 text-[#00ff66]' : 'bg-amber-950 text-amber-400'
                                }`}>
                                  {task.status}
                                </span>
                              </div>
                              <p className="text-slate-400 text-[9px] leading-relaxed line-clamp-2">{task.detail}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Agent Activity logs */}
                    <div className="space-y-2.5 pt-1.5">
                      <span className="text-[9px] font-mono text-emerald-500/60 font-bold block uppercase tracking-wider">RECENT COGNITIVE TELEMETRY FEED</span>
                      <div className="p-3 rounded-lg bg-black border border-emerald-950 h-36 overflow-y-auto text-[9px] text-emerald-300 font-mono leading-normal space-y-2 scrollbar-thin">
                        {matchingLogs.length === 0 ? (
                          <div className="p-6 text-center text-slate-600">
                            NO LOGS FOUND FOR THIS COGNITIVE INSTANCE
                          </div>
                        ) : (
                          matchingLogs.map((log) => (
                            <div key={log.id} className="space-y-0.5 border-b border-emerald-950/40 pb-1.5 last:border-0 last:pb-0">
                              <div className="flex justify-between items-center text-[8px] text-slate-500">
                                <span className="font-bold text-emerald-500">{log.agentName}</span>
                                <span>{log.timestamp}</span>
                              </div>
                              <p className="text-slate-300 leading-relaxed font-sans">{log.action}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-10 text-center border border-dashed border-emerald-950 text-slate-600 text-xs font-mono rounded-xl">
                    SELECT AN AGENT TO INSPECT COGNITIVE SINAPSIS
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  const renderAgentsGrid = () => {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-emerald-950/40 pb-4">
          <div>
            <h2 className="font-display font-black text-2xl text-white tracking-tight">JoelOS AGENT DECK</h2>
            <p className="text-emerald-500/60 text-xs font-mono uppercase tracking-wider mt-1">ENABLE, CONFIGURE & BENCHMARK COLLABORATIVE CORE INSTANCES</p>
          </div>
          <button
            onClick={() => setShowModelHub(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#00ff66]/10 hover:bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/30 hover:border-[#00ff66]/50 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer h-10 shadow-lg shadow-[#00ff66]/5 uppercase shrink-0"
            title="Open Model Hub to pull or delete local models"
          >
            <Server size={14} />
            <span>Models Hub</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {agents.map((agent) => {
            const isActive = agent.status === 'thinking';
            return (
              <div
                key={agent.id}
                className={`p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
                  agent.enabled === false
                    ? 'border-emerald-950 bg-[#020503]/50 opacity-40'
                    : isActive
                      ? 'border-emerald-400 bg-[#092613] shadow-[0_0_15px_rgba(0,255,102,0.2)] ring-1 ring-emerald-400/30'
                      : 'border-emerald-800 bg-[#05140b] hover:border-emerald-400 hover:bg-[#071b0e]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-950/60">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl select-none">
                        {agent.icon.startsWith('/') ? <img src={agent.icon} alt={agent.name} className="w-8 h-8 inline-block object-cover rounded-full" /> : agent.icon}
                      </span>
                      <div className="space-y-0.5">
                        <span className="font-mono font-black text-sm text-white">{agent.name}</span>
                        <span className="text-[8px] font-mono text-emerald-500 uppercase tracking-widest block font-extrabold">CORE_INSTANCE_{agent.id.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] text-slate-500">{agent.enabled !== false ? 'ENABLED' : 'DISABLED'}</span>
                      <button
                        onClick={() => {
                          const updated = agents.map(a => {
                            if (a.id === agent.id) {
                              return { ...a, enabled: a.enabled === false ? true : false };
                            }
                            return a;
                          });
                          setAgents(updated);
                          const enabledMap = updated.reduce((acc, a) => ({ ...acc, [a.id]: a.enabled !== false }), {});
                          localStorage.setItem('joelos_enabled_agents_v2', JSON.stringify(enabledMap));
                        }}
                        className={`w-9 h-5 rounded-full p-0.5 transition-all cursor-pointer relative ${
                          agent.enabled !== false ? 'bg-[#10b981]' : 'bg-slate-800'
                        }`}
                        title="Toggle Agent status"
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-all transform ${
                          agent.enabled !== false ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed mb-4">{agent.description}</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-emerald-950/60">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between text-xs font-mono">
                    <div className="space-y-1 w-full sm:w-auto">
                      <span className="text-[8px] font-mono text-slate-500 block uppercase tracking-wider font-extrabold">MODEL INSTANCE</span>
                      {agent.id === 'memory' ? (
                        <span className="text-emerald-400 font-bold block py-1.5">Vector Store</span>
                      ) : (
                        <select
                          value={agentModels[agent.id] || (activeModelsList[0]?.id || 'llama3.2')}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updatedModels = { ...agentModels, [agent.id]: val };
                            setAgentModels(updatedModels);
                            localStorage.setItem('joelos_agent_models', JSON.stringify(updatedModels));
                          }}
                          className="text-xs rounded-lg bg-black border border-emerald-900/60 px-2 py-1 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono w-full sm:w-48 h-[30px] cursor-pointer"
                        >
                          {activeModelsList.map(m => (
                            <option key={m.id} value={m.id} className="bg-black text-slate-200">
                              {m.name || m.id} {m.isFree ? ' (FREE)' : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[8px] font-mono text-slate-500 block uppercase tracking-wider font-extrabold">RUN TELEMETRY</span>
                      <span className="text-emerald-300 font-bold font-mono block mt-1">{agent.taskCount || 0} Runs</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <SidebarProvider defaultOpen={false} style={{ "--sidebar-width": "18.5rem", "--sidebar-width-icon": "4.2rem" } as React.CSSProperties}>
      <div className={`h-screen w-full overflow-hidden ${theme === 'light' ? 'bg-[#f3f6f4] text-slate-800' : (theme === 'oled' ? 'bg-[#000000] text-emerald-200/90' : 'bg-[#020403] text-emerald-200/90')} flex flex-col font-sans selection:bg-emerald-500/35 selection:text-white terminal-grid transition-colors duration-300`}>
      <style>{`
        :root {
          --theme-color: ${colorPalette === 'matrix-green' ? '#00ff66' : '#00d2ff'};
          --theme-color-rgb: ${colorPalette === 'matrix-green' ? '0, 255, 102' : '0, 210, 255'};
          
          --theme-emerald-100-rgb: ${colorPalette === 'matrix-green' ? '209, 250, 229' : '224, 242, 254'};
          --theme-emerald-200-rgb: ${colorPalette === 'matrix-green' ? '167, 243, 208' : '186, 230, 253'};
          --theme-emerald-300-rgb: ${colorPalette === 'matrix-green' ? '110, 231, 183' : '125, 211, 252'};
          --theme-emerald-400-rgb: ${colorPalette === 'matrix-green' ? '52, 211, 153' : '56, 189, 248'};
          --theme-emerald-500-rgb: ${colorPalette === 'matrix-green' ? '16, 185, 129' : '14, 165, 233'};
          --theme-emerald-600-rgb: ${colorPalette === 'matrix-green' ? '5, 150, 105' : '2, 132, 199'};
          --theme-emerald-700-rgb: ${colorPalette === 'matrix-green' ? '4, 120, 87' : '3, 105, 161'};
          --theme-emerald-800-rgb: ${colorPalette === 'matrix-green' ? '6, 95, 70' : '7, 89, 133'};
          --theme-emerald-900-rgb: ${colorPalette === 'matrix-green' ? '6, 78, 59' : '12, 74, 110'};
          --theme-emerald-950-rgb: ${colorPalette === 'matrix-green' ? '2, 44, 34' : '8, 47, 73'};

          --theme-emerald-400: ${colorPalette === 'matrix-green' ? '#34d399' : '#38bdf8'};
          --theme-emerald-500: ${colorPalette === 'matrix-green' ? '#10b981' : '#0ea5e9'};
          --theme-emerald-600: ${colorPalette === 'matrix-green' ? '#059669' : '#0284c7'};
          --theme-emerald-300: ${colorPalette === 'matrix-green' ? '#6ee7b7' : '#7dd3fc'};
          --theme-emerald-200: ${colorPalette === 'matrix-green' ? '#a7f3d0' : '#bae6fd'};
          --theme-emerald-950: ${colorPalette === 'matrix-green' ? '#022c22' : '#082f49'};
          --theme-emerald-900: ${colorPalette === 'matrix-green' ? '#064e3b' : '#0c4a6e'};
          --theme-bg-0b2114: ${colorPalette === 'matrix-green' ? '#0b2114' : '#0b1621'};
        }
        
        /* Auto-generated precise theme overrides */

        .border-emerald-900\\/30 { border-color: rgba(var(--theme-emerald-900-rgb), 0.3) !important; }
        .border-emerald-950 { border-color: rgb(var(--theme-emerald-950-rgb)) !important; }
        .text-emerald-400 { color: rgb(var(--theme-emerald-400-rgb)) !important; }
        .bg-emerald-900\\/60 { background-color: rgba(var(--theme-emerald-900-rgb), 0.6) !important; }
        .text-emerald-300 { color: rgb(var(--theme-emerald-300-rgb)) !important; }
        .hover\\:bg-emerald-950\\/40:hover { background-color: rgba(var(--theme-emerald-950-rgb), 0.4) !important; }
        .bg-emerald-900\\/20 { background-color: rgba(var(--theme-emerald-900-rgb), 0.2) !important; }
        .text-\\[\\#00ff66\\] { color: rgb(var(--theme-color-rgb)) !important; }
        .border-\\[\\#00ff66\\] { border-color: rgb(var(--theme-color-rgb)) !important; }
        .bg-emerald-900\\/10 { background-color: rgba(var(--theme-emerald-900-rgb), 0.1) !important; }
        .bg-emerald-500 { background-color: rgb(var(--theme-emerald-500-rgb)) !important; }
        .text-emerald-500 { color: rgb(var(--theme-emerald-500-rgb)) !important; }
        .border-emerald-500\\/20 { border-color: rgba(var(--theme-emerald-500-rgb), 0.2) !important; }
        .text-emerald-700 { color: rgb(var(--theme-emerald-700-rgb)) !important; }
        .border-emerald-950\\/60 { border-color: rgba(var(--theme-emerald-950-rgb), 0.6) !important; }
        .border-emerald-950\\/40 { border-color: rgba(var(--theme-emerald-950-rgb), 0.4) !important; }
        .text-emerald-500\\/50 { color: rgba(var(--theme-emerald-500-rgb), 0.5) !important; }
        .border-emerald-500\\/40 { border-color: rgba(var(--theme-emerald-500-rgb), 0.4) !important; }
        .bg-emerald-950\\/15 { background-color: rgba(var(--theme-emerald-950-rgb), 0.15) !important; }
        .border-emerald-950\\/30 { border-color: rgba(var(--theme-emerald-950-rgb), 0.3) !important; }
        .group-hover\\:border-emerald-500\\/40:hover { border-color: rgba(var(--theme-emerald-500-rgb), 0.4) !important; }
        .bg-\\[\\#00ff66\\]\\/85 { background-color: rgba(var(--theme-color-rgb), 0.85) !important; }
        .border-emerald-400\\/20 { border-color: rgba(var(--theme-emerald-400-rgb), 0.2) !important; }
        .bg-emerald-700\\/85 { background-color: rgba(var(--theme-emerald-700-rgb), 0.85) !important; }
        .text-emerald-500\\/60 { color: rgba(var(--theme-emerald-500-rgb), 0.6) !important; }
        .text-emerald-500\\/80 { color: rgba(var(--theme-emerald-500-rgb), 0.8) !important; }
        .hover\\:bg-emerald-950\\/10:hover { background-color: rgba(var(--theme-emerald-950-rgb), 0.1) !important; }
        .text-emerald-200\\/90 { color: rgba(var(--theme-emerald-200-rgb), 0.9) !important; }
        .bg-emerald-950\\/10 { background-color: rgba(var(--theme-emerald-950-rgb), 0.1) !important; }
        .border-emerald-500\\/10 { border-color: rgba(var(--theme-emerald-500-rgb), 0.1) !important; }
        .text-emerald-200 { color: rgb(var(--theme-emerald-200-rgb)) !important; }
        .bg-emerald-950\\/40 { background-color: rgba(var(--theme-emerald-950-rgb), 0.4) !important; }
        .hover\\:bg-emerald-900\\/40:hover { background-color: rgba(var(--theme-emerald-900-rgb), 0.4) !important; }
        .text-emerald-300\\/90 { color: rgba(var(--theme-emerald-300-rgb), 0.9) !important; }
        .bg-emerald-950\\/30 { background-color: rgba(var(--theme-emerald-950-rgb), 0.3) !important; }
        .bg-emerald-500\\/35 { background-color: rgba(var(--theme-emerald-500-rgb), 0.35) !important; }
        .hover\\:text-\\[\\#00ff66\\]:hover { color: rgb(var(--theme-color-rgb)) !important; }
        .hover\\:text-emerald-400:hover { color: rgb(var(--theme-emerald-400-rgb)) !important; }
        .hover\\:text-emerald-500:hover { color: rgb(var(--theme-emerald-500-rgb)) !important; }
        .hover\\:text-emerald-300:hover { color: rgb(var(--theme-emerald-300-rgb)) !important; }
        .text-emerald-600 { color: rgb(var(--theme-emerald-600-rgb)) !important; }
        .hover\\:text-emerald-600:hover { color: rgb(var(--theme-emerald-600-rgb)) !important; }
        .bg-\\[\\#00ff66\\] { background-color: rgb(var(--theme-color-rgb)) !important; }
        .ring-\\[\\#00ff66\\] { --tw-ring-color: rgb(var(--theme-color-rgb)) !important; }
        .bg-emerald-400 { background-color: rgb(var(--theme-emerald-400-rgb)) !important; }
        .bg-emerald-900 { background-color: rgb(var(--theme-emerald-900-rgb)) !important; }
        .bg-emerald-950 { background-color: rgb(var(--theme-emerald-950-rgb)) !important; }
        .bg-\\[\\#10b981\\] { background-color: rgb(var(--theme-emerald-500-rgb)) !important; }
        .border-emerald-400 { border-color: rgb(var(--theme-emerald-400-rgb)) !important; }
        .border-emerald-500 { border-color: rgb(var(--theme-emerald-500-rgb)) !important; }
        .border-emerald-900 { border-color: rgb(var(--theme-emerald-900-rgb)) !important; }
        .border-\\[\\#10b981\\] { border-color: rgb(var(--theme-emerald-500-rgb)) !important; }
        .text-emerald-100 { color: rgb(var(--theme-emerald-100-rgb)) !important; }
        .bg-emerald-9 { background-color: rgb(var(--theme-emerald-9-rgb)) !important; }
        .border-emerald-9 { border-color: rgb(var(--theme-emerald-9-rgb)) !important; }
        .text-emerald-2 { color: rgb(var(--theme-emerald-2-rgb)) !important; }
        .text-emerald-3 { color: rgb(var(--theme-emerald-3-rgb)) !important; }
        .text-emerald-4 { color: rgb(var(--theme-emerald-4-rgb)) !important; }
        .text-emerald-6 { color: rgb(var(--theme-emerald-6-rgb)) !important; }
        .hover\\:bg-emerald-9:hover { background-color: rgb(var(--theme-emerald-9-rgb)) !important; }
        .hover\\:bg-\\[\\#00ff66\\]:hover { background-color: rgb(var(--theme-color-rgb)) !important; }
        .text-emerald-5 { color: rgb(var(--theme-emerald-5-rgb)) !important; }
        .text-emerald-7 { color: rgb(var(--theme-emerald-7-rgb)) !important; }
        .bg-\\[\\#00ff66\\]\\/1 { background-color: rgba(var(--theme-color-rgb), 0.01) !important; }
        .bg-\\[\\#10b981\\]\\/2 { background-color: rgba(var(--theme-emerald-500-rgb), 0.02) !important; }
        .bg-emerald-950\\/1 { background-color: rgba(var(--theme-emerald-950-rgb), 0.01) !important; }
        .border-emerald-900\\/35 { border-color: rgba(var(--theme-emerald-900-rgb), 0.35) !important; }
        .border-emerald-900\\/50 { border-color: rgba(var(--theme-emerald-900-rgb), 0.5) !important; }
        .bg-emerald-500\\/5 { background-color: rgba(var(--theme-emerald-500-rgb), 0.05) !important; }
        .bg-emerald-500\\/15 { background-color: rgba(var(--theme-emerald-500-rgb), 0.15) !important; }
        .border-emerald-500\\/35 { border-color: rgba(var(--theme-emerald-500-rgb), 0.35) !important; }
        .text-emerald-400\\/60 { color: rgba(var(--theme-emerald-400-rgb), 0.6) !important; }
        .border-emerald-900\\/40 { border-color: rgba(var(--theme-emerald-900-rgb), 0.4) !important; }
        .bg-\\[\\#10b981\\]\\/20 { background-color: rgba(var(--theme-emerald-500-rgb), 0.2) !important; }
        .border-\\[\\#10b981\\]\\/40 { border-color: rgba(var(--theme-emerald-500-rgb), 0.4) !important; }
        .hover\\:bg-emerald-950\\/80:hover { background-color: rgba(var(--theme-emerald-950-rgb), 0.8) !important; }
        .hover\\:border-emerald-500\\/30:hover { border-color: rgba(var(--theme-emerald-500-rgb), 0.3) !important; }
        .bg-emerald-900\\/40 { background-color: rgba(var(--theme-emerald-900-rgb), 0.4) !important; }
        .border-emerald-500\\/50 { border-color: rgba(var(--theme-emerald-500-rgb), 0.5) !important; }
        .bg-\\[\\#10b981\\]\\/25 { background-color: rgba(var(--theme-emerald-500-rgb), 0.25) !important; }
        .hover\\:bg-\\[\\#10b981\\]\\/5:hover { background-color: rgba(var(--theme-emerald-500-rgb), 0.05) !important; }
        .bg-emerald-950\\/50 { background-color: rgba(var(--theme-emerald-950-rgb), 0.5) !important; }
        .border-emerald-500\\/25 { border-color: rgba(var(--theme-emerald-500-rgb), 0.25) !important; }
        .bg-\\[\\#00ff66\\]\\/10 { background-color: rgba(var(--theme-color-rgb), 0.1) !important; }
        .border-\\[\\#00ff66\\]\\/20 { border-color: rgba(var(--theme-color-rgb), 0.2) !important; }
        .hover\\:border-emerald-900\\/60:hover { border-color: rgba(var(--theme-emerald-900-rgb), 0.6) !important; }
        .hover\\:bg-emerald-800\\/80:hover { background-color: rgba(var(--theme-emerald-800-rgb), 0.8) !important; }
        .text-emerald-400\\/80 { color: rgba(var(--theme-emerald-400-rgb), 0.8) !important; }
        .bg-emerald-950\\/60 { background-color: rgba(var(--theme-emerald-950-rgb), 0.6) !important; }
        .text-emerald-800 { color: rgb(var(--theme-emerald-800-rgb)) !important; }
        .text-emerald-600\\/60 { color: rgba(var(--theme-emerald-600-rgb), 0.6) !important; }
        .bg-emerald-900\\/25 { background-color: rgba(var(--theme-emerald-900-rgb), 0.25) !important; }
        .ring-emerald-400 { --tw-ring-color: rgb(var(--theme-emerald-400-rgb)) !important; }
        .border-emerald-500\\/30 { border-color: rgba(var(--theme-emerald-500-rgb), 0.3) !important; }
        .bg-emerald-500\\/10 { background-color: rgba(var(--theme-emerald-500-rgb), 0.1) !important; }
        .text-emerald-500\\/70 { color: rgba(var(--theme-emerald-500-rgb), 0.7) !important; }
        .border-emerald-900\\/20 { border-color: rgba(var(--theme-emerald-900-rgb), 0.2) !important; }
        .border-emerald-400\\/40 { border-color: rgba(var(--theme-emerald-400-rgb), 0.4) !important; }
        .hover\\:border-emerald-500\\/55:hover { border-color: rgba(var(--theme-emerald-500-rgb), 0.55) !important; }
        .text-emerald-400\\/50 { color: rgba(var(--theme-emerald-400-rgb), 0.5) !important; }
        .bg-emerald-900\\/30 { background-color: rgba(var(--theme-emerald-900-rgb), 0.3) !important; }
        .hover\\:bg-emerald-800\\/40:hover { background-color: rgba(var(--theme-emerald-800-rgb), 0.4) !important; }
        .hover\\:bg-emerald-950:hover { background-color: rgb(var(--theme-emerald-950-rgb)) !important; }
        .bg-emerald-950\\/20 { background-color: rgba(var(--theme-emerald-950-rgb), 0.2) !important; }
        .border-emerald-900\\/60 { border-color: rgba(var(--theme-emerald-900-rgb), 0.6) !important; }
        .hover\\:bg-\\[\\#10b981\\]\\/30:hover { background-color: rgba(var(--theme-emerald-500-rgb), 0.3) !important; }
        .hover\\:border-emerald-400:hover { border-color: rgb(var(--theme-emerald-400-rgb)) !important; }
        .ring-emerald-500 { --tw-ring-color: rgb(var(--theme-emerald-500-rgb)) !important; }
        .border-\\[\\#00ff66\\]\\/50 { border-color: rgba(var(--theme-color-rgb), 0.5) !important; }
        .hover\\:border-emerald-900:hover { border-color: rgb(var(--theme-emerald-900-rgb)) !important; }
        .hover\\:bg-emerald-950\\/50:hover { background-color: rgba(var(--theme-emerald-950-rgb), 0.5) !important; }
        .border-emerald-800\\/60 { border-color: rgba(var(--theme-emerald-800-rgb), 0.6) !important; }
        .border-emerald-500\\/60 { border-color: rgba(var(--theme-emerald-500-rgb), 0.6) !important; }
        .group-hover\\:text-emerald-300:hover { color: rgb(var(--theme-emerald-300-rgb)) !important; }
        .border-emerald-950\\/80 { border-color: rgba(var(--theme-emerald-950-rgb), 0.8) !important; }
        .hover\\:bg-emerald-900\\/50:hover { background-color: rgba(var(--theme-emerald-900-rgb), 0.5) !important; }


                ::-webkit-scrollbar-thumb {
          background: rgba(${colorPalette === 'matrix-green' ? '34, 197, 94' : '14, 165, 233'}, 0.2) !important;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(${colorPalette === 'matrix-green' ? '34, 197, 94' : '14, 165, 233'}, 0.4) !important;
        }
        .glow-emerald {
          box-shadow: 0 0 15px rgba(${colorPalette === 'matrix-green' ? '34, 197, 94, 0.35' : '14, 165, 233, 0.35'}) !important;
        }
        .shadow-\\[0_0_8px_rgba\\(16\\,185\\,129\\,0\\.6\\)\\] {
          box-shadow: 0 0 8px rgba(${colorPalette === 'matrix-green' ? '16, 185, 129, 0.6' : '14, 165, 233, 0.6'}) !important;
        }
        .shadow-\\[0_0_12px_rgba\\(0\\,255\\,102\\,0\\.35\\)\\] {
          box-shadow: 0 0 12px rgba(var(--theme-color-rgb), 0.35) !important;
        }
        .shadow-\\[0_0_8px_rgba\\(16\\,185\\,129\\,0\\.2\\)\\] {
          box-shadow: 0 0 8px rgba(${colorPalette === 'matrix-green' ? '16, 185, 129, 0.2' : '14, 165, 233, 0.2'}) !important;
        }
        svg path[stroke="#00ff66"], svg path[stroke="#00FF66"] {
          stroke: var(--theme-color) !important;
        }
        
        ${theme === 'light' ? `
          .min-h-screen {
            background-color: #f3f6f4 !important;
            color: #1e293b !important;
          }
          header, aside, main, pre {
            background-color: #ffffff !important;
            border-color: #cbd5e1 !important;
          }
          main {
            background-color: #f8fafc !important;
          }
          input, select, textarea {
            background-color: #ffffff !important;
            border-color: ${colorPalette === 'matrix-green' ? '#10b981' : '#0ea5e9'} !important;
            color: #0f172a !important;
          }
          input::placeholder, textarea::placeholder {
            color: #94a3b8 !important;
          }
          
          /* Generic dark background overrides */
          [class*="bg-[#0"]:not([class*="bg-[#00ff66]"]):not([class*="bg-[#000000]"]) {
            background-color: #ffffff !important;
            border-color: ${colorPalette === 'matrix-green' ? '#10b981' : '#0ea5e9'} !important;
          }
          
          [class*="bg-emerald-9"] {
            background-color: #f1f5f9 !important;
          }
          
          [class*="border-[#0"]:not([class*="border-[#00ff66]"]):not([class*="border-[#000000]"]),
          [class*="border-emerald-9"] {
            border-color: ${colorPalette === 'matrix-green' ? '#10b981' : '#0ea5e9'} !important;
          }
          
          /* Generic text overrides - placed after backgrounds to ensure they win */
          h1, h2, h3, h4, h5, h6, 
          [class*="text-slate-1"], [class*="text-slate-2"], [class*="text-slate-3"], [class*="text-white"] {
            color: #1e293b !important;
          }
          
          [class*="text-[#00ff66]"], [class*="text-emerald-2"], [class*="text-emerald-3"], [class*="text-emerald-4"], [class*="text-emerald-6"] {
            color: ${colorPalette === 'matrix-green' ? '#047857' : '#0284c7'} !important;
          }
          
          code {
            color: #334155 !important;
          }
          
          [class*="hover:bg-emerald-9"]:hover, [class*="hover:bg-[#0"]:not([class*="hover:bg-[#00ff66]"]):not([class*="hover:bg-[#000000]"]):hover {
            background-color: #cbd5e1 !important;
          }
          
          .bg-black\\/35, .bg-black\\/60 {
            background-color: #f8fafc !important;
            color: #334155 !important;
          }
          
          [class*="text-emerald-5"], [class*="text-emerald-7"] {
            color: #475569 !important;
          }
          
          [class*="bg-[#00ff66]/1"], [class*="bg-[#10b981]/2"], [class*="bg-emerald-950/1"] {
            background-color: ${colorPalette === 'matrix-green' ? '#f0fdf4' : '#f0f9ff'} !important;
            color: ${colorPalette === 'matrix-green' ? '#166534' : '#075985'} !important;
          }
        ` : ''}
      `}</style>
      
      {/* Top OS Title Header */}
      <header className={`border-b border-emerald-900/35 ${theme === 'oled' ? 'bg-[#050505]' : 'bg-[#08120c]'} px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 transition-all duration-300 shadow-md shrink-0`}>
        <div className="flex items-center gap-3">
          {/* Hamburger menu for mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex lg:hidden p-2 rounded-lg border border-emerald-900/50 hover:bg-emerald-950/40 text-emerald-400 cursor-pointer min-w-[44px] min-h-[44px] items-center justify-center transition-colors"
            title="Toggle Sidebar"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Connected Neon-Green "jb" Logo Icon (mimics uploaded favicon precisely) */}
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-[#010302] border border-emerald-500/40 shadow-lg shadow-emerald-500/15 shrink-0 overflow-hidden group hidden sm:flex">
            <svg viewBox="0 0 100 100" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="logo-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Connected lowercase j-b ligature path */}
              <path 
                d="M40 22V60C40 71 33 78 21 78C15 78 13 73 13 67" 
                stroke="#00ff66" 
                strokeWidth="8.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                filter="url(#logo-glow)"
                className="group-hover:stroke-emerald-400 transition-colors duration-300"
              />
              <path 
                d="M40 48C40 33 53 27 65 27C77 27 87 37 87 49C87 61 77 71 65 71C53 71 40 65 40 48Z" 
                stroke="#00ff66" 
                strokeWidth="8.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                filter="url(#logo-glow)"
                className="group-hover:stroke-emerald-400 transition-colors duration-300"
              />
            </svg>
            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <h1 className="font-sans font-bold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-emerald-50 to-emerald-400 bg-clip-text text-transparent">JoelOS</h1>
              <span className="text-[10px] font-mono uppercase font-black bg-emerald-500/15 border border-emerald-500/35 px-2.5 py-0.5 rounded-full text-emerald-400 tracking-wider">v1.2.0</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher for Pipeline vs Private Agent Chat */}
        {activeTab === 'pipeline' && (
          <div className={`hidden md:flex border border-emerald-900/40 bg-[#020503] rounded-xl p-1 shrink-0 gap-1`}>
            <button
              onClick={() => setChatTab('global')}
              className={`px-3 py-1.5 text-[11px] font-mono font-bold tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                chatTab === 'global'
                  ? 'bg-emerald-950/80 text-white border border-emerald-500/40 shadow-[0_0_8px_rgba(0,255,102,0.15)] font-black'
                  : 'text-emerald-500/60 hover:text-emerald-400 border border-transparent hover:bg-emerald-950/40'
              }`}
            >
              <Terminal size={12} />
              <span>ORCHESTRATOR PIPELINE</span>
            </button>
            <button
              onClick={() => setChatTab('private')}
              className={`px-3 py-1.5 text-[11px] font-mono font-bold tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                chatTab === 'private'
                  ? 'bg-emerald-950/80 text-white border border-emerald-500/40 shadow-[0_0_8px_rgba(0,255,102,0.15)] font-black'
                  : 'text-emerald-500/60 hover:text-emerald-400 border border-transparent hover:bg-emerald-950/40'
              }`}
            >
              <MessageSquare size={12} />
              <span>PRIVATE AGENT CHAT</span>
            </button>
          </div>
        )}

        {/* Global Connection Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Ollama Connection Indicator */}
          <button
            onClick={() => setShowModelHub(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#020503] hover:bg-emerald-950/30 border border-emerald-950 hover:border-emerald-500/30 text-xs font-mono transition-all cursor-pointer"
            title="Open Model Hub"
          >
            <span className={`w-2.5 h-2.5 rounded-full ${ollamaConnectionStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-amber-500 animate-pulse'}`}></span>
            <span className="text-emerald-400">
              {ollamaConnectionStatus === 'connected' 
                ? `Ollama: Active (${installedOllamaModels.length} models)` 
                : ollamaConnectionStatus === 'failed' 
                  ? 'Ollama: Offline' 
                  : 'Ollama: Connecting...'}
            </span>
          </button>

          {/* Engine Selector */}
          <div className="flex items-center rounded-xl bg-[#020503] p-1 border border-emerald-900/40 shrink-0">
            <button
              onClick={() => {
                const lastCloud = (localStorage.getItem('joelos_last_cloud_engine') || 'gemini') as 'gemini' | 'openai' | 'openrouter';
                setEngine(lastCloud);
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px] ${engine !== 'ollama' && engine !== 'hermes' ? 'bg-[#10b981]/20 text-emerald-300 border border-[#10b981]/40 shadow-sm' : 'text-emerald-600 hover:text-emerald-400'}`}
              title="Switch to Cloud Orchestration"
            >
              <Sparkles size={12} />
              <span className="hidden sm:inline">Cloud</span>
            </button>
            <button
              onClick={() => setEngine('ollama')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px] ${engine === 'ollama' ? 'bg-[#10b981]/20 text-emerald-300 border border-[#10b981]/40 shadow-sm' : 'text-emerald-600 hover:text-emerald-400'}`}
              title="Switch to Local Orchestration"
            >
              <Terminal size={12} />
              <span className="hidden sm:inline">Local</span>
            </button>
            <button
              onClick={() => setEngine('hermes')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px] ${engine === 'hermes' ? 'bg-[#10b981]/20 text-emerald-300 border border-[#10b981]/40 shadow-sm' : 'text-emerald-600 hover:text-emerald-400'}`}
              title="Switch to Hermes Router Gateway"
            >
              <Cpu size={12} />
              <span className="hidden sm:inline">Hermes</span>
            </button>
          </div>

          {/* Visual Customization Buttons */}
          <div className="flex items-center gap-2 bg-[#020503] p-1 rounded-xl border border-emerald-900/40 shrink-0">
            {/* Theme Toggle Button */}
            <button
              onClick={() => {
                const themes = ['dark', 'light', 'oled'];
                const nextTheme = themes[(themes.indexOf(theme) + 1) % themes.length] as 'dark' | 'light' | 'oled';
                setTheme(nextTheme);
                localStorage.setItem('joelos_theme', nextTheme);
              }}
              className="w-8 h-8 rounded-lg border border-transparent bg-transparent hover:bg-emerald-950/80 hover:border-emerald-500/30 flex justify-center items-center transition-all focus:outline-none focus:ring-0 focus:ring-offset-0"
              title={`Switch Theme (Current: ${theme})`}
            >
              {theme === 'dark' ? <Moon size={16} className="text-emerald-500" /> : theme === 'light' ? <Sun size={16} className="text-emerald-500" /> : <Sun size={16} className="text-emerald-500 opacity-60" />}
            </button>

            <div className="w-[1px] h-4 bg-emerald-900/40"></div>

            {/* Color Palette Dropdown Select */}
            <Select 
              value={colorPalette} 
              onValueChange={(val: any) => { 
                setColorPalette(val); 
                localStorage.setItem('joelos_color_palette', val); 
              }}
            >
              <SelectTrigger className="w-8 h-8 rounded-lg border border-transparent bg-transparent shadow-none hover:bg-emerald-950/80 hover:border-emerald-500/30 p-0 flex justify-center items-center [&>svg:last-child]:hidden focus:ring-0 focus:ring-offset-0 transition-all">
                <Palette size={16} className="text-emerald-500" />
              </SelectTrigger>
              <SelectContent className="bg-[#020403] border border-emerald-500/50 shadow-xl shadow-emerald-900/20">
                <SelectItem value="matrix-green" className="text-[#00ff66] font-mono text-xs focus:bg-emerald-900 focus:text-[#00ff66] cursor-pointer">Phosphor</SelectItem>
                <SelectItem value="cyber-blue" className="text-cyan-400 font-mono text-xs focus:bg-cyan-900 focus:text-cyan-400 cursor-pointer">Cyber</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick Utility Icons Group */}
          <div className="flex items-center gap-1 bg-[#020503] p-1 rounded-xl border border-emerald-900/40 shrink-0">
            {/* Keyboard Shortcuts Trigger */}
            <button
              onClick={() => setShortcutsOpen(true)}
              className="p-2 rounded-lg text-emerald-500 hover:text-emerald-300 hover:bg-emerald-950/40 transition-all cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              title="Show Keyboard Shortcuts Panel (?)"
            >
              <HelpCircle size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Top Navigation Bar */}
      <nav className={`border-b border-emerald-900/30 ${theme === 'oled' ? 'bg-[#000000]' : 'bg-[#030805]'} px-6 py-2 flex items-center justify-between shrink-0 font-mono text-xs z-20 gap-4 overflow-x-auto no-scrollbar`}>
        <div className="flex items-center gap-1.5 md:gap-3 overflow-x-auto no-scrollbar flex-1">
          {[
            { id: 'command-center', label: 'COMMAND CENTER', icon: <LayoutDashboard size={14} /> },
            { id: 'pipeline', label: 'PIPELINE', icon: <Terminal size={14} /> },
            { id: 'operations', label: 'OPERATIONS', icon: <Trello size={14} /> },
            { id: 'agents', label: 'AGENTS', icon: <Bot size={14} /> },
            { id: 'mail', label: 'MAIL', icon: <Mail size={14} /> },
            { id: 'settings', label: 'SETTINGS', icon: <Settings size={14} /> }
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id as Tab);
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer select-none border whitespace-nowrap font-black tracking-wider text-[10px] sm:text-[11px] ${
                  isActive
                    ? 'bg-[#10b981]/20 text-[#00ff66] border-emerald-500/50 shadow-[0_0_10px_rgba(0,255,102,0.15)] font-black'
                    : 'text-emerald-600 hover:text-emerald-400 border-transparent hover:bg-emerald-950/20'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Global Action Triggers floating right */}
        <div className="flex items-center gap-2 shrink-0 border-l border-emerald-900/30 pl-3">
          <button
            onClick={() => setIsPipelineDrawerOpen(true)}
            className="px-2.5 py-1.5 rounded-lg border border-emerald-900/40 text-emerald-500 hover:text-[#00ff66] hover:border-emerald-500/40 hover:bg-emerald-950/20 flex items-center gap-1.5 cursor-pointer select-none font-bold text-[10px] transition-all"
            title="Execution Pipeline Graph"
          >
            <Workflow size={12} />
            <span className="hidden md:inline">FLOW GRAPH</span>
          </button>
          <button
            onClick={() => setIsMemoryDrawerOpen(true)}
            className="px-2.5 py-1.5 rounded-lg border border-emerald-900/40 text-emerald-500 hover:text-[#00ff66] hover:border-emerald-500/40 hover:bg-emerald-950/20 flex items-center gap-1.5 cursor-pointer select-none font-bold text-[10px] transition-all"
            title="Athena memory history ledger"
          >
            <Database size={12} />
            <span className="hidden md:inline">ATHENA LEDGER</span>
          </button>
        </div>
      </nav>

      {/* Main Container Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">

        <Sidebar side="left" collapsible="icon" className="border-r border-emerald-900/30 z-20 font-mono shadow-xl">
          <SidebarContent className={`${theme === 'oled' ? 'bg-[#000000]' : 'bg-[#050c08]'} gap-0`}>
            
            <SidebarGroup className="flex-1 min-h-0 py-5 group-data-[collapsible=icon]:px-2 group-data-[collapsible=offcanvas]:p-5">
              
              <div className="flex items-center justify-between mb-4 shrink-0 group-data-[collapsible=icon]:hidden">
                <h3 className="text-[10px] uppercase tracking-widest text-emerald-300 font-bold flex items-center gap-2 px-2.5 py-1 rounded bg-[#0b2114] border border-emerald-500/25">
                  <Layers size={11} className="text-[#00ff66]" />
                  <span>Core Agents</span>
                </h3>
                <span className="text-[10px] bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/20 px-2 py-0.5 rounded font-bold">
                  {agents.filter(a => a.enabled !== false).length} ONLINE
                </span>
              </div>
              <div className="mb-4 shrink-0 mt-4 group-data-[collapsible=offcanvas]:hidden hidden group-data-[collapsible=icon]:flex justify-center" title="Core Agents">
                <Layers size={18} className="text-emerald-500/80" />
              </div>

              <div className="space-y-1.5 overflow-y-auto flex-1 select-none pr-1 group-data-[collapsible=icon]:no-scrollbar group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1.5 group-data-[collapsible=icon]:pr-0">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    title={`${agent.name}: ${agent.description}`}
                    className={`relative rounded-xl border transition-all flex items-center gap-2.5 p-2 group-data-[collapsible=icon]:p-0.5 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:justify-center ${
                      agent.enabled === false
                        ? 'border-emerald-950/30 bg-[#050a08]/50 opacity-50'
                        : agent.status === 'thinking'
                          ? 'border-emerald-400 bg-[#0d2719] shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                          : 'border-emerald-950 bg-[#091510]/50 hover:bg-[#0c1e16] hover:border-emerald-900/60'
                    }`}
                  >
                    <div className={`shrink-0 filter grayscale-0 opacity-100 transition-all flex items-center justify-center`}>
                      {agent.icon.startsWith('/') ? <img src={agent.icon} alt={agent.name} className="w-8 h-8 group-data-[collapsible=icon]:w-7 group-data-[collapsible=icon]:h-7 object-cover rounded-full border border-emerald-950 shadow-inner" /> : agent.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-100">{agent.name}</span>
                          <button
                            onClick={() => {
                              if (pipelineIsRunning) return;
                              setAgents(prev => {
                                const next = prev.map(a => a.id === agent.id ? { ...a, enabled: a.enabled === false ? true : false } : a);
                                const enabledMap = next.reduce((acc, a) => ({ ...acc, [a.id]: a.enabled }), {});
                                localStorage.setItem('joelos_enabled_agents', JSON.stringify(enabledMap));
                                return next;
                              });
                            }}
                            disabled={pipelineIsRunning}
                            className={`text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider transition-all border ${
                              agent.enabled === false 
                                ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-700 cursor-pointer' 
                                : 'bg-emerald-950 text-[#00ff66] hover:bg-[#041d0e] border-emerald-500/40 cursor-pointer shadow-[0_0_4px_rgba(0,255,102,0.15)]'
                            }`}
                          >
                            {agent.enabled === false ? 'OFF' : 'ON'}
                          </button>
                        </div>
                        <span className="text-[9px] font-mono text-emerald-400/80 truncate max-w-[85px] bg-emerald-950/40 px-1 py-0.5 rounded">{agent.model}</span>
                      </div>
                      {(agentTimings[agent.id] || agentTokens[agent.id]) && (
                        <div className="flex items-center gap-2 mt-2 text-[9px] font-mono text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/20 w-fit">
                          {agentTimings[agent.id] && (
                            <span className="flex items-center gap-1">
                              <Clock size={9} className="text-[#00ff66]" />
                              {agentTimings[agent.id]}
                            </span>
                          )}
                          {agentTimings[agent.id] && agentTokens[agent.id] && (
                            <span className="text-emerald-800">•</span>
                          )}
                          {agentTokens[agent.id] && (
                            <span className="flex items-center gap-1">
                              <Layers size={9} className="text-[#00ff66]" />
                              {agentTokens[agent.id]} T
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Pulsing Status Dot */}
                    <div className="relative flex items-center justify-center shrink-0">
                      <span className={`w-2.5 h-2.5 rounded-full ${agent.dotColor} ${agent.status === 'thinking' ? 'animate-status-pulse text-[#00ff66]' : ''}`}></span>
                      {agent.status === 'thinking' && (
                        <span className="absolute w-2.5 h-2.5 rounded-full border border-emerald-400 animate-ping"></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SidebarGroup>

          </SidebarContent>

          <SidebarFooter className={`${theme === 'oled' ? 'bg-[#000000]' : 'bg-[#050c08]'} p-5 pt-4 border-t border-emerald-900/35 group-data-[collapsible=icon]:hidden`}>
            <div className="text-[10px] font-mono text-emerald-400/80 space-y-2 shrink-0">
              <div className="flex justify-between">
                <span>SESSION TOKENS:</span>
                <span className="text-[#00ff66] font-bold">{sessionTokens.toLocaleString()} T</span>
              </div>
              <div className="flex justify-between">
                <span>LOCAL MODELS:</span>
                <span className="text-[#00ff66] font-bold">{installedOllamaModels.length} DETECTED</span>
              </div>
              <div className="flex justify-between">
                <span>LEDGER SIZE:</span>
                <span className="text-[#00ff66] font-bold">{memories.length} ENTRIES</span>
              </div>
              <div className="flex justify-between">
                <span>EMBEDDING VECTOR:</span>
                <span className="text-[#00ff66] font-bold">{engine === 'gemini' ? '768-D GEMINI' : '128-D LOCAL'}</span>
              </div>
              <div className="flex justify-between">
                <span>OLLAMA STATUS:</span>
                <span className={`${ollamaConnectionStatus === 'connected' ? 'text-[#00ff66]' : 'text-amber-500'} font-bold uppercase`}>{ollamaConnectionStatus}</span>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* MIDDLE COLUMN: Chat Interface & Visual Orchestrator Flow */}
        <main className={`flex-1 flex flex-col overflow-hidden relative ${theme === 'oled' ? 'bg-[#000000]' : 'bg-[#040806]'} transition-colors duration-300`}>
          <div className="absolute top-4 left-4 z-20 md:hidden">
            <SidebarTrigger className="bg-[#0b2114] text-emerald-400 border border-emerald-500/30 rounded-lg p-2" />
          </div>
          
          {activeTab === 'command-center' ? (
            renderCommandCenter()
          ) : activeTab === 'pipeline' ? (
            <>
              {chatTab === 'global' ? (
                <>
                  {/* Chat log & outputs area */}
              <div 
                className="flex-1 overflow-y-auto p-6 space-y-6"
                onScroll={(e) => {
                  const target = e.target as HTMLDivElement;
                  const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 40;
                  setIsAutoScrollEnabled(isAtBottom);
                }}
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-full scale-125 animate-pulse"></div>
                      <div className="relative w-16 h-16 rounded-2xl border border-emerald-400/40 bg-[#020503] flex items-center justify-center shadow-lg shadow-emerald-500/15">
                        <Brain size={32} className="text-[#00ff66]" />
                      </div>
                    </div>
                    <h3 className="font-sans font-bold text-xl text-white mb-2">JoelOS Agent Workspace</h3>
                    <p className="text-slate-300 text-sm leading-relaxed mb-6 font-sans">
                      A high-speed collaborative agent environment. Enter task targets to coordinate Planner, Coder, Reviewer, Researcher, and Vector memory engines automatically.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left">
                      <button
                        onClick={() => setGlobalPrompt('Build a Flask API that returns Bitcoin price')}
                        className="p-4 rounded-xl bg-[#07110c]/85 hover:bg-[#0b1c13] border border-emerald-900/40 hover:border-emerald-500/55 text-left text-xs transition-all group cursor-pointer shadow-sm"
                      >
                        <span className="font-mono text-[#00ff66] font-bold block mb-1">Example Pipeline</span>
                        <span className="text-slate-300 group-hover:text-white line-clamp-1 font-sans">"Build a Flask API that returns Bitcoin price"</span>
                      </button>
                      <button
                        onClick={() => setGlobalPrompt('Create a responsive Tailwind landing page banner component')}
                        className="p-4 rounded-xl bg-[#07110c]/85 hover:bg-[#0b1c13] border border-emerald-900/40 hover:border-emerald-500/55 text-left text-xs transition-all group cursor-pointer shadow-sm"
                      >
                        <span className="font-mono text-[#00ff66] font-bold block mb-1">UI Engineering</span>
                        <span className="text-slate-300 group-hover:text-white line-clamp-1 font-sans">"Create a responsive Tailwind landing page banner"</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 max-w-5xl mx-auto">
                    {messages.map((msg) => {
                      const isUser = msg.sender === 'user';
                      const agentProfile = agents.find(a => a.id === msg.sender);

                      if (isUser) {
                        return (
                          <div key={msg.id} className="flex justify-end w-full">
                            <div className="bg-[#0c1e14] border border-emerald-500/40 px-5 py-4 rounded-2xl max-w-[75%] shadow-md">
                              <div className="flex items-center justify-between gap-4 mb-2 text-[10px] text-[#00ff66] font-mono font-bold">
                                <span>👤 USER PROMPT</span>
                                <span className="text-emerald-400/50">{msg.timestamp}</span>
                              </div>
                              <p className="text-[14.5px] text-slate-100 leading-relaxed whitespace-pre-wrap font-sans">{msg.text}</p>
                            </div>
                          </div>
                        );
                      }

                      let borderColor = 'border-emerald-500';
                      let headerText = 'SYSTEM UPDATE';
                      let headerColor = 'text-emerald-400';
                      let headerBg = 'bg-[#08120d]';
                      let isAgent = false;
                      let modelName = '';

                      if (msg.sender === 'planner') {
                        borderColor = 'border-amber-500';
                        headerText = '🧠 PLANNER';
                        headerColor = 'text-amber-400';
                        headerBg = 'bg-[#181205]';
                        isAgent = true;
                        modelName = agentProfile?.model || agentModels.planner;
                      } else if (msg.sender === 'coder') {
                        borderColor = 'border-[#00ff66]';
                        headerText = '💻 CODER';
                        headerColor = 'text-[#00ff66]';
                        headerBg = 'bg-[#05180f]';
                        isAgent = true;
                        modelName = agentProfile?.model || agentModels.coder;
                      } else if (msg.sender === 'reviewer') {
                        borderColor = 'border-rose-500';
                        headerText = '🔍 REVIEWER';
                        headerColor = 'text-rose-400';
                        headerBg = 'bg-[#1c080b]';
                        isAgent = true;
                        modelName = agentProfile?.model || agentModels.reviewer;
                      } else if (msg.sender === 'researcher') {
                        borderColor = 'border-sky-500';
                        headerText = '🌐 RESEARCHER';
                        headerColor = 'text-sky-400';
                        headerBg = 'bg-[#05121c]';
                        isAgent = true;
                        modelName = agentProfile?.model || agentModels.researcher;
                      } else if (msg.sender === 'memory') {
                        borderColor = 'border-purple-500';
                        headerText = '📚 MEMORY';
                        headerColor = 'text-purple-400';
                        headerBg = 'bg-[#14061a]';
                        isAgent = true;
                        modelName = 'Vector Engine';
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`bg-[#030604] border-l-4 ${borderColor} rounded-xl shadow-lg overflow-hidden transition-all border-y border-r border-emerald-950`}
                        >
                          <div className={`px-4 py-2.5 border-b border-emerald-950/60 flex items-center justify-between ${headerBg}`}>
                            <div className="flex items-center gap-2">
                              {agentProfile && (
                                <img 
                                  src={agentProfile.icon} 
                                  alt={agentProfile.name} 
                                  className="w-5 h-5 rounded-full object-cover border border-[#00ff66]/20 shadow-[0_0_4px_rgba(0,255,102,0.15)]" 
                                />
                              )}
                              <span className={`text-xs font-mono font-black tracking-wider ${headerColor}`}>{headerText}</span>
                              {isAgent && modelName && (
                                <span className="text-[10px] text-emerald-400/60 font-mono bg-[#020503] px-2 py-0.5 rounded border border-emerald-900/30">({modelName})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-emerald-500/60 font-mono">
                              <Clock size={10} />
                              <span>{msg.timestamp}</span>
                            </div>
                          </div>
                          <div className="p-5">
                            {renderMessageContent(msg)}
                            
                            {msg.isStreaming && (
                              <div className="flex items-center gap-2 mt-4 text-xs font-mono text-[#00ff66] bg-[#05180f] p-3 rounded-lg border border-emerald-500/20">
                                <RefreshCw size={12} className="animate-spin text-[#00ff66]" />
                                <span>Generating streamed response from agent...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Private messages scroll list */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {(privateMessages[privateAgentId] || []).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-full scale-125 animate-pulse"></div>
                      <div className="relative w-16 h-16 rounded-2xl border border-emerald-400/40 bg-[#020503] flex items-center justify-center shadow-lg shadow-emerald-500/15">
                        <span className="text-3xl">
                          {(() => {
                            const agent = agents.find(a => a.id === privateAgentId);
                            if (!agent) return '🤖';
                            return agent.icon.startsWith('/') ? <img src={agent.icon} alt={agent.name} className="w-16 h-16 object-cover rounded-2xl" /> : agent.icon;
                          })()}
                        </span>
                      </div>
                    </div>
                    <h3 className="font-sans font-bold text-xl text-white mb-2">Direct Link: {agents.find(a => a.id === privateAgentId)?.name}</h3>
                    <p className="text-slate-300 text-sm leading-relaxed font-sans mb-4">
                      You are connected to a direct, secure channel with the <span className="font-bold text-[#00ff66]">{agents.find(a => a.id === privateAgentId)?.name}</span> agent, bypassing the full multi-agent pipeline.
                    </p>
                    <div className="text-[10px] font-mono text-emerald-500/70 border border-emerald-950 bg-emerald-950/15 rounded-lg px-4 py-2 max-w-xs text-left space-y-1">
                      <div>• SYSTEM ROLE: {privateAgentId.toUpperCase()}</div>
                      <div>• DIRECTIVES: Custom instruction payload</div>
                      <div>• STATUS: SECURE DIRECT CONNECTION</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 max-w-5xl mx-auto">
                    {(privateMessages[privateAgentId] || []).map((msg) => {
                      const isUser = msg.sender === 'user';
                      const agentProfile = agents.find(a => a.id === msg.sender);

                      if (isUser) {
                        return (
                          <div key={msg.id} className="flex justify-end w-full">
                            <div className="bg-[#0c1e14] border border-emerald-500/40 px-5 py-4 rounded-2xl max-w-[75%] shadow-md">
                              <div className="flex items-center justify-between gap-4 mb-2 text-[10px] text-[#00ff66] font-mono font-bold">
                                <span>👤 USER DIRECT PORT</span>
                                <span className="text-emerald-400/50">{msg.timestamp}</span>
                              </div>
                              <p className="text-[14.5px] text-slate-100 leading-relaxed whitespace-pre-wrap font-sans">{msg.text}</p>
                            </div>
                          </div>
                        );
                      }

                      let borderColor = 'border-emerald-500';
                      let headerText = 'SYSTEM UPDATE';
                      let headerColor = 'text-emerald-400';
                      let headerBg = 'bg-[#08120d]';
                      let isAgent = false;
                      let modelName = '';

                      if (msg.sender === 'planner') {
                        borderColor = 'border-amber-500';
                        headerText = '🧠 PLANNER';
                        headerColor = 'text-amber-400';
                        headerBg = 'bg-[#181205]';
                        isAgent = true;
                        modelName = agentProfile?.model || agentModels.planner;
                      } else if (msg.sender === 'coder') {
                        borderColor = 'border-[#00ff66]';
                        headerText = '💻 CODER';
                        headerColor = 'text-[#00ff66]';
                        headerBg = 'bg-[#05180f]';
                        isAgent = true;
                        modelName = agentProfile?.model || agentModels.coder;
                      } else if (msg.sender === 'reviewer') {
                        borderColor = 'border-rose-500';
                        headerText = '🔍 REVIEWER';
                        headerColor = 'text-rose-400';
                        headerBg = 'bg-[#1c080b]';
                        isAgent = true;
                        modelName = agentProfile?.model || agentModels.reviewer;
                      } else if (msg.sender === 'researcher') {
                        borderColor = 'border-sky-500';
                        headerText = '🌐 RESEARCHER';
                        headerColor = 'text-sky-400';
                        headerBg = 'bg-[#05121c]';
                        isAgent = true;
                        modelName = agentProfile?.model || agentModels.researcher;
                      } else if (msg.sender === 'memory') {
                        borderColor = 'border-purple-500';
                        headerText = '📚 MEMORY';
                        headerColor = 'text-purple-400';
                        headerBg = 'bg-[#14061a]';
                        isAgent = true;
                        modelName = 'Vector Engine';
                      } else if (msg.sender === 'cortana') {
                        borderColor = 'border-[#00ff66]';
                        headerText = '🛡️ CORTANA (ORCHESTRATOR)';
                        headerColor = 'text-[#00ff66]';
                        headerBg = 'bg-[#05180f]';
                        isAgent = true;
                        modelName = agentModels.cortana;
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`bg-[#030604] border-l-4 ${borderColor} rounded-xl shadow-lg overflow-hidden transition-all border-y border-r border-emerald-950 w-full`}
                        >
                          <div className={`px-4 py-2.5 border-b border-emerald-950/60 flex items-center justify-between ${headerBg}`}>
                            <div className="flex items-center gap-2">
                              {agentProfile && (
                                <img 
                                  src={agentProfile.icon} 
                                  alt={agentProfile.name} 
                                  className="w-5 h-5 rounded-full object-cover border border-[#00ff66]/20 shadow-[0_0_4px_rgba(0,255,102,0.15)]" 
                                />
                              )}
                              <span className={`text-xs font-mono font-black tracking-wider ${headerColor}`}>{headerText}</span>
                              {isAgent && modelName && (
                                <span className="text-[10px] text-emerald-400/60 font-mono bg-[#020503] px-2 py-0.5 rounded border border-emerald-900/30">({modelName})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-emerald-500/60 font-mono">
                              <Clock size={10} />
                              <span>{msg.timestamp}</span>
                            </div>
                          </div>
                          <div className="p-5">
                            {renderMessageContent(msg)}
                            
                            {msg.isStreaming && (
                              <div className="flex items-center gap-2 mt-4 text-xs font-mono text-[#00ff66] bg-[#05180f] p-3 rounded-lg border border-emerald-500/20">
                                <RefreshCw size={12} className="animate-spin text-[#00ff66]" />
                                <span>Generating streamed response from agent...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </>
          )}

              {/* Bottom error status block */}
              {runtimeError && (
                <div className="mx-6 mb-4 p-4 rounded-xl border border-rose-500/30 bg-[#0e0809] flex flex-col gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-mono font-bold text-rose-400 block uppercase tracking-wide">Pipeline Execution Paused</span>
                      <p className="text-rose-200/80 mt-1 font-sans">{runtimeError}</p>
                      
                      {/* Detailed helpful text for Ollama Model Not Found */}
                      {engine === 'ollama' && (
                        <div className="mt-2 text-[11px] text-emerald-500/70 leading-relaxed font-mono bg-black/40 p-2.5 rounded border border-emerald-950">
                          <p className="text-emerald-400 font-semibold mb-1">💡 Troubleshooting Local Ollama Models:</p>
                          <ul className="list-disc pl-4 space-y-1">
                            <li>Make sure Ollama is running locally with <code className="text-emerald-300 bg-emerald-950/50 px-1 py-0.5 rounded">ollama serve</code> on your computer.</li>
                            <li>Ensure you have the required models installed. Run this command in your terminal:
                              <pre className="mt-1 bg-black text-emerald-400 p-1.5 rounded text-[10px] select-all overflow-x-auto">
                                {failedPhase === 'planner' ? 'ollama run qwen3:4b' :
                                 failedPhase === 'coder' ? 'ollama run qwen2.5-coder:14b' :
                                 'ollama run llama3.1:8b'}
                              </pre>
                            </li>
                            <li>You can download them by running <code className="text-emerald-300 bg-emerald-950/50 px-1 py-0.5 rounded">ollama run &lt;model-name&gt;</code>.</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-950/30">
                    {failedPhase && (
                      <button
                        onClick={() => startPipelineOrchestration(failedPhase)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-900/30 hover:bg-emerald-800/40 text-emerald-300 border border-emerald-500/20 font-bold font-mono text-[11px] transition-all cursor-pointer"
                      >
                        🔄 Retry {failedPhase.toUpperCase()} Agent
                      </button>
                    )}
                    
                    <button
                      onClick={async () => {
                        if (engine === 'ollama') {
                          const lastCloud = (localStorage.getItem('joelos_last_cloud_engine') || 'gemini') as 'gemini' | 'openai' | 'openrouter';
                          setEngine(lastCloud);
                        } else {
                          setEngine('ollama');
                        }
                        setRuntimeError(null);
                        if (failedPhase) {
                          // Allow state update to settle, then restart
                          setTimeout(() => {
                            startPipelineOrchestration(failedPhase);
                          }, 100);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#0e1610] hover:bg-emerald-950 text-emerald-400 border border-[#0f2416] font-semibold font-mono text-[11px] transition-all cursor-pointer"
                    >
                      🔌 Switch Engine to {engine !== 'ollama' ? 'Local' : 'Cloud'} & Resume
                    </button>

                    <button
                      onClick={() => {
                        setRuntimeError(null);
                        setFailedPhase(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-transparent hover:bg-rose-950/20 text-rose-400 font-semibold font-mono text-[11px] transition-all cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Input Prompt Area */}
              <div className={`p-6 border-t border-emerald-900/30 ${theme === 'oled' ? 'bg-black' : 'bg-[#030604]'}`}>
                <div className="max-w-5xl mx-auto flex gap-3 relative items-end">
                  <div className="relative flex-1">
                    <textarea
                      value={chatTab === 'private' ? privatePrompt : globalPrompt}
                      onChange={(e) => chatTab === 'private' ? setPrivatePrompt(e.target.value) : setGlobalPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (chatTab === 'private') {
                            sendPrivateMessage();
                          } else {
                            startPipelineOrchestration();
                          }
                        }
                      }}
                      placeholder={chatTab === 'private' ? `Send private direct message to ${agents.find(a => a.id === privateAgentId)?.name || 'agent'}...` : "Enter your project goal or refine current plan..."}
                      rows={2}
                      className={`w-full bg-[#010302] border border-emerald-900 focus:border-emerald-400 rounded-xl px-4 py-3.5 text-[14px] focus:outline-none text-slate-100 placeholder-emerald-800/80 resize-none transition-all ${chatTab === 'private' ? 'pr-[170px]' : 'pr-32'} font-sans shadow-inner`}
                      disabled={chatTab === 'private' ? privateIsSending : pipelineIsRunning}
                    />

                    {/* Compact Target Agent Selector at the right side of the chat input */}
                    {chatTab === 'private' && (
                      <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1.5 bg-[#020503] border border-emerald-850/60 rounded-lg px-2.5 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                        {(() => {
                          const activeAgent = agents.find(a => a.id === privateAgentId);
                          if (activeAgent) {
                            return (
                              <img 
                                src={activeAgent.icon} 
                                alt={activeAgent.name} 
                                className="w-5 h-5 rounded-full object-cover border border-emerald-500/20" 
                              />
                            );
                          }
                          return null;
                        })()}
                        <select
                          value={privateAgentId}
                          onChange={(e) => setPrivateAgentId(e.target.value as AgentId)}
                          className="bg-transparent text-[#00ff66] focus:outline-none text-xs font-mono font-bold cursor-pointer h-5 pr-1"
                        >
                          {agents.map(a => (
                            <option key={a.id} value={a.id} className="bg-[#020503] text-emerald-400 font-mono">
                              {a.name} ({engine === 'gemini' ? 'gemini-2.5-flash' : (agentModels[a.id] || 'llama3.2')})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={toggleListening}
                      className={`h-11 w-11 rounded-xl transition-all cursor-pointer flex items-center justify-center border ${
                        isListening
                          ? 'bg-rose-950/40 border-rose-500 text-rose-400 animate-pulse'
                          : 'bg-emerald-950/20 border-emerald-900/60 text-emerald-500 hover:text-[#00ff66] hover:border-emerald-500/40 hover:bg-[#10b981]/10'
                      }`}
                      title={isListening ? "Listening... Click to stop" : "Voice input dictation"}
                    >
                      <Mic size={14} className={isListening ? "animate-bounce" : ""} />
                    </button>
                    {chatTab === 'private' ? (
                      privateIsSending ? (
                        <button
                          disabled
                          className="h-11 w-11 rounded-xl font-bold text-xs font-mono tracking-wider border bg-emerald-950/20 border-emerald-900/60 text-emerald-800 flex items-center justify-center"
                          title="Sending..."
                        >
                          <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse"></span>
                        </button>
                      ) : (
                        <button
                          onClick={sendPrivateMessage}
                          disabled={!privatePrompt.trim()}
                          className={`h-11 w-11 rounded-xl font-bold text-xs font-mono tracking-wider transition-all cursor-pointer flex items-center justify-center border ${
                            !privatePrompt.trim()
                              ? 'bg-emerald-950/20 border-emerald-900/60 text-emerald-800' 
                              : 'bg-[#10b981]/20 hover:bg-[#10b981]/30 text-white border-emerald-500/40 hover:border-emerald-400 shadow-md'
                          }`}
                          title="DIRECT SEND"
                        >
                          <Play size={14} className="fill-current text-[#00ff66]" />
                        </button>
                      )
                    ) : (
                      pipelineIsRunning ? (
                        <button
                          onClick={stopPipelineOrchestration}
                          className="h-11 w-11 rounded-xl font-bold text-xs font-mono tracking-wider transition-all cursor-pointer flex items-center justify-center border bg-rose-950/45 hover:bg-rose-900/35 text-rose-200 border-rose-500/40 hover:border-rose-300 shadow-md animate-pulse active:scale-95 transition-transform"
                          title="Abort active agent orchestration pipeline"
                        >
                          <AlertCircle size={14} className="text-rose-400" />
                        </button>
                      ) : (
                        <button
                          onClick={() => startPipelineOrchestration()}
                          disabled={!globalPrompt.trim()}
                          className={`h-11 w-11 rounded-xl font-bold text-xs font-mono tracking-wider transition-all cursor-pointer flex items-center justify-center border ${
                            !globalPrompt.trim()
                              ? 'bg-emerald-950/20 border-emerald-900/60 text-emerald-800' 
                              : 'bg-[#10b981]/20 hover:bg-[#10b981]/30 text-white border-emerald-500/40 hover:border-emerald-400 shadow-md'
                          }`}
                          title="SEND TASK"
                        >
                          <Play size={14} className="fill-current text-[#00ff66]" />
                        </button>
                      )
                    )}
                    {messages.length > 0 && (
                      <button
                        onClick={clearHistory}
                        disabled={pipelineIsRunning}
                        className="h-9 w-9 rounded-xl border border-emerald-900 hover:border-rose-500/40 hover:bg-rose-950/15 text-emerald-500/60 hover:text-rose-400 transition-all cursor-pointer flex items-center justify-center font-bold"
                        title="Clear conversation logs (RESET OS)"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : activeTab === 'settings' ? (
            /* SETTINGS / CONFIGURATION TAB */
            <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-8 font-mono">
              <div>
                <h2 className="font-display font-bold text-2xl text-white">JoelOS System Configuration</h2>
                <p className="text-emerald-500/60 text-sm mt-1">Configure models, host connections, and auto-indexing parameters.</p>
              </div>

              {/* Dynamic Connection Status Notification */}
              <div className={`p-4 rounded-xl border ${ollamaConnectionStatus === 'connected' ? 'border-emerald-500/20 bg-emerald-950/10 text-emerald-300' : 'border-amber-500/20 bg-amber-950/10 text-amber-300'} text-xs space-y-1`}>
                <span className="font-bold block uppercase tracking-wider">
                  {ollamaConnectionStatus === 'connected' ? '✓ Connected to Local Ollama Node' : '⚠ Direct Ollama Node Offline'}
                </span>
                <p className="leading-relaxed opacity-90">
                  {ollamaConnectionStatus === 'connected' 
                    ? `Found ${installedOllamaModels.length} active models compiled on host machine. Agents are configured to auto-select matching parameters.`
                    : `Could not verify connection to Ollama at '${ollamaUrl}'. Ensure Ollama is running ('ollama serve') with host CORS origins configured ('OLLAMA_ORIGINS="*"'). Displaying standard fallback models.`}
                </p>
              </div>

              {/* Models Config Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Section: Agent Configuration */}
                <div className="p-6 rounded-2xl border-2 border-emerald-800 bg-[#05140b] space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-emerald-950">
                    <Terminal size={16} className="text-emerald-400" />
                    <h3 className="font-display font-semibold text-sm text-white">Model Configuration</h3>
                  </div>
                  
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-mono text-emerald-400/80 mb-1.5">Ollama Host URL</label>
                      <input
                        type="text"
                        value={ollamaUrl}
                        onChange={(e) => setOllamaUrl(e.target.value)}
                        placeholder="e.g. http://localhost:11434"
                        className="w-full rounded-lg bg-[#0a0f0c] border border-emerald-950 p-2.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => setShowModelHub(true)}
                        className="w-full mt-3 bg-[#00ff66]/10 hover:bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/30 py-2 rounded font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer h-9 shadow-md shadow-[#00ff66]/5"
                        title="Open Model Hub to Pull and Delete local LLMs"
                      >
                        <Server size={13} />
                        OPEN MODELS HUB
                      </button>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">Agent Model Assignment</label>
                        {loadingProviderModels && (
                          <span className="text-[10px] text-[#00ff66] font-mono animate-pulse">Syncing provider catalog...</span>
                        )}
                        {providerModelsError && (
                          <span className="text-[10px] text-red-400 font-mono" title={providerModelsError}>Offline Catalog (Fallback loaded)</span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-96 overflow-y-auto pr-2 no-scrollbar">
                        {agents.map((agent) => {
                          const presets = activeModelsList.map(m => m.id);
                          const isCustom = !presets.includes(agentModels[agent.id]);
                          
                          return (
                            <div key={agent.id} className="space-y-1">
                              <label className="block text-[11px] text-emerald-500/70 font-bold uppercase">
                                {agent.icon.startsWith('/') ? <img src={agent.icon} alt={agent.name} className="w-4 h-4 inline-block object-cover rounded-full mr-1" /> : agent.icon + " "} {agent.name}
                              </label>
                              <select
                                value={isCustom ? 'custom' : (agentModels[agent.id] || '')}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val !== 'custom') {
                                    setAgentModels(prev => {
                                      const next = { ...prev, [agent.id]: val };
                                      localStorage.setItem('joelos_agent_models', JSON.stringify(next));
                                      return next;
                                    });
                                  } else {
                                    setAgentModels(prev => {
                                      const next = { ...prev, [agent.id]: '' };
                                      localStorage.setItem('joelos_agent_models', JSON.stringify(next));
                                      return next;
                                    });
                                  }
                                }}
                                className="w-full rounded bg-[#0a0f0c] border border-emerald-950 p-2 font-mono text-xs text-emerald-300 focus:outline-none focus:border-emerald-500 h-9 cursor-pointer"
                              >
                                {activeModelsList.map(m => (
                                  <option key={m.id} value={m.id} className="bg-[#0a0f0c] text-emerald-300">
                                    {m.name || m.id} {m.isFree ? ' (FREE)' : ''}
                                  </option>
                                ))}
                                <option value="custom" className="bg-[#0a0f0c] text-emerald-300">
                                  -- Custom model name --
                                </option>
                              </select>
                              {(isCustom) && (
                                <input
                                  type="text"
                                  value={agentModels[agent.id] || ''}
                                  onChange={(e) => {
                                    setAgentModels(prev => {
                                      const next = { ...prev, [agent.id]: e.target.value };
                                      localStorage.setItem('joelos_agent_models', JSON.stringify(next));
                                      return next;
                                    });
                                  }}
                                  placeholder="Type custom model name..."
                                  className="w-full mt-1.5 rounded bg-[#0a0f0c] border border-[#0a0f0c] p-2 font-mono text-xs text-emerald-300 focus:outline-none focus:border-emerald-500"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Cloud Engine Settings */}
                <div className="p-6 rounded-2xl border-2 border-emerald-800 bg-[#05140b] space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-emerald-950">
                    <Sparkles size={16} className="text-emerald-400" />
                    <h3 className="font-display font-semibold text-sm text-white">Cloud API Keys</h3>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="p-3 rounded-lg bg-emerald-950/15 border border-emerald-500/10 space-y-1 text-emerald-300 leading-relaxed text-[11px]">
                      <span className="font-bold text-emerald-300 block">Custom Providers</span>
                      Provide an API key to use models from OpenAI, OpenRouter, or Gemini Cloud instead of local execution.
                    </div>
                    
                    <div>
                      <label className="block text-xs font-mono text-emerald-400/80 mb-1.5">Active Engine</label>
                      <select
                        value={engine}
                        onChange={(e) => setEngine(e.target.value as any)}
                        className="w-full rounded bg-[#0a0f0c] border border-emerald-950 p-2 font-mono text-xs text-emerald-300 focus:outline-none focus:border-emerald-500 h-9 cursor-pointer"
                      >
                        <option value="gemini" className="bg-[#0a0f0c] text-emerald-300">Google Gemini AI</option>
                        <option value="openai" className="bg-[#0a0f0c] text-emerald-300">OpenAI</option>
                        <option value="openrouter" className="bg-[#0a0f0c] text-emerald-300">OpenRouter (Nvidia, Anthropic, etc)</option>
                        <option value="ollama" className="bg-[#0a0f0c] text-emerald-300">Ollama (Local Models)</option>
                        <option value="hermes" className="bg-[#0a0f0c] text-emerald-300">Hermes (Local Gateway Router)</option>
                      </select>
                    </div>

                    {engine !== 'ollama' && engine !== 'hermes' && (
                      <div className="space-y-2">
                        <label className="block text-[11px] text-emerald-500/70 font-bold uppercase">
                          {engine === 'gemini' ? 'Gemini API Key' : engine === 'openai' ? 'OpenAI API Key' : 'OpenRouter API Key'}
                        </label>
                        {/* 
                          Note: We do not perform client-side prefix validation (e.g., checking for AIzaSy)
                          because Google AI Studio now issues keys with different formats (e.g., AQ.).
                          The key is validated by the server when making the actual API request. 
                        */}
                        <input
                          type="password"
                          value={cloudApiKey}
                          onChange={(e) => {
                            setCloudApiKey(e.target.value);
                            localStorage.setItem('joelos_cloud_api_key', e.target.value);
                          }}
                          placeholder={engine === 'gemini' ? 'Leave empty to use server .env' : 'sk-...'}
                          className="w-full mt-1.5 rounded bg-[#0a0f0c] border border-emerald-950 p-2 font-mono text-xs text-emerald-300 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a0f0c]/60 border border-emerald-950 mt-4">
                      <div>
                        <span className="font-semibold block text-slate-200">Google Search Grounding</span>
                        <span className="text-[10px] text-emerald-500/60">Only supported on Gemini engine.</span>
                      </div>
                      <Switch
                        checked={searchGrounding}
                        onCheckedChange={setSearchGrounding}
                        disabled={engine !== 'gemini'}
                        className={engine !== 'gemini' ? 'opacity-50 cursor-not-allowed' : ''}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a0f0c]/60 border border-emerald-950 mt-4">
                      <div>
                        <span className="font-semibold block text-slate-200">Audio Notifications</span>
                        <span className="text-[10px] text-emerald-500/60">Play chime sounds on agent events.</span>
                      </div>
                      <Switch
                        checked={soundEnabled}
                        onCheckedChange={setSoundEnabled}
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Pipeline Execution Priority */}
                <div className="p-6 rounded-2xl border border-emerald-950 bg-[#080d0a] space-y-4 md:col-span-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-emerald-950">
                    <Layers size={16} className="text-emerald-400" />
                    <h3 className="font-display font-semibold text-sm text-white">Pipeline Execution Priority</h3>
                  </div>
                  <p className="text-xs text-emerald-500/70 font-sans leading-relaxed">
                    Prioritize specific agents to influence the pipeline's execution flow. Forcing an agent priority allocates more time and resources to that phase of the orchestrated workflow.
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {['none', 'researcher', 'planner', 'coder', 'reviewer'].map((agent) => (
                      <button
                        key={agent}
                        onClick={() => setPriorityAgent(agent)}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                          priorityAgent === agent 
                            ? 'bg-[#00ff66]/10 border-[#00ff66]/50 text-[#00ff66] shadow-[0_0_15px_rgba(0,255,102,0.15)]' 
                            : 'bg-[#030604] border-emerald-950 text-emerald-500/60 hover:border-emerald-900 hover:text-emerald-400'
                        }`}
                      >
                        <span className="font-bold text-xs uppercase tracking-wider">{agent}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Agent Performance Timings & Bottlenecks Chart */}
                <div className="p-6 rounded-2xl border border-emerald-950 bg-[#080d0a] space-y-4 md:col-span-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-emerald-950">
                    <Clock size={16} className="text-[#00ff66]" />
                    <h3 className="font-display font-semibold text-sm text-white">System Resource & Execution Bottleneck Profiler</h3>
                  </div>
                  
                  <p className="text-xs text-emerald-500/60 leading-relaxed mb-4">
                    Visualizes real-time system execution durations across all agents to pinpoint heavy compilation tasks or API delay hotspots.
                  </p>

                  {renderTimingChart()}
                </div>

              </div>

              {/* Obsidian Second Brain Integration */}
              <div className="p-6 rounded-2xl border border-emerald-950 bg-[#080d0a] space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-950">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-[#00ff66]" />
                    <h3 className="font-display font-semibold text-sm text-white">Obsidian Second Brain Integration</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isVaultConfigured ? 'bg-[#00ff66] animate-pulse shadow-[0_0_8px_#00ff66]' : 'bg-slate-600'}`}></span>
                    <span className="text-[10px] font-mono text-emerald-500/60 font-bold uppercase">
                      {isVaultConfigured ? 'ONLINE WATCHER' : 'OFFLINE'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-emerald-500/60 leading-relaxed font-sans">
                  Connect JoelOS to a local Obsidian vault on your host machine. Once configured, a background file watcher monitors changes to sync your markdown notes with local vector embeddings. Core agent results and memory nodes are automatically backed up as markdown notes with metadata frontmatter.
                </p>

                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div className="md:col-span-3 space-y-1.5">
                      <label className="block text-xs font-mono text-emerald-400/80">Local Vault Absolute Path</label>
                      <input
                        type="text"
                        value={vaultPath}
                        onChange={(e) => setVaultPath(e.target.value)}
                        placeholder="e.g., /Users/username/Documents/ObsidianVault"
                        className="w-full rounded-lg bg-[#0a0f0c] border border-emerald-950 p-2.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/vault/config', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ vaultPath, autoWrite: autoWriteOutputs })
                          });
                          const data = await res.json();
                          if (data.success) {
                            setIsVaultConfigured(true);
                            setIndexedNotesCount(data.notesCount || 0);
                            alert('✓ Obsidian Vault configuration compiled and synced successfully!');
                          } else {
                            alert('⚠ Config saved, but could not read directory. Ensure the path is correct and accessible.');
                          }
                        } catch (e) {
                          console.error('Error saving vault config:', e);
                          alert('Error connecting to backend API.');
                        }
                      }}
                      className="w-full bg-[#00ff66]/10 hover:bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/30 py-2.5 rounded-lg font-mono text-xs font-bold transition-all h-[38px] cursor-pointer"
                    >
                      SAVE CONFIG
                    </button>
                  </div>

                  {isVaultConfigured && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="p-3 rounded-lg bg-[#040805] border border-emerald-950 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] text-emerald-500/60 font-mono font-bold block uppercase tracking-wider">Indexed Vault Notes</span>
                          <span className="text-xl font-bold text-slate-100 font-display mt-1 block">{indexedNotesCount} Notes</span>
                        </div>
                        <p className="text-[10px] text-emerald-500/40 mt-1 leading-normal font-sans">
                          These notes are converted into local semantic vector frames, enabling real-time recall injection inside model coordination workflows.
                        </p>
                      </div>

                      <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#040805] border border-emerald-950">
                        <div>
                          <span className="font-semibold block text-slate-200 text-xs font-sans">Auto-Sync Deliverables</span>
                          <span className="text-[10px] text-emerald-500/60 font-sans block mt-0.5">Commit Planner/Researcher/Coder/Reviewer nodes to vault.</span>
                        </div>
                        <Switch
                          checked={autoWriteOutputs}
                          onCheckedChange={async (checked) => {
                            setAutoWriteOutputs(checked);
                            try {
                              await fetch('/api/vault/config', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ vaultPath, autoWrite: checked })
                              });
                            } catch (err) {
                              console.error('Failed to update autoWrite config:', err);
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Real-time file system change events */}
                  {isVaultConfigured && recentNoteEvents.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] text-emerald-500/60 font-mono font-bold block uppercase tracking-wider">Live File Watcher Log</span>
                      <div className="p-3 rounded-lg bg-[#030604] border border-emerald-950 max-h-32 overflow-y-auto font-mono text-[10px] space-y-1.5 no-scrollbar">
                        {recentNoteEvents.map((evt, idx) => (
                          <div key={idx} className="flex justify-between gap-4 text-emerald-400 border-b border-emerald-950/30 pb-1 last:border-0 last:pb-0">
                            <span className="truncate">
                              <span className="text-[#00ff66] font-bold uppercase mr-1.5">[{evt.event}]</span>
                              {evt.path}
                            </span>
                            <span className="text-emerald-500/40 shrink-0">{evt.timestamp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Memory vector specs */}
              <div className="p-6 rounded-2xl border border-emerald-950 bg-[#080d0a] space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-950">
                  <div className="flex items-center gap-2">
                    <Database size={16} className="text-emerald-400" />
                    <h3 className="font-display font-semibold text-sm text-white">Semantic Recall & Athena Store</h3>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete all stored workspace memory structures? This action cannot be undone.')) {
                        fetch('/api/memory', {
                          method: 'POST',
                          body: JSON.stringify({ items: [] }),
                          headers: { 'Content-Type': 'application/json' }
                        }).catch(err => console.error('Error purging memories:', err));
                        setMemories([]);
                        setMatchedMemories([]);
                      }
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Purge Store</span>
                  </button>
                </div>
                
                <p className="text-xs text-emerald-500/60 leading-relaxed">
                  Every complete multi-agent pipeline workflow is indexed to a persistent cloud-backed memory storage (<span className="font-mono">brain.json</span>) as highly scannable contextual metadata blocks. Athena utilizes a high-performance Cosine Similarity calculation to check relevancy on query recall, feeding history directly into upcoming pipelines automatically.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-[#0a0f0c] rounded-xl border border-emerald-950">
                    <span className="text-[10px] text-emerald-500/50 uppercase tracking-wider block font-mono">Ledger Count</span>
                    <span className="text-lg font-bold text-slate-100 font-display">{memories.length}</span>
                  </div>
                  <div className="p-3 bg-[#0a0f0c] rounded-xl border border-emerald-950">
                    <span className="text-[10px] text-emerald-500/50 uppercase tracking-wider block font-mono">Similarity Metric</span>
                    <span className="text-lg font-bold text-slate-100 font-display">Cosine Match</span>
                  </div>
                  <div className="p-3 bg-[#0a0f0c] rounded-xl border border-emerald-950">
                    <span className="text-[10px] text-emerald-500/50 uppercase tracking-wider block font-mono">Storage Type</span>
                    <span className="text-lg font-bold text-slate-100 font-display">Local JSON</span>
                  </div>
                  <div className="p-3 bg-[#0a0f0c] rounded-xl border border-emerald-950">
                    <span className="text-[10px] text-emerald-500/50 uppercase tracking-wider block font-mono">Athena Check</span>
                    <span className="text-lg font-bold text-emerald-400 font-display">Automatic</span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'operations' ? (
            renderOperations()
          ) : activeTab === 'agents' ? (
            renderAgentsGrid()
          ) : activeTab === 'mail' ? (
            /* MAIL INTEGRATION TAB */
            <div className="flex-1 overflow-hidden">
              <MailIntegration 
                onSuggestReply={(content) => {
                  setGlobalPrompt(content);
                  setChatTab('global');
                  setActiveTab('pipeline');
                }}
                isAiThinking={pipelineIsRunning}
              />
            </div>
          ) : (
            /* ABOUT PAGE */
            <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full space-y-6 font-mono">
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={28} className="text-emerald-400" />
                </div>
                <h2 className="font-display font-bold text-2xl text-white">JoelOS Operating System</h2>
                <span className="text-xs text-emerald-400 font-mono">Distributed Multi-Agent Architecture</span>
              </div>

              <div className="p-6 rounded-2xl border border-emerald-950 bg-[#080d0a] text-sm text-emerald-300 leading-relaxed space-y-4">
                <p>
                  <strong>JoelOS</strong> is an intelligent orchestration dashboard built to integrate local LLM processing frameworks (like Ollama) with state-of-the-art enterprise model architectures (like Google Gemini).
                </p>
                <p>
                  By establishing specialized agents with strict systemic constraints, JoelOS processes objectives through an organic pipeline:
                </p>
                <div className="p-4 rounded-xl bg-[#0a0f0c] border border-emerald-950 font-mono text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-right text-emerald-400">1.</span>
                    <span className="font-bold text-slate-200">Athena Agent</span>
                    <span className="text-emerald-500/60">indexes past solutions & injects previous patterns</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-right text-emerald-400">2.</span>
                    <span className="font-bold text-slate-200">Researcher</span>
                    <span className="text-emerald-500/60">crawls online references / technical requirements</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-right text-emerald-400">3.</span>
                    <span className="font-bold text-slate-200">Planner</span>
                    <span className="text-emerald-500/60">drafts hierarchical task checklists (no coding)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-right text-emerald-400">4.</span>
                    <span className="font-bold text-slate-200">Coder</span>
                    <span className="text-emerald-500/60">assembles clean, modular and compiled implementations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-right text-emerald-400">5.</span>
                    <span className="font-bold text-slate-200">Reviewer</span>
                    <span className="text-emerald-500/60">analyzes bugs, checks type safety and logs vulnerabilities</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

      </div>

      {/* Execution Pipeline Drawer Panel */}
      <AnimatePresence>
        {isPipelineDrawerOpen && (
          <div className="fixed inset-y-0 right-0 z-40 pointer-events-none flex justify-end w-full">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`relative h-full w-full sm:w-80 md:w-96 shadow-2xl flex flex-col ${
                theme === 'oled' ? 'bg-[#000000]' : 'bg-[#050c08]'
              } border-l border-emerald-900/30 overflow-hidden font-mono pointer-events-auto`}
            >
              {/* Header */}
              <div className="flex items-center justify-between shrink-0 p-5 border-b border-emerald-900/30">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs uppercase tracking-widest text-emerald-300 font-bold flex items-center gap-2 px-2.5 py-1 rounded bg-[#0b2114] border border-emerald-500/25">
                    <Workflow size={13} className="text-[#00ff66]" />
                    <span>Execution Pipeline</span>
                  </h3>
                </div>
                <button
                  onClick={() => setIsPipelineDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-emerald-500 hover:text-white hover:bg-emerald-950/40 transition-all cursor-pointer"
                  title="Close Pipeline Drawer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Active Execution Pipeline Visualizer */}
              <div className="flex-1 overflow-y-auto flex flex-col p-5">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-900/30">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Terminal size={14} />
                    <span className="text-[10px] font-black tracking-wider uppercase">Orchestrator Sequence</span>
                  </div>
                  {pipelineIsRunning && (
                    <button
                      onClick={stopPipelineOrchestration}
                      className="w-7 h-7 flex items-center justify-center rounded bg-rose-950/70 hover:bg-rose-900/60 text-rose-200 border border-rose-500/50 cursor-pointer animate-pulse transition-all active:scale-95"
                      title="Halt active agent execution immediately"
                    >
                      <AlertCircle size={14} className="text-rose-400" />
                    </button>
                  )}
                </div>

                {/* Vertical Nodes container */}
                <div className="flex flex-col gap-0 items-start relative pb-4 border-b border-emerald-900/30">
                  {/* Vertical connecting line */}
                  <div className="absolute left-[15px] top-[15px] bottom-[15px] w-[2px] bg-emerald-950/40 z-0"></div>
                  
                  {pipelineNodes.map((node, index) => {
                    let statusColor = 'bg-emerald-950/10 border-emerald-950 text-emerald-600/60';
                    let glow = '';
                    if (node.status === 'active') {
                      statusColor = 'bg-emerald-900/25 border-emerald-400 text-white animate-pulse';
                      glow = 'shadow-[0_0_12px_rgba(0,255,102,0.35)]';
                    } else if (node.status === 'completed') {
                      statusColor = 'bg-[#0a1f13] border-emerald-500/50 text-emerald-300';
                      glow = 'shadow-[0_0_8px_rgba(16,185,129,0.2)]';
                    } else if (node.status === 'error') {
                      statusColor = 'bg-[#2a0b10] border-rose-500 text-rose-300';
                      glow = 'shadow-[0_0_12px_rgba(244,63,94,0.4)]';
                    } else if (node.status === 'skipped') {
                      statusColor = 'bg-slate-900/50 border-slate-700/50 text-slate-500';
                    }

                    return (
                      <div key={node.id} className="flex items-center gap-3 w-full group relative z-10 py-3">
                        <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 bg-[#020503] ${
                          node.status === 'completed' ? 'border-emerald-400 shadow-[0_0_8px_rgba(0,255,102,0.6)]' :
                          node.status === 'active' ? 'border-[#00ff66] animate-pulse shadow-[0_0_10px_rgba(0,255,102,0.8)]' :
                          node.status === 'error' ? 'border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]' :
                          node.status === 'skipped' ? 'border-slate-700' : 'border-emerald-900/50'
                        }`}>
                          {node.status === 'completed' && <Check size={12} className="text-emerald-400" />}
                          {node.status === 'active' && <div className="w-2.5 h-2.5 bg-[#00ff66] rounded-full animate-ping"></div>}
                          {node.status === 'error' && <X size={12} className="text-rose-500" />}
                          {node.status === 'pending' && <div className="w-1.5 h-1.5 bg-emerald-800 rounded-full"></div>}
                          {node.status === 'skipped' && <span className="text-[10px] text-slate-500 font-bold">-</span>}
                        </span>
                        
                        <button
                          onClick={() => setSelectedNodeContextId(prev => prev === node.id ? null : node.id)}
                          className={`flex-1 flex flex-col items-start px-3 py-2 rounded-xl border text-xs font-mono font-bold transition-all duration-300 cursor-pointer text-left focus:outline-none ${statusColor} ${glow} ${selectedNodeContextId === node.id ? 'ring-2 ring-emerald-400 border-transparent shadow-[0_0_15px_rgba(16,185,129,0.4)]' : ''}`}
                          title={`Click to view run summary for ${node.label}`}
                        >
                          <span className="uppercase text-[11px] font-black tracking-wider">{node.label}</span>
                          <span className="text-[9px] opacity-70 font-sans mt-0.5 line-clamp-1">{
                            node.id === 'researcher' ? 'Gathers live internet data' : 
                            node.id === 'planner' ? 'Drafts system architecture blueprint' : 
                            node.id === 'coder' ? 'Compiles application source code' : 
                            node.id === 'reviewer' ? 'Audits codebase for quality & bugs' : 'Agent task'
                          }</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Global Progress */}
                {pipelineIsRunning && (() => {
                  const completedCount = pipelineNodes.filter(n => n.status === 'completed').length;
                  const activeCount = pipelineNodes.filter(n => n.status === 'active').length;
                  const percent = Math.min(100, Math.round(((completedCount + activeCount * 0.5) / pipelineNodes.length) * 100));
                  return (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[10px] mb-2 font-mono">
                        <span className="text-[#00ff66] uppercase font-bold tracking-wider">Progress</span>
                        <span className="text-emerald-400 font-bold">{percent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-emerald-950/60 rounded-full overflow-hidden border border-emerald-900/20">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-[#00ff66] rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(0,255,102,0.5)]"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })()}

                {/* Selected Node Context inline */}
                {selectedNodeContextId && (() => {
                  const node = pipelineNodes.find(n => n.id === selectedNodeContextId);
                  const context = nodeContexts[selectedNodeContextId];
                  if (!node) return null;
                  return (
                    <div className={`mt-4 p-3 rounded-xl border border-emerald-500/30 shadow-lg ${theme === 'oled' ? 'bg-[#050505]' : 'bg-[#09110d]'} text-xs animate-in fade-in slide-in-from-top-2 duration-200 flex-shrink-0`}>
                      <div className="flex items-center justify-between border-b border-emerald-900/30 pb-2 mb-2">
                        <span className="font-bold text-emerald-300 uppercase truncate text-[10px]">{node.label} Context</span>
                        <button 
                          onClick={() => setSelectedNodeContextId(null)}
                          className="text-emerald-500 hover:text-white transition-colors cursor-pointer p-0.5 ml-2"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                        <div>
                          <span className="text-[10px] text-emerald-500/60 uppercase font-black block mb-1">Target / Input Context:</span>
                          <p className="text-slate-200 text-[10px] leading-relaxed bg-black/40 p-2 rounded border border-emerald-950/40">
                            {context ? context.input : `No input context. Awaiting activation...`}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-500/60 uppercase font-black block mb-1">Payload / Streamed Output:</span>
                          <pre className="text-emerald-300 text-[10px] leading-relaxed bg-black/60 p-2 rounded border border-emerald-950/60 whitespace-pre-wrap overflow-x-auto font-mono max-h-24">
                            {context ? context.output : (node.status === 'active' ? 'Synthesizing output stream...' : 'Waiting to capture output payload from current run.')}
                          </pre>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Modal Overlay */}
      {shortcutsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className={`w-full max-w-md rounded-2xl border border-emerald-500/35 ${theme === 'oled' ? 'bg-[#050505]' : 'bg-[#09110d]'} shadow-2xl shadow-emerald-500/15 p-6 relative overflow-hidden font-mono`}>
            
            {/* Ambient header glow */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-[#00ff66] to-emerald-500"></div>

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-[#00ff66]" />
                <h3 className="font-black text-sm uppercase tracking-wider text-emerald-200">System Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={() => setShortcutsOpen(false)}
                className="text-emerald-500 hover:text-white p-1.5 rounded-lg border border-emerald-900/50 hover:bg-emerald-950/50 cursor-pointer transition-all"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-sans">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#030604] border border-emerald-950">
                <span className="text-slate-300">Toggle Shortcuts Panel</span>
                <kbd className="px-2 py-1 rounded bg-[#091510] border border-emerald-800/60 text-[#00ff66] text-[10px] font-bold font-mono shadow shadow-emerald-950">?</kbd>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#030604] border border-emerald-950">
                <span className="text-slate-300">Focus Goal Prompt Box</span>
                <kbd className="px-2 py-1 rounded bg-[#091510] border border-emerald-800/60 text-[#00ff66] text-[10px] font-bold font-mono shadow shadow-emerald-950">/</kbd>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#030604] border border-emerald-950">
                <span className="text-slate-300">Trigger/Send Active Pipeline</span>
                <kbd className="px-2 py-1 rounded bg-[#091510] border border-emerald-800/60 text-[#00ff66] text-[10px] font-bold font-mono shadow shadow-emerald-950">Ctrl + Enter</kbd>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#030604] border border-emerald-950">
                <span className="text-slate-300">Clear Conversation History</span>
                <kbd className="px-2 py-1 rounded bg-[#091510] border border-emerald-800/60 text-[#00ff66] text-[10px] font-bold font-mono shadow shadow-emerald-950">Ctrl + Shift + X</kbd>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#030604] border border-emerald-950">
                <span className="text-slate-300">Unfocus Fields / Close Modals</span>
                <kbd className="px-2 py-1 rounded bg-[#091510] border border-emerald-800/60 text-[#00ff66] text-[10px] font-bold font-mono shadow shadow-emerald-950">ESC</kbd>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-emerald-900/30 text-[10px] text-emerald-500 font-mono text-center leading-normal">
              Press <code className="text-[#00ff66] bg-[#05180f] px-1 py-0.5 rounded font-bold border border-[#00ff66]/20">ESC</code> at any time to immediately dismiss this help card.
            </div>
          </div>
        </div>
      )}

      {/* Memory Drawer Overlay */}
      <AnimatePresence>
        {isMemoryDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMemoryDrawerOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`absolute top-0 right-0 bottom-0 w-full sm:w-96 md:w-[450px] shadow-2xl flex flex-col ${
                theme === 'oled' ? 'bg-[#000000]' : 'bg-[#050c08]'
              } border-l border-emerald-900/30 overflow-hidden`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between shrink-0 p-5 border-b border-emerald-900/30">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs uppercase tracking-widest text-emerald-300 font-bold flex items-center gap-2 px-2.5 py-1 rounded bg-[#0b2114] border border-emerald-500/25">
                    <Database size={13} className="text-[#00ff66]" />
                    <span>Athena Memory Ledger</span>
                  </h3>
                  <span className="text-[10px] bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/20 px-2 py-0.5 rounded font-bold">ACTIVE</span>
                </div>
                <button
                  onClick={() => setIsMemoryDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-emerald-500 hover:text-white hover:bg-emerald-950/40 transition-all cursor-pointer"
                  title="Close Athena Ledger"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Search bar inside memory */}
              <div className="relative font-mono shrink-0 p-5 pb-0">
                <Search size={14} className="absolute left-8 top-1/2 -translate-y-1/2 mt-2.5 text-emerald-500" />
                <input
                  type="text"
                  value={memorySearchQuery}
                  onChange={(e) => handleMemorySearch(e.target.value)}
                  placeholder="Search history ledger..."
                  className="w-full rounded-xl bg-[#010302] border border-emerald-900/60 pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-emerald-800/60 focus:outline-none focus:border-emerald-400 font-sans shadow-inner"
                />
                {isMemorySearching && (
                  <RefreshCw size={14} className="absolute right-8 top-1/2 -translate-y-1/2 mt-2.5 text-[#00ff66] animate-spin" />
                )}
              </div>

              {/* Matches List */}
              <div className="flex-1 overflow-y-auto space-y-4 p-5 min-h-0">
                {matchedMemories.length === 0 ? (
                  <div className="text-center py-12 text-emerald-700 text-sm font-mono">
                    No matching memory records.
                  </div>
                ) : (
                  matchedMemories.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedMemory(selectedMemory?.id === item.id ? null : item)}
                      className={`p-4 rounded-xl border transition-all text-left group cursor-pointer ${
                        selectedMemory?.id === item.id
                          ? 'bg-[#0d2719] border-emerald-500/60 shadow-lg'
                          : 'bg-[#091510]/50 border-emerald-950 hover:bg-[#0c1e16] hover:border-emerald-900/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 font-mono">
                        <span className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors line-clamp-1">{item.title}</span>
                        {item.relevance !== undefined && (
                          <span className="text-[10px] font-mono text-[#00ff66] font-extrabold bg-[#00ff66]/10 px-2 py-0.5 rounded border border-[#00ff66]/20 shrink-0">
                            {(item.relevance * 100).toFixed(0)}% Match
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300/80 line-clamp-2 mt-2 leading-relaxed font-sans">{item.summary}</p>
                      
                      {/* Collapsed / Expanded state visual code block excerpt */}
                      {selectedMemory?.id === item.id && (
                        <div className="mt-4 pt-4 border-t border-emerald-950/80 space-y-3">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#00ff66] font-bold">Snippet / Summary Excerpt:</span>
                          <pre className="p-3 rounded-lg bg-black/60 text-xs font-mono text-[#00ff66] overflow-x-auto border border-emerald-950/60 leading-relaxed max-h-48 shadow-inner custom-scrollbar">
                            <code>{item.snippet}</code>
                          </pre>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(item.id, item.snippet);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900/50 text-[#00ff66] hover:text-white font-mono text-xs flex items-center gap-1.5 cursor-pointer border border-emerald-900/30 transition-all font-bold"
                          >
                            <Copy size={12} />
                            <span>Copy Code Block</span>
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-emerald-950/80 text-[10px] font-mono text-emerald-600">
                        <span className="truncate max-w-[200px]">{item.tags.join(' • ')}</span>
                        <span>{item.timestamp.split(',')[0]}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Preset trigger context helper */}
              <div className="p-5 border-t border-emerald-900/30 text-xs text-emerald-500/60 font-mono space-y-2 leading-relaxed shrink-0 bg-[#020503]">
                <span className="text-emerald-400 font-bold uppercase block tracking-widest text-[10px]">Workspace Context</span>
                <p className="text-emerald-600/60 leading-normal font-sans">Type queries above. Relevant memories feed into future planners to maintain contextual persistent recall.</p>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fullScreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
            onClick={() => setFullScreenImage(null)}
          >
            <button
              className="absolute top-6 right-6 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              onClick={(e) => { e.stopPropagation(); setFullScreenImage(null); }}
            >
              <X size={24} />
            </button>
            <div className="relative max-w-full max-h-full flex flex-col items-center group">
              <img
                src={fullScreenImage}
                alt="Full View"
                className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              <div 
                className="absolute bottom-4 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                <a
                  href={fullScreenImage}
                  download="joelos-image-generation.jpg"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-full shadow-lg flex items-center gap-2 transform hover:scale-105 transition-all"
                >
                  <Download size={18} />
                  Download Image
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedStudioJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-6"
            onClick={() => setSelectedStudioJob(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
              className="bg-zinc-950 border border-emerald-950/60 rounded-xl overflow-hidden max-w-5xl w-full max-h-[90vh] grid grid-cols-1 md:grid-cols-12 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedStudioJob(null)}
                className="absolute top-4 right-4 b-10 p-2 rounded-full bg-black/60 border border-emerald-900/30 text-slate-400 hover:text-white hover:bg-emerald-950/40 transition-colors"
              >
                <X size={18} />
              </button>

              {/* Left Column: Image Canvas */}
              <div className="md:col-span-7 bg-black flex items-center justify-center p-4 min-h-[300px] md:max-h-[85vh] border-b md:border-b-0 md:border-r border-emerald-950/30 relative group">
                <img
                  src={selectedStudioJob.resultUrl}
                  alt={selectedStudioJob.prompt}
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[70vh] object-contain rounded-md shadow-lg animate-fade-in"
                />
              </div>

              {/* Right Column: Detailed Metadata Panel */}
              <div className="md:col-span-5 p-6 md:p-8 flex flex-col justify-between overflow-y-auto max-h-[85vh] bg-[#030704]">
                <div className="space-y-6">
                  <div>
                    <span className="text-[9px] font-mono font-extrabold text-[#00ff66] bg-emerald-950/50 border border-emerald-500/20 px-2.5 py-1 rounded-full tracking-wider uppercase inline-block">
                      {selectedStudioJob.provider}
                    </span>
                    <h2 className="text-lg font-bold text-slate-100 font-sans tracking-tight mt-3">
                      Asset Details & Metadata
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono text-emerald-500/80 block uppercase font-bold font-sans">Generation Prompt</span>
                      <div className="text-xs text-slate-300 leading-relaxed bg-black/40 border border-emerald-950/40 p-3 rounded font-sans italic relative select-all">
                        "{selectedStudioJob.prompt}"
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1 bg-black/20 border border-emerald-950/20 p-2 rounded">
                        <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold">Aspect Ratio</span>
                        <span className="text-xs text-[#00ff66] font-mono font-bold">
                          {selectedStudioJob.aspectRatio || '1:1'}
                        </span>
                      </div>
                      <div className="space-y-1 bg-black/20 border border-emerald-950/20 p-2 rounded">
                        <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold font-sans">Generated At</span>
                        <span className="text-xs text-slate-300 font-mono">
                          {new Date(selectedStudioJob.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-6 border-t border-emerald-950/30 mt-6">
                  <a
                    href={selectedStudioJob.resultUrl}
                    download={`generation-${selectedStudioJob.id}.png`}
                    className="w-full px-4 py-2.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-400 text-[#00ff66] font-mono text-xs font-bold rounded flex items-center justify-center gap-2 transition-all transform hover:translate-y-[-1px] cursor-pointer"
                  >
                    <Download size={14} />
                    DOWNLOAD HIGH-RES
                  </a>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedStudioJob.prompt);
                    }}
                    className="w-full px-4 py-2.5 bg-black hover:bg-emerald-950/20 border border-emerald-950 text-slate-300 font-mono text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Copy size={14} />
                    COPY PROMPT TEXT
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showModelHub && (
        <ModelHub 
          models={ollamaModelDetails}
          ollamaUrl={ollamaUrl}
          onClose={() => setShowModelHub(false)}
          onRefresh={() => {
            setOllamaRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </div>
    </SidebarProvider>
  );
}
