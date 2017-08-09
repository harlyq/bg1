import * as Tape from 'tape'
import {Chain} from '../chain'

Tape('test length', t => {
  let chain1 = new Chain()
  let chain2 = new Chain(['a','b','c'])

  t.equal(chain1.getLength(), 0, 'empty chain')
  t.equal(chain2.getLength(), 3, 'chain with some elements')

  t.end()
})

Tape('test prev/next in loop', t => {
  let c = new Chain(['a','b','c'])

  let x = 'a'

  x = c.next(x)
  t.equal(x, 'b', 'next is b')
  x = c.next(x)
  t.equal(x, 'c', 'next is c')
  x = c.next(x)
  t.equal(x, 'a', 'next is a')

  x = c.prev(x)
  t.equal(x, 'c', 'next is c')
  x = c.prev(x)
  t.equal(x, 'b', 'next is b')
  x = c.prev(x)
  t.equal(x, 'a', 'next is a')

  t.end()
})

Tape('test prev/next with add/remove', t => {
  let c = new Chain(['a','b','c'])

  let x = 'a'

  t.comment('add d and remove b and c')
  c.add('d') // to the end
  c.remove('b')
  c.remove('c')
  x = c.next(x)
  t.equal(x, 'd', 'next is d')
  x = c.next(x)
  t.equal(x, 'a', 'next is a')
  x = c.next(x)
  t.equal(x, 'd', 'next is d')

  x = 'd'
  x = c.prev(x)
  t.equal(x, 'a', 'next is a')
  x = c.prev(x)
  t.equal(x, 'd', 'next is d')
  x = c.prev(x)
  t.equal(x, 'a', 'next is a')

  t.comment('re-add b')
  c.add('b') // re-activate b in the middle

  x = 'a'
  x = c.next(x)
  t.equal(x, 'b', 'next is b')
  x = c.next(x)
  t.equal(x, 'd', 'next is d')
  x = c.next(x)
  t.equal(x, 'a', 'next is a')

  t.end()
})

Tape('test random', t => {
  let c = new Chain([0,1,2,3,4,5,6,7,8,9])

  let n = c.getLength()*10
  var result = []
  for (var i = 0; i < n; ++i) {
    var x = c.random()
    result[x] = (result[x] || 0) + 1
  }

  t.ok(result.length === c.getLength() && result.every(x => x > 1), 'all items have been chosen at least once')

  t.comment('remove two items')
  c.remove(3)
  c.remove(7)

  result = []
  for (var i = 0; i < n; ++i) {
    var x = c.random()
    result[x] = (result[x] || 0) + 1
  }

  t.ok(result.length === c.getLength() + 2 && result.every((x,i) => x > 1 || i === 3 || i === 7), 'all valid items have values')
  t.notOk(result[3], 'item 3 never chosen')
  t.notOk(result[7], 'item 7 never chosen')

  t.end()
})
