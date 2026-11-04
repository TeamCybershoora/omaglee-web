import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  Settings, 
  PhoneOff, 
  FastForward, 
  Flag, 
  Info,
  Loader2,
  PhoneCall,
  Square
} from 'lucide-react';
import { VideoChatState } from '../../services/state/frontendStateMachine';

export interface CallControlsProps {
  callState: VideoChatState | string;
  isAudioMuted?: boolean;
  isVideoMuted?: boolean;
  isScreenSharing?: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare?: () => void;
  onOpenSettings?: () => void;
  onOpenInfo?: () => void;
  onOpenReport?: () => void;
  onStartChatting: () => void;
  onNext: () => void;
  onDisconnect: () => void;
  waitingSeconds?: number;
  isActionLoading?: boolean;
}

export default function CallControls({
  callState,
  isAudioMuted = false,
  isVideoMuted = false,
  isScreenSharing = false,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onOpenSettings,
  onOpenInfo,
  onOpenReport,
  onStartChatting,
  onNext,
  onDisconnect,
  isActionLoading = false,
}: CallControlsProps) {
  const isIdle = callState === 'IDLE' || callState === 'idle';
  const isSearching =
    callState === 'SEARCHING' || callState === 'searching' || callState === 'waiting_peer';
  const isConnected = callState === 'CONNECTED' || callState === 'connected';

  return (
    <div className="cyber-controls-dock" role="toolbar" aria-label="Call Controls Dock">
      {/* 1. Info Button */}
      <button
        type="button"
        onClick={onOpenInfo}
        className="dock-round-btn"
        title="Chat Guidelines & Safety"
        aria-label="Information"
      >
        <Info size={19} />
      </button>

      <div className="dock-divider" />

      {/* 2. Microphone Toggle */}
      <button
        type="button"
        onClick={onToggleAudio}
        className={`dock-round-btn ${isAudioMuted ? 'btn-active-muted' : ''}`}
        title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        aria-label={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
      >
        {isAudioMuted ? <MicOff size={19} /> : <Mic size={19} />}
      </button>

      {/* 3. Camera Toggle */}
      <button
        type="button"
        onClick={onToggleVideo}
        className={`dock-round-btn ${isVideoMuted ? 'btn-active-muted' : ''}`}
        title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
        aria-label={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
      >
        {isVideoMuted ? <VideoOff size={19} /> : <Video size={19} />}
      </button>

      {/* 4. Screen Share Toggle */}
      <button
        type="button"
        onClick={onToggleScreenShare}
        className={`dock-round-btn ${isScreenSharing ? 'btn-active-screenshare' : ''}`}
        title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
        aria-label="Screen Share"
      >
        <Monitor size={19} />
      </button>

      {/* 5. Settings Gear */}
      <button
        type="button"
        onClick={onOpenSettings}
        className="dock-round-btn"
        title="Audio & Video Settings"
        aria-label="Settings"
      >
        <Settings size={19} />
      </button>

      {/* 6. Stop / End Call Red Button */}
      <button
        type="button"
        onClick={onDisconnect}
        disabled={isIdle && !isSearching}
        className="dock-round-btn btn-end-call"
        title={isSearching ? 'Cancel Queue (Stop)' : 'Stop / End Call (Both users stop)'}
        aria-label="Stop Call"
      >
        {isSearching ? <Square size={17} /> : <PhoneOff size={20} />}
      </button>

      {/* 7. Action Buttons (Start Call & Skip / Next) */}
      <div className="dock-action-buttons-group">
        {/* Option A: Start Call / Stop Search */}
        {isIdle ? (
          <button
            type="button"
            onClick={onStartChatting}
            disabled={isActionLoading}
            className="dock-next-glow-btn start-mode"
            aria-label="Start Call with Stranger"
            title="Start video matchmaking call"
          >
            <div className="next-btn-content">
              <span className="next-main-title">
                <PhoneCall size={16} className="inline-icon" /> Start Call
              </span>
              <span className="next-sub-title">Connect Stranger</span>
            </div>
          </button>
        ) : isSearching ? (
          <button
            type="button"
            onClick={onDisconnect}
            className="dock-next-glow-btn searching-cancel-mode"
            aria-label="Cancel Queue"
            title="Stop searching and cancel queue"
          >
            <div className="next-btn-content">
              <span className="next-main-title">
                <Loader2 size={16} className="spin-fast inline-icon" /> Searching...
              </span>
              <span className="next-sub-title">Click to Stop</span>
            </div>
          </button>
        ) : null}

        {/* Option B: Skip / Next (Always available to enter queue directly) */}
        <button
          type="button"
          onClick={onNext}
          disabled={isActionLoading}
          className={`dock-next-glow-btn skip-mode ${isConnected ? 'primary-skip' : ''}`}
          aria-label="Skip to Next Stranger"
          title="Directly enter queue for next stranger"
        >
          {isActionLoading && !isSearching ? (
            <div className="next-btn-content">
              <span className="next-main-title">
                <Loader2 size={16} className="spin-fast inline-icon" /> Skipping...
              </span>
            </div>
          ) : (
            <div className="next-btn-content">
              <span className="next-main-title">
                Skip / Next <FastForward size={16} className="inline-icon" />
              </span>
              <span className="next-sub-title">Connect Next (Queue)</span>
            </div>
          )}
        </button>
      </div>

      {/* 8. Report Stranger Button */}
      <button
        type="button"
        onClick={onOpenReport}
        disabled={!isConnected}
        className="dock-pill-btn btn-report"
        title="Report Stranger"
        aria-label="Report Active Stranger"
      >
        <Flag size={16} />
        <span>Report</span>
      </button>
    </div>
  );
}
