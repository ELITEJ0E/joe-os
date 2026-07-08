import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import { VoiceWaveVisualizer, VoiceState } from './VoiceWaveVisualizer';
import { synthesizeSpeech } from '../ttsRegistry';

interface VoiceModeChannelProps {
  onSendMessage: (text: string) => Promise<void>;
  isProcessing: boolean;
  lastAssistantMessage?: string | null;
}

export const VoiceModeChannel: React.FC<VoiceModeChannelProps> = ({ 
  onSendMessage, 
  isProcessing,
  lastAssistantMessage 
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Play assistant message via TTS when it arrives
  useEffect(() => {
    if (lastAssistantMessage && isActive && voiceState !== 'listening') {
      const playTTS = async () => {
        setVoiceState('thinking');
        try {
          const url = await synthesizeSpeech(lastAssistantMessage);
          if (url) {
            if (!audioElementRef.current) {
              audioElementRef.current = new Audio();
            }
            audioElementRef.current.src = url;
            
            audioElementRef.current.onplay = () => setVoiceState('speaking');
            audioElementRef.current.onended = () => {
              setVoiceState('idle');
              // Automatically resume listening if still active?
              // Or require wake word? We are using push-to-talk or toggle for now since openWakeWord is in python.
            };
            
            await audioElementRef.current.play();
          } else {
            // Web Speech API played it
            setVoiceState('idle');
          }
        } catch (e) {
          console.error("TTS playback failed:", e);
          setVoiceState('idle');
        }
      };
      playTTS();
    }
  }, [lastAssistantMessage, isActive]);

  // If chat is processing but we aren't handling audio, show thinking
  useEffect(() => {
    if (isProcessing && isActive && voiceState === 'idle') {
      setVoiceState('thinking');
    } else if (!isProcessing && voiceState === 'thinking') {
      setVoiceState('idle');
    }
  }, [isProcessing, isActive, voiceState]);

  const startRecording = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        audioChunksRef.current = [];
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
        
        await handleTranscription(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setVoiceState('listening');
      setIsActive(true);
      
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    } catch (err: any) {
      console.error('Microphone access denied or error:', err);
      setErrorMessage('Microphone access denied. Check permissions.');
      setVoiceState('idle');
      setIsActive(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setVoiceState('thinking');
    }
  };

  const handleTranscription = async (blob: Blob) => {
    try {
      setVoiceState('thinking');
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      
      // Call our proxy or directly to sidecar
      const res = await fetch('/api/stt/transcribe', {
        method: 'POST',
        body: blob, // Express handles raw body, wait actually FormData is easier if proxy supports it.
        headers: {
          'Content-Type': blob.type,
        }
      });
      
      if (!res.ok) throw new Error('Transcription failed');
      
      const data = await res.json();
      if (data.text && data.text.trim().length > 0) {
        await onSendMessage(data.text.trim());
      } else {
        setVoiceState('idle');
      }
    } catch (err: any) {
      console.error('STT Error:', err);
      setErrorMessage('Transcription service unavailable.');
      setVoiceState('idle');
    }
  };

  const toggleRecording = () => {
    if (voiceState === 'listening') {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const turnOffVoiceMode = () => {
    if (voiceState === 'listening') stopRecording();
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsActive(false);
    setVoiceState('idle');
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {isActive ? (
        <div className="flex flex-col gap-2">
          <VoiceWaveVisualizer 
            state={voiceState} 
            audioStream={audioStreamRef.current}
            audioElement={audioElementRef.current}
          />
          <div className="flex gap-2 justify-center">
            <button
              onClick={toggleRecording}
              className={`p-3 rounded-full transition-all ${
                voiceState === 'listening' 
                  ? 'bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30'
              }`}
            >
              {voiceState === 'listening' ? <Square size={20} /> : <Mic size={20} />}
            </button>
            <button
              onClick={turnOffVoiceMode}
              className="p-3 rounded-full bg-gray-800/50 text-gray-400 hover:text-white border border-gray-700/50"
            >
              <MicOff size={20} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={startRecording}
          className="flex items-center gap-2 p-2 px-4 rounded-lg bg-emerald-950/30 border border-emerald-900/50 text-emerald-500 hover:bg-emerald-900/40 hover:text-emerald-400 transition-colors w-max"
        >
          <Mic size={16} />
          <span className="font-mono text-xs uppercase font-semibold">Enter Voice Mode</span>
        </button>
      )}
      
      {errorMessage && (
        <div className="text-red-400 text-xs font-mono px-2">
          {errorMessage}
        </div>
      )}
    </div>
  );
};
