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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Audio context for actual audio analysis
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null>(null);

  // Synth state (for 'processing' mode backward compatibility)
  const [isMuted, setIsMuted] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: isCompact ? 160 : 320 });

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  // Track parent element dimensions for true responsiveness
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      
      // Calculate responsive height based on screen size
      const targetHeight = isCompact ? 140 : (width < 485 ? 240 : 320);
      
      setDimensions({
        width: Math.floor(width),
        height: targetHeight
      });
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, [isCompact]);

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
        try {
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
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
    };
  }, [state, audioStream, audioElement]);

  // Main visualization loop rendering the circular high-tech green HUD
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      time += 0.05;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      // Clear the physical canvas area perfectly to prevent scaling trails
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(dpr, dpr);

      // Clear background with extremely deep cinematic dark green-black tint using logical coordinates
      ctx.fillStyle = 'rgba(2, 6, 4, 0.95)';
      ctx.fillRect(0, 0, width, height);

      // --- 1. INTRODUCE SUBTLE TECH GRID BACKGROUND ---
      ctx.strokeStyle = 'rgba(0, 255, 102, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 25;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // --- 2. RETRIEVE REAL OR SIMULATED AMPLITUDE ---
      let amplitude = 0;
      let frequencyData: Uint8Array | null = null;
      let timeDomainData: Uint8Array | null = null;

      if (analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        frequencyData = new Uint8Array(bufferLength);
        timeDomainData = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(frequencyData);
        analyserRef.current.getByteTimeDomainData(timeDomainData);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += frequencyData[i];
        }
        amplitude = sum / bufferLength / 255;
      } else {
        // High quality simulated amplitudes based on system states
        if (state === 'speaking') {
          amplitude = 0.25 + Math.sin(time * 8) * 0.15 + Math.cos(time * 3) * 0.08;
        } else if (state === 'listening') {
          amplitude = 0.12 + Math.sin(time * 6) * 0.05 + Math.random() * 0.04;
        } else if (state === 'thinking') {
          amplitude = 0.08 + Math.sin(time * 12) * 0.02;
        } else if (state === 'processing') {
          amplitude = 0.18 + Math.sin(time * 10) * 0.08;
        } else { // idle
          amplitude = 0.02 + Math.sin(time * 2) * 0.01;
        }
      }

      // Ensure amplitude is bounded
      amplitude = Math.max(0, Math.min(1, amplitude));

      // --- 3. COMPUTE HUD GEOMETRY ---
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Scale radius slightly based on compactness and screen width
      const isMobile = width < 485;
      const baseRadius = isCompact ? 40 : (isMobile ? 50 : 75);
      
      // Dynamic expansion / beaming factor
      const beamScale = 1 + amplitude * 0.45;
      const activeRadius = baseRadius * beamScale;

      // Color scheme (Hi-tech neon emerald green)
      const primaryGreen = 'rgba(0, 255, 102, 0.95)';
      const accentGreen = 'rgba(0, 255, 102, 0.4)';
      const dimGreen = 'rgba(0, 255, 102, 0.15)';
      const ultraDimGreen = 'rgba(0, 255, 102, 0.05)';

      // Helper to draw a hexagon (for corner tech visuals)
      const drawHexagon = (hx: number, hy: number, size: number, alpha: number) => {
        ctx.save();
        ctx.strokeStyle = `rgba(0, 255, 102, ${alpha})`;
        ctx.fillStyle = `rgba(0, 255, 102, ${alpha * 0.15})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const px = hx + Math.cos(angle) * size;
          const py = hy + Math.sin(angle) * size;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };

      // Helper to draw a chevron arrow pointing upwards
      const drawChevron = (cx: number, cy: number, sz: number, alpha: number) => {
        ctx.save();
        ctx.strokeStyle = `rgba(0, 255, 102, ${alpha})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx - sz, cy + sz * 0.5);
        ctx.lineTo(cx, cy - sz * 0.5);
        ctx.lineTo(cx + sz, cy + sz * 0.5);
        ctx.stroke();
        ctx.restore();
      };

      // --- 4. DRAW CORNER ORNAMENTS (Desktop Only) ---
      if (!isCompact && !isMobile) {
        // Hexagonal grid clusters (bottom right corner)
        drawHexagon(width - 90, height - 60, 14, 0.1);
        drawHexagon(width - 110, height - 50, 14, 0.15);
        drawHexagon(width - 100, height - 35, 14, 0.08);

        // Hexagonal grid clusters (top left corner)
        drawHexagon(80, 50, 16, 0.08);
        drawHexagon(105, 40, 16, 0.12);
        drawHexagon(90, 65, 16, 0.06);

        // Decorative Text Labels
        ctx.fillStyle = 'rgba(0, 255, 102, 0.8)';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.letterSpacing = '1px';
        ctx.fillText("HI-TECH INTERFACE", 40, 35);
        ctx.font = '6px monospace';
        ctx.fillStyle = 'rgba(0, 255, 102, 0.4)';
        ctx.fillText("SYS_SECURE_NODE // LATENCY_STABLE", 40, 47);

        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.fillStyle = 'rgba(0, 255, 102, 0.8)';
        ctx.fillText("FUTURISTIC", width - 120, height - 25);
        ctx.font = '6px monospace';
        ctx.fillStyle = 'rgba(0, 255, 102, 0.4)';
        ctx.fillText("CORTANA_NEURAL_OS_v4.5", width - 120, height - 15);
      }

      // --- 5. DRAW GAUGE LEADER LINES AND PERCENTAGES (Desktop Only) ---
      if (!isCompact && !isMobile) {
        // Top Right Callout (43%)
        const trX = centerX + baseRadius * 1.1;
        const trY = centerY - baseRadius * 1.1;
        ctx.strokeStyle = accentGreen;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(trX, trY);
        ctx.lineTo(trX + 35, trY - 35);
        ctx.lineTo(trX + 115, trY - 35);
        ctx.stroke();

        ctx.fillStyle = primaryGreen;
        ctx.font = 'bold 15px "Space Grotesk", sans-serif';
        const dynamicTrPercent = Math.round(43 + Math.sin(time * 0.3) * 2);
        ctx.fillText(`${dynamicTrPercent}%`, trX + 45, trY - 42);

        // Visual spectrum indicator bars (top right near callout)
        ctx.fillStyle = accentGreen;
        for (let i = 0; i < 5; i++) {
          const barH = 5 + (frequencyData ? frequencyData[i * 4] / 20 : (5 + Math.sin(time * (4 + i)) * 6));
          ctx.fillRect(trX + 85 + i * 5, trY - 48, 3, -Math.max(1, barH));
        }

        // Bottom Left Callout (71% + Chevron Up Arrows)
        const blX = centerX - baseRadius * 1.1;
        const blY = centerY + baseRadius * 1.1;
        ctx.beginPath();
        ctx.moveTo(blX, blY);
        ctx.lineTo(blX - 35, blY + 35);
        ctx.lineTo(blX - 115, blY + 35);
        ctx.stroke();

        ctx.fillStyle = primaryGreen;
        ctx.font = 'bold 15px "Space Grotesk", sans-serif';
        const dynamicBlPercent = Math.round(71 + Math.cos(time * 0.4) * 3);
        ctx.fillText(`${dynamicBlPercent}%`, blX - 110, blY + 28);

        // Triple Chevron arrows pointing up (bottom left)
        const chevBaseX = blX - 50;
        const chevBaseY = blY + 52;
        const chevPulse = Math.abs(Math.sin(time * 3));
        drawChevron(chevBaseX, chevBaseY, 7, 0.2 + chevPulse * 0.8);
        drawChevron(chevBaseX, chevBaseY + 10, 7, 0.4 + chevPulse * 0.4);
        drawChevron(chevBaseX, chevBaseY + 20, 7, 0.1);
      }

      // --- 6. DRAW THE SIDE GAUGE WINGS ---
      ctx.save();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = accentGreen;
      
      const wingRadius = activeRadius * 1.25;
      // Left Wing Arc
      ctx.beginPath();
      ctx.arc(centerX, centerY, wingRadius, (5 * Math.PI) / 6, (7 * Math.PI) / 6);
      ctx.stroke();

      // Right Wing Arc
      ctx.beginPath();
      ctx.arc(centerX, centerY, wingRadius, -Math.PI / 6, Math.PI / 6);
      ctx.stroke();

      // Draw Dash/Scale marks on Left/Right wings
      ctx.lineWidth = 1;
      const wingDashes = 15;
      // Left wing marks
      for (let i = 0; i <= wingDashes; i++) {
        const angle = (5 * Math.PI) / 6 + ((2 * Math.PI) / 6) * (i / wingDashes);
        const startR = wingRadius - 5;
        const endR = wingRadius + (i % 3 === 0 ? 3 : 0);
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle) * startR, centerY + Math.sin(angle) * startR);
        ctx.lineTo(centerX + Math.cos(angle) * endR, centerY + Math.sin(angle) * endR);
        ctx.stroke();
      }
      // Right wing marks
      for (let i = 0; i <= wingDashes; i++) {
        const angle = -Math.PI / 6 + ((2 * Math.PI) / 6) * (i / wingDashes);
        const startR = wingRadius - 5;
        const endR = wingRadius + (i % 3 === 0 ? 3 : 0);
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle) * startR, centerY + Math.sin(angle) * startR);
        ctx.lineTo(centerX + Math.cos(angle) * endR, centerY + Math.sin(angle) * endR);
        ctx.stroke();
      }
      ctx.restore();

      // --- 7. DRAW MAIN CONCENTRIC GAUGE RING WITH GLOW ---
      ctx.save();
      ctx.shadowBlur = 10 + amplitude * 18;
      ctx.shadowColor = '#00ff66';
      ctx.strokeStyle = primaryGreen;
      ctx.lineWidth = 2.5;

      // Outer Beaming ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, activeRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // --- 7B. GLORIOUS BEAMING RIPPLE WAVES (WHEN SPEAKING OR PROCESSING) ---
      if (state === 'speaking' || state === 'processing') {
        ctx.save();
        const rippleCount = 3;
        for (let r = 0; r < rippleCount; r++) {
          // Each ripple starts at activeRadius and expands outwards, fading out
          const ripplePhase = (time * 0.18 + r / rippleCount) % 1;
          const rippleRadius = activeRadius + ripplePhase * (width * 0.35);
          const rippleAlpha = (1 - ripplePhase) * 0.4 * (0.3 + amplitude * 0.7);
          
          ctx.strokeStyle = `rgba(0, 255, 102, ${rippleAlpha})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
          ctx.stroke();
          
          // Draw a secondary dashed support ring for visual depth
          ctx.strokeStyle = `rgba(0, 255, 102, ${rippleAlpha * 0.3})`;
          ctx.setLineDash([4, 8]);
          ctx.beginPath();
          ctx.arc(centerX, centerY, rippleRadius + 5, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Thin decorative secondary outer line
      ctx.save();
      ctx.strokeStyle = dimGreen;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, activeRadius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // --- 8. DRAW SEGMENTED RADIAL TICK GAUGES ---
      ctx.save();
      ctx.strokeStyle = primaryGreen;
      const segmentTicks = 45;
      const innerT = activeRadius - 12;
      const outerT = activeRadius - 3;
      
      // Rotate the segmented progress bar ring over time
      const rotOffset = time * 0.15;

      for (let i = 0; i < segmentTicks; i++) {
        const angle = (i / segmentTicks) * Math.PI * 2 + rotOffset;
        
        // Highlight active segments based on dynamic power
        const relativeSegment = i / segmentTicks;
        const segmentActive = relativeSegment < (0.4 + amplitude * 0.5);
        ctx.strokeStyle = segmentActive ? primaryGreen : dimGreen;
        ctx.lineWidth = segmentActive ? 2 : 1;

        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle) * innerT, centerY + Math.sin(angle) * innerT);
        ctx.lineTo(centerX + Math.cos(angle) * outerT, centerY + Math.sin(angle) * outerT);
        ctx.stroke();
      }
      ctx.restore();

      // --- 9. DRAW SECOND CONCENTRIC GEAR DIAL RING ---
      ctx.save();
      ctx.strokeStyle = accentGreen;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 5]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, activeRadius - 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // --- 10. DRAW POLAR OSCILLOSCOPE BRAIN (CENTRAL CORE) ---
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = primaryGreen;
      ctx.shadowBlur = 12 + amplitude * 20;
      ctx.shadowColor = '#00ff66';
      ctx.beginPath();

      const coreRadius = baseRadius * 0.55;
      const polarBufferLength = timeDomainData ? timeDomainData.length : 60;

      for (let i = 0; i < polarBufferLength; i++) {
        const angle = (i / polarBufferLength) * Math.PI * 2 + time * 0.1;
        
        // Use real audio samples, fallback to simulated cyber ripples
        let sample = 0;
        if (timeDomainData && timeDomainData[i] !== undefined) {
          sample = timeDomainData[i] / 128.0 - 1.0; // range -1 to 1
        } else {
          sample = Math.sin(i * 0.4 + time * 3.5) * 0.15 * (state === 'idle' ? 0.2 : 1.0);
        }

        const currentR = coreRadius + sample * baseRadius * 0.35 * (1 + amplitude * 0.5);
        const px = centerX + Math.cos(angle) * currentR;
        const py = centerY + Math.sin(angle) * currentR;

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // --- 11. DRAW CENTRAL CORE GLOWING ORB ---
      ctx.save();
      const orbRadius = baseRadius * 0.22;
      const radialGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, orbRadius * (1 + amplitude * 1.5));
      radialGradient.addColorStop(0, 'rgba(0, 255, 102, 1)');
      radialGradient.addColorStop(0.3, 'rgba(0, 255, 102, 0.6)');
      radialGradient.addColorStop(1, 'rgba(0, 255, 102, 0)');
      
      ctx.fillStyle = radialGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius * (1 + amplitude * 1.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // --- 12. TEXT OVERLAY LOGS IN CENTER MATRIX ---
      ctx.fillStyle = 'rgba(0, 255, 102, 0.6)';
      ctx.font = '6px monospace';
      ctx.fillText(`STATE: ${state.toUpperCase()}`, 15, height - 25);
      ctx.fillText(`BEAM_CORE: ${Math.round(beamScale * 100)}%`, 15, height - 15);
      
      if (state === 'listening') {
        ctx.fillStyle = '#ff3333';
        ctx.fillText(`MIC_CAPTURE: LIVE`, 15, height - 35);
      } else if (state === 'speaking') {
        ctx.fillStyle = '#00ff66';
        ctx.fillText(`AUDIO_VOICE_OUT: ENGAGED`, 15, height - 35);
      }

      ctx.restore();
    };

    draw();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [state, isMuted, isCompact]);

  if (errorMessage) {
    return (
      <div className="p-3 bg-red-950/20 border border-red-900 rounded text-center text-[10px] text-red-400 font-mono animate-fade-in">
        {errorMessage}
      </div>
    );
  }

  return (
    <div className={`w-full rounded-xl border border-emerald-900/60 bg-[#020503]/95 relative overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.8)] ${isCompact ? 'p-2' : 'p-4 space-y-3'}`}>
      <div className="flex items-center justify-between border-b border-emerald-950/50 pb-2">
        <div className="flex items-center gap-2 text-emerald-400 font-mono text-[10px] font-bold tracking-wider">
          {state === 'listening' ? (
            <Mic size={12} className="animate-pulse text-red-500" />
          ) : (
            <Radio size={12} className="animate-pulse text-[#00ff66]" />
          )}
          <span className="uppercase">{state === 'processing' ? 'NEURAL SPEECH ENVELOPE' : 'VOICE MODE INTERFACE'}</span>
        </div>
        
        {state === 'processing' && (
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[8px] font-mono border transition-all cursor-pointer ${
              isMuted 
                ? 'bg-emerald-950/10 border-emerald-950 text-emerald-600 hover:text-emerald-400 hover:border-emerald-700' 
                : 'bg-emerald-500/20 border-emerald-400 text-[#00ff66] shadow-[0_0_8px_rgba(0,255,102,0.3)]'
            }`}
          >
            {isMuted ? (
              <>
                <VolumeX size={9} />
                <span>UNMUTE</span>
              </>
            ) : (
              <>
                <Volume2 size={9} className="animate-bounce" />
                <span>MUTED_OFF</span>
              </>
            )}
          </button>
        )}
      </div>

      <div 
        ref={containerRef}
        className="relative rounded-lg overflow-hidden border border-emerald-950/70 bg-[#020604] shadow-inner w-full"
      >
        <canvas
          ref={canvasRef}
          width={dimensions.width * dpr}
          height={dimensions.height * dpr}
          style={{ width: '100%', height: `${dimensions.height}px` }}
          className="block"
        />
        <div className="absolute right-3 top-3 text-[7px] font-mono text-emerald-600/40 select-none tracking-widest uppercase">
          SYS_AUDIO_CARRIER_LINK
        </div>
      </div>

      {!isCompact && prompt && (
        <div className="text-[10px] text-emerald-400/80 font-mono leading-relaxed bg-[#010302] p-2.5 rounded-lg border border-emerald-950/60 max-h-16 overflow-y-auto">
          <span className="text-emerald-400 font-bold uppercase tracking-wider mr-1.5">[SYNTH_OUT]:</span> 
          {prompt}
        </div>
      )}
    </div>
  );
};

