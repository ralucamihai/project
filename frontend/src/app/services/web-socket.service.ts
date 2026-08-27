import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: WebSocket | null = null;
  private messageSubject = new Subject<string>();

  public messages$ = this.messageSubject.asObservable();

  connect() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
      this.socket = new WebSocket(protocol + window.location.host + '/api/ws');

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.socket?.send('Hello, server!');
      };

      this.socket.onmessage = (event) => {
        const data = event.data;
        this.messageSubject.next(data);
      };

      this.socket.onclose = () => {
        console.log('WebSocket closed');
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
