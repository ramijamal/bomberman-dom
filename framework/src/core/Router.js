export class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.stateManager = null;
    this.routeChangeCallback = null; 
    
    window.addEventListener('popstate', (e) => {
      this.handleRoute(window.location.pathname);
    });
    
    // Also listen for hash changes for TodoMVC-style routing
    window.addEventListener('hashchange', (e) => {
      const hash = window.location.hash;
      const path = hash === '#/' || hash === '' ? '/' : hash.substring(1);
      this.handleRoute(path);
    });
  }

  setStateManager(stateManager) {
    this.stateManager = stateManager;
  }

  addRoute(path, handler) {
    this.routes.set(path, handler);
  }

  navigate(path) {
    if (path !== this.currentRoute) {
      const hash = path === '/' ? '#/' : `#${path}`;
      window.location.hash = hash;
      this.handleRoute(path);
    }
  }

  handleRoute(path) {
    console.log('Router handling route:', path);
    this.currentRoute = path;
    
    if (this.stateManager) {
      this.stateManager.setState({ currentRoute: path });
    }
    
    const handler = this.routes.get(path);
    if (handler) {
      console.log('Calling route handler for:', path);
      if (typeof handler === 'function') {
        handler(); 
      }
    } else {
      console.log('No handler found for route:', path);
    }
    
    if (this.routeChangeCallback) {
      this.routeChangeCallback(handler, path);
    }
  }

  onRouteChange(callback) {
    this.routeChangeCallback = callback; 
  }

  start() {
    const hash = window.location.hash;
    const initialPath = hash === '#/' || hash === '' ? '/' : hash.substring(1);
    console.log('Router starting with path:', initialPath);
    this.handleRoute(initialPath);
  }
}