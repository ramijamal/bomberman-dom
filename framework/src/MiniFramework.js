import { VirtualDOM } from './core/VirtualDOM.js';
import { StateManager } from './core/StateManager.js';
import { Router } from './core/Router.js';
import { EventSystem } from './core/EventSystem.js';
import { Component } from './core/Component.js';

export class MiniFramework {
  constructor() {
    this.virtualDOM = new VirtualDOM();
    this.stateManager = new StateManager();
    this.router = new Router();
    this.eventSystem = new EventSystem();
    
    this.router.setStateManager(this.stateManager);
  }

  createElement(tag, attrs = {}, ...children) {
    return this.virtualDOM.createElement(tag, attrs, ...children);
  }

  render(component, container) {
    if (component instanceof Component) {
      component.setFramework(this);
      component.mount(container);
    } else {
      container.innerHTML = '';
      this.virtualDOM.render(component, container);
    }
  }

  createComponent(ComponentClass, props = {}) {
    const component = new ComponentClass(props);
    component.setFramework(this);
    return component;
  }

  getState() {
    return this.stateManager.getState();
  }

  setState(state) {
    this.stateManager.setState(state);
  }

  subscribe(callback) {
    return this.stateManager.subscribe(callback);
  }

  dispatch(action) {
    this.stateManager.dispatch(action);
  }

  addRoute(path, component) {
    this.router.addRoute(path, component);
  }

  navigate(path) {
    this.router.navigate(path);
  }

  onRouteChange(callback) {
    this.router.onRouteChange(callback);
  }

  startRouter() {
    this.router.start();
  }

  on(element, eventType, handler, options) {
    return this.eventSystem.on(element, eventType, handler, options);
  }

  off(element, eventType, handler) {
    this.eventSystem.off(element, eventType, handler);
  }

  emit(eventType, data) {
    this.eventSystem.emit(eventType, data);
  }

  onGlobal(eventType, handler) {
    return this.eventSystem.onGlobal(eventType, handler);
  }
}

export { Component };