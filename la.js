(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
      define([], factory);
  } else if (typeof module === 'object' && module.exports) {
      module.exports = factory();
  } else {
    root.LayoutArchitect = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  return function (rootContainer, allBlocks, initialState, extractItem) {
    if (!rootContainer) throw new Error('Please provide a HTML element as first argument!');
    if (!allBlocks) throw new Error('Please provide a list of strings as a second argument!');
    
    if (typeof initialState === 'function') {
        extractItem = initialState;
        initialState = null;
    }
    
    let blockLookup = {};
    
    if (typeof allBlocks === 'object' && !Array.isArray(allBlocks)) {
        blockLookup = Object.assign({}, allBlocks);
        allBlocks = Object.keys(allBlocks);
    }

    const $ = tag => document.createElement(tag);
    const $a = (e, attr, value) => e.setAttribute(attr, value);
    const blocks = filterBlocksBasedOnTheInitialState();
    const laContainer = $('DIV');
    const listeners = [];
    let state = initialState || null;
    let selectedCallback;

    $a(laContainer, 'class', 'la');

    function filterBlocksBasedOnTheInitialState() {
      const all = allBlocks.slice();

      if (!initialState) return all;
      const foundInTree = (function parseEl(found, item) {
        if (item.children.length === 0) {
          found.push(item.id);
        } else {
          item.children.forEach(i => parseEl(found, i));
        }
        return found;
      })([], initialState);

      return all.filter(i => foundInTree.indexOf(i) === -1);
    }
    function getBlockLabel(id) {
      if (typeof blockLookup[id] === 'object') {
         return blockLookup[id].label || id;
      }
      return blockLookup[id] || id;
    }
    function getBlockClassName(id) {
      let className = 'la-block-' + id;
      if (typeof blockLookup[id] === 'object' &&
        typeof blockLookup[id].type === 'string') {
        return 'la-block-' + blockLookup[id].type;
      }
      return className;
    }
    function createBlock(id) {
      const item = { id: id, children: [] };
      if (typeof blockLookup[id] === 'object') {
        if (typeof extractItem === 'function') {
          extractItem(item, blockLookup[id]);
        } else {
          Object.assign(item, blockLookup[id]);
        }
      }
      return item;
    }
    function addItem(item, direction, where) {
      return selectBlock().then(blockName => createBlock(blockName)).then(block => {
        if (item.children.length === 0) {
          item.direction = direction;
          item.children = where === 'after' ? [
            createBlock(item.id),
            block
          ] : [
            block,
            createBlock(item.id)
          ];
          Object.keys(item).forEach(function(k) {
             if (k !== 'direction' && k !== 'children') {
                 delete item[k];
             }
          });
        } else {
          if (item.direction !== direction) {
            const oldElements = {
              direction: item.direction,
              children: item.children
            }
            item.children = where === 'after' ?
              [ oldElements, block ] :
              [ block, oldElements ]
          } else {
            where === 'after' ?
              item.children.push(block) :
              item.children = [block].concat(item.children);
          }
          item.direction = direction;
        }
      })
    }
    function removeItem(parent, item) {
      if (!parent) {
        state = null;
        if (blocks.indexOf(item.id) === -1) {
          blocks.push(item.id);
        }
        return;
      }

      const index = parent.children.findIndex(i => i === item);
      if (index > -1) {
        parent.children.splice(index, 1);
        if (parent.children.length === 1) {
          if (parent.children[0].children.length > 0) {
            parent.direction = parent.children[0].direction;
            parent.children = parent.children[0].children;
          } else {
            parent.id = parent.children[0].id;
            parent.children = [];
            delete parent.direction;
          }
        }
        blocks.push(item.id);
      }
    }
    function addLinks(container, operations, item, parent) {
      return operations.map(linkData => {
        const a = $('A');
        $a(a, 'data-op', linkData[0]);
        $a(a, 'href', 'javascript:void(0);');
        $a(a, 'class', linkData[2]);
        a.innerHTML = linkData[1];
        a.item = item;
        a.parent = parent;
        return a;
      }).forEach(link => container.appendChild(link));
    }
    function renderItem(item, parent) {
      const e = $('DIV');
      
      if (item.children.length === 0) {
        $a(e, 'data-id', item.id);
        $a(e, 'class', 'la-block ' + getBlockClassName(item.id));
        e.innerHTML = '<div class="la-name">' + getBlockLabel(item.id) + '</div>';
        addLinks(e, [ ['remove', '<svg width="14" height="14" viewBox="0 0 1792 1792"><path d="M1490 1322q0 40-28 68l-136 136q-28 28-68 28t-68-28l-294-294-294 294q-28 28-68 28t-68-28l-136-136q-28-28-28-68t28-68l294-294-294-294q-28-28-28-68t28-68l136-136q28-28 68-28t68 28l294 294 294-294q28-28 68-28t68 28l136 136q28 28 28 68t-28 68l-294 294 294 294q28 28 28 68z"/></svg>', 'la-remove'], ], item, parent);
      } else {
        $a(e, 'class', 'la-block');
        const direction = item.direction === 'vertical' ? 'rows' : 'columns';
        e.innerHTML = '<div class="la-children la-children-' + direction + '" style="grid-template-' + direction + ': repeat(' + item.children.length + ', 1fr);"></div>';
        item.children.forEach(i => e.querySelector('.la-children').appendChild(renderItem(i, item)))
      }
      addLinks(e, [
        ['horizontal:left', '', 'la-edge la-left'],
        ['vertical:top', '', 'la-edge la-top'],
        ['vertical:bottom', '', 'la-edge la-bottom'],
        ['horizontal:right', '', 'la-edge la-right']
      ], item, parent);
      return e;
    }
    function createBlockSelector() {
      const e = $('DIV');
      blocks.forEach(blockName => {
        const link = $('A');
        const label = getBlockLabel(blockName);
        $a(link, 'href', 'javascript:void(0);');
        $a(link, 'data-op', 'select');
        link.item = blockName;
        link.innerHTML = '<svg width="10" height="10" viewBox="0 0 1792 1792"><path d="M1600 736v192q0 40-28 68t-68 28h-416v416q0 40-28 68t-68 28h-192q-40 0-68-28t-28-68v-416h-416q-40 0-68-28t-28-68v-192q0-40 28-68t68-28h416v-416q0-40 28-68t68-28h192q40 0 68 28t28 68v416h416q40 0 68 28t28 68z"/></svg> ' + label;
        e.appendChild(link);
      });
      $a(e, 'class', 'la-selector');
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
    function findItem(id, parent) {
      parent = parent || state;
      if (parent && parent.id === id) {
        return parent;
    } else if (parent && parent.children && parent.children.length) {
        const index = parent.children.findIndex(function(item) {
          return item.id === id;
        });
        if (index > -1) {
          const item = parent.children[index];
          return { parent, index, item };
        } else {
          let match;
          for (let i = 0; i < parent.children.length; i++) {
             match = findItem(id, parent.children[i]);
             if (match) break;
          }
          return match;
        }
      }
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

    state ? render() : selectInitialBlock();

    rootContainer.appendChild(laContainer);

    return {
      onChange: cb => {
        listeners.push(cb);
      },
      change: newState => {
        state = newState;
        render();
      },
      get() {
        return state;
      },
      clear() {
        state = {};
        render();
      },
      find(id) {
        return findItem(id);
      },
      replace(a, b, strict) {
        const itemA = findItem(a);
        const itemB = findItem(b);
        const indexB = blocks.indexOf(b);
        if (itemA && itemA.parent && itemB && itemB.parent) {
          itemA.parent.children.splice(itemA.index, 1, itemB.item);
          itemB.parent.children.splice(itemB.index, 1, itemA.item);
          render();
          notify()
        } else if (itemA && itemA.parent && indexB > -1 && !strict) {
          itemA.parent.children.splice(itemA.index, 1, createBlock(b));
          blocks.splice(indexB, 1);
          render();
          notify();
        } else if (itemA && indexB > -1 && !strict) {
          state = createBlock(b);
          blocks.splice(indexB, 1);
          render();
          notify();
        }
      },
      update() {
        render();
        notify()
      }
    }
  };
}));
