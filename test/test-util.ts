import * as Tape from 'tape'
import Util from '../app/util.js'

Tape('test getCombinations', t => {
  let combo0 = Util.getCombinations([2,4,6,-1], 0)
  let combo1 = Util.getCombinations([2,4,6,-1], 1)
  let combo2 = Util.getCombinations([2,4,6,-1], 2)
  let combo3 = Util.getCombinations([2,4,6,-1], 3)
  let combo4 = Util.getCombinations([2,4,6,-1], 4)
  let combo5 = Util.getCombinations([2,4,6,-1], 1, 2)
  debugger
  let combo6 = Util.getCombinations([2,4,6,-1], 1, 1, (xs => (xs[0]%2 === 0))) // only even numbers

  t.deepEqual(combo0, [[]], 'empty combo')
  t.deepEqual(combo1, [[2], [4], [6], [-1]], 'combo of 1')
  t.deepEqual(combo2, [[2,4], [2,6], [2,-1], [4,6], [4,-1], [6,-1]], 'combo of 2')
  t.deepEqual(combo3, [[2,4,6], [2,4,-1], [2,6,-1], [4,6,-1]], 'combo of 3')
  t.deepEqual(combo4, [[2,4,6,-1]], 'combo of 4')
  t.deepEqual(combo5, [[2], [4], [6], [-1], [2,4], [2,6], [2,-1], [4,6], [4,-1], [6,-1]], 'combo of 1 or 2')
  t.deepEqual(combo6, [[2], [4], [6]], 'combo of 1, even numbers only')

  t.end()
})

Tape('test countBuckets', t => {
  let count0 = Util.countBuckets([], x => x.type)

  let alpha = [{type: 'a'}, {type: 'a'}, {type: 'b'}, {type: 'c'}, {type: 'c'}]
  let count1 = Util.countBuckets(alpha, x => x.type)

  t.deepEqual(count0, {}, 'empty')
  t.deepEqual(count1, {'a': 2, 'b': 1, 'c': 2}, 'variety')
  t.end()
})

Tape('test isEqual', t => {
  t.ok(Util.isEqual({}, {}), 'empty object')
  t.ok(Util.isEqual([], []), 'empty array')
  t.notOk(Util.isEqual([], {}), 'different types, arrays and objects')
  t.notOk(Util.isEqual(1, "1"), 'different types, numbers and strings')
  t.notOk(Util.isEqual(2, 3), 'different numbers')
  t.notOk(Util.isEqual('cat', 'dog'), 'different strings')
  t.notOk(Util.isEqual(['a'], ['b']), 'different arrays')
  t.notOk(Util.isEqual({a: 4}, {a: 5}), 'same keys, different values')
  t.notOk(Util.isEqual({a: 4}, {b: 4}), 'same values, different keys')
  t.ok(Util.isEqual(-1, -1), 'same values')
  t.ok(Util.isEqual('dummy', 'dummy'), 'same strings')
  t.ok(Util.isEqual([-1,2], [-1,2]), 'same arrays')
  t.ok(Util.isEqual({a: 1, b: 'x'}, {a: 1, b: 'x'}), 'same objects')

  t.end()
})
