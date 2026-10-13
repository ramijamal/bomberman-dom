export class VirtualNode {
  constructor(tag, attrs = {}, children = []) {
    this.tag = tag;
    this.attrs = attrs;
    this.children = Array.isArray(children) ? children : [children];
    this.key = attrs.key || null;
  }
}

export class VirtualDOM {
  constructor() {
    this.currentVDOM = null;
  }

  createElement(tag, attrs = {}, ...children) {
    const flatChildren = [];
    
    function flattenChildren(items) {
      for (const item of items) {
        if (Array.isArray(item)) {
          flattenChildren(item);
        } else if (item !== null && item !== undefined && item !== false) {
          flatChildren.push(item);
        }
      }
    }
    
    flattenChildren(children);
    return new VirtualNode(tag, attrs, flatChildren);
  }

  render(vnode, container) {
    container.innerHTML = '';
    const newDOM = this.createDOMNode(vnode);
    container.appendChild(newDOM);
    this.currentVDOM = vnode;
  }

  createDOMNode(vnode) {
    if (vnode === null || vnode === undefined || vnode === false) {
      return document.createTextNode('');
    }

    if (typeof vnode === 'string' || typeof vnode === 'number') {
      return document.createTextNode(vnode);
    }

    if (vnode && typeof vnode === 'object' && vnode.render) {
      const rendered = vnode.render();
      return this.createDOMNode(rendered);
    }

    if (!vnode.tag) {
      console.error('Invalid vnode:', vnode);
      return document.createTextNode('');
    }

    if (typeof vnode.tag === 'function') {
      const componentInstance = new vnode.tag(vnode.attrs || {});
      
      if (vnode.attrs && vnode.attrs.framework) {
        componentInstance.framework = vnode.attrs.framework;
      }
      
      const renderedVNode = componentInstance.render();
      return this.createDOMNode(renderedVNode);
    }

    if (typeof vnode.tag !== 'string') {
      console.error('Invalid tag type:', typeof vnode.tag, vnode.tag);
      return document.createTextNode('');
    }

    const element = document.createElement(vnode.tag);
    
    if (vnode.attrs) {
      Object.entries(vnode.attrs).forEach(([key, value]) => {
        if (key.startsWith('on') && typeof value === 'function') {
          const event = key.slice(2).toLowerCase();
          element.addEventListener(event, value);
        } else if (key === 'className' || key === 'class') {
          element.className = value;
        } else if (key === 'style' && typeof value === 'object') {
          Object.assign(element.style, value);
        } else if (key === 'value') {
          element.value = value;
        } else if (key === 'checked') {
          element.checked = value === 'checked' || value === true;
        } else if (key === 'disabled') {
          element.disabled = !!value;
        } else if (key !== 'key') {
          element.setAttribute(key, value);
        }
      });
    }

    if (vnode.children && vnode.children.length > 0) {
      vnode.children.forEach((child) => {
        if (child !== null && child !== undefined && child !== false) {
          const childNode = this.createDOMNode(child);
          element.appendChild(childNode);
        }
      });
    }

    return element;
  }

  updateDOM(parent, newNode, oldNode, newVNode, oldVNode) {
    if (!oldNode) {
      parent.appendChild(newNode);
    } else if (!newNode) {
      parent.removeChild(oldNode);
    } else if (this.hasChanged(newVNode, oldVNode)) {
      parent.replaceChild(newNode, oldNode);
    } else if (newVNode.tag) {
      this.updateAttributes(oldNode, newVNode.attrs, oldVNode.attrs);
      
      const newLength = newVNode.children.length;
      const oldLength = oldVNode.children.length;
      const oldChildren = Array.from(oldNode.childNodes);
      
      for (let i = 0; i < newLength || i < oldLength; i++) {
        this.updateDOM(
          oldNode,
          i < newLength ? this.createDOMNode(newVNode.children[i]) : null,
          oldChildren[i],
          newVNode.children[i],
          oldVNode.children[i]
        );
      }
    }
  }

  hasChanged(node1, node2) {
    return typeof node1 !== typeof node2 ||
           ((typeof node1 === 'string' || typeof node1 === 'number') && node1 !== node2) ||
           node1.tag !== node2.tag;
  }

  updateAttributes(element, newAttrs, oldAttrs) {
    const allAttrs = { ...oldAttrs, ...newAttrs };
    
    Object.keys(allAttrs).forEach(key => {
      if (key.startsWith('on') && (typeof oldAttrs[key] === 'function' || typeof newAttrs[key] === 'function')) {
        if (oldAttrs[key] !== newAttrs[key]) {
          const event = key.slice(2).toLowerCase();
          if (typeof oldAttrs[key] === 'function') {
            element.removeEventListener(event, oldAttrs[key]);
          }
          if (typeof newAttrs[key] === 'function') {
            element.addEventListener(event, newAttrs[key]);
          }
        }
      } else if (!(key in newAttrs)) {
        element.removeAttribute(key);
      } else if (oldAttrs[key] !== newAttrs[key]) {
        if (key === 'className') {
          element.className = newAttrs[key];
        } else if (key === 'style' && typeof newAttrs[key] === 'object') {
          Object.assign(element.style, newAttrs[key]);
        } else if (!key.startsWith('on') && key !== 'key') {
          element.setAttribute(key, newAttrs[key]);
        }
      }
    });
  }
}