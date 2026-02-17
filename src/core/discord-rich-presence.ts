import * as net from 'net';

const DISCORD_APP_ID = '1361149287812452392';

enum DiscordOpCode {
    Handshake = 0,
    Frame = 1,
    Close = 2,
    Ping = 3,
    Pong = 4
}

interface PresencePayload {
    tabName: string;
    encounterCount: number;
    startTimestamp: number;
}

export class DiscordRichPresenceManager {
    private socket: net.Socket | null = null;
    private enabled = false;
    private connected = false;
    private sessionStart: number | null = null;
    private statusListener?: (connected: boolean) => void;
    private reconnectTimer: NodeJS.Timeout | null = null;

    onStatusChanged(listener: (connected: boolean) => void) {
        this.statusListener = listener;
    }

    async setEnabled(enabled: boolean) {
        this.enabled = enabled;

        if (!enabled) {
            this.clearReconnect();
            await this.clearActivity();
            this.disconnect();
            this.sessionStart = null;
            this.notifyStatus(false);
            return;
        }

        if (this.sessionStart === null) {
            this.sessionStart = Math.floor(Date.now() / 1000);
        }

        await this.connect();
    }

    async updatePresence(payload: PresencePayload) {
        if (!this.enabled || !this.connected || !this.socket) {
            return;
        }

        const body = {
            cmd: 'SET_ACTIVITY',
            args: {
                pid: process.pid,
                activity: {
                    details: 'Shiny Hunting',
                    state: `${payload.tabName} • ${payload.encounterCount} encounters`,
                    timestamps: {
                        start: payload.startTimestamp
                    }
                }
            },
            nonce: `${Date.now()}`
        };

        this.send(DiscordOpCode.Frame, body);
    }

    private async clearActivity() {
        if (!this.connected || !this.socket) {
            return;
        }

        this.send(DiscordOpCode.Frame, {
            cmd: 'SET_ACTIVITY',
            args: {
                pid: process.pid,
                activity: null
            },
            nonce: `${Date.now()}`
        });
    }

    private async connect() {
        if (this.connected || !this.enabled) {
            return;
        }

        for (let i = 0; i < 10; i++) {
            const path = process.platform === 'win32'
                ? `\\\\?\\pipe\\discord-ipc-${i}`
                : `/tmp/discord-ipc-${i}`;

            try {
                await this.connectToPath(path);
                this.connected = true;
                this.notifyStatus(true);
                this.send(DiscordOpCode.Handshake, { v: 1, client_id: DISCORD_APP_ID });
                return;
            } catch {
                continue;
            }
        }

        this.connected = false;
        this.notifyStatus(false);
        this.scheduleReconnect();
    }

    private connectToPath(path: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const socket = net.createConnection(path, () => {
                this.socket = socket;
                this.attachSocketListeners(socket);
                resolve();
            });

            socket.once('error', err => {
                socket.destroy();
                reject(err);
            });
        });
    }

    private attachSocketListeners(socket: net.Socket) {
        socket.on('data', buffer => {
            if (buffer.length < 8) {
                return;
            }

            const op = buffer.readInt32LE(0);
            if (op === DiscordOpCode.Ping) {
                const payload = JSON.parse(buffer.subarray(8).toString('utf8'));
                this.send(DiscordOpCode.Pong, payload);
            }
        });

        socket.on('close', () => {
            this.connected = false;
            this.notifyStatus(false);
            if (this.enabled) {
                this.scheduleReconnect();
            }
        });

        socket.on('error', () => {
            this.connected = false;
            this.notifyStatus(false);
            if (this.enabled) {
                this.scheduleReconnect();
            }
        });
    }

    private send(op: DiscordOpCode, data: unknown) {
        if (!this.socket) {
            return;
        }

        const json = JSON.stringify(data);
        const payload = Buffer.from(json, 'utf8');
        const packet = Buffer.alloc(8 + payload.length);
        packet.writeInt32LE(op, 0);
        packet.writeInt32LE(payload.length, 4);
        payload.copy(packet, 8);
        this.socket.write(packet);
    }

    getSessionStart(): number {
        if (this.sessionStart === null) {
            this.sessionStart = Math.floor(Date.now() / 1000);
        }

        return this.sessionStart;
    }

    disconnect() {
        this.socket?.destroy();
        this.socket = null;
        this.connected = false;
    }

    private notifyStatus(connected: boolean) {
        this.statusListener?.(connected);
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) {
            return;
        }

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, 5000);
    }

    private clearReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
}
