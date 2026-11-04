import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Video, 
  MessageSquare,
  Users,
  Info, 
  X, 
  ShieldAlert, 
  AlertTriangle,
  Sun,
  Moon,
  User,
  Settings,
  ShieldCheck,
  Shield,
  LogOut
} from 'lucide-react';
import CallManager from '../services/webrtc/callManager';
import matchmakingClient from '../services/matchmaking/matchmakingClient';
import FrontendStateMachine, { VideoChatState } from '../services/state/frontendStateMachine';
import LocalVideo from '../components/video-chat/LocalVideo';
import RemoteVideo from '../components/video-chat/RemoteVideo';
import CallControls from '../components/video-chat/CallControls';
import ChatPanel, { ChatMessage } from '../components/video-chat/ChatPanel';
import AdPlacement from '../components/video-chat/AdPlacement';
import GoogleAuthModal from '../components/GoogleAuthModal';
import AuthScreen from '../components/AuthScreen';
import Button from '../components/Button';
import '../styles/chat.css';

interface NoticeState {
  type: 'success' | 'error' | 'neutral';
  message: string;
}

interface MatchData {
  matchId: string;
  role: 'initiator' | 'receiver';
  participantId: string;
  participantToken: string;
  channel?: string;
}

export interface CurrentUser {
  name: string;
  email?: string;
  picture?: string;
  isGuest?: boolean;
}

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    try {
      const stored = localStorage.getItem('omaglee_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Idle state initially: User sees their own face on Card 1, Card 2 is sleek black screen
  const [callState, setCallState] = useState<VideoChatState>('IDLE');
  const stateMachineRef = useRef<FrontendStateMachine>(new FrontendStateMachine('IDLE'));

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [signalingStatus, setSignalingStatus] = useState<string>('disconnected');
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [showGoogleAuth, setShowGoogleAuth] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [waitingSeconds, setWaitingSeconds] = useState<number>(0);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [onlineCount, setOnlineCount] = useState<number>(10248);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Route & Metrics
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);
  const [routeType, setRouteType] = useState<'direct_p2p' | 'turn_relay' | 'unknown'>('unknown');

  // Ephemeral stranger text chat messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState<boolean>(false);

  // Moderation & Report Submission State
  const [reportReason, setReportReason] = useState<string>('nudity_inappropriate');
  const [reportDescription, setReportDescription] = useState<string>('');
  const [reportSubmitting, setReportSubmitting] = useState<boolean>(false);

  const activeMatchRef = useRef<MatchData | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | number | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | number | null>(null);
  const waitingTimerRef = useRef<NodeJS.Timeout | number | null>(null);
  const callManagerRef = useRef<CallManager | null>(null);

  // Synchronize state machine state to component state
  const changeState = useCallback((targetState: VideoChatState, reason?: string) => {
    const sm = stateMachineRef.current;
    if (sm.canTransitionTo(targetState)) {
      sm.transition(targetState);
      setCallState(targetState);
      if (reason) {
        console.log(`[Omaglee State] ${targetState} (${reason})`);
      }
    } else {
      console.warn(`[Omaglee State] Transition rejected: ${sm.getState()} -> ${targetState}`);
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (waitingTimerRef.current) {
      clearInterval(waitingTimerRef.current);
      waitingTimerRef.current = null;
    }
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  // Connect to an established match
  const connectMatchedStranger = useCallback((matchData: MatchData) => {
    stopPolling();
    activeMatchRef.current = matchData;
    changeState('MATCHED', `Pair matched: ${matchData.matchId}`);
    setRouteType('unknown');

    // Reset ephemeral chat history for new stranger
    setMessages([
      {
        id: `sys_${Date.now()}`,
        sender: 'system',
        text: 'Connected with an anonymous stranger. Say hello! 👋',
        timestamp: Date.now(),
      },
    ]);

    if (callManagerRef.current) {
      changeState('CONNECTING');
      callManagerRef.current.connectToMatch(matchData);
    }

    // Start match heartbeat
    stopHeartbeat();
    heartbeatTimerRef.current = setInterval(() => {
      if (activeMatchRef.current && activeMatchRef.current.matchId) {
        matchmakingClient.sendHeartbeat(activeMatchRef.current.matchId);
      }
    }, 10000);
  }, [stopPolling, stopHeartbeat, changeState]);

  // Start polling queue status while waiting for stranger
  const startPollingQueue = useCallback(() => {
    stopPolling();
    setWaitingSeconds(0);

    waitingTimerRef.current = setInterval(() => {
      setWaitingSeconds(prev => prev + 1);
    }, 1000);

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await matchmakingClient.pollStatus();

        if (res.status === 'matched' && res.matchId && res.role) {
          stopPolling();
          connectMatchedStranger({
            matchId: res.matchId,
            role: res.role,
            participantId: res.participantId || '',
            participantToken: res.participantToken || '',
            channel: res.channel,
          });
        } else if (res.status === 'idle') {
          stopPolling();
          changeState('IDLE');
        }
      } catch (err) {
        console.warn('[Omaglee] Queue poll error:', err);
      }
    }, 1500);
  }, [stopPolling, connectMatchedStranger, changeState]);

  // Online count random fluctuation for lively UI
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount(prev => prev + (Math.floor(Math.random() * 5) - 2));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Request local camera and microphone stream so user immediately sees their own face
  const startLocalPreview = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (callManagerRef.current) {
          callManagerRef.current.mediaManager.localStream = stream;
        }
      }
    } catch (err) {
      console.warn('[Omaglee] Local camera access error:', err);
      setNotice({
        type: 'neutral',
        message: 'Camera permission required to see your video. Click "Allow Camera & Mic" to enable.',
      });
    }
  }, []);

  // Initialize CallManager once user is authenticated
  useEffect(() => {
    if (!currentUser) return;

    const cm = new CallManager({
      onLocalStream: (stream) => {
        setLocalStream(stream);
      },
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
        changeState('CONNECTED', 'Remote media stream received');
        setIsActionLoading(false);
      },
      onSignalingStatus: (status) => {
        setSignalingStatus(status);
      },
      onRouteType: (route) => {
        setRouteType(route);
      },
      onChatMessage: (payload: unknown) => {
        const p = payload as { text?: string; timestamp?: number } | string;
        const msgText = typeof p === 'string' ? p : (p?.text || '');
        setMessages(prev => [
          ...prev,
          {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            sender: 'stranger',
            text: msgText,
            timestamp: typeof p === 'object' && p?.timestamp ? p.timestamp : Date.now(),
          },
        ]);
      },
      onStrangerDisconnected: () => {
        stopHeartbeat();
        setRemoteStream(null);
        activeMatchRef.current = null;
        stateMachineRef.current.forceState('IDLE');
        setCallState('IDLE');
        setNotice({
          type: 'neutral',
          message: 'The stranger disconnected or stopped the call. Both calls ended.',
        });
      },
      onError: (err) => {
        console.error('[Omaglee CallManager Error]:', err);
        setIsActionLoading(false);
        setNotice({
          type: 'error',
          message: err.message || 'Media or connection error encountered.',
        });
      },
    });

    callManagerRef.current = cm;

    // Start local camera stream only after user is authenticated
    startLocalPreview();

    return () => {
      stopPolling();
      stopHeartbeat();
      cm.destroy();
      callManagerRef.current = null;
    };
  }, [currentUser, changeState, stopPolling, stopHeartbeat, startLocalPreview]);

  // Handler: Logout & return to Auth screen
  const handleLogout = useCallback(() => {
    if (callManagerRef.current) {
      callManagerRef.current.endCall();
      callManagerRef.current.destroy();
      callManagerRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    stopPolling();
    stopHeartbeat();
    localStorage.removeItem('omaglee_user');
    localStorage.removeItem('omaglee_session_uuid');
    localStorage.removeItem('omaglee_session_token');
    stateMachineRef.current.forceState('IDLE');
    setCallState('IDLE');
    setCurrentUser(null);
    setNotice({ type: 'neutral', message: 'You have logged out successfully.' });
  }, [localStream, stopPolling, stopHeartbeat]);

  // Handler: Start Chatting (Initial search)
  const handleStartChatting = async () => {
    if (!stateMachineRef.current.acquireLock('start_chatting', 1000)) return;
    setIsActionLoading(true);
    setNotice(null);

    try {
      changeState('REQUESTING_MEDIA');

      if (!localStream && callManagerRef.current) {
        await callManagerRef.current.startLocalStream();
      }

      changeState('SEARCHING');
      const res = await matchmakingClient.joinQueue();

      if (res.status === 'matched' && res.matchId && res.role) {
        connectMatchedStranger({
          matchId: res.matchId,
          role: res.role,
          participantId: res.participantId || '',
          participantToken: res.participantToken || '',
          channel: res.channel,
        });
      } else {
        startPollingQueue();
      }
    } catch (err: unknown) {
      changeState('IDLE');
      setIsActionLoading(false);
      const e = err as Error;
      setNotice({
        type: 'error',
        message: e?.message || 'Unable to access camera/mic or connect to matchmaking service.',
      });
    }
  };

  // Handler: Next Stranger
  const handleNext = useCallback(async () => {
    if (!stateMachineRef.current.acquireLock('next_stranger', 800)) return;
    setIsActionLoading(true);
    setRemoteStream(null);
    stopPolling();
    stopHeartbeat();

    try {
      if (activeMatchRef.current && activeMatchRef.current.matchId) {
        await matchmakingClient.leaveMatch(activeMatchRef.current.matchId);
      }
      activeMatchRef.current = null;

      if (callManagerRef.current) {
        callManagerRef.current.endCall();
      }

      changeState('SEARCHING', 'Searching next stranger');
      const res = await matchmakingClient.joinQueue();

      if (res.status === 'matched' && res.matchId && res.role) {
        connectMatchedStranger({
          matchId: res.matchId,
          role: res.role,
          participantId: res.participantId || '',
          participantToken: res.participantToken || '',
          channel: res.channel,
        });
      } else {
        startPollingQueue();
      }
    } catch {
      changeState('IDLE');
      setIsActionLoading(false);
      setNotice({
        type: 'error',
        message: 'Could not connect to next stranger. Please try again.',
      });
    }
  }, [changeState, stopPolling, stopHeartbeat, connectMatchedStranger, startPollingQueue]);

  // Handler: Stop Call / Cancel Queue
  // Neither participant enters queue when Stop is clicked
  const handleDisconnect = async () => {
    if (!stateMachineRef.current.acquireLock('disconnect', 1000)) return;
    setIsActionLoading(true);
    stopPolling();
    stopHeartbeat();

    // Cancel queue search in backend if in progress
    try {
      await matchmakingClient.cancelMatchmaking();
    } catch (e) {
      console.warn(e);
    }

    try {
      if (activeMatchRef.current && activeMatchRef.current.matchId) {
        await matchmakingClient.leaveMatch(activeMatchRef.current.matchId);
      }
    } catch (err) {
      console.warn('[Omaglee] Disconnect match failed:', err);
    }

    if (callManagerRef.current) {
      callManagerRef.current.endCall();
    }
    // Clear stranger stream so stranger card returns to pure black screen
    setRemoteStream(null);
    activeMatchRef.current = null;
    stateMachineRef.current.forceState('IDLE');
    setCallState('IDLE');
    setRouteType('unknown');
    setIsActionLoading(false);
    setNotice({ type: 'neutral', message: 'Call stopped. Both users in idle standby.' });
  };

  // Media Controls
  const handleToggleAudio = () => {
    if (callManagerRef.current) {
      const next = !isAudioMuted;
      callManagerRef.current.setAudioEnabled(!next);
      setIsAudioMuted(next);
    }
  };

  const handleToggleVideo = () => {
    if (callManagerRef.current) {
      const next = !isVideoMuted;
      callManagerRef.current.setVideoEnabled(!next);
      setIsVideoMuted(next);
    }
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      try {
        if (callManagerRef.current) {
          const camStream = await callManagerRef.current.startLocalStream();
          setLocalStream(camStream);
        }
        setIsScreenSharing(false);
        setNotice({ type: 'neutral', message: 'Switched back to camera feed.' });
      } catch (e) {
        console.error(e);
      }
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          setLocalStream(displayStream);
          setIsScreenSharing(true);
          displayStream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
          };
          setNotice({ type: 'neutral', message: 'Screen sharing active.' });
        } else {
          setNotice({ type: 'error', message: 'Screen sharing is not supported by your browser.' });
        }
      } catch {
        // user cancelled
      }
    }
  };

  const handleTogglePrivacyMode = useCallback(() => {
    setPrivacyMode((prev) => {
      const next = !prev;
      if (callManagerRef.current) {
        callManagerRef.current.setPrivacyMode(next);
      }
      setNotice({
        type: 'neutral',
        message: next
          ? 'Relay-Only Privacy Mode enabled. Direct IP discovery is blocked via TURN relay.'
          : 'Privacy Mode disabled. Standard direct P2P connectivity restored.',
      });
      return next;
    });
  }, []);

  const handleBlockStranger = async () => {
    const match = activeMatchRef.current;
    const sessionUuid = localStorage.getItem('omaglee_session_uuid');
    const sessionToken = localStorage.getItem('omaglee_session_token');

    if (!sessionUuid || !sessionToken || !match?.matchId) {
      setNotice({ type: 'error', message: 'No active match to block.' });
      return;
    }

    const apiUrl = (import.meta.env.VITE_BACKEND_API_URL as string) || 'http://127.0.0.1:8000/api';

    try {
      const res = await fetch(`${apiUrl}/blocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-UUID': sessionUuid,
          'X-Session-Token': sessionToken,
        },
        body: JSON.stringify({
          matchId: match.matchId,
          reason: 'User blocked by participant',
        }),
      });

      if (res.ok) {
        setNotice({
          type: 'neutral',
          message: 'Stranger blocked. You will never be matched with this participant again.',
        });
        handleNext();
      } else {
        const data = await res.json().catch(() => ({}));
        setNotice({
          type: 'error',
          message: data.message || 'Could not block stranger.',
        });
      }
    } catch {
      setNotice({ type: 'error', message: 'Failed to block stranger. Please try again.' });
    }
  };

  const handleSubmitReport = async () => {
    const match = activeMatchRef.current;
    const sessionUuid = localStorage.getItem('omaglee_session_uuid');
    const sessionToken = localStorage.getItem('omaglee_session_token');

    if (!sessionUuid || !sessionToken) {
      setNotice({ type: 'error', message: 'No active session found to submit report.' });
      return;
    }

    setReportSubmitting(true);
    const apiUrl = (import.meta.env.VITE_BACKEND_API_URL as string) || 'http://127.0.0.1:8000/api';

    try {
      const res = await fetch(`${apiUrl}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-UUID': sessionUuid,
          'X-Session-Token': sessionToken,
        },
        body: JSON.stringify({
          matchId: match?.matchId || null,
          reason: reportReason,
          description: reportDescription || 'Reported via Safety Modal',
        }),
      });

      if (res.ok) {
        setShowReportModal(false);
        setReportDescription('');
        setNotice({
          type: 'success',
          message: 'Report received. Our moderation team has been notified.',
        });
        handleNext();
      } else {
        const data = await res.json().catch(() => ({}));
        setNotice({
          type: 'error',
          message: data.message || 'Failed to submit report. Please try again.',
        });
      }
    } catch {
      setNotice({ type: 'error', message: 'Failed to submit report. Please try again.' });
    } finally {
      setReportSubmitting(false);
    }
  };

  // Handler: Send Chat Message
  const handleSendMessage = async (text: string) => {
    if (!callManagerRef.current || callState !== 'CONNECTED') return;

    const newMsg: ChatMessage = {
      id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'local',
      text,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, newMsg]);

    try {
      await callManagerRef.current.sendChatMessage(text);
    } catch (err) {
      console.error('[Omaglee] Message dispatch failed:', err);
    }
  };

  if (!currentUser) {
    return (
      <AuthScreen
        onSuccess={(user) => {
          setCurrentUser(user);
        }}
        onlineCount={onlineCount}
      />
    );
  }

  return (
    <div className={`cyber-app-shell theme-${theme}`}>
      {/* 1. Top Navbar matching screenshot */}
      <header className="cyber-navbar">
        <div className="nav-left">
          {/* Brand Logo with gradient icon */}
          <Link to="/" className="brand-logo-wrap">
            <div className="brand-logo-icon">
              <Video size={18} />
            </div>
            <span className="brand-title">Omaglee</span>
          </Link>

          {/* Navigation Category Pills */}
          <nav className="nav-pills-row" aria-label="Main Navigation">
            <button type="button" className="nav-pill active-pill">
              <Video size={15} />
              <span>Video Chat</span>
            </button>
            <button
              type="button"
              className="nav-pill"
              onClick={() => setIsMobileChatOpen(prev => !prev)}
            >
              <MessageSquare size={15} />
              <span>Text Chat</span>
            </button>
            <button
              type="button"
              className="nav-pill"
              onClick={() => setNotice({ type: 'neutral', message: 'Group rooms are coming in the next release!' })}
            >
              <Users size={15} />
              <span>Groups</span>
            </button>
            <button
              type="button"
              className="nav-pill"
              onClick={() => setShowInfoModal(true)}
            >
              <Info size={15} />
              <span>About</span>
            </button>
          </nav>
        </div>

        <div className="nav-right">
          {/* Live Online Users Badge */}
          <div className="live-online-pill">
            <span className="status-dot green-dot pulsing-dot" />
            <span className="online-count-text">{onlineCount.toLocaleString()} Online</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            className="nav-icon-circle-btn"
            onClick={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* User Profile Info Pill */}
          {currentUser && (
            <div className="nav-user-pill">
              {currentUser.picture ? (
                <img src={currentUser.picture} alt={currentUser.name} className="nav-user-avatar" />
              ) : (
                <div className="nav-user-avatar-placeholder">
                  {(currentUser.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="nav-user-name">{currentUser.name}</span>
            </div>
          )}

          {/* User Profile & Settings Modal Button */}
          <button
            type="button"
            className="nav-icon-circle-btn profile-btn"
            onClick={() => setShowSettingsModal(true)}
            title="Call & Privacy Settings"
            aria-label="Settings"
          >
            <Settings size={16} />
          </button>

          {/* Logout Button */}
          <button
            type="button"
            className="nav-logout-btn"
            onClick={handleLogout}
            title="Log out"
            aria-label="Log out"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Notice Banner */}
      {notice && (
        <div className={`cyber-notice-toast ${notice.type}`} role="alert">
          <div className="notice-inner">
            <Info size={16} className="notice-icon" />
            <p className="notice-text">{notice.message}</p>
            <button 
              type="button" 
              className="notice-close" 
              onClick={() => setNotice(null)}
              aria-label="Dismiss notice"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Workspace Grid */}
      <main className="cyber-main-grid">
        {/* Top/Middle Row: 3 Panels (You Video + Stranger Video + Chat Panel) */}
        <div className="video-and-chat-row">
          {/* Card 1: Local Video (You) - Displays your actual live face */}
          <LocalVideo
            stream={localStream}
            isVideoMuted={isVideoMuted}
            isAudioMuted={isAudioMuted}
            onToggleAudio={handleToggleAudio}
            onToggleVideo={handleToggleVideo}
            onRequestPermissions={startLocalPreview}
          />

          {/* Card 2: Remote Video (Stranger) - Pure black screen until Start Call */}
          <RemoteVideo
            stream={remoteStream}
            callState={callState}
            waitingSeconds={waitingSeconds}
            countryName="India"
            countryFlag="🇮🇳"
            onStartCall={handleStartChatting}
          />

          {/* Card 3: Chat Panel */}
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            callState={callState}
            isMobileOpen={isMobileChatOpen}
            onCloseMobile={() => setIsMobileChatOpen(false)}
          />
        </div>

        {/* Bottom Row: Controls Dock on Left/Center + Ad Card on Right */}
        <div className="bottom-dock-and-ad-row">
          <CallControls
            callState={callState}
            isAudioMuted={isAudioMuted}
            isVideoMuted={isVideoMuted}
            isScreenSharing={isScreenSharing}
            onToggleAudio={handleToggleAudio}
            onToggleVideo={handleToggleVideo}
            onToggleScreenShare={handleToggleScreenShare}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenInfo={() => setShowInfoModal(true)}
            onOpenReport={() => setShowReportModal(true)}
            onStartChatting={handleStartChatting}
            onNext={handleNext}
            onDisconnect={handleDisconnect}
            waitingSeconds={waitingSeconds}
            isActionLoading={isActionLoading}
          />

          <AdPlacement />
        </div>
      </main>

      {/* Safety & Report Modal */}
      {showReportModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowReportModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <ShieldAlert size={20} className="modal-icon text-amber" />
                <h3>Safety & Reporting</h3>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setShowReportModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p>
                <strong>Zero Tolerance for Violations:</strong> Inappropriate, abusive, or non-consensual conduct is strictly prohibited. Reported users are reviewed and permanently banned.
              </p>

              <div className="report-abuse-section">
                <label htmlFor="report-reason-select" className="report-label">Reason for reporting:</label>
                <select
                  id="report-reason-select"
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  className="report-select-input"
                >
                  <option value="nudity_inappropriate">Inappropriate / Nudity</option>
                  <option value="harassment">Harassment / Bullying</option>
                  <option value="hate_speech">Hate Speech / Violence</option>
                  <option value="spam_bot">Spam / Bot Account</option>
                  <option value="underage">Underage User</option>
                  <option value="other">Other Violation</option>
                </select>

                <label htmlFor="report-desc-input" className="report-label" style={{ marginTop: '0.75rem' }}>
                  Details (optional):
                </label>
                <textarea
                  id="report-desc-input"
                  value={reportDescription}
                  onChange={e => setReportDescription(e.target.value)}
                  placeholder="Provide additional details for the moderation team..."
                  className="report-text-input"
                  rows={2}
                />
              </div>
            </div>

            <div className="modal-footer">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setShowReportModal(false);
                  handleBlockStranger();
                }}
                disabled={callState !== 'CONNECTED'}
              >
                Block Stranger
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleSubmitReport}
                disabled={reportSubmitting || callState !== 'CONNECTED'}
              >
                {reportSubmitting ? 'Reporting...' : 'Report & Next'}
              </Button>
              <Button variant="secondary" size="md" onClick={() => setShowReportModal(false)}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowSettingsModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <Settings size={20} className="modal-icon text-cyan" />
                <h3>Call & Privacy Settings</h3>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setShowSettingsModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="settings-toggle-row">
                <div className="settings-text-col">
                  <strong>Relay-Only Privacy Mode</strong>
                  <p>Hide your direct IP address from strangers by forcing all media strictly through our secure encrypted TURN relay.</p>
                </div>
                <button
                  type="button"
                  onClick={handleTogglePrivacyMode}
                  className={`settings-toggle-switch ${privacyMode ? 'active' : ''}`}
                >
                  {privacyMode ? <ShieldCheck size={18} /> : <Shield size={18} />}
                  <span>{privacyMode ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              <div className="settings-toggle-row" style={{ marginTop: '1rem' }}>
                <div className="settings-text-col">
                  <strong>Signaling Status</strong>
                  <p>Current WebSocket connection state: <span className="status-code">{signalingStatus}</span></p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <Button variant="primary" size="md" onClick={() => setShowSettingsModal(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Info / About Modal */}
      {showInfoModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowInfoModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <Info size={20} className="modal-icon text-emerald" />
                <h3>About Omaglee</h3>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setShowInfoModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p>
                <strong>Omaglee</strong> connects people worldwide in instantaneous, encrypted peer-to-peer random video conversations.
              </p>
              <div className="modal-callout age-policy-callout" style={{ marginTop: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                <ShieldCheck size={18} className="text-emerald" />
                <span>
                  <strong>Private & Anonymous:</strong> We do not log video calls or store raw chat recordings. All calls are ephemeral.
                </span>
              </div>
              <div className="modal-callout" style={{ marginTop: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                <AlertTriangle size={18} className="text-rose" />
                <span>
                  <strong>18+ Strictly Enforced:</strong> You must be at least 18 years old to use Omaglee. Any violation will result in an immediate permanent ban.
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <Button variant="primary" size="md" onClick={() => setShowInfoModal(false)}>
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Google Authentication Modal */}
      <GoogleAuthModal
        isOpen={showGoogleAuth}
        onClose={() => setShowGoogleAuth(false)}
        onSuccess={() => {
          setShowGoogleAuth(false);
          startLocalPreview();
        }}
      />
    </div>
  );
}
