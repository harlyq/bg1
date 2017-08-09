// NOTE edges may be unidirectional, so there may be an edge from A to B, but
// not from B to A
export interface Node {
  name: string // name of this sector, corner or edge
  sectors?: string[] // adjacent sectors, only needed if pieces are placed in sectors
  corners?: string[] // adjacent corners, only needed if pieces are placed on corners
  edges?: string[] // adjacent edges, only needed if pieces are placed on edges
  [key: string]: any
}

export class Graph {
  allSectors: {[name: string]: Node} = {}
  allEdges: {[name: string]: Node} = {}
  allCorners: {[name: string]: Node} = {}

  public getSectors(): string[] {
    return Object.keys(this.allSectors)
  }

  public getEdges(): string[] {
    return Object.keys(this.allEdges)
  }

  public getCorners(): string[] {
    return Object.keys(this.allCorners)
  }

  public getSector(sectorName: string): Node {
    return this.allSectors[sectorName]
  }

  public getEdge(edgeName: string): Node {
    return this.allEdges[edgeName]
  }

  public getCorner(cornerName: string): Node {
    return this.allCorners[cornerName]
  }

  public addSector(sector: Node | Node[]) { // only needed if pieces are placed on sectors
    let sectors = Array.isArray(sector) ? sector : [sector]

    for (let x of sectors) {
      console.assert(typeof this.allSectors[x.name] === 'undefined', `sector '${x.name}' already exists`)
      this.allSectors[x.name] = x
    }
  }

  public addEdge(edge: Node | Node[]) { // only needed if pieces are placed on edges
    let edges = Array.isArray(edge) ? edge : [edge]
    for (let x of edges) {
      console.assert(typeof this.allEdges[x.name] === 'undefined', `edge '${x.name}' already exists`)
      this.allEdges[x.name] = x
      console.assert((
          typeof(x.sectors) === 'undefined' ||
          x.sectors.length === 0 ||
          x.sectors.length === 2
        ),
        `sectors '${x.sectors}' must be either empty or have two sectors`
      )
    }
  }

  public addCorner(corner: Node) { // only needed if pieces are placed on corners
    let corners = Array.isArray(corner) ? corner : [corner]

    for (let x of corners) {
      console.assert(typeof this.allCorners[x.name] === 'undefined', `corner '${x.name}' already exists`)
      this.allCorners[x.name] = x
    }
  }

  // automatically adds sectors and populates their edges and sectors arrays
  // given a list of edge information and assuming that each edge is
  // bidirectional.  This function simplifies the graph setup
  public resolveSectors() {
    for (let edge in this.allEdges) {
      let edgeNode = this.allEdges[edge]
      if (Array.isArray(edgeNode.sectors)) {
        for (let sector of edgeNode.sectors) {
          if (typeof this.allSectors[sector] === 'undefined') {
            this.allSectors[sector] = {name: sector}
          }
          let sectorNode = this.allSectors[sector]
          sectorNode.edges = sectorNode.edges || []
          sectorNode.edges.push(edge)
          sectorNode.sectors = sectorNode.sectors || []

          for (let otherSector of edgeNode.sectors) {
            if (otherSector !== sector) {
              if (sectorNode.sectors.indexOf(otherSector) === -1) {
                sectorNode.sectors.push(otherSector)
              }
            }
          }
        }
      }
    }
  }

  public getAdjacentSectors(sectorName: string): string[] {
    console.assert(typeof this.allSectors[sectorName] !== 'undefined')
    return this.allSectors[sectorName].sectors
  }

  public getAdjacentEdges(edgeName: string): string[] {
    console.assert(typeof this.allEdges[edgeName] !== 'undefined')
    return this.allEdges[edgeName].edges
  }

  public getAdjacentCorners(cornerName: string): string[] {
    console.assert(typeof this.allCorners[cornerName] !== 'undefined')
    return this.allCorners[cornerName].corners
  }

  public getSectorCorners(sectorName: string): string[] {
    console.assert(typeof this.allSectors[sectorName] !== 'undefined')
    return this.allSectors[sectorName].corners
  }

  public getSectorEdges(sectorName: string): string[] {
    console.assert(typeof this.allSectors[sectorName] !== 'undefined')
    return this.allSectors[sectorName].edges
  }

  public getEdgeCorners(edgeName: string): string[] {
    console.assert(typeof this.allEdges[edgeName] !== 'undefined')
    return this.allEdges[edgeName].corners
  }

  public getEdgeSectors(edgeName: string): string[] {
    console.assert(typeof this.allEdges[edgeName] !== 'undefined')
    return this.allEdges[edgeName].sectors
  }

  public getCornerEdges(cornerName: string): string[] {
    console.assert(typeof this.allCorners[cornerName] !== 'undefined')
    return this.allCorners[cornerName].edges
  }

  public getCornerSectors(cornerName: string): string[] {
    console.assert(typeof this.allCorners[cornerName] !== 'undefined')
    return this.allCorners[cornerName].sectors
  }

  // ensure all of the sectors, edges and nodes are linked to each other
  // NOTE links between edges, sectors and nodes may be one way
  public validateGraph() {
    for (let sector in this.allSectors) {
      let node = this.allSectors[sector]
      if (node.edges) {
        for (let edge of node.edges) {
          console.assert(typeof this.allEdges[edge] === 'object', `edge '${edge}' was not added`)
          console.assert(Array.isArray(this.allEdges[edge].sectors), `edge '${edge}' was added but does not have associated sector '${sector}'`)
          console.assert(this.allEdges[edge].sectors.indexOf(node.name) !== -1, `sector node '${sector}' was not added to this edge '${edge}'`)
        }
      }

      if (node.corners) {
        for (let corner of node.corners) {
          console.assert(typeof this.allCorners[corner] === 'object', `corner '${corner}' was not added`)
          console.assert(Array.isArray(this.allCorners[corner].sectors), `corner '${corner}' was added but does not have associated sector '${sector}'`)
          console.assert(this.allCorners[corner].sectors.indexOf(node.name) !== -1, `sector node '${sector}' was not added to this corner '${corner}'`)
        }
      }
    }

    for (let edge in this.allEdges) {
      let node = this.allEdges[edge]

      // NOTE edges may be bidirectional, so an edge can mention two sectors,
      // but only one of those sectors will mention the edge
      if (node.sectors) {
        let sectorHasThisEdge = false
        for (let sector of node.sectors) {
          console.assert(typeof this.allSectors[sector] === 'object', `sector '${sector}' was not added`)
          sectorHasThisEdge = sectorHasThisEdge || (Array.isArray(this.allSectors[sector].edges) && this.allSectors[sector].edges.indexOf(node.name) !== -1)
        }
        console.assert(sectorHasThisEdge, `edge node '${edge}' was not connected to its sectors ${node.sectors}`)
      }

      if (node.corners) {
        for (let corner of node.corners) {
          console.assert(typeof this.allCorners[corner] === 'object', `corner '${corner}' was not added`)
          console.assert(Array.isArray(this.allCorners[corner].edges), `corner '${corner}' was added but does not have associated edge '${edge}'`)
          console.assert(this.allCorners[corner].edges.indexOf(node.name) !== -1, `edge node '${edge}' was not added to this corner '${corner}'`)
        }
      }
    }

    for (let corner in this.allCorners) {
      let node = this.allCorners[corner]
      if (node.sectors) {
        for (let sector of node.sectors) {
          console.assert(typeof this.allSectors[sector] === 'object', `sector '${sector}' was not added`)
          console.assert(Array.isArray(this.allSectors[sector].corners), `sector '${sector}' has added but does not have associated corner '${corner}'`)
          console.assert(this.allSectors[sector].corners.indexOf(node.name) !== -1, `corner node '${corner}' was not added to this sector '${sector}'`)
        }
      }

      if (node.edges) {
        for (let edge of node.edges) {
          console.assert(typeof this.allEdges[edge] === 'object', `edge ${edge} was not added`)
          console.assert(Array.isArray(this.allEdges[edge].corners), `edge ${edge} was added but does not have associated corner ${corner}`)
          console.assert(this.allEdges[edge].corners.indexOf(node.name) !== -1, `corner ${corner} node was not added to this edge ${edge}`)
        }
      }
    }
  }
}
