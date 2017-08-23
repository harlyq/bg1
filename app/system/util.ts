export default class Util {
  public static clamp(x, min, max) {
    return Math.max(min, Math.min(max, x))
  }

  private static _f: number[] = []

  public static factorial(n: number): number {
    if (n === 0 || n === 1) {
      return 1
    } else if (Util._f[n]) {
      return Util._f[n]
    } else {
      let val = 1
      for (var i = 2; i <= n; ++i) {
        Util._f[i] = val = val*i
      }
      return val
    }
  }

  public static combination(n: number, k1: number, k2?: number): number {
    if (typeof k2 === 'undefined') {
      k2 = k1
    }
    let sum = 0
    for (let k = k1; k <= k2; ++k) {
      sum += Util.factorial(n)/(Util.factorial(k)*Util.factorial(n - k))
    }
    return sum
  }

  // public static getRandomCombination<T>(list: T[], startCount: number, endCount?: number): T[] {
  //   if (typeof endCount === 'undefined') {
  //     endCount = startCount
  //   }
  //
  //   const n = list.length
  //   let numCombinations = 0
  //   for (let count = startCount; count <= endCount; ++count) {
  //     numCombinations += Util.combination(n, count)
  //   }
  //
  //   let randomIndex = Math.floor(Math.random()*numCombinations)
  // }

  public static getCombinations<T>(list: T[], startCount: number, endCount?: number, validationFn?: (x: T[]) => boolean): T[][] {
    if (typeof endCount === 'undefined') {
      endCount = startCount
    }

    let combinations = []
    for (let count = startCount; count <= endCount; ++count) {
      if (count === 0) {
        combinations.push([])
      } else {
        combinations.push(...Util.getCombinationsInternal(list, count, validationFn))
      }
    }

    return combinations
  }

  private static getCombinationsInternal<T>(list: T[], count: number, validationFn: (x: T[]) => boolean, lastCombo: T[] = [], nextIndex = 0): T[][] {
    if (count === 0) {
      return []
    }

    let choices = []
    let n = list.length

    for (let i = nextIndex; i <= n - count; ++i) {
      let newCombo: T[] = lastCombo.slice()
      newCombo.push(list[i])

      if (count > 1) {
        let subChoices = Util.getCombinationsInternal(list, count - 1, validationFn, newCombo, i + 1)
        choices.push(...subChoices)
      } else if (typeof validationFn === 'undefined' || validationFn(newCombo)){
        choices.push(newCombo)
      }
    }

    return choices
  }

  // returns a map by keyFn of the list of instances with a matching keyFn
  public static makeBuckets<T>(list: T[], keyFn: (T) => string): {[key: string]: T[]} {
    let buckets = list.reduce((buckets, x) => {
      const key = keyFn(x)
      if (typeof buckets[key] === 'undefined') {
        buckets[key] = []
      }
      buckets[key].push(x)
      return buckets
    }, {})
    return buckets
  }

  // returns a map by keyFn of the number of instances with a matching keyFn
  public static countBuckets<T>(list: T[], keyFn: (T) => string): {[key: string]: number} {
    let buckets = list.reduce((buckets, x) => {
      const key = keyFn(x)
      buckets[key] = (buckets[key] || 0) + 1
      return buckets
    }, {})
    return buckets
  }

  // matches against the first level of
  public static isEqual(a: any, b: any): boolean {
    if (typeof a === typeof b) {
      if (Array.isArray(a)) {
        const n = a.length
        if (n === b.length) {
          for (let i = 0; i < n; ++i) {
            if (a[i] !== b[i]) {
              return false
            }
          }
          return true
        }
      } else if (typeof a === 'object') {
        if (Object.keys(a).length === Object.keys(b).length) {
          for (let key in a) {
            if (a[key] !== b[key]) {
              return false
            }
          }
          return true
        }
      } else {
        return a === b
      }
    }

    return false
  }

  // returns the first highest index
  public static maxIndex<T>(list: T[]): number {
    let n = list.length
    if (n === 0) {
      return -1
    }

    let bestIndex = 0
    for (var i = 1; i < n; ++i) {
      if (list[i] > list[bestIndex]) {
        bestIndex = i
      }
    }

    return bestIndex
  }

  // returns the index with the highest value, or multiple indices if there is a tie
  public static maxIndices<T>(list: T[]): number[] {
    let n = list.length
    if (n === 0) {
      return [-1]
    }

    let maxValue = list[0]
    for (var i = 1; i < n; ++i) {
      if (list[i] > maxValue) {
        maxValue = list[i]
      }
    }

    let indices = []
    for (var i = 0; i < n; ++i) {
      if (list[i] === maxValue) {
        indices.push(i)
      }
    }
    
    return indices
  }

  public static swapElements<T>(list: T[], i: number, j: number): T[] {
    let t = list[i]
    list[i] = list[j]
    list[j] = t
    return list
  }

  public static arrayIntersection<T>(a: T[], b: T[]): T[] {
     let intersection = []
     for (let x of a) {
       if (b.indexOf(x) !== -1) {
         intersection.push(x)
       }
     }
     return intersection
  }

  public static arrayUnion<T>(a: T[], b: T[]): T[] {
    let union = b.slice()
    for (let x of a) {
      if (union.indexOf(x) === -1) {
        union.push(x)
      }
    }
    return union
  }

  // returns integer in the range (min, max]
  public static randomInt(min: number, max: number): number {
    return Math.floor(Math.random()*(max - min) + min)
  }

  public static randomValue<T>(list: T[]): T {
    return list[Util.randomInt(0, list.length)]
  }

  public static fisherYates<T>(list: T[]): T[] {
    let n = list.length
    for (var i = 0; i < n - 1; ++i) {
      var j = Util.randomInt(i, n)
      Util.swapElements(list, i, j)
    }
    return list
  }

  public static sequence(min: number, max?: number, step: number = 1): number[] {
    if (!max) {
      max = min - 1
      min = 0
    }

    let n = Math.floor((max - min + 1)/step)
    var result = Array(n)
    for (var v = min, i = 0; i < n; v += step, ++i) {
      result[i] = v
    }
    return result
  }

  public static isListUnique<T>(list: T[]): boolean {
    let n = list.length
    for (var i = 0; i < n; ++i) {
      for (var j = i + 1; j < n; ++j) {
        if (list[i] === list[j]) {
          return false
        }
      }
    }
    return true
  }

  public static quitOnCtrlBreak() {
    // only works on nodejs
    if (process) {
      process.stdin.resume();

      process.on('SIGINT', () => {
        process.exit()
      });
    }
  }

  public static quit() {
    // only works on nodejs
    if (process) {
      process.exit();
    }
  }

  public static copyJSON(src: any) {
    if (src === null || typeof(src) !== 'object') {
      return src
    } else if (Array.isArray(src)) {
      let dest = []
      const n = src.length
      for (let i = 0; i < n; ++i) {
        dest[i] = Util.copyJSON(src[i])
      }
      return dest
    } else {
      let dest = {}
      for (let key in src) {
        dest[key] = Util.copyJSON(src[key])
      }
      return dest
    }
  }

  // takes items in lists of lists and places them into a list
  // only flattens the first level
  public static flatten(list: any[][]): any[] {
    let result = []
    for (let item in list) {
      if (Array.isArray(item)) {
        result.concat(item)
      } else {
        result.push(item)
      }
    }
    return result
  }
}
