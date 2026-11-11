/**
 * Media Service - Camera, Microphone & Screen Sharing
 */

import { AppState, DOMElements } from '../types';
import { showToast } from './ui';

function createSyntheticVideoStream(): MediaStreamTrack {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d')!;
  let frame = 0;

  const draw = () => {
    frame++;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Glowing circle pulse
    const pulse = 100 + Math.sin(frame * 0.08) * 15;
    const gradient = ctx.createRadialGradient(320, 220, 10, 320, 220, pulse);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.7)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(320, 220, pulse, 0, Math.PI * 2);
    ctx.fill();

    // User Avatar Silhouette
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(320, 190, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(320, 280, 65, Math.PI, 0, false);
    ctx.fill();

    // Text Label
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'center';
    ctx.fillText('Omaglee Virtual Camera', 320, 390);

    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Webcam in use by another tab or standby', 320, 420);
  };

  draw();
  setInterval(draw, 100);

  const canvasStream = (canvas as any).captureStream
    ? (canvas as any).captureStream(15)
    : (canvas as any).mozCaptureStream(15);
  return canvasStream.getVideoTracks()[0];
}

export async function startLocalPreview(state: AppState, el: DOMElements): Promise<void> {
  if (state.localStream && state.localStream.active) {
    if (el.localVideo && el.localVideo.srcObject !== state.localStream) {
      el.localVideo.srcObject = state.localStream;
    }
    return;
  }

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      state.localStream = stream;
      if (el.localVideo) {
        el.localVideo.srcObject = stream;
      }
      if (el.requestPermsBtn) {
        el.requestPermsBtn.style.display = 'none';
      }
      return;
    }
  } catch (err: any) {
    console.warn('Direct camera access error:', err?.name || err);

    // Try fallback for multi-tab testing on the same machine (where webcam is already locked)
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
      const videoTrack = createSyntheticVideoStream();
      const combinedStream = new MediaStream();
      combinedStream.addTrack(videoTrack);
      if (audioStream) {
        audioStream.getAudioTracks().forEach(t => combinedStream.addTrack(t));
      }

      state.localStream = combinedStream;
      if (el.localVideo) {
        el.localVideo.srcObject = combinedStream;
      }
      if (el.requestPermsBtn) {
        el.requestPermsBtn.style.display = 'none';
      }
      showToast(el, 'Webcam busy in another tab; using virtual camera fallback.', 'neutral');
      return;
    } catch {
      // Complete fallback
      const videoTrack = createSyntheticVideoStream();
      const combinedStream = new MediaStream([videoTrack]);
      state.localStream = combinedStream;
      if (el.localVideo) {
        el.localVideo.srcObject = combinedStream;
      }
    }

    if (el.requestPermsBtn) {
      el.requestPermsBtn.style.display = 'inline-flex';
    }
  }
}

export function toggleAudio(state: AppState, el: DOMElements): void {
  if (!state.localStream) return;
  state.isAudioMuted = !state.isAudioMuted;
  state.localStream.getAudioTracks().forEach(t => {
    t.enabled = !state.isAudioMuted;
  });
  updateMediaButtonStates(state, el);
}

export function toggleVideo(state: AppState, el: DOMElements): void {
  if (!state.localStream) return;
  state.isVideoMuted = !state.isVideoMuted;
  state.localStream.getVideoTracks().forEach(t => {
    t.enabled = !state.isVideoMuted;
  });
  updateMediaButtonStates(state, el);
}

async function replaceOutgoingTracks(state: AppState, stream: MediaStream | null): Promise<void> {
  if (!state.peerConnection || !stream) return;
  const senders = state.peerConnection.getSenders();
  const videoTrack = stream.getVideoTracks()[0];
  const audioTrack = stream.getAudioTracks()[0];

  if (videoTrack) {
    const videoSender = senders.find(s => s.track?.kind === 'video');
    if (videoSender) {
      await videoSender.replaceTrack(videoTrack).catch(err => console.warn('replaceTrack(video) failed:', err));
    }
  }
  if (audioTrack) {
    const audioSender = senders.find(s => s.track?.kind === 'audio');
    if (audioSender) {
      await audioSender.replaceTrack(audioTrack).catch(err => console.warn('replaceTrack(audio) failed:', err));
    }
  }
}

async function stopScreenShare(state: AppState, el: DOMElements): Promise<void> {
  if (!state.isScreenSharing) return;
  state.isScreenSharing = false;

  if (state.localStream) {
    state.localStream.getTracks().forEach(t => {
      t.onended = null;
      t.stop();
    });
    state.localStream = null;
  }

  await startLocalPreview(state, el);

  // Restore mute flags on newly created camera stream
  if (state.localStream) {
    state.localStream.getAudioTracks().forEach(t => { t.enabled = !state.isAudioMuted; });
    state.localStream.getVideoTracks().forEach(t => { t.enabled = !state.isVideoMuted; });
  }

  await replaceOutgoingTracks(state, state.localStream);
  updateMediaButtonStates(state, el);
  showToast(el, 'Switched back to camera feed.');
}

export async function toggleScreenShare(state: AppState, el: DOMElements): Promise<void> {
  if (state.isScreenSharing) {
    await stopScreenShare(state, el);
    return;
  }

  try {
    if (!navigator.mediaDevices?.getDisplayMedia) return;
    const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenVideoTrack = displayStream.getVideoTracks()[0];
    if (!screenVideoTrack) return;

    // Preserve existing mic audio tracks, stop old video tracks
    const preservedAudioTracks: MediaStreamTrack[] = [];
    if (state.localStream) {
      state.localStream.getVideoTracks().forEach(t => t.stop());
      preservedAudioTracks.push(...state.localStream.getAudioTracks());
    }

    const nextStream = new MediaStream([screenVideoTrack, ...preservedAudioTracks]);
    state.localStream = nextStream;
    if (el.localVideo) el.localVideo.srcObject = nextStream;
    state.isScreenSharing = true;

    await replaceOutgoingTracks(state, nextStream);

    screenVideoTrack.onended = () => {
      stopScreenShare(state, el).catch(() => {});
    };
    showToast(el, 'Screen sharing active.');
  } catch {
    // User cancelled picker
  }
  updateMediaButtonStates(state, el);
}

export function updateMediaButtonStates(state: AppState, el: DOMElements): void {
  if (el.micBtn) {
    el.micBtn.classList.toggle('control-btn-muted', state.isAudioMuted);
    el.micBtn.title = state.isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone';
  }
  if (el.camBtn) {
    el.camBtn.classList.toggle('control-btn-muted', state.isVideoMuted);
    el.camBtn.title = state.isVideoMuted ? 'Turn On Camera' : 'Turn Off Camera';
  }
  if (el.localMicBtn) {
    el.localMicBtn.classList.toggle('active', state.isAudioMuted);
    el.localMicBtn.classList.toggle('control-btn-muted', state.isAudioMuted);
    el.localMicBtn.title = state.isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone';
  }
  if (el.localCamBtn) {
    el.localCamBtn.classList.toggle('active', state.isVideoMuted);
    el.localCamBtn.classList.toggle('control-btn-muted', state.isVideoMuted);
    el.localCamBtn.title = state.isVideoMuted ? 'Turn On Camera' : 'Turn Off Camera';
  }
  if (el.screenBtn) {
    el.screenBtn.classList.toggle('control-btn-active', state.isScreenSharing);
    el.screenBtn.title = state.isScreenSharing ? 'Stop Screen Share' : 'Share Screen';
  }
}
