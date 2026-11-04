import { ShieldCheck, Wifi, Activity } from 'lucide-react';
import { VideoChatState } from '../../services/state/frontendStateMachine';

export interface ConnectionStatusProps {
  state: VideoChatState | string;
  signalingStatus?: string;
  routeType?: 'direct_p2p' | 'turn_relay' | 'unknown';
  rttMs?: number | null;
  bitrateInKbps?: number | null;
  bitrateOutKbps?: number | null;
  privacyMode?: boolean;
}

export default function ConnectionStatus({
  state,
  signalingStatus,
  routeType = 'unknown',
  rttMs = null,
  bitrateInKbps = 0,
  privacyMode = false,
}: ConnectionStatusProps) {
  const getBadge = () => {
    switch (state) {
      case 'IDLE':
      case 'idle':
        return { label: 'Idle', color: 'idle' };
      case 'REQUESTING_MEDIA':
      case 'requesting_media':
        return { label: 'Checking Camera', color: 'warning' };
      case 'SEARCHING':
      case 'searching':
      case 'waiting_peer':
        return { label: 'Searching Queue', color: 'warning' };
      case 'MATCHED':
      case 'matched':
      case 'joining_room':
        return { label: 'Stranger Found', color: 'warning' };
      case 'CONNECTING':
      case 'negotiating':
        return { label: 'Negotiating WebRTC', color: 'warning' };
      case 'CONNECTED':
      case 'connected':
        return { label: 'Connected', color: 'success' };
      case 'RECONNECTING':
      case 'reconnecting':
        return { label: 'Reconnecting (ICE)', color: 'warning' };
      case 'CONNECTION_FAILED':
      case 'failed':
        return { label: 'Connection Failed', color: 'danger' };
      case 'STOPPING':
      case 'stopping':
        return { label: 'Stopping', color: 'idle' };
      case 'stranger_left':
        return { label: 'Stranger Left', color: 'warning' };
      case 'DISCONNECTED':
      case 'disconnected':
        return { label: 'Disconnected', color: 'danger' };
      case 'ERROR':
      case 'error':
        return { label: 'Error', color: 'danger' };
      default:
        return { label: 'Standby', color: 'idle' };
    }
  };

  const getSignalingPill = () => {
    if (!signalingStatus || signalingStatus === 'disconnected' || state === 'IDLE' || state === 'idle') {
      return null;
    }
    if (signalingStatus === 'connected') {
      return <span className="signaling-tag reverb">Reverb WS</span>;
    }
    if (signalingStatus === 'fallback') {
      return <span className="signaling-tag fallback">Sync HTTP</span>;
    }
    if (signalingStatus === 'reconnecting') {
      return <span className="signaling-tag reconnecting">WS Reconnecting</span>;
    }
    return <span className="signaling-tag connecting">Connecting</span>;
  };

  const badge = getBadge();
  const isConnected = state === 'CONNECTED' || state === 'connected';

  return (
    <div className="status-container-row" role="status" aria-label="Connection Status">
      {getSignalingPill()}

      {/* WebRTC Route Badge */}
      {isConnected && routeType === 'direct_p2p' && (
        <span className="route-tag direct" title="Direct Peer-to-Peer Media Route">
          <Wifi size={12} className="tag-icon" />
          Direct P2P
        </span>
      )}

      {isConnected && routeType === 'turn_relay' && (
        <span className="route-tag relay" title="TURN Media Relay Fallback Active">
          <Activity size={12} className="tag-icon" />
          TURN Relay
        </span>
      )}

      {/* Privacy Mode Badge */}
      {privacyMode && (
        <span className="route-tag privacy" title="Privacy Mode Active: Direct IP exchange disabled">
          <ShieldCheck size={12} className="tag-icon" />
          Relay Only
        </span>
      )}

      {/* Latency & Bandwidth Metrics */}
      {isConnected && rttMs !== null && (
        <div className="metrics-pill" title={`Latency: ${rttMs}ms | Downlink: ${bitrateInKbps} kbps`}>
          <span className="metric-item">{rttMs}ms</span>
          <span className="metric-divider">/</span>
          <span className="metric-item">{bitrateInKbps} kbps</span>
        </div>
      )}

      {/* Primary Connection Pill */}
      <div className="connection-status-pill">
        <span className={`status-orb ${badge.color}`} />
        <span className="status-label">{badge.label}</span>
      </div>
    </div>
  );
}
