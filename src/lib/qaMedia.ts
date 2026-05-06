type ManagedStream = {
  stop: () => void;
};

const managedStreams = new WeakMap<MediaStream, ManagedStream>();

function registerManagedStream(stream: MediaStream, stop: () => void) {
  managedStreams.set(stream, { stop });
}

function drawQaFrame(context: CanvasRenderingContext2D, frame: number, now: Date) {
  const width = context.canvas.width;
  const height = context.canvas.height;
  context.fillStyle = "#09090f";
  context.fillRect(0, 0, width, height);

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#7c3aed");
  gradient.addColorStop(0.5, "#d946ef");
  gradient.addColorStop(1, "#0ea5e9");
  context.fillStyle = gradient;
  context.fillRect(32, 32, width - 64, height - 64);

  context.fillStyle = "rgba(10, 10, 24, 0.82)";
  context.fillRect(64, 64, width - 128, height - 128);

  context.fillStyle = "#fafafa";
  context.font = "600 42px Inter, Arial, sans-serif";
  context.fillText("RoomCast QA share", 96, 132);

  context.fillStyle = "rgba(255,255,255,0.75)";
  context.font = "500 24px Inter, Arial, sans-serif";
  context.fillText(`Frame ${frame}`, 96, 180);
  context.fillText(now.toLocaleTimeString(), 96, 218);

  context.strokeStyle = "rgba(255,255,255,0.18)";
  context.lineWidth = 1;
  for (let x = 96; x < width - 96; x += 64) {
    context.beginPath();
    context.moveTo(x, 260);
    context.lineTo(x, height - 96);
    context.stroke();
  }

  context.fillStyle = "#22c55e";
  for (let i = 0; i < 7; i += 1) {
    const barHeight = 36 + ((frame * 11 + i * 23) % 180);
    context.fillRect(108 + i * 84, height - 108 - barHeight, 40, barHeight);
  }
}

function makeToneStream(frequency: number, gainValue: number) {
  const AudioContextCtor = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    throw new Error("AudioContext is not available in this browser.");
  }

  const audioContext = new AudioContextCtor();
  const oscillator = audioContext.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  const gain = audioContext.createGain();
  gain.gain.value = gainValue;

  const destination = audioContext.createMediaStreamDestination();
  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start();

  return {
    stream: destination.stream,
    stop: () => {
      oscillator.stop();
      oscillator.disconnect();
      gain.disconnect();
      void audioContext.close();
    },
  };
}

function createCanvasFallbackStream() {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas rendering context is not available.");
  }

  let frame = 0;
  drawQaFrame(context, frame, new Date());
  const frameTimer = window.setInterval(() => {
    frame += 1;
    drawQaFrame(context, frame, new Date());
  }, 150);

  const canvasStream = canvas.captureStream(10);
  const tone = makeToneStream(220, 0.018);
  const stream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...tone.stream.getAudioTracks(),
  ]);

  registerManagedStream(stream, () => {
    window.clearInterval(frameTimer);
    canvasStream.getTracks().forEach((track) => track.stop());
    tone.stop();
  });

  return stream;
}

export async function createQaScreenShareStream() {
  try {
    const cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, frameRate: 24 },
      audio: false,
    });
    const tone = makeToneStream(220, 0.018);
    const stream = new MediaStream([
      ...cameraStream.getVideoTracks(),
      ...tone.stream.getAudioTracks(),
    ]);
    registerManagedStream(stream, () => {
      cameraStream.getTracks().forEach((track) => track.stop());
      tone.stop();
    });
    return stream;
  } catch {
    return createCanvasFallbackStream();
  }
}

export function createQaMicrophoneStream() {
  const tone = makeToneStream(660, 0.01);
  const stream = new MediaStream(tone.stream.getAudioTracks());
  registerManagedStream(stream, () => {
    tone.stop();
  });
  return stream;
}

export function stopQaManagedStream(stream: MediaStream | null | undefined) {
  if (!stream) return;
  managedStreams.get(stream)?.stop();
  managedStreams.delete(stream);
  stream.getTracks().forEach((track) => {
    if (track.readyState !== "ended") track.stop();
  });
}
