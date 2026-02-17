import * as crypto from 'crypto';
import * as net from 'net';

const DISCORD_CLIENT_ID = '123456789012345678';

enum OpCode {
  Handshake = 0,
  Frame = 1,
  Close = 2,
  Ping = 3,
  Pong = 4
}

export class DiscordPresenceManager {
  private socket: net.Socket | null = null;
  private enabled = false;
  private connected = false;
  private sessionStartTimestamp: number | null = null;

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;

    if (!enabled) {
      this.disconnect();
      return;
    }

    this.sessionStartTimestamp = this.sessionStartTimestamp ?? Math.floor(Date.now() / 1000);
    await this.ensureConnected();
  }

  async update(tabName: string, encounterTotal: number): Promise<void> {
    if (!this.enabled) {
      return;
    }

    await this.ensureConnected();
    if (!this.connected || !this.socket) {
      return;
    }

    const payload = {
      cmd: 'SET_ACTIVITY',
      nonce: crypto.randomUUID(),
      args: {
        pid: process.pid,
        activity: {
          details: `Shiny Hunting in ${tabName}`,
          state: `${encounterTotal} encounters`,
          timestamps: this.sessionStartTimestamp ? { start: this.sessionStartTimestamp } : undefined
        }
      }
    };

    this.writeFrame(OpCode.Frame, payload);
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async ensureConnected(): Promise<void> {
    if (!this.enabled || this.connected) {
      return;
    }

    const pipePath = process.platform === 'win32' ? '\\\\.\\pipe\\discord-ipc-0' : '/tmp/discord-ipc-0';

    await new Promise<void>((resolve) => {
      const socket = net.createConnection(pipePath, () => {
        this.socket = socket;
        this.connected = true;

        this.writeFrame(OpCode.Handshake, { v: 1, client_id: DISCORD_CLIENT_ID });
        resolve();
      });

      socket.on('error', () => {
        this.connected = false;
        resolve();
      });

      socket.on('close', () => {
        this.connected = false;
        this.socket = null;
      });

      socket.on('data', (chunk) => {
        if (chunk.length < 8) {
          return;
        }

        const opcode = chunk.readInt32LE(0);
        if (opcode === OpCode.Ping) {
          this.writeFrame(OpCode.Pong, {});
        }
      });
    });
  }

  private writeFrame(opCode: OpCode, payload: unknown): void {
    if (!this.socket) {
      return;
    }

    const json = Buffer.from(JSON.stringify(payload), 'utf8');
    const header = Buffer.alloc(8);
    header.writeInt32LE(opCode, 0);
    header.writeInt32LE(json.length, 4);

    this.socket.write(Buffer.concat([header, json]));
  }

  private disconnect(): void {
    if (this.socket) {
      try {
        this.writeFrame(OpCode.Close, {});
      } catch {
        // no-op
      }
      this.socket.destroy();
      this.socket = null;
    }

    this.connected = false;
    this.sessionStartTimestamp = null;
  }
}
