import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface TerminalProps {
  appId: string;
  replicaId: string; // Since we're in Phase 2, passing replica is best. Otherwise we'll just mock for now.
}

export const WebShell: React.FC<TerminalProps> = ({ appId, replicaId }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    term.current = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#121214',
      },
    });

    const fitAddon = new FitAddon();
    term.current.loadAddon(fitAddon);
    term.current.open(terminalRef.current);
    fitAddon.fit();

    // Connect to websocket gateway - we might fetch a real token here via our control-plane.
    // Here we'll mock the token issuance by signing a mock JWT or assuming a mock for local dev
    // In real life: GET /v1/shell-token(app=appId...)->token
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // For local dev, hardcoded port
    const gatewayUrl = `${protocol}//localhost:8083/v1/shell?token=TEST_TOKEN_MOCK`;

    ws.current = new WebSocket(gatewayUrl);

    // Provide warning wrapper for multi-line paste
    term.current.onData((data) => {
      // Very basic paste protection - count newlines
      const newlineCount = (data.match(/\r/g) || []).length;
      if (newlineCount > 2) {
        if (!confirm(`You are pasting ${newlineCount} lines. Do you want to execute?`)) {
          term.current?.write('\r\n[Paste aborted]\r\n');
          return;
        }
      }
      ws.current?.send(data);
    });

    ws.current.onmessage = (event) => {
      if (typeof event.data === 'string') {
        term.current?.write(event.data);
      } else if (event.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            term.current?.write(new Uint8Array(reader.result as ArrayBuffer));
          }
        };
        reader.readAsArrayBuffer(event.data);
      }
    };

    ws.current.onclose = () => {
      term.current?.write('\r\n[Connection closed]\r\n');
    };

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.current?.close();
      term.current?.dispose();
    };
  }, [appId, replicaId]);

  return (
    <div ref={terminalRef} className="w-full h-full min-h-[400px] border rounded overflow-hidden" />
  );
};
