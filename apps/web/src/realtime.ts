import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';
import type { ConsultationDetail, ConsultationMessage } from './types';

interface Handlers {
  onMessage?: (message: ConsultationMessage) => void;
  onStatus?: (consultation: ConsultationDetail) => void;
}

export function useConsultationSocket(consultationId: string | undefined, handlers: Handlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!consultationId) return;
    const socket: Socket = io('/consultations', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token: getAccessToken() ?? '' },
    });
    socket.on('connect', () => socket.emit('join', { consultationId }));
    socket.on('message:new', (message: ConsultationMessage) =>
      handlersRef.current.onMessage?.(message),
    );
    socket.on('status:changed', (consultation: ConsultationDetail) =>
      handlersRef.current.onStatus?.(consultation),
    );
    return () => {
      socket.disconnect();
    };
  }, [consultationId]);
}