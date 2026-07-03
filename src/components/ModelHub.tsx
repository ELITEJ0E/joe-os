import React, { useState, useEffect } from 'react';
import { OllamaModelInfo } from '../types';
import { Server, Download, Trash2, Search, Cpu, HardDrive, Play, CheckCircle2, AlertTriangle, AlertCircle, Info, Clock, BarChart3, Database } from 'lucide-react';

interface ModelHubProps {
  models: OllamaModelInfo[];
  ollamaUrl: string;
  onClose: () => void;
  onRefresh: () => void;
}

const POPULAR_MODELS = [
  // Ollama
  { name: 'llama3.2', label: 'Llama 3.2 (3B)', provider: 'ollama', size: '2.0 GB', description: 'Meta lightweight state-of-the-art model' },
  { name: 'llama3.2:1b', label: 'Llama 3.2 (1B)', provider: 'ollama', size: '1.3 GB', description: 'Meta ultra-lightweight model for constrained systems' },
  { name: 'llama3.1', label: 'Llama 3.1 (8B)', provider: 'ollama', size: '4.7 GB', description: 'Highly versatile Meta general assistant' },
  { name: 'nemotron-mini', label: 'Nemotron Mini (4B)', provider: 'ollama', size: '2.7 GB', description: 'NVIDIA highly-optimized compact model' },
  { name: 'nemotron', label: 'Nemotron (70B)', provider: 'ollama', size: '42 GB', description: 'NVIDIA powerful 70B general purpose model' },
  { name: 'glm4', label: 'GLM-4 (9B)', provider: 'ollama', size: '5.5 GB', description: 'High-quality Chinese-English bilingual model' },
  { name: 'phi4', label: 'Phi-4 (14B)', provider: 'ollama', size: '9.1 GB', description: 'Microsoft state-of-the-art 14B reasoning model' },
  { name: 'mistral-nemo', label: 'Mistral Nemo (12B)', provider: 'ollama', size: '7.1 GB', description: 'Mistral 12B model with large context and multilingual support' },
  { name: 'deepseek-r1:1.5b', label: 'DeepSeek R1 (1.5B)', provider: 'ollama', size: '1.1 GB', description: 'DeepSeek distilled reasoning model, fast & smart' },
  { name: 'deepseek-r1:7b', label: 'DeepSeek R1 (7B)', provider: 'ollama', size: '4.7 GB', description: 'DeepSeek distilled Qwen reasoning model' },
  { name: 'deepseek-r1:8b', label: 'DeepSeek R1 (8B)', provider: 'ollama', size: '4.9 GB', description: 'DeepSeek distilled Llama reasoning model' },
  { name: 'qwen2.5:0.5b', label: 'Qwen 2.5 (0.5B)', provider: 'ollama', size: '397 MB', description: 'Alibaba ultra-lightweight high performing model' },
  { name: 'qwen2.5:1.5b', label: 'Qwen 2.5 (1.5B)', provider: 'ollama', size: '986 MB', description: 'Alibaba compact general purpose model' },
  { name: 'qwen2.5:3b', label: 'Qwen 2.5 (3B)', provider: 'ollama', size: '1.9 GB', description: 'Alibaba balanced performance & memory model' },
  { name: 'qwen2.5:7b', label: 'Qwen 2.5 (7B)', provider: 'ollama', size: '4.7 GB', description: 'Alibaba powerful general purpose model' },
  { name: 'qwen2.5-coder:1.5b', label: 'Qwen 2.5 Coder (1.5B)', provider: 'ollama', size: '986 MB', description: 'Excellent localized code generation specialist' },
  { name: 'qwen2.5-coder:7b', label: 'Qwen 2.5 Coder (7B)', provider: 'ollama', size: '4.7 GB', description: 'Alibaba top-tier developer/coding specialist' },
  { name: 'mistral', label: 'Mistral (7B)', provider: 'ollama', size: '4.1 GB', description: 'High performance French open-source model' },
  { name: 'phi3', label: 'Phi-3 (3.8B)', provider: 'ollama', size: '2.2 GB', description: 'Microsoft highly-capable lightweight model' },
  { name: 'gemma2:2b', label: 'Gemma 2 (2B)', provider: 'ollama', size: '1.6 GB', description: 'Google lightweight, high-quality instructions assistant' },
  { name: 'gemma2:9b', label: 'Gemma 2 (9B)', provider: 'ollama', size: '5.5 GB', description: 'Google superior reasoning and conversational model' },
  { name: 'smollm2:1.7b', label: 'SmolLM2 (1.7B)', provider: 'ollama', size: '1.0 GB', description: 'Hugging Face ultra-fast lightweight localized assistant' },
  
  // Hugging Face GGUF
  { name: 'hf.co/bartowski/Llama-3.2-1B-Instruct-GGUF', label: 'HF: Llama 3.2 (1B) GGUF', provider: 'huggingface', size: '1.3 GB', description: 'Llama 3.2 1B Instruct compiled by bartowski' },
  { name: 'hf.co/bartowski/Llama-3.2-3B-Instruct-GGUF', label: 'HF: Llama 3.2 (3B) GGUF', provider: 'huggingface', size: '2.0 GB', description: 'Llama 3.2 3B Instruct compiled by bartowski' },
  { name: 'hf.co/bartowski/DeepSeek-R1-Distill-Qwen-1.5B-GGUF', label: 'HF: DeepSeek R1 Qwen (1.5B) GGUF', provider: 'huggingface', size: '1.1 GB', description: 'DeepSeek R1 1.5B reasoning GGUF by bartowski' },
  { name: 'hf.co/bartowski/DeepSeek-R1-Distill-Qwen-7B-GGUF', label: 'HF: DeepSeek R1 Qwen (7B) GGUF', provider: 'huggingface', size: '4.7 GB', description: 'DeepSeek R1 7B reasoning GGUF by bartowski' },
  { name: 'hf.co/bartowski/DeepSeek-R1-Distill-Llama-8B-GGUF', label: 'HF: DeepSeek R1 Llama (8B) GGUF', provider: 'huggingface', size: '4.9 GB', description: 'DeepSeek R1 8B reasoning GGUF by bartowski' },
  { name: 'hf.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF', label: 'HF: Qwen 2.5 Coder (1.5B) GGUF', provider: 'huggingface', size: '986 MB', description: 'Official Qwen 2.5 Coder 1.5B GGUF' },
  { name: 'hf.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF', label: 'HF: Qwen 2.5 Coder (7B) GGUF', provider: 'huggingface', size: '4.7 GB', description: 'Official Qwen 2.5 Coder 7B GGUF' }
];

export function ModelHub({ models, ollamaUrl, onClose, onRefresh }: ModelHubProps) {
  const [pullModelName, setPullModelName] = useState('');
  const [pullProgress, setPullProgress] = useState<{ status: string, digest?: string, total?: number, completed?: number } | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullController, setPullController] = useState<AbortController | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'models' | 'compare'>('models');
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Hardware status state
  const [hardware, setHardware] = useState<{ totalMemory: number, freeMemory: number, cpuCores: number, cpuModel: string, platform: string } | null>(null);
  
  // Model usage tracking from localStorage
  const [lastUsedMap, setLastUsedMap] = useState<Record<string, string>>({});

  // Model deletion states
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(null);
  const [deletingModelName, setDeletingModelName] = useState<string | null>(null);

  useEffect(() => {
    // Fetch hardware info on mount
    fetch('/api/hardware')
      .then(res => res.json())
      .then(data => setHardware(data))
      .catch(err => console.error('Error fetching hardware info:', err));

    // Load last-used models map
    try {
      const saved = localStorage.getItem('joelos_model_last_used');
      if (saved) {
        setLastUsedMap(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handlePull = async () => {
    if (!pullModelName.trim()) return;
    setIsPulling(true);
    setPullProgress({ status: 'Initiating pull...' });
    
    const controller = new AbortController();
    setPullController(controller);

    try {
      const response = await fetch('/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pullModelName, ollamaUrl }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error('Pull request failed');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          const rawData = line.slice(6).trim();
          try {
            const data = JSON.parse(rawData);
            setPullProgress(data);
            if (data.status === 'success') {
               setTimeout(() => {
                 setPullProgress(null);
                 setIsPulling(false);
                 setPullModelName('');
                 setPullController(null);
                 onRefresh();
               }, 2000);
            }
          } catch (e) {
            console.error('SSE Parse error', e);
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
         setPullProgress({ status: 'Pull cancelled by user.' });
         setTimeout(() => setPullProgress(null), 3000);
      } else {
         setPullProgress({ status: `Error: ${err.message}` });
      }
      setIsPulling(false);
      setPullController(null);
    }
  };

  const handleCancelPull = () => {
    if (pullController) {
      pullController.abort();
    }
    setPullProgress({ status: 'Pull cancelled by user.' });
    setIsPulling(false);
    setPullController(null);
    setTimeout(() => setPullProgress(null), 3000);
  };

  const handleDeleteModel = async (modelName: string) => {
    setDeletingModelName(modelName);
    try {
      const response = await fetch('/api/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, ollamaUrl })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete model');
      }
      
      onRefresh(); // Refresh the list of installed models
    } catch (err: any) {
      console.error('Error deleting model:', err);
    } finally {
      setDeletingModelName(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const estimateModelSize = (name: string): number => {
    const lower = name.toLowerCase();
    let bCount = 0;
    const match = lower.match(/(\d+(?:\.\d+)?)\s*b/);
    if (match) {
      bCount = parseFloat(match[1]);
    } else if (lower.includes('llama3.2') || lower.includes('llama3-2')) {
      if (lower.includes('1b')) bCount = 1;
      else bCount = 3;
    } else if (lower.includes('llama3') || lower.includes('llama')) {
      bCount = 8;
    } else if (lower.includes('phi3') || lower.includes('phi-3')) {
      bCount = 3.8;
    } else if (lower.includes('gemma2') || lower.includes('gemma-2')) {
      if (lower.includes('2b')) bCount = 2;
      else if (lower.includes('9b')) bCount = 9;
      else bCount = 27;
    } else if (lower.includes('mistral')) {
      bCount = 7;
    } else if (lower.includes('qwen2.5') || lower.includes('qwen-2.5')) {
      if (lower.includes('0.5b')) bCount = 0.5;
      else if (lower.includes('1.5b')) bCount = 1.5;
      else if (lower.includes('3b')) bCount = 3;
      else if (lower.includes('7b')) bCount = 7;
      else if (lower.includes('14b')) bCount = 14;
      else bCount = 32;
    }

    if (bCount > 0) {
      // standard Q4_K_M size is around 0.65 GB per Billion parameters
      return bCount * 0.65 * 1024 * 1024 * 1024;
    }
    return 0;
  };

  const getSuitability = (sizeInBytes: number) => {
    if (!hardware) return { label: 'Unknown', color: 'text-gray-400 border-gray-900 bg-gray-950/20' };
    const safeLimit = hardware.totalMemory * 0.5;
    const warnLimit = hardware.totalMemory * 0.75;
    
    if (sizeInBytes < safeLimit) {
      return { label: 'Optimal', color: 'text-[#00ff66] border-[#00ff66]/20 bg-[#00ff66]/5' };
    } else if (sizeInBytes < warnLimit) {
      return { label: 'Good (Heavy)', color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' };
    } else {
      return { label: 'Warning (OOM Risk)', color: 'text-red-400 border-red-500/20 bg-red-500/5' };
    }
  };

  const getFilteredSuggestions = () => {
    const query = pullModelName.trim();
    const lowerQuery = query.toLowerCase();
    if (!query) return POPULAR_MODELS;
    
    // If they explicitly type "ollama", filter for ollama provider
    if (lowerQuery === 'ollama') {
      return POPULAR_MODELS.filter(m => m.provider === 'ollama');
    }
    // If they explicitly type "huggingface" or "hf", filter for huggingface provider
    if (lowerQuery === 'huggingface' || lowerQuery === 'hf') {
      return POPULAR_MODELS.filter(m => m.provider === 'huggingface');
    }

    const filtered = POPULAR_MODELS.filter(m => 
      m.name.toLowerCase().includes(lowerQuery) ||
      m.label.toLowerCase().includes(lowerQuery) ||
      m.provider.toLowerCase().includes(lowerQuery) ||
      m.description.toLowerCase().includes(lowerQuery)
    );

    // If query is not empty and doesn't exactly match any item, append a dynamic option to pull this exact string!
    const exactMatch = POPULAR_MODELS.some(m => m.name.toLowerCase() === lowerQuery);
    if (!exactMatch) {
      const isHF = lowerQuery.startsWith('hf.co') || lowerQuery.includes('/');
      filtered.unshift({
        name: query,
        label: `Pull "${query}"`,
        provider: isHF ? 'huggingface' : 'ollama',
        size: 'Custom Size',
        description: `Directly pull the "${query}" model from the ${isHF ? 'Hugging Face GGUF repository' : 'Ollama Registry'}`
      });
    }

    return filtered;
  };

  const estimatedSize = estimateModelSize(pullModelName);
  const isTooLarge = hardware && estimatedSize > 0 && estimatedSize > (hardware.totalMemory * 0.75);

  const filteredModels = models.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Sum total memory consumed by loaded models
  const totalModelsSize = models.reduce((acc, m) => acc + m.size, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-5xl bg-[#08100c] border border-[#00ff66]/20 rounded-xl shadow-2xl flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#00ff66]/20 bg-[#00ff66]/5 rounded-t-xl">
          <div className="flex items-center gap-2 text-[#00ff66]">
            <Server size={20} />
            <h2 className="font-bold font-mono tracking-widest uppercase">Model Hub & Hardware Core</h2>
          </div>
          <button onClick={onClose} className="p-1 text-emerald-500/60 hover:text-emerald-400 hover:bg-emerald-950/40 rounded transition-colors">
            <span className="sr-only">Close</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-emerald-950 px-4 bg-[#040806]">
          <button 
            onClick={() => setActiveTab('models')}
            className={`px-4 py-3 font-mono text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${
              activeTab === 'models' 
                ? 'border-[#00ff66] text-[#00ff66] bg-[#00ff66]/5' 
                : 'border-transparent text-emerald-500/60 hover:text-emerald-400'
            }`}
          >
            Installed Models
          </button>
          <button 
            onClick={() => setActiveTab('compare')}
            className={`px-4 py-3 font-mono text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${
              activeTab === 'compare' 
                ? 'border-[#00ff66] text-[#00ff66] bg-[#00ff66]/5' 
                : 'border-transparent text-emerald-500/60 hover:text-emerald-400'
            }`}
          >
            Comparison & Hardware Status
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
          
          {activeTab === 'models' ? (
            <>
              {/* Pull Section */}
              <div className="bg-[#050a08] border border-emerald-900/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-emerald-400 font-mono text-sm font-bold flex items-center gap-2">
                    <Download size={16} /> Pull New Model
                  </h3>
                  <div className="flex gap-2">
                    <a href="https://ollama.com/library" target="_blank" rel="noopener noreferrer" className="text-[10px] bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 px-2 py-1 rounded flex items-center gap-1 transition-colors">
                      <Search size={10} /> Search Ollama
                    </a>
                    <a href="https://huggingface.co/models?search=gguf" target="_blank" rel="noopener noreferrer" className="text-[10px] bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 px-2 py-1 rounded flex items-center gap-1 transition-colors">
                      <Search size={10} /> Search Hugging Face
                    </a>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-3 relative z-30">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="e.g., llama3.2, hf.co/bartowski/Llama-3.2-1B-Instruct-GGUF"
                      value={pullModelName}
                      onChange={(e) => {
                        setPullModelName(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                      disabled={isPulling}
                      className="w-full bg-[#0a0f0c] border border-emerald-900/60 rounded px-3 py-2 text-emerald-300 font-mono text-sm focus:outline-none focus:border-[#00ff66]/50 placeholder-emerald-800"
                    />
                    
                    {showDropdown && !isPulling && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#050c08] border border-emerald-900/80 rounded-lg shadow-2xl max-h-64 overflow-y-auto z-50 divide-y divide-emerald-950/60 scrollbar-thin scrollbar-thumb-emerald-900 scrollbar-track-transparent">
                        {getFilteredSuggestions().length > 0 ? (
                          getFilteredSuggestions().map((suggestion) => (
                            <button
                              key={suggestion.name}
                              type="button"
                              onClick={() => {
                                setPullModelName(suggestion.name);
                                setShowDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-emerald-950/50 flex flex-col gap-1 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-xs font-bold text-slate-100 truncate">{suggestion.label}</span>
                                  <span className="font-mono text-[9px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-900/30 truncate">
                                    {suggestion.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                    suggestion.provider === 'ollama'
                                      ? 'text-[#00ff66] bg-[#00ff66]/10 border border-[#00ff66]/20'
                                      : 'text-amber-400 bg-amber-400/10 border border-amber-500/20'
                                  }`}>
                                    {suggestion.provider}
                                  </span>
                                  <span className="text-[10px] font-mono text-emerald-500/60">{suggestion.size}</span>
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-400 font-sans leading-normal truncate">{suggestion.description}</p>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-center text-emerald-500/40 text-xs font-mono">
                            No matching recommended models found.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {isPulling ? (
                    <button
                      onClick={handleCancelPull}
                      className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 px-4 py-2 rounded font-mono text-sm font-bold transition-colors flex items-center justify-center gap-2 h-9 md:h-auto"
                    >
                      <div className="w-4 h-4 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                      CANCEL PULL
                    </button>
                  ) : (
                    <button
                      onClick={handlePull}
                      disabled={!pullModelName.trim()}
                      className="bg-[#00ff66]/10 hover:bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/30 px-4 py-2 rounded font-mono text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 h-9 md:h-auto"
                    >
                      <Download size={16} />
                      PULL
                    </button>
                  )}
                </div>

                {isTooLarge && hardware && (
                  <div className="mt-3 p-3 bg-red-950/40 border border-red-500/30 rounded-lg flex items-start gap-3 text-red-400 font-mono text-xs">
                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="font-bold uppercase tracking-wider text-red-300">Warning: RAM Budget Overdraft Risk</p>
                      <p className="mt-1">
                        This model is estimated to consume <span className="font-white font-bold">{formatBytes(estimatedSize)}</span>, 
                        which exceeds <span className="font-white font-bold">75%</span> of your total RAM (<span className="font-white font-bold">{formatBytes(hardware.totalMemory)}</span>). 
                        It is recommended to run smaller quantized versions (e.g. 1B-3B models) to prevent Out-Of-Memory (OOM) crashes.
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-emerald-500/50 font-mono mt-2 flex items-center gap-1">
                  <Info size={10} /> Supports Ollama tags and Hugging Face GGUF URLs (e.g. hf.co/user/repo)
                </p>
                
                {/* Progress */}
                {pullProgress && (
                  <div className="mt-4 p-3 bg-emerald-950/30 border border-emerald-900/40 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-mono text-emerald-300">{pullProgress.status}</span>
                      {pullProgress.total && pullProgress.completed && (
                        <span className="text-xs font-mono text-emerald-400">
                          {Math.round((pullProgress.completed / pullProgress.total) * 100)}%
                        </span>
                      )}
                    </div>
                    {pullProgress.total && pullProgress.completed && (
                      <div className="w-full bg-[#030504] rounded-full h-1.5 overflow-hidden border border-emerald-900/30">
                        <div 
                          className="bg-[#00ff66] h-1.5 transition-all duration-300 ease-out" 
                          style={{ width: `${(pullProgress.completed / pullProgress.total) * 100}%` }}
                        ></div>
                      </div>
                    )}
                    {pullProgress.total && pullProgress.completed && (
                       <div className="text-[10px] font-mono text-emerald-500/70 mt-1.5 text-right">
                         {formatBytes(pullProgress.completed)} / {formatBytes(pullProgress.total)}
                       </div>
                    )}
                  </div>
                )}
              </div>

              {/* List Section */}
              <div>
                <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                  <h3 className="text-emerald-400 font-mono text-sm font-bold flex items-center gap-2 whitespace-nowrap">
                    <HardDrive size={16} /> Installed Models ({models.length})
                  </h3>
                  
                  <div className="flex items-center gap-3 flex-1 min-w-[200px] justify-end">
                    <div className="relative flex-1 max-w-xs">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <Search size={14} className="text-emerald-600" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search installed models..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#050a08] border border-emerald-900/50 rounded-lg pl-8 pr-3 py-1.5 text-emerald-300 font-mono text-xs focus:outline-none focus:border-[#00ff66]/50 placeholder-emerald-800/70"
                      />
                    </div>
                    
                    <button onClick={onRefresh} className="text-emerald-500 hover:text-[#00ff66] transition-colors flex items-center gap-1 text-xs font-mono whitespace-nowrap bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-900/30">
                      <Server size={14} /> Refresh
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredModels.map((model) => {
                    const suitability = getSuitability(model.size);
                    const lastUsed = lastUsedMap[model.name];
                    return (
                      <div key={model.name} className="bg-[#0a0f0c] border border-emerald-900/40 hover:border-[#00ff66]/30 transition-colors rounded-lg p-4 relative group flex flex-col justify-between overflow-hidden">
                        {confirmDeleteName === model.name && (
                          <div className="absolute inset-0 bg-[#0c0505]/95 border border-rose-900/60 flex flex-col items-center justify-center p-4 text-center z-20 font-mono">
                            <Trash2 size={24} className="text-rose-500 mb-2 animate-bounce" />
                            <p className="text-rose-400 font-bold text-xs uppercase mb-1">Uninstall local model?</p>
                            <p className="text-slate-300 text-[10px] mb-4 truncate max-w-full px-2" title={model.name}>{model.name}</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setConfirmDeleteName(null)}
                                className="px-3 py-1.5 text-[10px] text-slate-400 border border-slate-800 rounded bg-[#101010] hover:bg-slate-900 transition-colors cursor-pointer"
                              >
                                CANCEL
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmDeleteName(null);
                                  handleDeleteModel(model.name);
                                }}
                                className="px-3 py-1.5 text-[10px] text-rose-500 border border-rose-900/40 bg-rose-950/20 rounded hover:bg-rose-950/40 transition-colors cursor-pointer"
                              >
                                CONFIRM DELETE
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {deletingModelName === model.name && (
                          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 z-20 font-mono text-center">
                            <div className="w-5 h-5 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mb-2" />
                            <p className="text-rose-400 text-[10px] font-bold tracking-wider">UNINSTALLING MODEL...</p>
                          </div>
                        )}

                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-mono font-bold text-emerald-300 text-base truncate pr-2" title={model.name}>{model.name}</h4>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono border ${suitability.color}`}>
                                {suitability.label}
                              </span>
                              <button
                                onClick={() => setConfirmDeleteName(model.name)}
                                title="Uninstall and delete model"
                                className="text-rose-500/50 hover:text-rose-400 hover:bg-rose-950/30 p-1.5 rounded transition-colors cursor-pointer flex items-center justify-center"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3 mt-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-emerald-500/50 text-[10px]">SIZE</span>
                              <span className="text-emerald-400 font-bold">{formatBytes(model.size)}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-emerald-500/50 text-[10px]">FAMILY</span>
                              <span className="text-emerald-400 uppercase truncate">{model.details?.family || 'UNKNOWN'}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-emerald-500/50 text-[10px]">PARAMS</span>
                              <span className="text-emerald-400 font-bold">{model.details?.parameter_size || 'N/A'}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-emerald-500/50 text-[10px]">QUANT</span>
                              <span className="text-emerald-400 font-bold">{model.details?.quantization_level || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-emerald-950 text-[10px] text-emerald-500/40 font-mono">
                          <div className="flex items-center gap-1">
                            <Clock size={10} />
                            <span>Modified: {new Date(model.modified_at).toLocaleDateString()}</span>
                          </div>
                          {lastUsed && (
                            <span className="text-emerald-400/70 font-semibold uppercase tracking-wider text-[9px]">
                              Active: {new Date(lastUsed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {models.length === 0 && (
                    <div className="col-span-full p-8 border border-dashed border-emerald-900/40 rounded-lg text-center flex flex-col items-center justify-center text-emerald-500/60 font-mono">
                      <AlertCircle size={32} className="mb-2 opacity-50" />
                      <p>No local Ollama models detected.</p>
                      <p className="text-xs mt-1">Try pulling one above (e.g., 'llama3.2')</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Tab 2: Comparison & Hardware Status */
            <div className="space-y-6 font-mono">
              
              {/* Hardware Overview Card */}
              <div className="bg-[#050a08] border border-emerald-900/40 rounded-lg p-5">
                <h3 className="text-emerald-400 text-sm font-bold flex items-center gap-2 mb-4 border-b border-emerald-950 pb-2">
                  <Cpu size={16} /> CORE HARDWARE SPECS
                </h3>
                
                {hardware ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <div className="text-[10px] text-emerald-500/50">CPU PROCESSOR</div>
                      <div className="text-emerald-300 font-bold text-sm truncate" title={hardware.cpuModel}>
                        {hardware.cpuModel}
                      </div>
                      <div className="text-xs text-emerald-400">{hardware.cpuCores} Logic Cores</div>
                    </div>
                    
                    <div className="space-y-1 md:col-span-2">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-emerald-500/50">SYSTEM MEMORY BUDGET</span>
                        <span className="text-emerald-400 font-bold">
                          {formatBytes(totalModelsSize)} of {formatBytes(hardware.totalMemory)} allocated
                        </span>
                      </div>
                      
                      {/* Budget Gauge */}
                      <div className="w-full bg-[#030504] h-3 rounded overflow-hidden border border-emerald-900/40 relative flex">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (totalModelsSize / hardware.totalMemory) * 100)}%` }}
                        />
                        <div 
                          className="bg-[#00ff66]/10 h-full flex-1"
                        />
                      </div>
                      
                      <div className="flex justify-between text-[9px] text-emerald-500/50 pt-1">
                        <span>Installed Models: {formatBytes(totalModelsSize)} ({Math.round((totalModelsSize / hardware.totalMemory) * 100)}%)</span>
                        <span>Free System RAM: {formatBytes(hardware.freeMemory)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-emerald-500/40">
                    <span className="inline-block w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mr-2" />
                    Querying system hardware profile...
                  </div>
                )}
              </div>

              {/* Side-by-Side Comparison Table */}
              <div className="bg-[#050a08] border border-emerald-900/40 rounded-lg overflow-hidden">
                <div className="p-4 bg-emerald-950/20 border-b border-emerald-950 flex justify-between items-center">
                  <h3 className="text-emerald-400 text-sm font-bold flex items-center gap-2">
                    <Database size={16} /> SIDE-BY-SIDE MODEL INDEX
                  </h3>
                  <span className="text-[10px] text-emerald-500/60 uppercase">Installed local tag matrix</span>
                </div>
                
                {models.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-emerald-950 text-emerald-500/60 bg-[#030605]">
                          <th className="p-3">MODEL IDENTIFIER</th>
                          <th className="p-3">SIZE</th>
                          <th className="p-3">QUANT LEVEL</th>
                          <th className="p-3">FAMILY</th>
                          <th className="p-3">PARAMS</th>
                          <th className="p-3">HARDWARE FIT</th>
                          <th className="p-3 text-right">LAST INVOKED</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-950">
                        {models.map(m => {
                          const suitability = getSuitability(m.size);
                          const lastUsed = lastUsedMap[m.name];
                          return (
                            <tr key={m.name} className="hover:bg-emerald-950/10 text-emerald-300 transition-colors">
                              <td className="p-3 font-bold text-white truncate max-w-[200px]" title={m.name}>{m.name}</td>
                              <td className="p-3 font-semibold text-emerald-400">{formatBytes(m.size)}</td>
                              <td className="p-3 text-emerald-400/80 uppercase">{m.details?.quantization_level || 'N/A'}</td>
                              <td className="p-3 text-emerald-400/80 uppercase">{m.details?.family || 'N/A'}</td>
                              <td className="p-3 font-semibold text-emerald-400/80">{m.details?.parameter_size || 'N/A'}</td>
                              <td className="p-3">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded border ${suitability.color}`}>
                                  {suitability.label}
                                </span>
                              </td>
                              <td className="p-3 text-right text-emerald-500/70">
                                {lastUsed ? (
                                  <span>{new Date(lastUsed).toLocaleDateString()} {new Date(lastUsed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                ) : (
                                  <span className="text-emerald-800">Never tracked</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-emerald-500/40">
                    No models installed for comparison matrix indices.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
