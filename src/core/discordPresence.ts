import * as net from 'net';
import * as os from 'os';

const OP_HANDSHAKE = 0;
const OP_FRAME = 1;
const OP_CLOSE = 2;

interface DiscordActivity {
    details: string;
    state: string;
    startTimestamp?: number;
}

export class DiscordPresenceManager {
    private readonly clientId = '133713371337133713';
    private socket: net.Socket | null = null;
    private connected = false;
    private enabled = false;
    private startTimestamp: number | null = null;
    private pendingActivity: DiscordActivity | null = null;

    async setEnabled(enabled: boolean): Promise<void> {
        this.enabled = enabled;
        if (!enabled) {
            this.clear();
            this.disconnect();
            this.startTimestamp = null;
            return;
        }

        if (!this.startTimestamp) {
            this.startTimestamp = Math.floor(Date.now() / 1000);
        }

        if (!this.connected) {
            await this.connect();
        }

        if (this.pendingActivity) {
            this.setActivity(this.pendingActivity);
        }
    }

    async updateActivity(tabName: string, encounterCount: number): Promise<void> {
        const activity: DiscordActivity = {
            details: `Shiny Hunting in ${tabName}`,
            state: `${encounterCount} encounters`,
            startTimestamp: this.startTimestamp ?? Math.floor(Date.now() / 1000)
        };

        this.pendingActivity = activity;

        if (!this.enabled) {
            return;
        }

        if (!this.connected) {
            await this.connect();
        }

        this.setActivity(activity);
    }

    getStatus() {
        return {
            enabled: this.enabled,
            connected: this.connected
        };
    }

    shutdown() {
        this.clear();
        this.disconnect();
    }

    private async connect(): Promise<void> {
        if (this.connected || this.socket) {
            return;
        }

        const ipcPath = this.resolveDiscordIpcPath();
        if (!ipcPath) {
            return;
        }

        await new Promise<void>((resolve) => {
            const socket = net.createConnection(ipcPath);
            this.socket = socket;

            socket.once('error', () => {
                this.connected = false;
                this.socket = null;
                resolve();
            });

            socket.once('connect', () => {
                this.writeFrame(OP_HANDSHAKE, { v: 1, client_id: this.clientId });
                this.connected = true;
                resolve();
            });

            socket.on('close', () => {
                this.connected = false;
                this.socket = null;
            });

            socket.on('data', (data) => {
                if (data.length < 8) {
                    return;
                }
                const opcode = data.readInt32LE(0);
                if (opcode === OP_CLOSE) {
                    this.connected = false;
                    socket.destroy();
                }
            });
        });
    }

    private setActivity(activity: DiscordActivity) {
        if (!this.connected) {
            return;
        }

        this.writeFrame(OP_FRAME, {
            cmd: 'SET_ACTIVITY',
            nonce: `${Date.now()}`,
            args: {
                pid: process.pid,
                activity: {
                    details: activity.details,
                    state: activity.state,
                    timestamps: activity.startTimestamp
                        ? { start: activity.startTimestamp }
                        : undefined
                }
            }
        });
    }

    private clear() {
        if (!this.connected) {
            return;
        }
        this.writeFrame(OP_FRAME, {
            cmd: 'SET_ACTIVITY',
            nonce: `${Date.now()}`,
            args: {
                pid: process.pid,
                activity: null
            }
        });
    }

    private disconnect() {
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
        this.connected = false;
    }

    private writeFrame(opcode: number, payload: unknown) {
        if (!this.socket) {
            return;
        }
        const body = Buffer.from(JSON.stringify(payload), 'utf8');
        const header = Buffer.alloc(8);
        header.writeInt32LE(opcode, 0);
        header.writeInt32LE(body.length, 4);
        this.socket.write(Buffer.concat([header, body]));
    }

    private resolveDiscordIpcPath(): string | null {
        for (let i = 0; i < 10; i += 1) {
            const candidate = process.platform === 'win32'
                ? `\\\\?\\pipe\\discord-ipc-${i}`
                : `${os.tmpdir()}/discord-ipc-${i}`;
            return candidate;
        }

        return null;
    }
}
