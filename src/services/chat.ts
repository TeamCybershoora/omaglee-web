/**
 * Chat Service - Ephemeral In-Call Text Chatting
 */

import { AppState, DOMElements } from '../types';
import { sendSignalingMessage } from './webrtc';

export function clearChatMessages(el: DOMElements): void {
  if (el.chatMessages) el.chatMessages.innerHTML = '';
}

export function appendChatMessage(el: DOMElements, sender: string, text: string): void {
  if (!el.chatMessages) return;

  const row = document.createElement('div');
  row.className = `chat-bubble-row ${sender}-bubble-row`;

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble chat-bubble-${sender}`;
  bubble.textContent = text;

  row.appendChild(bubble);
  el.chatMessages.appendChild(row);
  el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
}

export function handleSendChatMessage(state: AppState, el: DOMElements, e?: Event): void {
  if (e) e.preventDefault();
  if (!el.chatInput) return;

  const text = el.chatInput.value.trim();
  if (!text) return;

  appendChatMessage(el, 'local', text);
  el.chatInput.value = '';

  if (state.dataChannel && state.dataChannel.readyState === 'open') {
    state.dataChannel.send(JSON.stringify({ text, timestamp: Date.now() }));
  } else {
    sendSignalingMessage(state, 'chat', { text, timestamp: Date.now() });
  }
}
