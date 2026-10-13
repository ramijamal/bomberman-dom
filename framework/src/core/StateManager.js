export class StateManager {
  constructor() {
    this.state = {};
    this.subscribers = [];
    this.middlewares = [];
  }

  getState() {
    return { ...this.state };
  }

  setState(newState) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...newState };
    
    this.subscribers.forEach(callback => {
      callback(this.state, oldState);
    });
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  dispatch(action) {
    let processedAction = action;
    
    this.middlewares.forEach(middleware => {
      processedAction = middleware(processedAction, this.state);
    });

    if (typeof processedAction.reducer === 'function') {
      const newState = processedAction.reducer(this.state, processedAction.payload);
      this.setState(newState);
    }
  }

  addMiddleware(middleware) {
    this.middlewares.push(middleware);
  }
}