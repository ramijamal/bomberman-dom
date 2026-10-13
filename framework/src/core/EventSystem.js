export class EventSystem {
  constructor() {
    this.eventHandlers = new Map();
    this.globalListeners = new Map();
  }

  on(element, eventType, handler, options = {}) {
    if (!element) return;

    const wrappedHandler = (e) => {
      if (options.preventDefault) e.preventDefault();
      if (options.stopPropagation) e.stopPropagation();
      handler(e);
    };

    element.addEventListener(eventType, wrappedHandler);
    
    const key = `${element}_${eventType}`;
    if (!this.eventHandlers.has(key)) {
      this.eventHandlers.set(key, []);
    }
    this.eventHandlers.get(key).push({ handler, wrappedHandler });

    return () => this.off(element, eventType, handler);
  }

  off(element, eventType, handler) {
    const key = `${element}_${eventType}`;
    const handlers = this.eventHandlers.get(key);
    
    if (handlers) {
      const index = handlers.findIndex(h => h.handler === handler);
      if (index > -1) {
        element.removeEventListener(eventType, handlers[index].wrappedHandler);
        handlers.splice(index, 1);
      }
    }
  }

  emit(eventType, data) {
    const event = new CustomEvent(eventType, { detail: data });
    document.dispatchEvent(event);
  }

  onGlobal(eventType, handler) {
    if (!this.globalListeners.has(eventType)) {
      this.globalListeners.set(eventType, []);
      document.addEventListener(eventType, (e) => {
        this.globalListeners.get(eventType).forEach(h => h(e));
      });
    }
    
    this.globalListeners.get(eventType).push(handler);
    
    return () => {
      const handlers = this.globalListeners.get(eventType);
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    };
  }
}