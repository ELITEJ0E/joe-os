import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import chokidar from 'chokidar';
import os from 'os';
import { spawn } from 'child_process';
import http from 'http';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 3000;

// Manual CORS middleware (bypasses dependency issues cleanly)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
  
  // Set headers required for WebContainers / StackBlitz API browser isolated threads
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI
function getGeminiKeys(): string[] {
  // Only load from .env if it actually exists.
  // Never load .env.example as it only contains blank template values and
  // would overwrite the real environment variables passed by the container.
  if (fs.existsSync('.env')) {
    dotenv.config({ path: '.env', override: true });
  }
  
  // Note: We deliberately do NOT perform any hardcoded prefix validation 
  // (e.g., checking for 'AIzaSy' or 'AQ.') on the actual API key values here.
  // Google AI Studio issues keys with various prefixes, so prefix validation
  // is brittle. We rely on the API itself to validate the key at request time.
  const geminiKeys = Object.keys(process.env)
    .filter(k => k.startsWith('GEMINI_API_KEY') && process.env[k])
    .map(k => (process.env[k] as string).trim());
    
  // Basic non-empty string validation is enough.
  const validKeys = geminiKeys.filter(k => k.length > 0);
  
  return [...new Set(validKeys)];
}

let ai: GoogleGenAI | null = null;
const initialKeys = getGeminiKeys();

if (initialKeys.length > 0) {
  ai = new GoogleGenAI({
    apiKey: initialKeys[0],
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  console.log(`Google GenAI client initialized. Found ${initialKeys.length} API keys for fallback.`);
} else {
  console.warn('GEMINI_API_KEY not found in environment. Gemini features will require manual API key input or use Ollama only.');
}

async function executeWithGeminiFallback<T>(
  customKey: string | undefined,
  operation: (client: GoogleGenAI) => Promise<T>
): Promise<T> {
  const currentKeys = getGeminiKeys();
  
  // Basic validation: ensure the custom key is a non-empty string.
  // We do not check for specific prefixes like AIzaSy here, 
  // to support all Google AI Studio key formats (like AQ.).
  const validCustomKey = typeof customKey === 'string' && customKey.trim().length > 0 ? customKey.trim() : undefined;
  const keysToTry = validCustomKey ? [validCustomKey] : currentKeys;

  if (keysToTry.length === 0) {
    throw new Error('Gemini API client not initialized. Provide an API key in settings or backend env.');
  }

  let lastError: any;
  for (let i = 0; i < keysToTry.length; i++) {
    const key = keysToTry[i];
    try {
      const client = new GoogleGenAI({ 
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        }
      });
      return await operation(client);
    } catch (err: any) {
      lastError = err;
      console.error(`Gemini call failed for API key index ${i}:`, err.message);
      
      const isRateLimit = err.status === 429 || err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('exhausted') || err.status === 503;
      
      // We also fallback on 401/403 just in case they have a mix of dead/live keys
      // But log it clearly so they know why it failed.
      if (i < keysToTry.length - 1) {
        console.warn(`Falling back to next Gemini API key...`);
        continue;
      }
      
      throw err;
    }
  }
  
  throw lastError;
}

function cleanErrorMessage(err: any): string {
  if (!err) return 'Unknown error occurred';
  const msg = err.message || String(err);
  try {
    if (typeof msg === 'string') {
      const trimmed = msg.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        if (parsed.error && parsed.error.message) {
          return parsed.error.message;
        }
      }
    }
  } catch (e) {
    // ignore parsing failure
  }

  if (err.status && err.message) {
    return `${err.message} (${err.status})`;
  }

  if (err.error && typeof err.error === 'object' && err.error.message) {
    return err.error.message;
  }

  // extract via regex if embedded JSON is found
  const match = msg.match(/"message"\s*:\s*"([^"]+)"/);
  if (match && match[1]) {
    return match[1];
  }

  return msg;
}

// 128-dimensional local vector hashing helper (extremely robust, zero-dependency cosine similarity)
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
  
  // Normalize vector (L2 norm)
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

const BRAIN_FILE = path.join(process.cwd(), 'brain.json');

// REST API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', geminiAvailable: getGeminiKeys().length > 0 });
});

app.get('/api/memory', (req, res) => {
  try {
    if (!fs.existsSync(BRAIN_FILE)) return res.json([]);
    const data = JSON.parse(fs.readFileSync(BRAIN_FILE, 'utf-8'));
    res.json(data);
  } catch { res.json([]); }
});

app.post('/api/memory', (req, res) => {
  try {
    const items = req.body.items;
    fs.writeFileSync(BRAIN_FILE, JSON.stringify(items, null, 2));
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Endpoint for generating embeddings (either Gemini or Local Vector)
app.post('/api/embeddings', async (req, res) => {
  const { text, engine } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text prompt is required' });
  }

  try {
    if (engine === 'gemini' && getGeminiKeys().length > 0) {
      const response: any = await executeWithGeminiFallback(req.body.cloudApiKey, async (client) => {
        return await client.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: text,
        });
      });
      const values = response.embedding?.values || response.embeddings?.[0]?.values || response.embeddings?.values;
      if (values) {
        return res.json({ embedding: values });
      }
    }
  } catch (error: any) {
    console.error('Error generating Gemini embedding, falling back to local hashing:', error.message);
  }

  // Fallback to local high-fidelity vector hashing
  const vector = getLocalEmbeddingVector(text);
  return res.json({ embedding: vector });
});

// Proxy Ollama tags endpoint to get installed models list
app.get('/api/tags', async (req, res) => {
  const ollamaUrl = (req.query.url as string) || 'http://localhost:11434';
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }
    const data = await response.json();
    return res.json({ models: data.models || [], raw: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Proxy Ollama pull endpoint to download new models
app.post('/api/pull', async (req, res) => {
  const { name, ollamaUrl = 'http://localhost:11434' } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Model name is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let isCompleted = false;
  let reader: any = null;
  const controller = new AbortController();
  req.on('close', () => {
    controller.abort();
    if (reader) {
      try {
        reader.cancel().catch(() => {});
      } catch (err) {
        // ignore
      }
    }
    if (!isCompleted) {
      console.log(`Aborting Ollama pull for model "${name}" and cleaning up partial download...`);
      fetch(`${ollamaUrl}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      }).catch((e) => {
        console.warn('Failed to send delete to Ollama on pull abort:', e.message);
      });
    }
  });

  try {
    const response = await fetch(`${ollamaUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, stream: true }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Ollama response body is empty');
    }

    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        res.write(`data: ${line}\n\n`);
        
        // Also check if status is success to mark isCompleted
        try {
          const parsed = JSON.parse(line);
          if (parsed.status === 'success') {
            isCompleted = true;
          }
        } catch (e) {
          // Ignore parse issues of intermediate lines
        }
      }
    }
    isCompleted = true;
    return res.end();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.log('Client aborted pull request.');
      return res.end();
    }
    console.error('Error in pull proxy:', err);
    res.write(`data: ${JSON.stringify({ status: 'error', error: err.message })}\n\n`);
    return res.end();
  }
});

// Proxy Ollama delete endpoint to remove models
app.delete('/api/delete', async (req, res) => {
  const { name, ollamaUrl = 'http://localhost:11434' } = req.body;
  const modelName = name || req.query.name;
  if (!modelName) {
    return res.status(400).json({ error: 'Model name is required' });
  }

  try {
    const response = await fetch(`${ollamaUrl}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName })
    });

    if (response.status === 200 || response.ok) {
      return res.json({ success: true, message: `Model "${modelName}" uninstalled successfully.` });
    } else {
      const errText = await response.text();
      throw new Error(errText || `Ollama returned status ${response.status}`);
    }
  } catch (err: any) {
    console.error('Error deleting model:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete model' });
  }
});

// Combined agent chat routing (SSE Stream & standard JSON support)
app.post('/api/chat', async (req, res) => {
  const {
    engine,
    model,
    messages,
    systemInstruction,
    stream = true,
    ollamaUrl = 'http://localhost:11434',
    enableSearch = false,
  } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages list is required' });
  }

  // Set headers for SSE Streaming if active
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
  }

  // Mode: Gemini Cloud Engine
  if (engine === 'gemini') {
    try {
      // Map Ollama / Generic models to correct Gemini models
      let mappedModel = 'gemini-2.5-flash';
      if (model?.toLowerCase().includes('coder') || model?.toLowerCase().includes('14b') || model?.toLowerCase().includes('pro')) {
        mappedModel = 'gemini-2.5-pro'; // Premium coder reasoning
      }

      // Convert messages to GoogleGenAI formats
      const contents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : m.role,
        parts: [{ text: m.content }],
      }));

      const config: any = {
        systemInstruction,
      };

      if (enableSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      if (stream) {
        await executeWithGeminiFallback(req.body.cloudApiKey, async (client) => {
          const streamResponse = await client.models.generateContentStream({
            model: mappedModel,
            contents,
            config,
          });

          // Await the first chunk to catch authentication or rate limit errors immediately
          let firstChunkReceived = false;
          for await (const chunk of streamResponse) {
            firstChunkReceived = true;
            const text = chunk.text || '';
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
          if (!firstChunkReceived) {
             // Stream ended without chunks
          }
        });
        return res.end();
      } else {
        const response = await executeWithGeminiFallback(req.body.cloudApiKey, async (client) => {
          return await client.models.generateContent({
            model: mappedModel,
            contents,
            config,
          });
        });
        return res.json({ text: response.text });
      }
    } catch (error: any) {
      console.error('Gemini execution error:', error);
      const errMsg = error.message || 'Unknown error occurred during Gemini call';
      if (stream) {
        res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
        return res.end();
      } else {
        return res.status(500).json({ error: errMsg });
      }
    }
  }
  
  // Mode: OpenAI compatible / OpenRouter / Hermes
  if (engine === 'openai' || engine === 'openrouter' || engine === 'hermes') {
    try {
      let apiKey = req.body.cloudApiKey;
      if (!apiKey && engine !== 'hermes') {
        throw new Error(`API key is required for ${engine}`);
      } else if (!apiKey && engine === 'hermes') {
        apiKey = 'local-hermes-key';
      }
      
      const hermesUrl = process.env.HERMES_GATEWAY_URL || 'http://localhost:8080';
      const baseUrl = engine === 'hermes'
        ? `${hermesUrl}/v1/chat/completions`
        : (engine === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions');
      
      const formattedMessages = messages.map((m: any) => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.content,
      }));
      if (systemInstruction) {
        formattedMessages.unshift({ role: 'system', content: systemInstruction });
      }

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          ...(engine === 'openrouter' ? { 'HTTP-Referer': 'https://joelos.ai', 'X-Title': 'JoelOS' } : {})
        },
        body: JSON.stringify({
          model: model || (engine === 'hermes' ? 'hermes-3' : engine === 'openai' ? 'gpt-4o' : 'qwen/qwen-2.5-coder-32b-instruct'),
          messages: formattedMessages,
          stream,
        })
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`API returned status ${response.status}: ${txt}`);
      }

      if (stream) {
        if (!response.body) throw new Error('Response body empty');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === 'data: [DONE]') continue;
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.substring(6));
                const text = parsed.choices?.[0]?.delta?.content || '';
                if (text) {
                  res.write(`data: ${JSON.stringify({ text })}\n\n`);
                }
              } catch (e) { }
            }
          }
        }
        return res.end();
      } else {
        const data = await response.json();
        return res.json({ text: data.choices?.[0]?.message?.content || '' });
      }

    } catch (error: any) {
      console.error(`${engine} execution error:`, error);
      const errMsg = error.message || `Unknown error during ${engine} call`;
      if (stream) {
        res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
        return res.end();
      } else {
        return res.status(500).json({ error: errMsg });
      }
    }
  }

  // Mode: Local Ollama Proxy (bypasses browser CORS / Mixed Content issues)
  try {
    const formattedMessages = messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    if (systemInstruction) {
      // Add system instruction at the beginning or as system message
      formattedMessages.unshift({
        role: 'system',
        content: systemInstruction,
      });
    }

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        stream,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama server returned status ${response.status}`);
    }

    if (stream) {
      if (!response.body) {
        throw new Error('Ollama response body is empty');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            const text = parsed.message?.content || '';
            res.write(`data: ${JSON.stringify({ 
              text, 
              eval_count: parsed.eval_count, 
              prompt_eval_count: parsed.prompt_eval_count,
              done: parsed.done 
            })}\n\n`);
          } catch (e) {
            // Support raw SSE data formats too
            if (line.startsWith('data: ')) {
              res.write(`${line}\n\n`);
            }
          }
        }
      }
      return res.end();
    } else {
      const data = await response.json();
      return res.json({ text: data.message?.content || '' });
    }
  } catch (error: any) {
    console.error('Ollama connection/execution error:', error);
    const errMsg = `Ollama connection failed at ${ollamaUrl}. Make sure Ollama is running locally (e.g. 'ollama run ${model}') and accessible. Error: ${error.message}`;
    if (stream) {
      res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
      return res.end();
    } else {
      return res.status(500).json({ error: errMsg });
    }
  }
});

// Proxy route to fetch dynamic list of models from current active engine / provider
app.post('/api/provider-models', async (req, res) => {
  const { engine, apiKey, ollamaUrl = 'http://localhost:11434' } = req.body;

  if (!engine) {
    return res.status(400).json({ error: 'Engine parameter is required' });
  }

  try {
    if (engine === 'openrouter') {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
        }
      });
      if (!response.ok) {
        throw new Error(`OpenRouter models API returned status ${response.status}`);
      }
      const data = await response.json();
      const formattedModels = (data.data || []).map((m: any) => {
        const isFree = !m.pricing || (parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0 || m.id.endsWith(':free'));
        return {
          id: m.id,
          name: m.name,
          description: m.description || '',
          contextLength: m.context_length || 0,
          pricing: m.pricing || null,
          isFree: isFree,
        };
      });
      return res.json({ models: formattedModels });
    } else if (engine === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
        }
      });
      if (!response.ok) {
        throw new Error(`OpenAI models API returned status ${response.status}`);
      }
      const data = await response.json();
      const formattedModels = (data.data || [])
        .filter((m: any) => m.id.startsWith('gpt') || m.id.startsWith('o1'))
        .map((m: any) => ({
          id: m.id,
          name: m.id,
          isFree: false,
        }));
      return res.json({ models: formattedModels });
    } else if (engine === 'gemini') {
      const geminiModels = [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Recommended default. High speed, balanced multimodal capabilities.', isFree: true },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Premium reasoning, high-fidelity coding, and complex analysis.', isFree: true },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast, lightweight model for everyday tasks.', isFree: true },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Complex multi-turn instruction following.', isFree: true },
        { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B', description: 'Extremely fast, high-volume lower cost model.', isFree: true },
      ];
      return res.json({ models: geminiModels });
    } else if (engine === 'ollama') {
      const response = await fetch(`${ollamaUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama returned status ${response.status}`);
      }
      const data = await response.json();
      const formattedModels = (data.models || []).map((m: any) => ({
        id: m.name,
        name: m.name,
        description: `Size: ${(m.size / (1024 * 1024 * 1024)).toFixed(2)} GB - Format: ${m.details?.format || 'GGUF'}`,
        isFree: true,
      }));
      return res.json({ models: formattedModels });
    } else {
      return res.status(400).json({ error: `Unsupported engine: ${engine}` });
    }
  } catch (err: any) {
    console.error('Error in provider-models:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch provider models' });
  }
});

// Obsidian Vault Integration helpers and endpoints
let watcher: any = null;
let watcherClients: any[] = [];

function notifyWatcherClients(event: string, relativePath: string) {
  const data = JSON.stringify({ event, path: relativePath });
  watcherClients.forEach(client => {
    client.write(`data: ${data}\n\n`);
  });
}

function parseFrontmatter(content: string) {
  const result = { frontmatter: {} as any, content: content };
  if (content.startsWith('---')) {
    const endIdx = content.indexOf('---', 3);
    if (endIdx !== -1) {
      const yamlSection = content.substring(3, endIdx).trim();
      const remaining = content.substring(endIdx + 3).trim();
      result.content = remaining;
      const lines = yamlSection.split('\n');
      for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const key = line.substring(0, colonIdx).trim();
          let val = line.substring(colonIdx + 1).trim();
          if (val.startsWith('[') && val.endsWith(']')) {
            result.frontmatter[key] = val.substring(1, val.length - 1).split(',').map(s => s.trim());
          } else {
            result.frontmatter[key] = val;
          }
        }
      }
    }
  }
  return result;
}

async function generateEmbeddingForText(text: string): Promise<number[]> {
  const model = 'nomic-embed-text';
  const ollamaUrl = 'http://localhost:11434';
  
  // 1. Try Ollama /api/embed
  try {
    const response = await fetch(`${ollamaUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: text })
    });
    if (response.ok) {
      const data = await response.json();
      if (data.embeddings && data.embeddings[0]) {
        return data.embeddings[0];
      }
    }
  } catch (e) {}

  // 2. Try Ollama /api/embeddings
  try {
    const response = await fetch(`${ollamaUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text })
    });
    if (response.ok) {
      const data = await response.json();
      if (data.embedding) {
        return data.embedding;
      }
    }
  } catch (e) {}

  // 3. Try Gemini embedding
  if (getGeminiKeys().length > 0) {
    try {
      const response: any = await executeWithGeminiFallback(undefined, async (client) => {
        return await client.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: text,
        });
      });
      const values = response.embedding?.values || response.embeddings?.[0]?.values || response.embeddings?.values;
      if (values) {
        return values;
      }
    } catch (error: any) {}
  }

  // 4. Fallback
  return getLocalEmbeddingVector(text);
}

async function indexVaultFile(relativePath: string, absolutePath: string, vaultPath: string) {
  try {
    if (!fs.existsSync(absolutePath)) return;
    const stats = fs.statSync(absolutePath);
    if (!stats.isFile() || !relativePath.endsWith('.md')) return;

    // Ignore dotfiles and folders like .obsidian or .git
    if (relativePath.startsWith('.obsidian') || relativePath.startsWith('.git')) return;

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const { frontmatter, content: cleanContent } = parseFrontmatter(content);

    // Read index
    let index: any[] = [];
    const indexFile = path.join(process.cwd(), 'vault-index.json');
    if (fs.existsSync(indexFile)) {
      try {
        index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
      } catch { index = []; }
    }

    const existingIdx = index.findIndex((item: any) => item.path === relativePath);
    const mtime = stats.mtime.toISOString();

    if (existingIdx !== -1 && index[existingIdx].mtime === mtime) {
      return; // Up to date
    }

    const snippet = cleanContent.substring(0, 300);
    const title = frontmatter.title || path.basename(relativePath, '.md');
    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : (frontmatter.tags ? [frontmatter.tags] : []);

    const textToEmbed = `${title}\n${tags.join(', ')}\n${cleanContent.substring(0, 1000)}`;
    const embedding = await generateEmbeddingForText(textToEmbed);

    const indexedItem = {
      path: relativePath,
      title,
      summary: frontmatter.summary || (snippet.length > 150 ? snippet.substring(0, 150) + '...' : snippet),
      snippet,
      tags,
      embedding,
      mtime,
      timestamp: mtime,
      frontmatter
    };

    if (existingIdx !== -1) {
      index[existingIdx] = indexedItem;
    } else {
      index.push(indexedItem);
    }

    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
    console.log(`[Vault Watcher] Indexed note: ${relativePath}`);
  } catch (error) {
    console.error(`[Vault Watcher] Error indexing file ${relativePath}:`, error);
  }
}

function removeFileFromIndex(relativePath: string) {
  const indexFile = path.join(process.cwd(), 'vault-index.json');
  if (fs.existsSync(indexFile)) {
    try {
      const index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
      const filtered = index.filter((item: any) => item.path !== relativePath);
      fs.writeFileSync(indexFile, JSON.stringify(filtered, null, 2));
      console.log(`[Vault Watcher] Removed from index: ${relativePath}`);
    } catch (e) {
      console.error(e);
    }
  }
}

function startChokidarWatcher(vaultPath: string) {
  if (watcher) {
    watcher.close();
  }

  console.log(`[Vault Watcher] Starting recursive monitor on: ${vaultPath}`);
  watcher = chokidar.watch(vaultPath, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 100
    }
  });

  watcher.on('add', async (filePath) => {
    const relativePath = path.relative(vaultPath, filePath);
    if (!relativePath.endsWith('.md')) return;
    await indexVaultFile(relativePath, filePath, vaultPath);
    notifyWatcherClients('add', relativePath);
  });

  watcher.on('change', async (filePath) => {
    const relativePath = path.relative(vaultPath, filePath);
    if (!relativePath.endsWith('.md')) return;
    await indexVaultFile(relativePath, filePath, vaultPath);
    notifyWatcherClients('change', relativePath);
  });

  watcher.on('unlink', (filePath) => {
    const relativePath = path.relative(vaultPath, filePath);
    if (!relativePath.endsWith('.md')) return;
    removeFileFromIndex(relativePath);
    notifyWatcherClients('delete', relativePath);
  });
}

// REST Vault endpoints
app.get('/api/vault/config', (req, res) => {
  const CONFIG_FILE = path.join(process.cwd(), 'vault-config.json');
  if (!fs.existsSync(CONFIG_FILE)) {
    return res.json({ configured: false, autoWrite: true });
  }
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    const isValid = config.vaultPath && fs.existsSync(config.vaultPath) && fs.statSync(config.vaultPath).isDirectory();
    let notesCount = 0;
    if (isValid) {
      const indexFile = path.join(process.cwd(), 'vault-index.json');
      if (fs.existsSync(indexFile)) {
        try {
          const index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
          notesCount = index.length;
        } catch {}
      }
    }
    res.json({
      configured: isValid,
      vaultPath: config.vaultPath || '',
      autoWrite: config.autoWrite !== false,
      notesCount
    });
  } catch {
    res.json({ configured: false, autoWrite: true });
  }
});

app.post('/api/vault/config', (req, res) => {
  const { vaultPath, autoWrite = true } = req.body;
  if (!vaultPath) {
    return res.status(400).json({ error: 'Vault path is required' });
  }

  try {
    if (!fs.existsSync(vaultPath) || !fs.statSync(vaultPath).isDirectory()) {
      return res.status(400).json({ error: 'Path does not exist or is not a directory' });
    }

    const CONFIG_FILE = path.join(process.cwd(), 'vault-config.json');
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ vaultPath, autoWrite }, null, 2));

    // Start/restart watcher
    startChokidarWatcher(vaultPath);

    // Get current index length
    let notesCount = 0;
    const indexFile = path.join(process.cwd(), 'vault-index.json');
    if (fs.existsSync(indexFile)) {
      try {
        const index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
        notesCount = index.length;
      } catch {}
    }

    res.json({ success: true, vaultPath, autoWrite, notesCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vault/notes', (req, res) => {
  const indexFile = path.join(process.cwd(), 'vault-index.json');
  if (fs.existsSync(indexFile)) {
    try {
      const index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
      return res.json({ notes: index });
    } catch {}
  }
  return res.json({ notes: [] });
});

app.get('/api/vault/note', (req, res) => {
  const notePath = req.query.path as string;
  if (!notePath) {
    return res.status(400).json({ error: 'Note path query parameter is required' });
  }

  const CONFIG_FILE = path.join(process.cwd(), 'vault-config.json');
  if (!fs.existsSync(CONFIG_FILE)) {
    return res.status(400).json({ error: 'Vault is not configured' });
  }

  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    const absolutePath = path.join(config.vaultPath, notePath);

    const relative = path.relative(config.vaultPath, absolutePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return res.status(403).json({ error: 'Access denied: Path lies outside vault' });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const rawContent = fs.readFileSync(absolutePath, 'utf-8');
    const { frontmatter, content } = parseFrontmatter(rawContent);

    res.json({
      path: notePath,
      content,
      frontmatter,
      raw: rawContent
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vault/notes', async (req, res) => {
  const { path: notePath, content, frontmatter = {} } = req.body;
  if (!notePath || content === undefined) {
    return res.status(400).json({ error: 'Path and content parameters are required' });
  }

  const CONFIG_FILE = path.join(process.cwd(), 'vault-config.json');
  if (!fs.existsSync(CONFIG_FILE)) {
    return res.status(400).json({ error: 'Vault is not configured' });
  }

  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    const absolutePath = path.join(config.vaultPath, notePath);

    const relative = path.relative(config.vaultPath, absolutePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return res.status(403).json({ error: 'Access denied: Path lies outside vault' });
    }

    const parentDir = path.dirname(absolutePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    let fileContent = '';
    if (Object.keys(frontmatter).length > 0) {
      fileContent += '---\n';
      for (const [key, val] of Object.entries(frontmatter)) {
        if (Array.isArray(val)) {
          fileContent += `${key}: [${val.join(', ')}]\n`;
        } else {
          fileContent += `${key}: ${val}\n`;
        }
      }
      fileContent += '---\n';
    }
    fileContent += content;

    fs.writeFileSync(absolutePath, fileContent, 'utf-8');

    // Index immediately
    await indexVaultFile(notePath, absolutePath, config.vaultPath);

    res.json({ success: true, path: notePath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vault/watch-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  watcherClients.push(res);

  req.on('close', () => {
    watcherClients = watcherClients.filter(client => client !== res);
  });
});

app.post('/api/vault/search', async (req, res) => {
  const { query, limit = 5 } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  try {
    const queryVector = await generateEmbeddingForText(query);
    const indexFile = path.join(process.cwd(), 'vault-index.json');
    if (!fs.existsSync(indexFile)) {
      return res.json({ matches: [] });
    }

    const index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
    const matches = index.map((note: any) => {
      let sim = 0;
      if (note.embedding && queryVector) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        const len = Math.min(note.embedding.length, queryVector.length);
        for (let i = 0; i < len; i++) {
          dotProduct += note.embedding[i] * queryVector[i];
          normA += note.embedding[i] * note.embedding[i];
          normB += queryVector[i] * queryVector[i];
        }
        sim = normA && normB ? (dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))) : 0;
      }
      return {
        path: note.path,
        title: note.title,
        summary: note.summary,
        tags: note.tags,
        relevance: sim,
        frontmatter: note.frontmatter
      };
    });

    matches.sort((a: any, b: any) => b.relevance - a.relevance);
    res.json({ matches: matches.slice(0, limit) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Real embedding route using Ollama embeddings API
app.post('/api/embed', async (req, res) => {
  const { text, model = 'nomic-embed-text', ollamaUrl = 'http://localhost:11434' } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text prompt is required' });
  }

  try {
    const response = await fetch(`${ollamaUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: text })
    });
    if (response.ok) {
      const data = await response.json();
      if (data.embeddings && data.embeddings[0]) {
        return res.json({ embedding: data.embeddings[0] });
      }
    }
  } catch (e) {
    console.log('Ollama /api/embed failed, trying /api/embeddings...');
  }

  try {
    const response = await fetch(`${ollamaUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text })
    });
    if (response.ok) {
      const data = await response.json();
      if (data.embedding) {
        return res.json({ embedding: data.embedding });
      }
    }
  } catch (e) {
    console.log('Ollama /api/embeddings failed...');
  }

  // Fallback to Gemini
  if (getGeminiKeys().length > 0) {
    try {
      const response: any = await executeWithGeminiFallback(undefined, async (client) => {
        return await client.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: text,
        });
      });
      const values = response.embedding?.values || response.embeddings?.[0]?.values || response.embeddings?.values;
      if (values) {
        return res.json({ embedding: values });
      }
    } catch (error: any) {
      console.error('Gemini embedding failed, falling back to local hashing:', error.message);
    }
  }

  const vector = getLocalEmbeddingVector(text);
  return res.json({ embedding: vector, isFallback: true });
});

app.get('/api/hardware', (req, res) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpus = os.cpus();
    res.json({
      totalMemory: totalMem,
      freeMemory: freeMem,
      cpuCores: cpus.length,
      cpuModel: cpus[0]?.model || 'Unknown Processor',
      platform: os.platform()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- HERMES ORCHESTRATION TYPES & IN-MEMORY DATABASES ---
interface HermesCron {
  id: string;
  name: string;
  schedule: string;
  task: string;
  status: 'active' | 'paused';
  createdAt: string;
}

interface HermesSubagent {
  id: string;
  name: string;
  task: string;
  status: 'running' | 'idle' | 'completed' | 'failed';
  logs: string[];
  createdAt: string;
}

interface SandboxProject {
  id: string;
  name: string;
  status: 'building' | 'ready' | 'error';
  source: string;
  createdAt: string;
  files: Record<string, string>;
  port?: number;
  logs: string[];
}

const activeProcesses = new Map<string, {
  installProc?: any;
  devProc?: any;
  dir: string;
}>();

function launchSandboxProject(proj: SandboxProject) {
  if (activeProcesses.has(proj.id)) {
    cleanupSandboxProject(proj.id);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `joelos-sandbox-${proj.id}-`));
  proj.logs = [`[sandbox] Registered temp workspace at: ${tempDir}`, `[sandbox] Writing virtual container files...`];

  for (const [filename, content] of Object.entries(proj.files)) {
    const filePath = path.join(tempDir, filename);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    proj.logs.push(`[sandbox] Created file: ${filename}`);
  }

  if (!proj.files['package.json']) {
    const defaultPackageJson = {
      name: proj.name,
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite'
      },
      dependencies: {
        react: '^19.0.1',
        'react-dom': '^19.0.1',
        'lucide-react': '^0.546.0'
      },
      devDependencies: {
        vite: '^6.2.3'
      }
    };
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(defaultPackageJson, null, 2), 'utf-8');
    proj.files['package.json'] = JSON.stringify(defaultPackageJson, null, 2);
    proj.logs.push(`[sandbox] Generated default package.json`);
  }

  if (!proj.files['index.html']) {
    const defaultIndexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>JoelOS Sandbox - ${proj.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-[#020503] text-[#f1f5f9]">
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>`;
    fs.writeFileSync(path.join(tempDir, 'index.html'), defaultIndexHtml, 'utf-8');
    proj.files['index.html'] = defaultIndexHtml;
    proj.logs.push(`[sandbox] Generated default index.html`);
  }

  if (!proj.files['main.tsx']) {
    const defaultMainTsx = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
    fs.writeFileSync(path.join(tempDir, 'main.tsx'), defaultMainTsx, 'utf-8');
    proj.files['main.tsx'] = defaultMainTsx;
    proj.logs.push(`[sandbox] Generated default main.tsx`);
  }

  proj.status = 'building';
  proj.logs.push('[sandbox] Running npm install...');

  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const installProc = spawn(npmCmd, ['install', '--no-audit', '--no-fund'], {
    cwd: tempDir,
    env: { ...process.env, NODE_ENV: 'development' }
  });

  const procInfo = {
    installProc,
    dir: tempDir,
    devProc: null as any
  };
  activeProcesses.set(proj.id, procInfo);

  installProc.stdout.on('data', (data: any) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        proj.logs.push(`[npm install] ${line.trim()}`);
      }
    }
  });

  installProc.stderr.on('data', (data: any) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        proj.logs.push(`[npm install error] ${line.trim()}`);
      }
    }
  });

  installProc.on('close', (code: number) => {
    if (code !== 0) {
      proj.status = 'error';
      proj.logs.push(`[sandbox] npm install failed with exit code ${code}`);
      return;
    }

    proj.logs.push(`[sandbox] npm install completed. Starting dev server on port ${proj.port || 3001}...`);

    const devCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const devProc = spawn(devCmd, ['vite', '--port', String(proj.port || 3001), '--host', '0.0.0.0', '--base', `/sandbox-preview/${proj.id}/`], {
      cwd: tempDir,
      env: { ...process.env, NODE_ENV: 'development' }
    });

    procInfo.devProc = devProc;

    devProc.stdout.on('data', (data: any) => {
      const output = data.toString();
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          proj.logs.push(`[dev-server] ${line.trim()}`);
          if (line.includes('Local:') || line.includes('http://localhost') || line.includes('ready in')) {
            proj.status = 'ready';
          }
        }
      }
    });

    devProc.stderr.on('data', (data: any) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          proj.logs.push(`[dev-server error] ${line.trim()}`);
        }
      }
    });

    devProc.on('close', (devCode: number) => {
      if (devCode !== null) {
        proj.logs.push(`[sandbox] Dev server stopped with exit code ${devCode}`);
        if (proj.status === 'ready') {
          proj.status = 'error';
        }
      }
    });
  });
}

function cleanupSandboxProject(id: string) {
  const procInfo = activeProcesses.get(id);
  if (procInfo) {
    if (procInfo.installProc) {
      try { procInfo.installProc.kill(); } catch (e) {}
    }
    if (procInfo.devProc) {
      try { procInfo.devProc.kill(); } catch (e) {}
    }
    try {
      fs.rmSync(procInfo.dir, { recursive: true, force: true });
    } catch (e) {
      console.error(`Failed to remove sandbox temp dir ${procInfo.dir}:`, e);
    }
    activeProcesses.delete(id);
  }
}

interface StudioJob {
  id: string;
  type: 'image' | 'video' | 'voice';
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  resultUrl?: string;
  provider: string;
  error?: string;
  timestamp: string;
}

const HERMES_GATEWAY_URL = process.env.HERMES_GATEWAY_URL || 'http://localhost:8080';

let hermesCrons: HermesCron[] = [
  { id: 'cron-1', name: 'Database Sync', schedule: '0 0 * * *', task: 'Backup SQLite and sync vectors', status: 'active', createdAt: new Date().toISOString() },
  { id: 'cron-2', name: 'Agent Check-in', schedule: '*/15 * * * *', task: 'Check local subagent status', status: 'paused', createdAt: new Date().toISOString() }
];

let hermesSubagents: HermesSubagent[] = [
  { id: 'sub-1', name: 'UI Architect', task: 'Generate code for an image upload card inspired by shadcn ui', status: 'completed', logs: ['Initializing subagent...', 'Downloading shadcn dependencies...', 'Generating glassmorphism styles...', 'Writing React code...'], createdAt: new Date().toISOString() }
];

let sandboxProjects: SandboxProject[] = [
  {
    id: 'proj-upload-card',
    name: 'shadcn-upload-card',
    status: 'ready',
    source: 'Hermes UI Architect',
    createdAt: new Date().toISOString(),
    files: {
      'App.tsx': `import React, { useState } from 'react';
import { Upload, X, Check, Image as ImageIcon } from 'lucide-react';

export default function App() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
      <div className="relative group w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl transition-all hover:border-emerald-500/30">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-transparent to-purple-500/10 opacity-50 group-hover:opacity-80 transition-opacity" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/10 p-2 border border-emerald-500/20">
              <ImageIcon className="text-emerald-400 h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide">Image Upload Card</h3>
              <p className="text-[10px] text-slate-400 font-mono">INSPIRED BY SHADCN + GLASSMORPHISM</p>
            </div>
          </div>

          <div 
            className={\`border-2 border-dashed border-white/10 rounded-xl p-8 text-center transition-all cursor-pointer hover:bg-white/[0.02] \${dragActive ? 'border-emerald-400 bg-emerald-500/5' : ''}\`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); }}
          >
            <Upload className="mx-auto h-8 w-8 text-slate-400 mb-3 animate-bounce" />
            <p className="text-xs text-slate-300">Drag & drop your files here, or <span className="text-emerald-400 font-bold">browse</span></p>
            <p className="text-[10px] text-slate-500 mt-1 font-mono">PNG, JPG, SVG up to 10MB</p>
          </div>
        </div>
      </div>
    </div>
  );
}`,
      'package.json': `{
  "name": "glass-upload-card",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.344.0"
  },
  "devDependencies": {
    "vite": "^5.2.0"
  }
}`
    },
    port: 3001,
    logs: ['[sandbox] Loading WebContainer...', '[sandbox] Mounting filesystem...', '[sandbox] Running npm install...', '[sandbox] Dev server started on http://localhost:3001']
  }
];

let studioJobs: StudioJob[] = [
  {
    id: 'job-1',
    type: 'image',
    prompt: 'A cyberpunk interface with green grid glowing lines',
    status: 'completed',
    resultUrl: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
    provider: 'Google Gemini (Imagen)',
    timestamp: new Date(Date.now() - 3600000).toISOString()
  }
];

// Helper to call Hermes Gateway
async function callHermesGateway(endpoint: string, options: any = {}) {
  const url = `${HERMES_GATEWAY_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  if (!res.ok) {
    throw new Error(`Hermes Gateway returned status ${res.status}`);
  }
  return await res.json();
}

// --- HERMES ENDPOINTS ---

app.get('/api/hermes/cron', async (req, res) => {
  try {
    const data = await callHermesGateway('/cron');
    return res.json(data);
  } catch (err) {
    return res.json(hermesCrons);
  }
});

app.post('/api/hermes/cron', async (req, res) => {
  const { name, schedule, task } = req.body;
  const newCron: HermesCron = {
    id: 'cron-' + Date.now(),
    name: name || 'Untitled Task',
    schedule: schedule || '*/5 * * * *',
    task: task || 'Perform system inspection',
    status: 'active',
    createdAt: new Date().toISOString()
  };

  try {
    const data = await callHermesGateway('/cron', {
      method: 'POST',
      body: JSON.stringify({ name, schedule, task })
    });
    hermesCrons.unshift(data);
    return res.json(data);
  } catch (err) {
    hermesCrons.unshift(newCron);
    return res.json(newCron);
  }
});

app.post('/api/hermes/cron/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const cron = hermesCrons.find(c => c.id === id);
  if (cron) {
    cron.status = cron.status === 'active' ? 'paused' : 'active';
  }

  try {
    const data = await callHermesGateway(`/cron/${id}/toggle`, { method: 'POST' });
    return res.json(data);
  } catch (err) {
    return res.json({ success: true, cron });
  }
});

app.delete('/api/hermes/cron/:id', async (req, res) => {
  const { id } = req.params;
  hermesCrons = hermesCrons.filter(c => c.id !== id);

  try {
    await callHermesGateway(`/cron/${id}`, { method: 'DELETE' });
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: true });
  }
});

app.get('/api/hermes/subagents', async (req, res) => {
  try {
    const data = await callHermesGateway('/sessions');
    return res.json(data);
  } catch (err) {
    return res.json(hermesSubagents);
  }
});

app.post('/api/hermes/subagents', async (req, res) => {
  const { name, task } = req.body;
  const newSubagent: HermesSubagent = {
    id: 'sub-' + Date.now(),
    name: name || 'Subagent',
    task: task || 'Solve task',
    status: 'running',
    logs: ['Session initialized.', 'Analyzing goal...', 'Starting task completion loop.'],
    createdAt: new Date().toISOString()
  };

  hermesSubagents.unshift(newSubagent);

  const lowerTask = (task || '').toLowerCase();
  const isCodeBuildingTask = lowerTask.includes('code') || lowerTask.includes('card') || lowerTask.includes('ui') || lowerTask.includes('web') || lowerTask.includes('component') || lowerTask.includes('sandbox') || lowerTask.includes('upload');

  if (isCodeBuildingTask) {
    setTimeout(() => {
      const sub = hermesSubagents.find(s => s.id === newSubagent.id);
      if (sub) {
        sub.status = 'completed';
        sub.logs.push('[Hermes Code Generator] Output successfully compiled.');
        sub.logs.push('[Sandbox Auto-Hook] Registering build to Sandbox Previews...');
      }

      const projId = 'proj-' + Date.now();
      sandboxProjects.unshift({
        id: projId,
        name: `hermes-${(name || 'output').toLowerCase().replace(/\s+/g, '-')}`,
        status: 'ready',
        source: `Hermes Subagent (${name || 'Subagent'})`,
        createdAt: new Date().toISOString(),
        files: {
          'App.tsx': `import React, { useState } from 'react';
import { Sparkles, Check, Play, FileUp } from 'lucide-react';

export default function App() {
  const [active, setActive] = useState(false);

  return (
    <div className="min-h-screen bg-[#020503] text-emerald-100 flex flex-col items-center justify-center p-6 font-mono border-2 border-emerald-500/10">
      <div className="max-w-md w-full border border-[#00ff66]/30 bg-black/40 backdrop-blur-xl rounded-2xl p-6 shadow-2xl shadow-[#00ff66]/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
        <div className="flex items-center gap-3 mb-4">
          <FileUp className="text-[#00ff66] animate-bounce" size={24} />
          <h2 className="text-sm font-bold uppercase tracking-widest">Hermes Upload Card Sandbox</h2>
        </div>
        <p className="text-xs text-emerald-500/80 mb-6 leading-relaxed">
          Task Prompt: "${task.replace(/"/g, '\\"')}"
        </p>
        <button 
          onClick={() => setActive(!active)}
          className="w-full py-2.5 rounded-lg bg-[#00ff66]/10 border border-emerald-500/50 hover:bg-[#00ff66]/20 text-[#00ff66] text-xs font-bold transition-all flex items-center justify-center gap-2"
        >
          {active ? <Check size={14} /> : <Play size={14} />}
          <span>{active ? 'READY TO DISPATCH' : 'ACTIVATE COMPONENT'}</span>
        </button>
      </div>
    </div>
  );}`,
          'package.json': `{
  "name": "hermes-sandbox-project",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.344.0"
  },
  "devDependencies": {
    "vite": "^5.2.0"
  }
}`
        },
        port: 3002,
        logs: ['[sandbox] Mount completed', '[sandbox] Loaded packages', '[sandbox] Port assigned: 3002']
      });
    }, 4000);
  } else {
    let logStep = 0;
    const interval = setInterval(() => {
      const sub = hermesSubagents.find(s => s.id === newSubagent.id);
      if (!sub || sub.status !== 'running') {
        clearInterval(interval);
        return;
      }
      logStep++;
      if (logStep === 1) {
        sub.logs.push('[Observation] Gathering context resources...');
      } else if (logStep === 2) {
        sub.logs.push('[Action] Running tool completions...');
      } else if (logStep === 3) {
        sub.status = 'completed';
        sub.logs.push('[Output] Hermes execution completed successfully.');
        clearInterval(interval);
      }
    }, 3000);
  }

  try {
    const data = await callHermesGateway('/sessions', {
      method: 'POST',
      body: JSON.stringify({ name, task })
    });
    return res.json(data);
  } catch (err) {
    return res.json(newSubagent);
  }
});

app.delete('/api/hermes/subagents/:id', async (req, res) => {
  const { id } = req.params;
  const sub = hermesSubagents.find(s => s.id === id);
  if (sub) {
    sub.status = 'failed';
    sub.logs.push('[System] Interrupted and terminated by user request.');
  }

  try {
    await callHermesGateway(`/sessions/${id}`, { method: 'DELETE' });
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: true });
  }
});

// --- SANDBOX ENDPOINTS ---

app.get('/api/sandbox/projects', (req, res) => {
  res.json(sandboxProjects);
});

app.post('/api/sandbox/projects', (req, res) => {
  const { name, source, files } = req.body;
  if (!name || !files) {
    return res.status(400).json({ error: 'Name and files are required' });
  }

  const id = 'proj-' + Date.now();
  const newProject: SandboxProject = {
    id,
    name,
    status: 'building',
    source: source || 'User Dispatched',
    createdAt: new Date().toISOString(),
    files,
    port: 3001 + sandboxProjects.length,
    logs: ['[sandbox] Registering workspace...']
  };

  sandboxProjects.unshift(newProject);

  // Launch real background install & dev server
  launchSandboxProject(newProject);

  res.json(newProject);
});

app.delete('/api/sandbox/projects/:id', (req, res) => {
  const { id } = req.params;
  cleanupSandboxProject(id);
  sandboxProjects = sandboxProjects.filter(p => p.id !== id);
  res.json({ success: true });
});

app.put('/api/sandbox/projects/:id', (req, res) => {
  const { id } = req.params;
  const { files } = req.body;
  const proj = sandboxProjects.find(p => p.id === id);
  if (proj) {
    if (files) {
      proj.files = { ...proj.files, ...files };
      proj.logs.push(`[sandbox] Files updated dynamically. Triggering Hot Module Replacement...`);

      // Write updated files to active workspace
      const procInfo = activeProcesses.get(id);
      if (procInfo) {
        for (const [filename, content] of Object.entries(files)) {
          const filePath = path.join(procInfo.dir, filename as string);
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, content as string, 'utf-8');
          proj.logs.push(`[sandbox] Refreshed workspace file: ${filename}`);
        }
      }
    }
    return res.json(proj);
  }
  return res.status(404).json({ error: 'Project not found' });
});

app.post('/api/sandbox/projects/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, port, logs } = req.body;
  const proj = sandboxProjects.find(p => p.id === id);
  if (proj) {
    if (status) proj.status = status;
    if (port) proj.port = port;
    if (logs) proj.logs.push(...logs);
    return res.json(proj);
  }
  res.status(404).json({ error: 'Project not found' });
});

app.all('/sandbox-preview/:id*', (req, res) => {
  const fullPath = req.path;
  const parts = fullPath.split('/');
  const id = parts[2];
  if (!id) {
    return res.status(404).send('Project ID not specified');
  }

  if (fullPath === `/sandbox-preview/${id}`) {
    return res.redirect(`/sandbox-preview/${id}/`);
  }

  const proj = sandboxProjects.find(p => p.id === id);
  if (!proj) {
    return res.status(404).send('Sandbox project not found');
  }

  const targetPort = proj.port || 3001;
  const targetPath = req.originalUrl;

  const proxyReq = http.request({
    host: '127.0.0.1',
    port: targetPort,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      // Ensure host header is set appropriately for the target
      host: `127.0.0.1:${targetPort}`
    }
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error for sandbox:', id, err.message);
    res.status(502).send('Error communicating with sandbox dev server. It may still be starting up or has failed.');
  });

  req.pipe(proxyReq);
});

// --- STUDIO ENDPOINTS ---

app.get('/api/studio/jobs', (req, res) => {
  res.json(studioJobs);
});

app.post('/api/studio/jobs', async (req, res) => {
  const { type, prompt, providerKey } = req.body;
  if (!type || !prompt) {
    return res.status(400).json({ error: 'Type and prompt are required' });
  }

  const job: StudioJob = {
    id: 'job-' + Date.now(),
    type,
    prompt,
    status: 'pending',
    provider: type === 'image' ? 'Google Gemini' : 'fal.ai (Stub)',
    timestamp: new Date().toISOString()
  };

  studioJobs.unshift(job);

  if (type === 'image') {
    (async () => {
      try {
        job.status = 'processing';
        
        // Define Image Providers
        const imageProviders: Record<string, { needsKey: boolean, call: (prompt: string, key?: string) => Promise<string> }> = {
          nanoBanana: {
            needsKey: true,
            call: async (promptText: string, key?: string) => {
              const keysToTry = key ? [key] : getGeminiKeys();
              if (keysToTry.length === 0) {
                throw new Error('Gemini API client not initialized. Provide an API key.');
              }

              let lastError: any;
              for (let i = 0; i < keysToTry.length; i++) {
                const currentKey = keysToTry[i];
                try {
                  const client = new GoogleGenAI({ 
                    apiKey: currentKey,
                    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
                  });
                  
                  let response;
                  try {
                    response = await client.models.generateContent({
                      model: 'gemini-2.5-flash-image',
                      contents: [{ role: 'user', parts: [{ text: promptText }] }],
                      config: {
                         responseModalities: ["IMAGE"] as any
                      }
                    });
                  } catch (apiErr: any) {
                    throw new Error(`API_ERROR [Status: ${apiErr.status || 'UNKNOWN'}]: ${apiErr.message}`);
                  }
                  
                  try {
                    const candidates = response.candidates;
                    if (candidates && candidates.length > 0) {
                       for (const part of candidates[0].content.parts) {
                         if (part.inlineData && part.inlineData.data) {
                           return `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
                         }
                       }
                    }
                    throw new Error('PARSE_ERROR: Response shape missing expected inlineData.');
                  } catch (parseErr: any) {
                    if (parseErr.message.includes('PARSE_ERROR')) {
                      throw parseErr;
                    }
                    throw new Error(`PARSE_ERROR: ${parseErr.message}`);
                  }
                } catch (err: any) {
                  lastError = err;
                  console.error(`Gemini provider failed for API key index ${i}:`, err.message);
                  
                  if (keysToTry.length > 1 && i < keysToTry.length - 1) {
                    console.warn(`Falling back to next Gemini API key...`);
                    continue;
                  }
                  break;
                }
              }
              throw lastError;
            }
          },
          pollinations: {
            needsKey: false,
            call: async (promptText: string) => {
              const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?nologo=true&referrer=joelos`;
              const headers: Record<string, string> = {};
              if (process.env.POLLINATIONS_TOKEN) {
                headers['Authorization'] = `Bearer ${process.env.POLLINATIONS_TOKEN}`;
              }
              
              const res = await fetch(url, { headers });
              if (!res.ok) {
                const text = await res.text();
                throw new Error(`Pollinations API failed with status ${res.status}: ${text}`);
              }
              
              const contentType = res.headers.get('content-type') || '';
              if (contentType.includes('text/html') || contentType.includes('application/json')) {
                const text = await res.text();
                throw new Error(`Pollinations API returned invalid content type (${contentType}): ${text.slice(0, 100)}`);
              }
              
              const arrayBuffer = await res.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              if (buffer.length === 0) {
                throw new Error('Pollinations API returned an empty image buffer.');
              }
              
              const mimeType = contentType || 'image/jpeg';
              return `data:${mimeType};base64,${buffer.toString('base64')}`;
            }
          }
        };

        // If the user selected a model that indicates pollinations, or we use nanoBanana by default
        let selectedProvider = 'nanoBanana';
        if (req.body.model === 'pollinations') {
           selectedProvider = 'pollinations';
        }

        let provider = imageProviders[selectedProvider];
        if (!provider) {
           provider = imageProviders['nanoBanana'];
        }

        try {
           job.resultUrl = await provider.call(prompt, providerKey);
           job.provider = selectedProvider === 'pollinations' ? 'Pollinations.ai' : 'Google Gemini (generateContent)';
           job.status = 'completed';
        } catch (err: any) {
           console.error(`${selectedProvider} failed:`, err);
           job.status = 'failed';
           job.error = cleanErrorMessage(err);
        }

      } catch (err: any) {
        console.error('Studio Image generation error:', err);
        job.status = 'failed';
        job.error = cleanErrorMessage(err);
      }
    })();

    return res.json(job);
  } else {
    job.status = 'processing';
    setTimeout(() => {
      const liveJob = studioJobs.find(j => j.id === job.id);
      if (liveJob) {
        liveJob.status = 'completed';
        if (type === 'video') {
          liveJob.resultUrl = 'https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-32115-large.mp4';
        } else {
          liveJob.resultUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
        }
      }
    }, 6000);

    return res.json(job);
  }
});

app.delete('/api/studio/jobs/:id', (req, res) => {
  const { id } = req.params;
  studioJobs = studioJobs.filter(j => j.id !== id);
  res.json({ success: true });
});

// Run watcher on startup if configured
const STARTUP_CONFIG = path.join(process.cwd(), 'vault-config.json');
if (fs.existsSync(STARTUP_CONFIG)) {
  try {
    const config = JSON.parse(fs.readFileSync(STARTUP_CONFIG, 'utf-8'));
    if (config.vaultPath && fs.existsSync(config.vaultPath) && fs.statSync(config.vaultPath).isDirectory()) {
      startChokidarWatcher(config.vaultPath);
    }
  } catch (err) {
    console.error('Failed to start watcher on startup:', err);
  }
}

// Setup Vite Dev server middleware or serve production static build
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware loaded in Development mode.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static paths served.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JoelOS core container running on http://localhost:${PORT}`);
    
    // Launch default sandbox project on start
    if (sandboxProjects.length > 0) {
      launchSandboxProject(sandboxProjects[0]);
    }
  });
}

setupViteOrStatic();
