import yo from 'yo-yo'
import {FSArchiveFolder_BeingCreated} from 'beaker-virtual-fs'
import renderNavSidebar from './files-browser/nav-sidebar'
import renderFilesTreeView from './files-browser/files-tree-view'
import renderPreviewSidebar from './files-browser/preview-sidebar'

// exported api
// =

export default class FilesBrowser {
  constructor (root) {
    this.lastRenderedElement = null // element last rendered
    this.root = root
    this.currentSource = this.root._children[0]
    this.expandedNodes = new Set() // set of nodes
    this.selectedNodes = new Set() // set of nodes
    this.currentDragNode = null
  }

  // method to render at a place in the page
  // eg yo`<div>${myFilesBrowser.render()}</div>`
  render () {
    this.lastRenderedElement = this._render()
    return this.lastRenderedElement
  }

  // method to re-render in place
  // eg myFilesBrowser.rerender()
  rerender () {
    if (this.lastRenderedElement) {
      yo.update(this.lastRenderedElement, this._render())
    }
  }

  // internal method to produce HTML
  _render () {
    if (!this.root) {
      return yo`<div class="files-browser"></div>`
    }

    return yo`
      <div class="files-browser">
        ${renderNavSidebar(this, this.root)}
        ${this.getCurrentSource() ? renderFilesTreeView(this, this.getCurrentSource()) : null}
        ${renderPreviewSidebar(Array.from(this.selectedNodes.values())[0])}
      </div>
    `
  }

  // state management api

  async reloadTree (node = undefined) {
    // if node is not given, then this is a root call
    // run for the sources, and for the current source
    if (!node) {
      await this.reloadTree(this.root)
      await this.reloadTree(this.currentSource)
      return 
    }

    // recursively read data of the currently-expanded tree
    await node.readData()
    if (node.hasChildren) {
      const children = node.children
      for (var k in children) {
        if (children[k] && this.isExpanded(children[k])) {
          await this.reloadTree(children[k])
        }
      }
    }
  }

  // current source api (what drives the nav sidebar)

  isCurrentSource (node) {
    return node === this.currentSource
  }

  getCurrentSource () {
    return this.currentSource
  }

  async setCurrentSource (node) {
    this.currentSource = node
    await this.currentSource.readData()
    this.rerender()
  }

  // expand api

  isExpanded (node) {
    return this.expandedNodes.has(node)
  }

  expand (node) {
    this.expandedNodes.add(node)
  }

  collapse (node) {
    this.expandedNodes.delete(node)
  }

  // selection api

  isSelected (node) {
    return this.selectedNodes.has(node)
  }

  async selectOne (node) {
    await this.unselectAll()
    await this.select(node)
  }

  async select (node) {
    this.selectedNodes.add(node)

    // read data if needed
    if (node.type === 'file') {
      await node.readData()
    }

    this.rerender()
  }

  async unselect (node) {
    // reset node state
    if (node instanceof FSArchiveFolder_BeingCreated) {
      // if this was a new folder, reload the tree to remove that temp node
      await this.reloadTree()
    } else {
      node.isRenaming = false
    }

    // remove from set
    this.selectedNodes.delete(node)
  }

  async unselectAll () {
    for (let node of this.selectedNodes) {
      await this.unselect(node)
    }
  }

  // drag/drop api

  getCurrentlyDraggedNode () {
    return this.currentDragNode
  }

  setCurrentlyDraggedNode (node) {
    this.currentDragNode = node
  }
}