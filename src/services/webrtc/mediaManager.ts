/**
 * MediaManager
 * Responsible for requesting camera/mic access, managing tracks,
 * muting/unmuting, and ensuring complete cleanup.
 */
export class MediaManager {
  localStream: MediaStream | null;
  isAudioMuted: boolean;
  isVideoMuted: boolean;

  constructor() {
    this.localStream = null;
    this.isAudioMuted = false;
    this.isVideoMuted = false;
  }

  /**
   * Request user media with graceful error handling.
   */
  async requestMedia(
    constraints: MediaStreamConstraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true }
  ): Promise<MediaStream> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Your browser does not support media device capture (navigator.mediaDevices.getUserMedia is unavailable).');
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.isAudioMuted = false;
      this.isVideoMuted = false;
      return this.localStream;
    } catch (err: unknown) {
      this.localStream = null;
      let friendlyMessage = 'Unable to access camera or microphone.';

      const errorName = err instanceof Error ? err.name : '';

      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        friendlyMessage = 'Permission Denied: Please allow camera and microphone access in your browser settings to proceed with video chat.';
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        friendlyMessage = 'Device Not Found: No working camera or microphone was detected on this computer.';
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        friendlyMessage = 'Hardware In Use: Your camera or microphone is currently in use by another application (e.g. Zoom, Teams, or another browser tab).';
      } else if (errorName === 'OverconstrainedError') {
        friendlyMessage = 'Hardware Constraints: The requested camera resolution is not supported by your hardware.';
      } else if (errorName === 'SecurityError') {
        friendlyMessage = 'Security Context: Camera/microphone access requires a secure HTTPS connection or localhost.';
      }

      const mediaError = new Error(friendlyMessage);
      throw mediaError;
    }
  }

  /**
   * Get the active local MediaStream.
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Mute or unmute the local audio track.
   */
  setAudioEnabled(enabled: boolean): boolean {
    if (!this.localStream) return false;
    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) return false;

    audioTracks.forEach((track) => {
      track.enabled = enabled;
    });
    this.isAudioMuted = !enabled;
    return true;
  }

  /**
   * Enable or disable the local video track.
   */
  setVideoEnabled(enabled: boolean): boolean {
    if (!this.localStream) return false;
    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length === 0) return false;

    videoTracks.forEach((track) => {
      track.enabled = enabled;
    });
    this.isVideoMuted = !enabled;
    return true;
  }

  /**
   * Fully stop and release all hardware media tracks.
   */
  stopAllTracks(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore
        }
      });
      this.localStream = null;
    }
    this.isAudioMuted = false;
    this.isVideoMuted = false;
  }
}

export default MediaManager;
