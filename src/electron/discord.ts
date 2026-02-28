import * as DiscordRPC from 'discord-rpc';
import { Counter } from '../core/types';

// weave your true developer portal ID back in here!
const clientId = '1477148769005867191'; 

export class DiscordPresenceManager {
    private rpc: DiscordRPC.Client | null = null;
    private isEnabled = false;
    private cycleInterval: NodeJS.Timeout | null = null;
    private currentCounters: Counter[] = [];
    private currentIndex = 0;
    private isConnected = false;
    
    // the temporal wards to match the architectural invariant! ><
    private lastUpdateTime = 0;
    private updateTimeout: NodeJS.Timeout | null = null;

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
            this.triggerUpdate();
        });

        try {
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
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = null;
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
        const selected = counters.filter(c => c.isSelected);
        
        // carve out the absolute identities of the current targets
        const currentIds = this.currentCounters.map(c => c.id).join(',');
        const newIds = selected.map(c => c.id).join(',');
        
        this.currentCounters = selected;
        
        if (currentIds !== newIds) {
            // the actual selection of targets changed! realign the optics. :>
            this.currentIndex = 0;
            if (this.isEnabled && this.isConnected) {
                this.startCycle();
                this.triggerUpdate();
            }
        } else {
            // only the counts mutated! preserve the optical rhythm.
            if (this.currentIndex >= this.currentCounters.length) {
                this.currentIndex = 0;
            }
            if (this.isEnabled && this.isConnected) {
                this.triggerUpdate();
            }
        }
    }

    private startCycle() {
        if (this.cycleInterval) clearInterval(this.cycleInterval);
        
        // let the beacon gently rotate exactly every 15 seconds to appease the strict gates ^^
        if (this.currentCounters.length > 1) {
            this.cycleInterval = setInterval(() => {
                this.currentIndex = (this.currentIndex + 1) % this.currentCounters.length;
                this.triggerUpdate();
            }, 16000); 
        }
    }

    private triggerUpdate() {
        if (this.updateTimeout) clearTimeout(this.updateTimeout);
        
        // check the hourglass! 16000ms is the non-negotiable threshold.
        const now = Date.now();
        const timeSinceLast = now - this.lastUpdateTime;
        
        if (timeSinceLast >= 16000) {
            this.updatePresence();
        } else {
            // gracefully hold the whisper until the exact threshold is crossed! ._.
            this.updateTimeout = setTimeout(() => {
                this.updatePresence();
            }, 16000 - timeSinceLast);
        }
    }

    private updatePresence() {
        if (!this.rpc || !this.isEnabled || !this.isConnected) return;
        
        this.lastUpdateTime = Date.now();
        const visualSigil = 'your_asset_name'; // remember your portal asset string!
        
        if (this.currentCounters.length === 0) {
            this.rpc.setActivity({
                details: 'Shiny Hunting',
                state: 'Idling... no targets selected!',
                largeImageKey: visualSigil,
                largeImageText: 'resting the dice...',
                instance: false,
            }).catch(() => {});
            return;
        }

        const counter = this.currentCounters[this.currentIndex];
        this.rpc.setActivity({
            details: 'Shiny Hunting',
            state: `${counter.name}: ${counter.count} Encounters`,
            largeImageKey: visualSigil,
            largeImageText: 'hunting for chromosomal anomalies! :3',
            instance: false,
        }).catch(() => {});
    }
}