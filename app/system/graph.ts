// NOTE edges may be unidirectional, so there may be an edge from A to B, but
// not from B to A
interface Node {
  name: string // name of this sector, corner or edge
  sectors?: string[] // adjacent sectors, only needed if pieces are placed in sectors
  corners?: string[] // adjacent corners, only needed if pieces are placed on corners
  edges?: string[] // adjacent edges, only needed if pieces are placed on edges
  [key: string]: any
}

export class Graph {
  sectors: {[name: string]: Node} = {}
  edges: {[name: string]: Node} = {}
  corners: {[name: string]: Node} = {}

  public addSector(sector: Node) { // only needed if pieces are placed on sectors
    this.sectors[sector.name] = sector
  }

  public addEdge(edge: Node) { // only needed if pieces are placed on edges
    this.edges[edge.name] = edge
    console.assert(
      typeof(edge.sectors) === 'undefined' ||
      edge.sectors.length === 0 ||
      edge.sectors.length === 2
    )
  }

  public addCorner(corner: Node) { // only needed if pieces are placed on corners
    this.corners[corner.name] = corner
  }

  // automatically adds sectors and populates their edges and sectors arrays
  // given a list of edge information and assuming that each edge is
  // bidirectional.  This function simplifies the graph setup
  public resolveSectors() {
    for (let edge in this.edges) {
      let edgeNode = this.edges[edge]
      if (Array.isArray(edgeNode.sectors)) {
        for (let sector of edgeNode.sectors) {
          if (typeof this.sectors[sector] === 'undefined') {
            this.sectors[sector] = {name: sector}
          }
          let sectorNode = this.sectors[sector]
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
    console.assert(typeof this.sectors[sectorName] !== 'undefined')
    return this.sectors[sectorName].sectors
  }

  public getAdjacentEdges(edgeName: string): string[] {
    console.assert(typeof this.edges[edgeName] !== 'undefined')
    return this.edges[edgeName].edges
  }

  public getAdjacentCorners(cornerName: string): string[] {
    console.assert(typeof this.corners[cornerName] !== 'undefined')
    return this.corners[cornerName].corners
  }

  public getSectorCorners(sectorName: string): string[] {
    console.assert(typeof this.sectors[sectorName] !== 'undefined')
    return this.sectors[sectorName].corners
  }

  public getSectorEdges(sectorName: string): string[] {
    console.assert(typeof this.sectors[sectorName] !== 'undefined')
    return this.sectors[sectorName].edges
  }

  public getEdgeCorners(edgeName: string): string[] {
    console.assert(typeof this.edges[edgeName] !== 'undefined')
    return this.edges[edgeName].corners
  }

  public getEdgeSectors(edgeName: string): string[] {
    console.assert(typeof this.edges[edgeName] !== 'undefined')
    return this.edges[edgeName].sectors
  }

  public getCornerEdges(cornerName: string): string[] {
    console.assert(typeof this.corners[cornerName] !== 'undefined')
    return this.corners[cornerName].edges
  }

  public getCornerSectors(cornerName: string): string[] {
    console.assert(typeof this.corners[cornerName] !== 'undefined')
    return this.corners[cornerName].sectors
  }

  // ensure all of the sectors, edges and nodes are linked to each other
  // NOTE links between edges, sectors and nodes may be one way
  public validateGraph() {
    for (let sector in this.sectors) {
      let node = this.sectors[sector]
      if (node.edges) {
        for (let edge of node.edges) {
          console.assert(typeof this.edges[edge] === 'object', `edge '${edge}' was not added`)
          console.assert(Array.isArray(this.edges[edge].sectors), `edge '${edge}' was added but does not have associated sector '${sector}'`)
          console.assert(this.edges[edge].sectors.indexOf(node.name) !== -1, `sector node '${sector}' was not added to this edge '${edge}'`)
        }
      }

      if (node.corners) {
        for (let corner of node.corners) {
          console.assert(typeof this.corners[corner] === 'object', `corner '${corner}' was not added`)
          console.assert(Array.isArray(this.corners[corner].sectors), `corner '${corner}' was added but does not have associated sector '${sector}'`)
          console.assert(this.corners[corner].sectors.indexOf(node.name) !== -1, `sector node '${sector}' was not added to this corner '${corner}'`)
        }
      }
    }

    for (let edge in this.edges) {
      let node = this.edges[edge]

      // NOTE edges may be bidirectional, so an edge can mention two sectors,
      // but only one of those sectors will mention the edge
      if (node.sectors) {
        let sectorHasThisEdge = false
        for (let sector of node.sectors) {
          console.assert(typeof this.sectors[sector] === 'object', `sector '${sector}' was not added`)
          sectorHasThisEdge = sectorHasThisEdge || (Array.isArray(this.sectors[sector].edges) && this.sectors[sector].edges.indexOf(node.name) !== -1)
        }
        console.assert(sectorHasThisEdge, `edge node '${edge}' was not connected to its sectors ${node.sectors}`)
      }

      if (node.corners) {
        for (let corner of node.corners) {
          console.assert(typeof this.corners[corner] === 'object', `corner '${corner}' was not added`)
          console.assert(Array.isArray(this.corners[corner].edges), `corner '${corner}' was added but does not have associated edge '${edge}'`)
          console.assert(this.corners[corner].edges.indexOf(node.name) !== -1, `edge node '${edge}' was not added to this corner '${corner}'`)
        }
      }
    }

    for (let corner in this.corners) {
      let node = this.corners[corner]
      if (node.sectors) {
        for (let sector of node.sectors) {
          console.assert(typeof this.sectors[sector] === 'object', `sector '${sector}' was not added`)
          console.assert(Array.isArray(this.sectors[sector].corners), `sector '${sector}' has added but does not have associated corner '${corner}'`)
          console.assert(this.sectors[sector].corners.indexOf(node.name) !== -1, `corner node '${corner}' was not added to this sector '${sector}'`)
        }
      }

      if (node.edges) {
        for (let edge of node.edges) {
          console.assert(typeof this.edges[edge] === 'object', `edge ${edge} was not added`)
          console.assert(Array.isArray(this.edges[edge].corners), `edge ${edge} was added but does not have associated corner ${corner}`)
          console.assert(this.edges[edge].corners.indexOf(node.name) !== -1, `corner ${corner} node was not added to this edge ${edge}`)
        }
      }
    }
  }
}
