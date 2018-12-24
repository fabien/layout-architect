(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
      define([], factory);
  } else if (typeof module === 'object' && module.exports) {
      module.exports = factory();
  } else {
    root.LayoutArchitect = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  return function (rootContainer, allBlocks, initialState) {
    if (!rootContainer) throw new Error('Please provide a HTML element as first argument!');
    if (!allBlocks) throw new Error('Please provide a list of strings as a second argument!');

    const blocks = allBlocks.slice();
    const laContainer = document.createElement('DIV');
    const listeners = [];
    let state = initialState || null;
    let selectedCallback;

    laContainer.setAttribute('class', 'la');

    function createBlock(name) {
      return { name: name, elements: [] }
    }
    function addItem(item, direction, where) {
      return selectBlock().then(blockName => createBlock(blockName)).then(block => {
        if (item.elements.length === 0) {
          item.direction = direction;
          item.elements = where === 'after' ? [
            createBlock(item.name),
            block
          ] : [
            block,
            createBlock(item.name)
          ];
          delete item.name;
        } else {
          if (item.direction !== direction) {
            const oldElements = {
              direction: item.direction,
              elements: item.elements
            }
            item.elements = where === 'after' ?
              [ oldElements, block ] :
              [ block, oldElements ]
          } else {
            where === 'after' ?
              item.elements.push(block) :
              item.elements = [block].concat(item.elements);
          }
          item.direction = direction;
        }
      })      
    }
    function removeItem(parent, item) {
      if (!parent) {
        state = initialState || null;
        blocks.push(item.name);
        return;
      }

      const index = parent.elements.findIndex(i => i === item);
      if (index > -1) {
        parent.elements.splice(index, 1);
        if (parent.elements.length === 1) {
          if (parent.elements[0].elements.length > 0) {
            parent.direction = parent.elements[0].direction; 
            parent.elements = parent.elements[0].elements;
          } else {
            parent.name = parent.elements[0].name;
            parent.elements = [];
            delete parent.direction;
          }
        }
        blocks.push(item.name);
      }
    }
    function addLinks(container, operations, item, parent) {
      return operations.map(linkData => {
        const a = document.createElement('A');
        a.setAttribute('data-op', linkData[0]);
        a.setAttribute('href', 'javascript:void(0);');
        a.setAttribute('class', linkData[2]);
        a.innerHTML = linkData[1];
        a.item = item;
        a.parent = parent;
        return a;
      }).forEach(link => container.appendChild(link));
    }
    function renderItem(item, parent) {
      const e = document.createElement('DIV');

      e.setAttribute('class', 'la-block');
      if (item.elements.length === 0) {
        e.innerHTML = '<div class="la-name">' + item.name + '</div>';
        addLinks(e, [ ['remove', 'X', 'la-remove'], ], item, parent);
      } else {
        e.innerHTML = '<div class="la-children" style="grid-template-' + (item.direction === 'horizontal' ? 'rows' : 'columns') + ': repeat(' + item.elements.length + ', 1fr);"></div>';
        item.elements.forEach(i => e.querySelector('.la-children').appendChild(renderItem(i, item)))
      }
      addLinks(e, [
        ['vertical:left', '', 'la-left'],
        ['horizontal:top', '', 'la-top'],
        ['horizontal:bottom', '', 'la-bottom'],
        ['vertical:right', '', 'la-right']
      ], item, parent);
      return e;
    }
    function createBlockSelector() {
      const e = document.createElement('DIV');
      blocks.forEach(blockName => {
        const link = document.createElement('A');
        link.setAttribute('href', 'javascript:void(0);');
        link.setAttribute('data-op', 'select');
        link.item = blockName;
        link.innerHTML = blockName;
        e.appendChild(link);
      });
      e.setAttribute('class', 'la-selector');
      return e;
    }
    function selectBlock() {
      render(createBlockSelector(laContainer));
      return new Promise(done => {
        selectedCallback = blockName => {
          const index = blocks.indexOf(blockName);
          if (index > -1) {
            blocks.splice(index, 1);
          }
          done(blockName);
        };
      });
    }
    function render(content) {
      content = content ? content : renderItem(state);
      while (laContainer.firstChild) { laContainer.removeChild(laContainer.firstChild); }
      laContainer.appendChild(content);
    }
    function notify() {
      listeners.forEach(l => l(state));
    }
    function selectInitialBlock() {
      selectBlock().then(blockName => {
        state = createBlock(blockName);
        render();
        notify();
      });
    }

    laContainer.addEventListener('click', event => {
      let operation = event.target.getAttribute('data-op');
      const item = event.target.item;
      const parent = event.target.parent;

      if (operation && item) {
        if (operation === 'remove') {
          removeItem(parent, item);
          if (state) {
            render();
          } else {
            selectInitialBlock();
          }
          notify();
        } else if (operation === 'select') {
          selectedCallback(item);
        } else {
          if (blocks.length === 0) return;
          operation = operation.split(':');
          addItem(item, operation[0], operation[1] === 'right' || operation[1] === 'bottom' ? 'after' : 'before').then(() => {
            render();
            notify();
          });
        }
      }
    });

    selectInitialBlock();

    rootContainer.appendChild(laContainer);

    return {
      onChange: cb => {
        listeners.push(cb);
        cb(state);
      },
      change: newState => {
        state = newState;
        render();
      }
    }
  };
}));