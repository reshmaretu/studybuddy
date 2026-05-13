import * as Y from 'yjs';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const UPDATE_EVENT = 'yjs-update';
const ORIGIN_TAG = 'supabase';

const encodeUpdate = (update: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < update.length; i++) {
    binary += String.fromCharCode(update[i]);
  }
  return btoa(binary);
};

const decodeUpdate = (encoded: string) => {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export class SupabaseYjsProvider {
  private channel: RealtimeChannel;
  private ydoc: Y.Doc;
  private roomId: string;
  private onStatus?: (status: string) => void;
  private isSubscribed = false;
  private pendingUpdates: Uint8Array[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private updateListeners: Array<{ type: string; callback: (...args: any[]) => void }> = [];
  private updateCount = 0;
  private batchSize = 50;
  private retryCount = 0;
  private retryTimer: NodeJS.Timeout | null = null;
  private updateListenerAttached = false;

  constructor(roomId: string, ydoc: Y.Doc, onStatus?: (status: string) => void) {
    this.roomId = roomId;
    this.ydoc = ydoc;
    this.onStatus = onStatus;
    this.channel = this.createChannel();
  }

  connect() {
    console.log(`🔗 Connecting to canvas room: ${this.roomId}`);
    this.subscribeChannel();

    if (!this.updateListenerAttached) {
      const boundHandleUpdate = this.handleUpdate.bind(this);
      this.updateListeners.push({ type: 'update', callback: boundHandleUpdate });
      this.ydoc.on('update', boundHandleUpdate);
      this.updateListenerAttached = true;
    }
  }

  destroy() {
    this.updateListeners.forEach(({ type, callback }) => {
      if (type === 'update') {
        this.ydoc.off('update', callback);
      }
    });
    this.updateListeners = [];
    
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    
    this.pendingUpdates = [];
    supabase.removeChannel(this.channel);
    console.log(`✓ Destroyed provider for room: ${this.roomId}`);
  }

  private createChannel() {
    return supabase.channel(`canvas:${this.roomId}`, {
      config: {
        broadcast: { self: false },
      },
    });
  }

  private subscribeChannel() {
    this.channel
      .on('broadcast', { event: UPDATE_EVENT }, ({ payload }) => {
        const encoded = payload?.update;
        if (!encoded) return;
        try {
          const update = decodeUpdate(encoded);
          Y.applyUpdate(this.ydoc, update, ORIGIN_TAG);
        } catch (err) {
          console.error('❌ Failed to decode/apply update:', err);
        }
      })
      .subscribe((status) => {
        console.log(`📡 Channel status: ${status}`);
        this.onStatus?.(status);
        if (status === 'SUBSCRIBED') {
          this.isSubscribed = true;
          this.retryCount = 0;
          this.flushPending();
          return;
        }

        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          this.isSubscribed = false;
          this.scheduleReconnect(status);
        }
      });
  }

  private scheduleReconnect(status: string) {
    if (this.retryTimer) return;
    const delay = Math.min(15000, 1000 * Math.pow(2, this.retryCount));
    this.retryCount += 1;
    console.warn(`⚠️ Channel ${status}. Reconnecting in ${delay}ms...`);

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      supabase.removeChannel(this.channel);
      this.channel = this.createChannel();
      this.subscribeChannel();
    }, delay) as unknown as NodeJS.Timeout;
  }

  private handleUpdate(update: Uint8Array, origin: unknown) {
    if (origin === ORIGIN_TAG) return;
    
    this.updateCount++;
    this.pendingUpdates.push(update);
    
    if (!this.isSubscribed) {
      return;
    }
    
    if (this.pendingUpdates.length >= this.batchSize) {
      this.flushPending();
      return;
    }
    
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => this.flushPending(), 16) as unknown as NodeJS.Timeout;
  }

  private flushPending() {
    if (!this.isSubscribed) {
      return;
    }
    if (this.pendingUpdates.length === 0) return;
    
    try {
      const merged = Y.mergeUpdates(this.pendingUpdates);
      this.pendingUpdates = [];
      
      if (this.flushTimer !== null) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }
      
      const encoded = encodeUpdate(merged);
      const size = encoded.length;
      console.log(`📤 Canvas update sent: ${size} bytes (batch ${this.updateCount})`);
      
      this.channel.send({
        type: 'broadcast',
        event: UPDATE_EVENT,
        payload: { update: encoded },
      }).catch((err) => {
        console.error('❌ Failed to send canvas update:', err);
      });
    } catch (err) {
      console.error('❌ Error flushing canvas updates:', err);
      this.pendingUpdates = [];
    }
  }
}
