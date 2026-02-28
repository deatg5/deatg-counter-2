import * as DiscordRPC from 'discord-rpc';
import { Counter } from '../core/types';

// you can swap this with your own app id from the discord developer portal later! ><
const clientId = '1477148769005867191'; 

export class DiscordPresenceManager {
    private rpc: DiscordRPC.Client | null = null;
    private isEnabled = false;
    private cycleInterval: NodeJS.Timeout | null = null;
    private currentCounters: Counter[] = [];
    private currentIndex = 0;
    private isConnected = false;

    constructor() {
        DiscordRPC.register(clientId);
    }

    async setEnabled(enabled: boolean) {
        this.isEnabled = enabled;
        if (enabled && !this.isConnected) {
            await this.connect();
        } else if (!enabled && this.isConnected) {
            this.disconnect();
        }
    }

    private async connect() {
        if (this.rpc || this.isConnected) return;
        this.rpc = new DiscordRPC.Client({ transport: 'ipc' });
        
        this.rpc.on('ready', () => {
            this.isConnected = true;
            this.updatePresence();
        });

        try {
            // graceful failure: if discord is asleep, we just let the connection melt away ._.
            await this.rpc.login({ clientId }).catch(() => {
                this.rpc = null;
            });
        } catch (e) {
            this.rpc = null;
        }
    }

    disconnect() {
        if (this.cycleInterval) {
            clearInterval(this.cycleInterval);
            this.cycleInterval = null;
        }
        if (this.rpc) {
            try {
                this.rpc.clearActivity();
                this.rpc.destroy();
            } catch (e) {}
            this.rpc = null;
        }
        this.isConnected = false;
    }

    updateCounters(counters: Counter[]) {
        // we only care about the targets currently being hunted!
        this.currentCounters = counters.filter(c => c.isSelected);
        this.currentIndex = 0;
        
        if (this.isEnabled && this.isConnected) {
            this.updatePresence();
            this.startCycle();
        }
    }

    private startCycle() {
        if (this.cycleInterval) clearInterval(this.cycleInterval);
        
        // if there are multiple anomalies, we rotate the beacon every 5 seconds ^^
        if (this.currentCounters.length > 1) {
            this.cycleInterval = setInterval(() => {
                this.currentIndex = (this.currentIndex + 1) % this.currentCounters.length;
                this.updatePresence();
            }, 5000);
        }
    }

    private updatePresence() {
        if (!this.rpc || !this.isEnabled || !this.isConnected) return;
        
        if (this.currentCounters.length === 0) {
            this.rpc.setActivity({
                details: 'Shiny Hunting',
                state: 'Idling... no counters selected.',
                largeImageKey: "count",
                largeImageText: 'Counting!',
                instance: false,
            }).catch(() => {});
            return;
        }

        const counter = this.currentCounters[this.currentIndex];
        this.rpc.setActivity({
            details: 'Shiny Hunting',
            state: `${counter.name}: ${counter.count} Encounters`,
            instance: false,
        }).catch(() => {});
    }
}