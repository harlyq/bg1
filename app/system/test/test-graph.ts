import * as Tape from 'Tape'
import {Graph} from '../graph'
//import Util from '../util'

Tape.test('test graph sectors', (test) => {
  let g = new Graph()

  g.addSector({name: 'A', sectors: ['B', 'D']})
  g.addSector({name: 'B', sectors: ['A', 'C']})
  g.addSector({name: 'C', sectors: []}) // link from b to c, but not c to b
  g.addSector({name: 'D', sectors: ['A']})
  g.validateGraph()

  test.equal(g.getSectors().length, 4, "4 sectors")
  test.deepEqual(g.getAdjacentSectors('A'), ['B','D'], "A links to B and D")
  test.deepEqual(g.getAdjacentSectors('C'), [], "C is linked to nothing")
  test.deepEqual(g.getAdjacentSectors('B'), ['A', 'C'], "B links to A and C")

  test.end()
})

Tape.test('test graph edges', (test) => {
  let g = new Graph()

  g.addSector({name: 'A', sectors: ['B', 'D'], edges: ['ab', 'ad']}) // these edges are bidirectional
  g.addSector({name: 'B', sectors: ['A', 'C'], edges: ['ab', 'bc']})
  g.addSector({name: 'C', sectors: []}) // link from b to c, but not c to b
  g.addSector({name: 'D', sectors: ['A'], edges: ['ad']})
  g.addEdge({name: 'ab', sectors: ['A', 'B']})
  g.addEdge({name: 'ad', sectors: ['A', 'D']})
  g.addEdge({name: 'bc', sectors: ['B', 'C']})
  g.validateGraph()

  test.equal(g.getSectors().length, 4, "4 sectors")
  test.equal(g.getEdges().length, 3, "3 edges")
  test.deepEqual(g.getSectorEdges('A'), ['ab', 'ad'], "A has edges ab and ad")
  test.deepEqual(g.getSectorEdges('B'), ['ab', 'bc'], "B has edges ab and bc")
  test.deepEqual(g.getEdgeSectors('ab'), ['A', 'B'], "edge ab links sectors A and B") // do we care about the order?

  test.end()
})

Tape.test('test graph resolveEdges', (test) => {
  let g = new Graph()

  g.addEdge({name: 'ab', sectors: ['A', 'B']})
  g.addEdge({name: 'ad', sectors: ['A', 'D']})
  g.addEdge({name: 'bc', sectors: ['B', 'C']})
  g.resolveSectors()
  g.validateGraph()

  test.equal(g.getSectors().length, 4, "4 sectors")
  test.equal(g.getEdges().length, 3, "3 edges")
  test.deepEqual(g.getSectorEdges('A'), ['ab', 'ad'], "A has edges ab and ad")
  test.deepEqual(g.getSectorEdges('B'), ['ab', 'bc'], "B has edges ab and bc")
  test.deepEqual(g.getSectorEdges('C'), ['bc'], "C has edge bc")
  test.deepEqual(g.getSectorEdges('D'), ['ad'], "D has edge ad")
  test.deepEqual(g.getAdjacentSectors('A'), ['B', 'D'], "A has edges to B and D")
  test.deepEqual(g.getAdjacentSectors('B'), ['A', 'C'], "B has edges to A and C")
  test.deepEqual(g.getAdjacentSectors('C'), ['B'], "C has an edge to B")
  test.deepEqual(g.getAdjacentSectors('D'), ['A'], "D has an edge to A")

  test.end()
})
