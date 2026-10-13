export class Component {
  constructor(props = {}) {
    this.props = props;
    this.localState = {};
    this.framework = null;
    this.subscriptions = [];
  }

  setFramework(framework) {
    this.framework = framework;
    this.subscriptions.push(
      framework.stateManager.subscribe((state) => {
        this.onStateChange(state);
      })
    );
  }

  setState(newState) {
    this.localState = { ...this.localState, ...newState };
    this.forceUpdate();
  }

  getState() {
    return this.framework ? this.framework.stateManager.getState() : {};
  }

  dispatch(action) {
    if (this.framework) {
      this.framework.stateManager.dispatch(action);
    }
  }

  onStateChange(state) {
    this.forceUpdate();
  }

  forceUpdate() {
    if (this.framework && this.container) {
      const vnode = this.render();
      this.container.innerHTML = '';
      this.framework.virtualDOM.render(vnode, this.container);
    }
  }

  mount(container) {
    this.container = container;
    this.onMount();
    this.forceUpdate();
  }

  unmount() {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.onUnmount();
  }

  onMount() {}
  onUnmount() {}
  
  render() {
    return this.framework.createElement('div', {}, 'Override render method');
  }

  createChildComponent(ComponentClass, props = {}) {
    if (!this.framework) {
      throw new Error('Framework not set on component');
    }
    
    const childComponent = new ComponentClass({...props, framework: this.framework});
    childComponent.setFramework(this.framework);
    return childComponent;
  }
}