# JoelOS Voice Sidecar Setup

To achieve 100% free, local, and private voice orchestration (Speech-to-Text and Wake Word), JoelOS uses a Python sidecar. This sidecar runs `faster-whisper` for STT and `openWakeWord` for wake word detection. 

The Node.js/React stack communicates with this Python daemon over a local HTTP server (default port `8643`).

## Prerequisites
- Python 3.9+
- ffmpeg (installed on your system: `sudo apt install ffmpeg` or `brew install ffmpeg`)
- PortAudio (for microphone capture: `sudo apt install portaudio19-dev` or `brew install portaudio`)

## Setup Instructions

1. **Navigate to the sidecar directory (or create it)**:
   ```bash
   mkdir -p python_voice_sidecar
   cd python_voice_sidecar
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. **Install dependencies**:
   Create a `requirements.txt`:
   ```text
   faster-whisper==1.0.0
   openwakeword==0.6.0
   pyaudio==0.2.14
   flask==3.0.0
   flask-cors==4.0.0
   sounddevice==0.4.6
   numpy==1.26.4
   ```
   Install them:
   ```bash
   pip install -r requirements.txt
   ```

4. **Create the Python server script (`server.py`)**:
   Create a script that listens to the microphone for the wake word, buffers audio, and triggers transcription. Alternatively, if you want the React app to send audio blobs to it, it just needs to expose a `/transcribe` endpoint.

   Since modern browsers can capture mic audio via Web Audio API, the easiest architecture is:
   - React app captures mic audio blobs.
   - React app sends blobs to `POST http://localhost:8643/transcribe`.
   - Sidecar returns transcribed text.
   
   If you want Wake Word processing in the sidecar too, you can run a continuous stream from the frontend to a websocket, or just run the wake word entirely on the python side sending a webhook back to Node.js when it wakes. For browser-centric UI (reacting to "listening" state), you can use a WebRTC or WebSocket connection, or just rely on a hotword detector in the browser (like `@picovoice/porcupine-web` but that's not fully free). Since the prompt requires `openWakeWord`, the Python sidecar is best running as a background daemon capturing mic directly, but that means the browser doesn't have the audio for the visualizer unless we dual-capture.

   **Recommended Architecture for JoelOS:**
   - Dual-capture: Python sidecar continuously listens to the system mic via `pyaudio` + `openWakeWord`.
   - When the wake word is detected, Python starts recording the command.
   - Once silence is detected (VAD), Python transcribes via `faster-whisper`.
   - Python POSTs the text to JoelOS Express server (`POST /api/voice/intent`).
   - The React UI listens to SSE or WebSockets from Express to update the VoiceWaveVisualizer to "thinking", then "speaking".

   **Alternatively (Browser-driven):**
   - The user clicks a "Mic" button in the React UI (simulating the wake word or using a basic browser VAD).
   - React captures audio via `MediaRecorder`.
   - React POSTs the blob to the Express server `/api/stt/transcribe`.
   - Express forwards to Python sidecar `POST http://localhost:8643/transcribe`.

   We will provide the **Browser-driven + Endpoint** version here for maximum compatibility with the existing React visualizer you requested, which uses the browser's `AnalyserNode`.

   **`server.py` snippet for STT endpoint:**
   ```python
   import os
   from flask import Flask, request, jsonify
   from flask_cors import CORS
   from faster_whisper import WhisperModel
   import tempfile

   app = Flask(__name__)
   CORS(app)

   print("Loading faster-whisper model (base.en)...")
   # 'base.en' is fast and uses ~1GB VRAM/RAM. Change to 'tiny.en' or 'small.en' as needed.
   model = WhisperModel("base.en", device="cpu", compute_type="int8")
   print("Model loaded.")

   @app.route('/transcribe', methods=['POST'])
   def transcribe():
       if 'audio' not in request.files:
           return jsonify({"error": "No audio file"}), 400
       
       file = request.files['audio']
       
       # Save to temporary file
       fd, path = tempfile.mkstemp(suffix=".webm")
       try:
           with os.fdopen(fd, 'wb') as f:
               f.write(file.read())
           
           segments, info = model.transcribe(path, beam_size=5)
           text = "".join([segment.text for segment in segments])
           
           return jsonify({"text": text.strip()})
       finally:
           os.remove(path)

   if __name__ == '__main__':
       app.run(port=8643, debug=False)
   ```

5. **Run the server**:
   ```bash
   python server.py
   ```
   It will start listening on port 8643.

## Piper TTS Setup
To enable the local Piper TTS (speaking):
1. Download a pre-trained voice model (e.g., `en_GB-jenny_dioco-medium.onnx` and its `.json` config file) from Hugging Face: `https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_GB/jenny_dioco/medium`
2. Download the Piper binary for your OS from `https://github.com/rhasspy/piper/releases`
3. Extract the binary.
4. Set the environment variables in your JoelOS `.env`:
   ```env
   PIPER_ENABLED=true
   PIPER_PATH=/path/to/piper/piper
   PIPER_MODEL=/path/to/en_GB-jenny_dioco-medium.onnx
   STT_SIDECAR_URL=http://localhost:8643
   ```
