import { useEffect, useRef, useState } from 'react';
import { Users, RefreshCw, Maximize2, Minimize2, AlertCircle, Loader2, PhoneCall } from 'lucide-react';
import { VideoChatState } from '../../services/state/frontendStateMachine';
import { toggleElementFullscreen } from '../../utils/fullscreen';

export interface RemoteVideoProps {
  stream: MediaStream | null;
  callState: VideoChatState | string;
  waitingSeconds?: number;
  countryName?: string;
  countryFlag?: string;
  onStartCall?: () => void;
}

export default function RemoteVideo({
  stream,
  callState,
  waitingSeconds = 0,
  countryName = 'India',
  countryFlag = '🇮🇳',
  onStartCall,
}: RemoteVideoProps) {
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

  const isConnected = (callState === 'CONNECTED' || callState === 'connected') && Boolean(stream);
  const isSearching =
    callState === 'SEARCHING' ||
    callState === 'searching' ||
    callState === 'waiting_peer' ||
    callState === 'REQUESTING_MEDIA';
  const isConnecting =
    callState === 'MATCHED' ||
    callState === 'matched' ||
    callState === 'CONNECTING' ||
    callState === 'joining_room' ||
    callState === 'negotiating';
  const isReconnecting = callState === 'RECONNECTING' || callState === 'reconnecting';
  const isDisconnected = callState === 'stranger_left' || callState === 'disconnected';
  const isIdle = !isConnected && !isSearching && !isConnecting && !isReconnecting && !isDisconnected;

  return (
    <div
      ref={containerRef}
      className={`video-feed-card remote-feed-card pure-black-screen ${isFullscreen ? 'in-fullscreen' : ''}`}
      aria-label="Stranger Video Feed"
    >
      {/* 1. Real WebRTC Remote Video Stream (When peer is connected) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`video-media ${!isConnected ? 'hidden' : ''}`}
        aria-label="Stranger Video Stream"
      />

      {/* 2. Sleek Black Screen Standby & Call States (No fake pictures) */}
      {!isConnected && (
        <div className="pure-black-standby">
          {isIdle && (
            <div className="black-screen-center-box">
              <div className="standby-avatar-glow dark-glow">
                <Users size={44} className="text-cyan" />
              </div>
              <h3 className="standby-title">Stranger Feed</h3>
              <p className="standby-subtitle">
                Camera is in standby. Click <strong>"Start Call"</strong> below to find and connect with an active random stranger.
              </p>
              {onStartCall && (
                <button
                  type="button"
                  onClick={onStartCall}
                  className="start-call-action-btn"
                >
                  <PhoneCall size={16} />
                  <span>Start Call</span>
                </button>
              )}
            </div>
          )}

          {isSearching && (
            <div className="black-screen-center-box">
              <div className="cyber-radar-container">
                <div className="radar-ring radar-ring-1" />
                <div className="radar-ring radar-ring-2" />
                <div className="radar-ring radar-ring-3" />
                <div className="radar-core">
                  <Users size={28} className="radar-icon" />
                </div>
              </div>
              <h3 className="standby-title">Finding someone to chat with...</h3>
              <p className="standby-subtitle">
                {waitingSeconds > 0
                  ? `Searching queue (${waitingSeconds}s elapsed)...`
                  : 'Scanning active video rooms worldwide...'}
              </p>
            </div>
          )}

          {isConnecting && (
            <div className="black-screen-center-box">
              <div className="standby-avatar-glow connecting-glow">
                <RefreshCw size={36} className="spin-fast text-cyan" />
              </div>
              <h3 className="standby-title">Stranger Found!</h3>
              <p className="standby-subtitle">Establishing encrypted WebRTC connection...</p>
            </div>
          )}

          {isReconnecting && (
            <div className="black-screen-center-box">
              <div className="standby-avatar-glow reconnecting-glow">
                <Loader2 size={36} className="spin-fast text-amber" />
              </div>
              <h3 className="standby-title">Reconnecting Stream...</h3>
              <p className="standby-subtitle">Attempting ICE restart recovery...</p>
            </div>
          )}

          {isDisconnected && (
            <div className="black-screen-center-box">
              <div className="standby-avatar-glow disconnected-glow">
                <AlertCircle size={36} className="text-rose" />
              </div>
              <h3 className="standby-title">Stranger Disconnected</h3>
              <p className="standby-subtitle">
                Stranger has left the room. Click <strong>"Start Call"</strong> or <strong>"Next"</strong> to connect with someone else!
              </p>
              {onStartCall && (
                <button
                  type="button"
                  onClick={onStartCall}
                  className="start-call-action-btn"
                >
                  <PhoneCall size={16} />
                  <span>Find Next Stranger</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Top Left Status Badge: 🟢 Stranger / ⚪ Standby */}
      <div className="feed-badge-top-left">
        <span
          className={`status-pill ${
            isConnected
              ? 'status-pill-active'
              : isSearching
              ? 'status-pill-searching'
              : 'status-pill-idle'
          }`}
        >
          <span
            className={`status-dot ${
              isConnected
                ? 'green-dot pulsing-dot'
                : isSearching
                ? 'amber-dot pulsing-dot'
                : 'gray-dot'
            }`}
          />
          <span className="status-text">
            {isConnected ? 'Stranger' : isSearching ? 'Searching...' : 'Stranger (Idle)'}
          </span>
        </span>
      </div>

      {/* Top Right Country Badge: (Only visible when connected) */}
      {isConnected && (
        <div className="feed-badge-top-right">
          <span className="country-badge-pill">
            <span className="flag-icon">{countryFlag}</span>
            <span className="country-name">{countryName}</span>
          </span>
        </div>
      )}

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
