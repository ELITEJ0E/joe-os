import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Settings, Volume2 } from 'lucide-react';
import { VoiceWaveVisualizer, VoiceState } from './VoiceWaveVisualizer';
import { synthesizeSpeech } from '../ttsRegistry';
import { Message } from '../types';

interface VoiceModeChannelProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  voiceProvider: string;
  voiceModel: string;
  cloudApiKey?: string;
  geminiApiKey: string;
  openaiApiKey: string;
  openrouterApiKey: string;
  isProcessing: boolean;
  typedMessageToSubmit?: string;
  onTypedMessageProcessed?: () => void;
}

export const VoiceModeChannel: React.FC<VoiceModeChannelProps> = ({ 
  messages,
  setMessages,
  voiceProvider,
  voiceModel,
  cloudApiKey,
  geminiApiKey,
  openaiApiKey,
  openrouterApiKey,
  isProcessing,
  typedMessageToSubmit,
  onTypedMessageProcessed
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [micThreshold, setMicThreshold] = useState(0.012); // Default sensitive VAD threshold
  const [showSensitivitySlider, setShowSensitivitySlider] = useState(false);

  // Refs for VAD Audio stream and Web Audio API
  const vadStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadAnimationFrameRef = useRef<number | null>(null);

  // Voice recording and audio chunks refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Abort controller for streaming LLM calls
  const abortControllerRef = useRef<AbortController | null>(null);

  // Audio Playback Queue and current playback refs for sentence-chunked TTS
  const audioQueueRef = useRef<{ sentence: string; urlPromise: Promise<string | null> }[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // VAD state trackers (using refs to avoid stale closures in requestAnimationFrame)
  const isSpeakingRef = useRef(false);
  const speechStartTime = useRef<number | null>(null);
  const silenceStartTime = useRef<number | null>(null);

  // Clean up on unmount and Auto-Start Cortana voice mode
  useEffect(() => {
    startVoiceMode();
    return () => {
      stopVoiceMode();
    };
  }, []);

  // Listen for typed messages from parent component
  useEffect(() => {
    if (typedMessageToSubmit && typedMessageToSubmit.trim()) {
      const text = typedMessageToSubmit;
      onTypedMessageProcessed?.();
      processTypedTextAndRespond(text);
    }
  }, [typedMessageToSubmit]);

  const startVoiceMode = async () => {
    try {
      setErrorMessage(null);
      setIsCalibrating(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      vadStreamRef.current = stream;

      // 1. Setup AudioContext and Analyser for Web Audio VAD
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Reset states
      isSpeakingRef.current = false;
      speechStartTime.current = null;
      silenceStartTime.current = null;
      audioQueueRef.current = [];
      
      setIsActive(true);
      setVoiceState('listening');
      setIsCalibrating(false);

      // Start continuous VAD polling loop
      startVADLoop();

      // Greet the user from Cortana upon successful startup
      const greetingText = "Hello! I am Cortana. I am active and ready to assist you. How can I help you today?";
      const greetingMsgId = 'cortana-greeting-' + Date.now();
      const greetingMsg: Message = {
        id: greetingMsgId,
        sender: 'cortana',
        text: greetingText,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages(prev => {
        if (prev.some(m => m.text === greetingText)) {
          return prev;
        }
        return [...prev, greetingMsg];
      });

      // Speak greeting
      setTimeout(() => {
        queueTTSChunk(greetingText);
      }, 300);

    } catch (err: any) {
      console.error('Failed to access microphone or initialize VAD:', err);
      setErrorMessage('Microphone access denied. Check system permissions.');
      setIsActive(false);
      setVoiceState('idle');
      setIsCalibrating(false);
    }
  };

  const stopVoiceMode = () => {
    setIsActive(false);
    setVoiceState('idle');

    // 1. Abort any in-flight LLM streaming call
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 2. Stop and clear TTS audio playing & queue
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    audioQueueRef.current = [];

    // 3. Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    // 4. Stop microphone stream
    if (vadStreamRef.current) {
      vadStreamRef.current.getTracks().forEach(track => track.stop());
      vadStreamRef.current = null;
    }

    // 5. Cancel VAD polling loop
    if (vadAnimationFrameRef.current) {
      cancelAnimationFrame(vadAnimationFrameRef.current);
      vadAnimationFrameRef.current = null;
    }

    // 6. Close Web Audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(e => console.warn('AudioContext close failed:', e));
      audioContextRef.current = null;
    }
  };

  // VAD Loop analyzing root-mean-square amplitude of the incoming mic signal
  const startVADLoop = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkVAD = () => {
      if (!analyserRef.current) return;

      analyser.getByteTimeDomainData(dataArray);

      // Compute Root Mean Square (RMS) volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / bufferLength);

      const now = Date.now();

      // VAD State Machine Transition
      if (rms > micThreshold) {
        silenceStartTime.current = null;
        if (!isSpeakingRef.current) {
          if (!speechStartTime.current) {
            speechStartTime.current = now;
          } else if (now - speechStartTime.current > 150) { // Require 150ms of sound to prevent clicks/pops
            isSpeakingRef.current = true;
            handleSpeechStarted();
          }
        }
      } else {
        speechStartTime.current = null;
        if (isSpeakingRef.current) {
          if (!silenceStartTime.current) {
            silenceStartTime.current = now;
          } else if (now - silenceStartTime.current > 1200) { // Require 1.2s of consistent silence to stop speech
            isSpeakingRef.current = false;
            silenceStartTime.current = null;
            handleSpeechEnded();
          }
        }
      }

      vadAnimationFrameRef.current = requestAnimationFrame(checkVAD);
    };

    vadAnimationFrameRef.current = requestAnimationFrame(checkVAD);
  };

  // BARGE-IN / INTERRUPTION HANDLING
  const handleSpeechStarted = () => {
    let wasInterrupted = false;

    // 1. Stop current audio playback
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      wasInterrupted = true;
    }

    // 2. Clear TTS playback queue
    if (audioQueueRef.current.length > 0) {
      audioQueueRef.current = [];
      wasInterrupted = true;
    }

    // 3. Abort active LLM response stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      wasInterrupted = true;
    }

    if (wasInterrupted) {
      // Sci-fi visual flash on interruption
      setVoiceState('thinking');
      setTimeout(() => {
        setVoiceState('listening');
      }, 150);
    } else {
      setVoiceState('listening');
    }

    // Start recording fresh utterance
    startAudioRecording();
  };

  const handleSpeechEnded = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setVoiceState('thinking');
  };

  const startAudioRecording = () => {
    if (!vadStreamRef.current) return;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    audioChunksRef.current = [];

    const mediaRecorder = new MediaRecorder(vadStreamRef.current, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
      audioChunksRef.current = [];
      await processTranscribeAndRespond(audioBlob);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
  };

  // Main processing pipeline: Transcribe -> Stream LLM -> Chunked TTS Speech synthesis
  const processTranscribeAndRespond = async (blob: Blob) => {
    try {
      setVoiceState('thinking');
      setErrorMessage(null);

      // Step 1: Speech-to-Text via faster-whisper sidecar
      let transcriptText = '';
      try {
        const res = await fetch('/api/stt/transcribe', {
          method: 'POST',
          body: blob,
          headers: {
            'Content-Type': blob.type,
          }
        });

        if (res.ok) {
          const data = await res.json();
          transcriptText = data.text?.trim() || '';
        }
      } catch (err) {
        console.warn('Local faster-whisper sidecar failed, transcript aborted:', err);
      }

      // Safeguard against empty or silent recordings
      if (!transcriptText || transcriptText.length < 2) {
        console.log('VAD triggered but transcription is empty or too short. Returning to ambient listener.');
        setVoiceState('listening');
        return;
      }

      // Step 2: Append user message to the UI logs
      const userMsgId = 'user-voice-' + Date.now();
      const userMsg: Message = {
        id: userMsgId,
        sender: 'user',
        text: transcriptText,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, userMsg]);

      // Step 3: Stream response from selected fast-path LLM provider
      abortControllerRef.current = new AbortController();
      const assistantMsgId = 'cortana-voice-' + Date.now();
      const assistantMsg: Message = {
        id: assistantMsgId,
        sender: 'cortana', // Cortana assistant identity
        text: '',
        isStreaming: true,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Prepare conversation history context
      const history = [...messages, userMsg];

      const streamRes = await fetch('/api/voice/stream-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          voiceProvider,
          voiceModel,
          cloudApiKey,
          geminiApiKey,
          openaiApiKey,
          openrouterApiKey,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!streamRes.ok) {
        throw new Error(`LLM call failed with HTTP ${streamRes.status}`);
      }

      if (!streamRes.body) {
        throw new Error('Response body empty');
      }

      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullAssistantText = '';
      let lastProcessedLength = 0;

      // Read LLM response stream
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.substring(6));
              
              if (parsed.error) {
                throw new Error(parsed.error);
              }

              if (parsed.text) {
                fullAssistantText += parsed.text;

                // Update text typing in UI
                setMessages(prev => prev.map(m => 
                  m.id === assistantMsgId ? { ...m, text: fullAssistantText } : m
                ));

                // Extract sentence-chunked TTS on clauses & complete sentences
                const newPart = fullAssistantText.substring(lastProcessedLength);
                const sentenceEndRegex = /[.!?](\s+|\n|$)/g;
                let match;
                let searchOffset = 0;

                while ((match = sentenceEndRegex.exec(newPart)) !== null) {
                  const endIndex = match.index + match[0].length;
                  const sentence = newPart.substring(searchOffset, endIndex).trim();
                  
                  if (sentence.length > 3) {
                    queueTTSChunk(sentence);
                  }
                  searchOffset = endIndex;
                }
                lastProcessedLength += searchOffset;
              }
            } catch (e) {}
          }
        }
      }

      // Handle any final un-punctuated chunk leftover at stream end
      const finalLeftover = fullAssistantText.substring(lastProcessedLength).trim();
      if (finalLeftover.length > 2) {
        queueTTSChunk(finalLeftover);
      }

      // Set streaming as completed
      setMessages(prev => prev.map(m => 
        m.id === assistantMsgId ? { ...m, isStreaming: false } : m
      ));

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Live Voice completed response aborted (user interrupted).');
        return;
      }
      console.error('Voice Mode response processing error:', err);
      setErrorMessage(`Conversation brain failed: ${err.message || err}`);
      setVoiceState('listening');
    }
  };

  // Direct Text Input conversational handler for Voice Mode (interacts with Cortana)
  const processTypedTextAndRespond = async (typedText: string) => {
    try {
      setVoiceState('thinking');
      setErrorMessage(null);

      // 1. Append user typed message to the UI logs
      const userMsgId = 'user-voice-type-' + Date.now();
      const userMsg: Message = {
        id: userMsgId,
        sender: 'user',
        text: typedText,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, userMsg]);

      // 2. Stream response from selected fast-path LLM provider
      abortControllerRef.current = new AbortController();
      const assistantMsgId = 'cortana-voice-' + Date.now();
      const assistantMsg: Message = {
        id: assistantMsgId,
        sender: 'cortana',
        text: '',
        isStreaming: true,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Prepare conversation history context (including user typed message)
      const history = [...messages, userMsg];

      const streamRes = await fetch('/api/voice/stream-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          voiceProvider,
          voiceModel,
          cloudApiKey,
          geminiApiKey,
          openaiApiKey,
          openrouterApiKey,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!streamRes.ok) {
        throw new Error(`LLM call failed with HTTP ${streamRes.status}`);
      }

      if (!streamRes.body) {
        throw new Error('Response body empty');
      }

      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullAssistantText = '';
      let lastProcessedLength = 0;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.substring(6));
              
              if (parsed.error) {
                throw new Error(parsed.error);
              }

              if (parsed.text) {
                fullAssistantText += parsed.text;

                // Update text typing in UI
                setMessages(prev => prev.map(m => 
                  m.id === assistantMsgId ? { ...m, text: fullAssistantText } : m
                ));

                // Extract sentence-chunked TTS on clauses & complete sentences
                const newPart = fullAssistantText.substring(lastProcessedLength);
                const sentenceEndRegex = /[.!?](\s+|\n|$)/g;
                let match;
                let searchOffset = 0;

                while ((match = sentenceEndRegex.exec(newPart)) !== null) {
                  const endIndex = match.index + match[0].length;
                  const sentence = newPart.substring(searchOffset, endIndex).trim();
                  
                  if (sentence.length > 3) {
                    queueTTSChunk(sentence);
                  }
                  searchOffset = endIndex;
                }
                lastProcessedLength += searchOffset;
              }
            } catch (e) {}
          }
        }
      }

      // Handle any final un-punctuated chunk leftover at stream end
      const finalLeftover = fullAssistantText.substring(lastProcessedLength).trim();
      if (finalLeftover.length > 2) {
        queueTTSChunk(finalLeftover);
      }

      // Set streaming as completed
      setMessages(prev => prev.map(m => 
        m.id === assistantMsgId ? { ...m, isStreaming: false } : m
      ));

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Live Voice typing completed response aborted.');
        return;
      }
      console.error('Voice Mode response processing error (typing):', err);
      setErrorMessage(`Conversation brain failed: ${err.message || err}`);
      setVoiceState('listening');
    }
  };

  // Synthesize sentence chunks in parallel as they generate to keep latency low
  const queueTTSChunk = (sentence: string) => {
    // Clean text of visual emojis/markdown syntax for cleaner voice narration
    const cleanText = sentence
      .replace(/[*_#`~[\]()]/g, '')
      .replace(/cortana/gi, 'Cortana');

    try {
      // Async synthesize trigger
      const urlPromise = synthesizeSpeech(cleanText);

      // Push promise task to the sequential audio playback pipeline
      audioQueueRef.current.push({ sentence: cleanText, urlPromise });

      // Start playing immediately if currently idle
      if (!currentAudioRef.current) {
        playNextTTSChunk();
      }
    } catch (err) {
      console.error('Failed to schedule TTS chunk synthesis:', err);
    }
  };

  const playNextTTSChunk = async () => {
    if (audioQueueRef.current.length === 0) {
      // Back to continuous ambient listener
      if (voiceState === 'speaking') {
        setVoiceState('listening');
      }
      return;
    }

    const nextChunk = audioQueueRef.current.shift();
    if (!nextChunk) return;

    try {
      setVoiceState('thinking'); // Brief transition to show TTS downloading/generating wave
      const url = await nextChunk.urlPromise;

      if (url) {
        const audio = new Audio(url);
        currentAudioRef.current = audio;

        audio.onplay = () => {
          setVoiceState('speaking');
        };

        audio.onended = () => {
          currentAudioRef.current = null;
          playNextTTSChunk();
        };

        audio.onerror = (e) => {
          console.error('Audio playback error on chunk:', e);
          currentAudioRef.current = null;
          playNextTTSChunk();
        };

        await audio.play();
      } else {
        // Direct browser SpeechSynthesis played it
        playNextTTSChunk();
      }
    } catch (err) {
      console.error('TTS playback task execution failed:', err);
      currentAudioRef.current = null;
      playNextTTSChunk();
    }
  };

  const toggleVoiceModeState = () => {
    if (isActive) {
      stopVoiceMode();
    } else {
      startVoiceMode();
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full h-full min-h-[420px] justify-between bg-[#040805] border border-emerald-950/60 p-8 rounded-2xl shadow-2xl relative overflow-hidden flex-1">
      {/* Background neon grid lines */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_40%,rgba(16,185,129,0.06),rgba(0,0,0,0))] pointer-events-none" />

      {isActive ? (
        <div className="flex flex-col gap-6 h-full justify-between flex-1">
          {/* Ambient or reactive sci-fi orb */}
          <div className="relative group flex-1 flex flex-col items-center justify-center min-h-[260px]">
            <VoiceWaveVisualizer 
              state={voiceState} 
              audioStream={vadStreamRef.current}
              audioElement={currentAudioRef.current}
            />
            {/* VAD Sensitivity Quick Controller */}
            <button
              onClick={() => setShowSensitivitySlider(!showSensitivitySlider)}
              className="absolute top-2 right-2 p-2 rounded-xl bg-emerald-950/40 border border-emerald-900/40 text-emerald-500 hover:text-[#00ff66] hover:bg-emerald-900/50 transition-all cursor-pointer"
              title="VAD Mic Sensitivity Configuration"
            >
              <Settings size={15} />
            </button>
          </div>

          {showSensitivitySlider && (
            <div className="bg-[#020503] border border-emerald-950/80 p-3.5 rounded-xl flex flex-col gap-2">
              <div className="flex justify-between items-center text-[11px] font-mono text-emerald-400">
                <span>VAD ACTIVATION THRESHOLD</span>
                <span className="font-bold text-[#00ff66]">{(micThreshold * 1000).toFixed(1)} mU</span>
              </div>
              <input
                type="range"
                min="0.002"
                max="0.05"
                step="0.001"
                value={micThreshold}
                onChange={(e) => setMicThreshold(parseFloat(e.target.value))}
                className="w-full accent-[#00ff66] bg-emerald-950 h-1.5 rounded cursor-pointer"
              />
              <span className="text-[10px] text-emerald-500/50 font-mono text-center">
                Lower = More sensitive to quiet speech | Higher = Block background buzz/hum
              </span>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-emerald-950/40 pt-4 mt-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff66] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff66]"></span>
              </span>
              <span className="text-[11px] text-emerald-400 font-mono uppercase font-bold tracking-wider">
                {voiceState === 'listening' && 'Listening (Open Mic)'}
                {voiceState === 'thinking' && 'Processing Brain...'}
                {voiceState === 'speaking' && 'Speaking (Streaming)'}
              </span>
            </div>

            <div className="flex gap-2">
              {/* Dynamic status stats badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#071309] border border-emerald-950 font-mono text-[10px] text-emerald-400/80 uppercase">
                <Volume2 size={12} />
                <span>{voiceProvider}</span>
              </div>

              <button
                onClick={stopVoiceMode}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-950/25 border border-red-900/40 text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-all font-mono text-[10px] uppercase font-bold cursor-pointer"
              >
                <MicOff size={12} />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <div className="h-20 w-20 rounded-full bg-emerald-950/15 border border-emerald-500/10 flex items-center justify-center text-emerald-500/50 shadow-inner group relative mb-6">
            <div className="absolute inset-0 rounded-full border border-emerald-500/5 animate-pulse" />
            <Mic size={28} className="text-emerald-400 animate-pulse" />
          </div>
          
          <div className="flex flex-col gap-2 max-w-sm mb-6">
            <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider font-mono">Initializing Cortana...</h4>
            <p className="text-[11px] text-emerald-500/60 font-mono leading-relaxed">
              Establishing voice session link. Requesting system microphone channel and calibrating VAD loops.
            </p>
          </div>

          <button
            onClick={startVoiceMode}
            disabled={isCalibrating}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#00ff66]/10 hover:bg-[#00ff66]/20 border border-[#00ff66]/30 hover:border-[#00ff66]/50 text-[#00ff66] font-mono text-xs uppercase font-bold tracking-wider transition-all cursor-pointer shadow-md"
          >
            <span className="flex items-center gap-1.5 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-[#00ff66] animate-bounce" />
              Connecting Microphone...
            </span>
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mt-2 text-center bg-red-950/20 border border-red-900/30 rounded-xl p-3 text-xs text-red-400 font-mono">
          {errorMessage}
        </div>
      )}
    </div>
  );
};
