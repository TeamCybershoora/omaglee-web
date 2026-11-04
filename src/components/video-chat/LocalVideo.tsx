import { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, Maximize2, Minimize2, Camera } from 'lucide-react';
import { toggleElementFullscreen } from '../../utils/fullscreen';

export interface LocalVideoProps {
  stream: MediaStream | null;
  isVideoMuted?: boolean;
  isAudioMuted?: boolean;
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
  onRequestPermissions?: () => void;
}

export default function LocalVideo({
  stream,
  isVideoMuted = false,
  isAudioMuted = false,
  onToggleAudio,
  onToggleVideo,
  onRequestPermissions,
}: LocalVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null;
    }
  }, [stream]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = async () => {
    const active = await toggleElementFullscreen(containerRef.current);
    setIsFullscreen(active);
  };

  const hasLiveWebcam = Boolean(stream && !isVideoMuted);

  return (
    <div
      ref={containerRef}
      className={`video-feed-card local-feed-card ${isFullscreen ? 'in-fullscreen' : ''}`}
      aria-label="Local Video Preview"
    >
      {/* 1. Real Webcam Video: Directly shows user's own live camera stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`video-media ${!hasLiveWebcam ? 'hidden' : ''}`}
        aria-label="Your Camera Feed"
      />

      {/* 2. Standby / Permission Needed State (when no stream yet or camera turned off) */}
      {!hasLiveWebcam && (
        <div className="video-standby-placeholder">
          <div className={`standby-avatar-glow ${isVideoMuted ? 'muted-glow' : ''}`}>
            {isVideoMuted ? <VideoOff size={44} /> : <Camera size={44} />}
          </div>
          <h3 className="standby-title">
            {isVideoMuted ? 'Camera Paused' : 'Camera Access Needed'}
          </h3>
          <p className="standby-subtitle">
            {isVideoMuted
              ? 'Your video is hidden from strangers. Click camera below to resume.'
              : 'Allow camera and microphone access to see your live preview.'}
          </p>

          {!isVideoMuted && onRequestPermissions && (
            <button
              type="button"
              onClick={onRequestPermissions}
              className="enable-camera-action-btn"
            >
              <Camera size={16} />
              <span>Allow Camera & Mic</span>
            </button>
          )}
        </div>
      )}

      {/* Top Left Status Badge: 🟢 You */}
      <div className="feed-badge-top-left">
        <span className="status-pill status-pill-active">
          <span className={`status-dot ${hasLiveWebcam ? 'green-dot pulsing-dot' : 'amber-dot'}`} />
          <span className="status-text">You</span>
        </span>
      </div>

      {/* Bottom Left Floating Media Controls (Mic & Cam) */}
      <div className="feed-controls-bottom-left">
        <button
          type="button"
          onClick={onToggleAudio}
          className={`feed-floating-btn ${isAudioMuted ? 'muted' : ''}`}
          title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          aria-label={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isAudioMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <button
          type="button"
          onClick={onToggleVideo}
          className={`feed-floating-btn ${isVideoMuted ? 'muted' : ''}`}
          title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
          aria-label={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
        >
          {isVideoMuted ? <VideoOff size={16} /> : <Video size={16} />}
        </button>
      </div>

      {/* Bottom Right Floating Fullscreen Toggle */}
      <div className="feed-controls-bottom-right">
        <button
          type="button"
          onClick={handleToggleFullscreen}
          className="feed-floating-btn"
          title={isFullscreen ? 'Exit Fullscreen' : 'Expand Video'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Expand Video'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
    </div>
  );
}
