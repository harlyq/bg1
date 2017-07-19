export default class Util {
  public static assert(cond, msg = "assert failed") {
    if (!cond) {
      debugger
      throw new Error(msg)
    }
  }

  public static maxIndex<T>(list: T[]): number {
    let n = list.length
    if (n === 0) {
      return -1
    }

    let maxIndex = 0
    for (var i = 1; i < n; ++i) {
      if (list[i] > list[maxIndex]) {
        maxIndex = i
      }
    }

    return maxIndex
  }

  public static swapElements<T>(list: T[], i: number, j: number): T[] {
    let t = list[i]
    list[i] = list[j]
    list[j] = t
    return list
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
}
