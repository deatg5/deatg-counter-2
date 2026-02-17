import * as net from 'net';
import * as path from 'path';

const DISCORD_APP_ID = '133713371337133713';
const OP_HANDSHAKE = 0;
const OP_FRAME = 1;
const OP_CLOSE = 2;

function encodeFrame(op: number, data: Record<string, unknown>): Buffer {
    const payload = Buffer.from(JSON.stringify(data), 'utf8');
    const header = Buffer.alloc(8);
    header.writeInt32LE(op, 0);
    header.writeInt32LE(payload.length, 4);
    return Buffer.concat([header, payload]);
}

function getIpcPath(index: number): string {
    if (process.platform === 'win32') {
        return `\\\\.\\pipe\\discord-ipc-${index}`;
    }

    const base = process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || '/tmp';
    return path.join(base, `discord-ipc-${index}`);
}

export class DiscordPresenceManager {
    private socket: net.Socket | null = null;
    private enabled = false;
    private connected = false;
    private sessionStartTime: number | null = null;

    isEnabled() {
        return this.enabled;
    }

    isConnected() {
        return this.connected;
    }

    async setEnabled(enabled: boolean): Promise<void> {
        this.enabled = enabled;
        if (!enabled) {
            this.clear();
            this.disconnect();
            return;
        }

        if (!this.socket) {
            await this.connect();
        }

        if (!this.sessionStartTime) {
            this.sessionStartTime = Math.floor(Date.now() / 1000);
        }
    }

    async updateActivity(tabName: string, totalEncounters: number): Promise<void> {
        if (!this.enabled || !this.connected || !this.socket) {
            return;
        }

        const payload = {
            cmd: 'SET_ACTIVITY',
            nonce: `${Date.now()}-${Math.random()}`,
            args: {
                pid: process.pid,
                activity: {
                    state: `${totalEncounters} encounters`,
                    details: `Shiny Hunting in ${tabName}`,
                    timestamps: this.sessionStartTime ? { start: this.sessionStartTime } : undefined,
                    assets: {
                        large_text: 'DEATG Counter'
                    }
                }
            }
        };

        this.socket.write(encodeFrame(OP_FRAME, payload));
    }

    clear() {
        if (!this.connected || !this.socket) {
            return;
        }

        const payload = {
            cmd: 'SET_ACTIVITY',
            nonce: `${Date.now()}-clear`,
            args: {
                pid: process.pid,
                activity: null
            }
        };

        this.socket.write(encodeFrame(OP_FRAME, payload));
        this.sessionStartTime = null;
    }

    disconnect() {
        this.connected = false;
        this.socket?.write(encodeFrame(OP_CLOSE, {}));
        this.socket?.destroy();
        this.socket = null;
    }

    private async connect() {
        for (let i = 0; i < 10; i += 1) {
            const ipcPath = getIpcPath(i);

            try {
                await new Promise<void>((resolve, reject) => {
                    const socket = net.createConnection(ipcPath, () => {
                        this.socket = socket;
                        this.connected = true;

                        socket.on('error', () => {
                            this.connected = false;
                            this.socket = null;
                        });

                        socket.on('close', () => {
                            this.connected = false;
                            this.socket = null;
                        });

                        socket.write(encodeFrame(OP_HANDSHAKE, { v: 1, client_id: DISCORD_APP_ID }));
                        resolve();
                    });

                    socket.once('error', (error) => {
                        socket.destroy();
                        reject(error);
                    });
                });

                return;
            } catch {
                // try next pipe
            }
        }

        this.connected = false;
    }
}
