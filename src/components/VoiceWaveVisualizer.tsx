import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Radio, Mic } from 'lucide-react';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'processing';

interface VoiceWaveVisualizerProps {
  prompt?: string;
  isCompact?: boolean;
  state?: VoiceState;
  audioStream?: MediaStream | null;
  audioElement?: HTMLAudioElement | null;
}

export const VoiceWaveVisualizer: React.FC<VoiceWaveVisualizerProps> = ({ 
  prompt = '', 
  isCompact = false,
  state = 'processing',
  audioStream = null,
  audioElement = null
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Audio context for actual audio analysis
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null>(null);

  // Synth state (for 'processing' mode backward compatibility)
  const [isMuted, setIsMuted] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Setup actual audio analysis based on props
  useEffect(() => {
    // We only need to analyze actual audio in listening or speaking state
    if (state !== 'listening' && state !== 'speaking') {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContextClass();
      }
      const audioCtx = audioContextRef.current;

      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      if (!analyserRef.current) {
        analyserRef.current = audioCtx.createAnalyser();
        analyserRef.current.fftSize = 256;
      }

      // Cleanup previous source
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }

      if (state === 'listening' && audioStream) {
        sourceNodeRef.current = audioCtx.createMediaStreamSource(audioStream);
        sourceNodeRef.current.connect(analyserRef.current);
      } else if (state === 'speaking' && audioElement) {
        // Warning: createMediaElementSource can only be called once per element
        // It might fail if we re-render or if the element was already hooked up.
        // We'll catch errors just in case.
        try {
          // If the audio element is playing, we need to ensure the audioContext is active
          // and we connect the analyser to destination so it still plays
          const src = audioCtx.createMediaElementSource(audioElement);
          src.connect(analyserRef.current);
          analyserRef.current.connect(audioCtx.destination);
          sourceNodeRef.current = src;
        } catch (e) {
          console.warn("Could not create media element source (may already be bound)", e);
        }
      }
    } catch (e: any) {
      console.error('Failed to initialize Web Audio API for analysis:', e);
    }

    return () => {
      // Don't close the context here as we might reuse it, just disconnect
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
    };
  }, [state, audioStream, audioElement]);

  // Main visualization loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      time += 0.05;

      const width = canvas.width;
      const height = canvas.height;

      // Clear background
      ctx.fillStyle = 'rgba(2, 5, 3, 0.25)';
      ctx.fillRect(0, 0, width, height);

      // Grid
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      for (let x = 0; x < width; x += width / 8) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#00ff66';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00ff66';

      ctx.beginPath();

      if (state === 'idle') {
        // Slow subtle ambient pulse
        ctx.strokeStyle = '#00ff66';
        ctx.globalAlpha = 0.5 + Math.sin(time * 0.5) * 0.3;
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      } else if (state === 'thinking') {
        // Rotating/shimmering pattern
        const segments = 60;
        const sliceWidth = width / segments;
        for (let i = 0; i <= segments; i++) {
          const x = i * sliceWidth;
          const yOffset = Math.sin(i * 0.5 + time * 2) * (height / 4) * Math.cos(time);
          const y = height / 2 + yOffset;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if ((state === 'listening' || state === 'speaking') && analyserRef.current) {
        // React to actual audio amplitude
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteTimeDomainData(dataArray);

        const sliceWidth = width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0; 
          const y = (v * height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      } else if (state === 'processing') {
        // Synthesized look for processing
        const segments = 100;
        const sliceWidth = width / segments;
        for (let i = 0; i <= segments; i++) {
          const x = i * sliceWidth;
          // random looking modulation
          const yOffset = Math.sin(i * 0.2 + time) * (height/3) * Math.random();
          const y = height / 2 + (isMuted ? yOffset * 0.3 : yOffset);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      // Text overlay
      ctx.fillStyle = 'rgba(16, 185, 129, 0.7)';
      ctx.font = '7px monospace';
      ctx.fillText(`STATE: ${state.toUpperCase()}`, 6, 12);
      if (state === 'listening') ctx.fillText(`MIC: ACTIVE`, 6, height - 6);
      else if (state === 'speaking') ctx.fillText(`TTS: PLAYING`, 6, height - 6);
    };

    draw();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [state, isMuted]);

  if (errorMessage) {
    return (
      <div className="p-3 bg-red-950/20 border border-red-900 rounded text-center text-[10px] text-red-400 font-mono">
        {errorMessage}
      </div>
    );
  }

  return (
    <div className={`w-full rounded-lg border border-emerald-950/70 bg-[#020503]/90 relative overflow-hidden ${isCompact ? 'p-2' : 'p-3 space-y-2'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[9px] font-bold tracking-wider">
          {state === 'listening' ? <Mic size={10} className="animate-pulse text-red-500" /> : <Radio size={10} className="animate-pulse text-[#00ff66]" />}
          <span>{state === 'processing' ? 'NEURAL SPEECH ENVELOPE' : 'VOICE MODE INTERFACE'}</span>
        </div>
        
        {state === 'processing' && (
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-mono border transition-all cursor-pointer ${
              isMuted 
                ? 'bg-emerald-950/10 border-emerald-950 text-emerald-600 hover:text-emerald-400 hover:border-emerald-700' 
                : 'bg-emerald-500/20 border-emerald-400 text-[#00ff66]'
            }`}
          >
            {isMuted ? <><VolumeX size={9} /><span>UNMUTE</span></> : <><Volume2 size={9} className="animate-bounce" /><span>MUTED_OFF</span></>}
          </button>
        )}
      </div>

      <div className="relative rounded overflow-hidden border border-emerald-950/50 bg-black/95">
        <canvas
          ref={canvasRef}
          width={280}
          height={isCompact ? 40 : 56}
          className="w-full block"
        />
        <div className="absolute right-2 top-2 text-[6px] font-mono text-emerald-600/40 select-none">
          SYSTEM_AUDIO_CARRIER
        </div>
      </div>

      {!isCompact && prompt && (
        <div className="text-[9px] text-emerald-700/80 font-mono leading-tight bg-black/30 p-1.5 rounded border border-emerald-950/30 truncate">
          <span className="text-emerald-500 font-semibold">SYNTH:</span> {prompt}
        </div>
      )}
    </div>
  );
};
