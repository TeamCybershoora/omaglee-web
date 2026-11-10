/**
 * Media Service - Camera, Microphone & Screen Sharing
 */

import { AppState, DOMElements } from '../types';
import { showToast } from './ui';

export async function startLocalPreview(state: AppState, el: DOMElements): Promise<void> {
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
    }
  } catch (err) {
    console.warn('Camera access error:', err);
    if (el.requestPermsBtn) {
      el.requestPermsBtn.style.display = 'inline-flex';
    }
    showToast(el, 'Camera permission required. Click "Allow Camera & Mic".', 'neutral');
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

export async function toggleScreenShare(state: AppState, el: DOMElements): Promise<void> {
  if (state.isScreenSharing) {
    await startLocalPreview(state, el);
    state.isScreenSharing = false;
    showToast(el, 'Switched back to camera feed.');
  } else {
    try {
      if (navigator.mediaDevices?.getDisplayMedia) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        state.localStream = displayStream;
        if (el.localVideo) el.localVideo.srcObject = displayStream;
        state.isScreenSharing = true;

        if (state.peerConnection) {
          const sender = state.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(displayStream.getVideoTracks()[0]);
        }

        displayStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare(state, el);
        };
        showToast(el, 'Screen sharing active.');
      }
    } catch {
      // User cancelled picker
    }
  }
  updateMediaButtonStates(state, el);
}

export function updateMediaButtonStates(state: AppState, el: DOMElements): void {
  if (el.micBtn) el.micBtn.classList.toggle('control-btn-muted', state.isAudioMuted);
  if (el.camBtn) el.camBtn.classList.toggle('control-btn-muted', state.isVideoMuted);
  if (el.localMicBtn) el.localMicBtn.classList.toggle('active', state.isAudioMuted);
  if (el.localCamBtn) el.localCamBtn.classList.toggle('active', state.isVideoMuted);
  if (el.screenBtn) el.screenBtn.classList.toggle('control-btn-active', state.isScreenSharing);
}
