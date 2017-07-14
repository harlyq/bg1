let Util = require('./util.js')

class Item {
  data: any
  valid: boolean = true
}

class Chain {
  items: Item[]

  // TODO support looping and ending
  constructor(list: any[] = []) {
    this.items = list.map(x => { return {data: x, valid: true} })
  }

  public copy(oldChain: Chain): Chain {
    var newChain = new Chain(oldChain.items)
    // newChain.items.concat(...oldChain.items)
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

  public toArray(): any[] {
    return this.items.filter(x => x.valid)
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

  // doesn't make sense to push.  if 'a' is already in the list
  // we can't push('a') again
  // public push(v: any) {
  //   this.items.push({data: v, valid: true})
  // }
  //
  // public pop(): any {
  //   let n = this.items.length
  //   for (var i = n - 1; i >= 0; --i) {
  //     let item = this.items[i]
  //     if (item.valid) {
  //       item.valid = false
  //       return item.data
  //     }
  //   }
  // }

  // we can provide range through an external function
  // e.g. newChain(range(x,y))
  // // range(x) gives [0..x-1]
  // // range(x,y) gives [x..y]
  // public range(x: number, y?: number) {
  //   let isXY = typeof y !== 'undefined'
  //   var a = isXY ? x : 0
  //   var b = isXY ? y : x - 1
  //
  //   this.items = []
  //   for (var i = a; i < b; ++i) {
  //     this.items.push({data: i, valid: true})
  //   }
  // }

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

export = Chain
