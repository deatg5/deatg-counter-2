import { CounterState } from './types';

export class Counter {
  private state: CounterState = {
    count: 0,
    lastUpdated: new Date()
  };

  increment(): void {
    this.state.count++;
    this.state.lastUpdated = new Date();
  }

  decrement(): void {
    this.state.count -= 1;
    this.state.lastUpdated = new Date();
  }

  getState(): CounterState {
    return { ...this.state };
  }
}

