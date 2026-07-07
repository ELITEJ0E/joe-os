import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Radio } from 'lucide-react';

interface VoiceWaveVisualizerProps {
  prompt: string;
  isCompact?: boolean;
}

export const VoiceWaveVisualizer: React.FC<VoiceWaveVisualizerProps> = ({ prompt, isCompact = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const modulatorRef = useRef<OscillatorNode | null>(null);
  const formantRef = useRef<OscillatorNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const visualGainRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isMuted, setIsMuted] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Web Audio API nodes
  useEffect(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        setErrorMessage('Web Audio API is not supported in this browser.');
        return;
      }

      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      // Analyser Node
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;

      // Master Gain (for audio output)
      const masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(isMuted ? 0 : 0.05, audioCtx.currentTime);
      masterGainRef.current = masterGain;

      // Visual Gain (always on, so waveform keeps animating even when muted)
      const visualGain = audioCtx.createGain();
      visualGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
      visualGainRef.current = visualGain;

      // Carrier Oscillator (fundamental frequency of synthesized voice)
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, audioCtx.currentTime); // 140Hz human vocal pitch approx
      oscillatorRef.current = osc;

      // Modulator (simulates vocal tract modulation / vibrato and speech rhythm)
      const mod = audioCtx.createOscillator();
      mod.type = 'sine';
      mod.frequency.setValueAtTime(6, audioCtx.currentTime); // 6Hz modulation
      const modGain = audioCtx.createGain();
      modGain.gain.setValueAtTime(30, audioCtx.currentTime); // +/- 30Hz range
      modulatorRef.current = mod;

      // Formant simulation (higher frequency resonance)
      const formant = audioCtx.createOscillator();
      formant.type = 'sine';
      formant.frequency.setValueAtTime(880, audioCtx.currentTime); // Formant frequency
      const formantGain = audioCtx.createGain();
      formantGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      formantRef.current = formant;

      // Connect Modulator to Carrier Frequency
      mod.connect(modGain);
      modGain.connect(osc.frequency);

      // Connect Formant to Visual Gain & Master Gain
      formant.connect(formantGain);
      
      // Connect Carrier to Visual & Master
      osc.connect(visualGain);
      formantGain.connect(visualGain);

      // Route through Analyser and Destination
      visualGain.connect(analyser);
      
      // Only route visual output to master output for listening
      analyser.connect(masterGain);
      masterGain.connect(audioCtx.destination);

      // Start all sound sources
      osc.start();
      mod.start();
      formant.start();

      // Slow dynamic speech rhythm parameter automation
      const interval = setInterval(() => {
        if (audioCtx.state === 'closed') return;
        const now = audioCtx.currentTime;
        // Randomize pitch and formant to sound like speech phonemes
        const targetPitch = 120 + Math.random() * 80;
        const targetFormant = 600 + Math.random() * 900;
        
        osc.frequency.exponentialRampToValueAtTime(targetPitch, now + 0.3);
        formant.frequency.exponentialRampToValueAtTime(targetFormant, now + 0.3);
        mod.frequency.linearRampToValueAtTime(4 + Math.random() * 8, now + 0.3);
      }, 400);

      return () => {
        clearInterval(interval);
        try {
          osc.stop();
        } catch {}
        try {
          mod.stop();
        } catch {}
        try {
          formant.stop();
        } catch {}
        audioCtx.close();
      };
    } catch (e: any) {
      console.error('Failed to initialize Web Audio API:', e);
      setErrorMessage('AudioContext blocked or uninitialized');
    }
  }, []);

  // Handle Mute/Unmute state updates
  useEffect(() => {
    if (masterGainRef.current && audioContextRef.current) {
      const audioCtx = audioContextRef.current;
      const now = audioCtx.currentTime;
      
      // Resume context if suspended (browser security policy)
      if (!isMuted && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      masterGainRef.current.gain.linearRampToValueAtTime(
        isMuted ? 0 : 0.05, 
        now + 0.1
      );
    }
  }, [isMuted]);

  // Waveform visualization loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      const width = canvas.width;
      const height = canvas.height;

      // Retrieve time-domain waveform data
      analyser.getByteTimeDomainData(dataArray);

      // Clear with elegant translucent background for a cybernetic tracer trail
      ctx.fillStyle = 'rgba(2, 5, 3, 0.25)';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle background target grid lines
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
      ctx.lineWidth = 1;
      
      // Horizontal center line
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Vertical marker grids
      for (let x = 0; x < width; x += width / 8) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw the glowing green waveform
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#00ff66';
      
      // Add heavy neon glow effect
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00ff66';

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0; // Normalized 0.0 to 2.0
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Reset shadow effects so other drawing actions are clean
      ctx.shadowBlur = 0;

      // Draw active scanner frequency text overlay
      ctx.fillStyle = 'rgba(16, 185, 129, 0.7)';
      ctx.font = '7px monospace';
      
      const pitchHz = oscillatorRef.current ? Math.round(oscillatorRef.current.frequency.value) : 140;
      const formantHz = formantRef.current ? Math.round(formantRef.current.frequency.value) : 880;
      
      ctx.fillText(`FREQ: ${pitchHz}Hz | FORMANT: ${formantHz}Hz`, 6, 12);
      ctx.fillText(`SPEECH_SYNTH: MODULATING`, 6, height - 6);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Explicitly resume audio context if it was blocked by browser
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

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
          <Radio size={10} className="animate-pulse text-[#00ff66]" />
          <span>NEURAL SPEECH ENVELOPE</span>
        </div>
        
        <button
          type="button"
          onClick={toggleMute}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-mono border transition-all cursor-pointer ${
            isMuted 
              ? 'bg-emerald-950/10 border-emerald-950 text-emerald-600 hover:text-emerald-400 hover:border-emerald-700' 
              : 'bg-emerald-500/20 border-emerald-400 text-[#00ff66]'
          }`}
          title={isMuted ? "Listen to synthetic carrier hum" : "Mute audio"}
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

      {!isCompact && (
        <div className="text-[9px] text-emerald-700/80 font-mono leading-tight bg-black/30 p-1.5 rounded border border-emerald-950/30 truncate">
          <span className="text-emerald-500 font-semibold">SYNTH:</span> {prompt}
        </div>
      )}
    </div>
  );
};
