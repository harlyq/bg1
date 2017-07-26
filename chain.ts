import Util from './util.js'

class Item {
  data: any
  valid: boolean = true
}

export default class Chain {
  items: Item[]

  // TODO support looping and ending
  constructor(list: any[] = []) {
    this.items = list.map(x => { return {data: x, valid: true} })
  }

  public copy(oldChain: Chain): Chain {
    var newChain = new Chain(oldChain.items)
    return newChain
  }

  public next(v): any {
    let n = this.items.length
    // find v in the list (even if now invalid)
    for (var i = 0; i < n; ++i) {
      if (this.items[i].data === v) {

        // return the next valid item, loop if necessary
        for (var j = i + 1, k = 0; k < n; ++j, ++k) {
          let item = this.items[Chain.resolveIndex(j, n)] // always valid
          if (item.valid) {
            return item.data
          }
        }
      }
    }
  }

  public prev(v): any {
    let n = this.items.length
    // find v in the list (even if now invalid)
    for (var i = 0; i < n; ++i) {
      if (this.items[i].data === v) {

        // return the previous valid item, loop if necessary
        for (var j = i - 1, k = 0; k < n; --j, ++k) {
          let item = this.items[Chain.resolveIndex(j, n)] // always valid
          if (item.valid) {
            return item.data
          }
        }
      }
    }
  }

  public getLength(): number {
    return this.items.reduce((l, x) => l += (x.valid) ? 1 : 0, 0)
  }

  public toArray(excludeList?: any[]): any[] {
    if (Array.isArray(excludeList)) {
      return this.items.filter(x => x.valid && excludeList.indexOf(x.data) === -1).map(x => x.data)
    } else {
      return this.items.filter(x => x.valid).map(x => x.data)
    }
  }

  public remove(v: any) {
    for (var item of this.items) {
      if (item.valid && item.data === v) {
        item.valid = false
        break
      }
    }
  }

  public add(v: any) {
    var found = false

    for (var item of this.items) {
      if (item.data === v) {
        item.valid = true
        return
      }
    }

    if (!found) {
      this.items.push({data: v, valid: true})
    }
  }

  public first(): any {
    for (let x of this.items) {
      if (x.valid) {
        return x.data
      }
    }
  }

  public last(): any {
    for (let i = this.items.length - 1; i >= 0; --i) {
      const x = this.items[i]
      if (x.valid) {
        return x.data
      }
    }
  }

  public random(): any {
    let validItems = this.items.filter(x => x.valid)
    return validItems[Util.randomInt(0, validItems.length)].data
  }

  private static resolveIndex(i: number, n: number): number {
    if (i < 0) {
      let j = (-i) % n
      return n - j
    } else {
      return i % n
    }
  }
}
