import {Game, IPlayerData, ILocationData, ICardData} from '../system/game'
import {Graph} from '../system/graph'
import {Util} from '../system/util'

type AreaType = 'g' | 'm' | 'w'

type GridDirection = 'north' | 'south' | 'east' | 'west'
type GridOrientation = 0 | 90 | 180 | 270

interface IIoSLocationData extends ILocationData {
  maxCards?: number
}

interface IIoSCardData extends ICardData {
  borders?: string
  center?: string
  money?: number
  name?: string
  whisky?: number
  sheep?: number
  cattle?: number
  farms?: number
  brochs?: number
  lighthouses?: number
  ships?: number
  scroll?: string
  orientation?: GridOrientation // clockwise
}

class IsleOfSkye extends Game {
  rounds: {scoring: string[], behindBonus: number}[]
  round: number = 1  // rounds start from 1
  landGraphs: {[key: string]: Graph} = {}
}

const PLAYER_CASTLE_POS = {x: 0, y: 0}

const SCORES = ['a', 'b', 'c', 'd']

const COLORS = ['red', 'white', 'blue', 'green', 'yellow']

const DIRECTIONS: GridDirection[] = ['north', 'east', 'south', 'west']

const ROUNDS_TWO_TO_FOUR_PLAYER = [
  {scoring: ['a'], behindBonus: 0},
  {scoring: ['b'], behindBonus: 0},
  {scoring: ['a', 'c'], behindBonus: 1},
  {scoring: ['b', 'd'], behindBonus: 2},
  {scoring: ['a', 'c', 'd'], behindBonus: 3},
  {scoring: ['b', 'c', 'd'], behindBonus: 4}
]

const ROUNDS_FIVE_PLAYER = [
  {scoring: ['a', 'b'], behindBonus: 0},
  {scoring: ['a', 'c'], behindBonus: 0},
  {scoring: ['b', 'd'], behindBonus: 1},
  {scoring: ['a', 'c', 'd'], behindBonus: 2},
  {scoring: ['b', 'c', 'd'], behindBonus: 3}
]

const SCORING_TILES = [
  'four landscape',
  'sheep',
  'brochs',
  'whisky',
  'sheep and cattle',
  'cattle',
  'roads',
  'water',
  'areas',
  'areas at least three tiles',
  'broch, farm and lighthouse',
  'ships',
  'gold',
  'ship and lighthouse',
  'vertical landscape',
  'mountain'
]

// borders in order Center, North, East, South and West. Centre and First character is (g)rass,
// (w)ater, or (m)ountain; second character is the (#)number of a road or (-)nothing.
// Roads with the same number on a tile are connected

const TILES: IIoSCardData[] = [
  {borders: 'gg1w-g1m1', money: 5, name: 'blue_start'},
  {borders: 'gg1w-g1m1', money: 5, name: 'yellow_start'},
  {borders: 'gg1w-g1m1', money: 5, name: 'red_start'},
  {borders: 'gg1m1g1w-', money: 5, name: 'white_start'},
  {borders: 'gg1m1g1w-', money: 5, name: 'green_start'},
  {borders: 'gg1w-w-w-', whisky: 1, ships: 2},
  {borders: 'mg-m1g1g1', whisky: 1, farms: 1},
  {borders: 'gg-m1m1g-', farms: 1, sheep: 1, brochs: 1},
  {borders: 'mw-w-m1g1', scroll: 'one per broch'},
  {borders: 'wg1g1g-m-', ships: 1, farms: 1},
  {borders: 'ww-m1m1w-', ships: 1, lighthouses: 1},
  {borders: 'ww-w-m-w-', lighthouses: 1},
  {borders: 'gw-w-m-w-', sheep: 1, cattle: 1, lighthouses: 1},
  {borders: 'gm1g2g2g1', sheep: 2},
  {borders: 'gm-w-g1g1', sheep: 1, farms: 1},
  {borders: 'gg-m1g1m1', whisky: 1, farms: 1},
  {borders: 'gm-w-w-g-', cattle: 1, ships: 1},
  {borders: 'mw-w-w-g-', brochs: 1, ships: 1},
  {borders: 'mg-g1m1m-', brochs: 1, sheep: 1},
  {borders: 'mm-w-m1m1', scroll: 'one per two whisky'},
  {borders: 'gg-m1m1g-', scroll: 'one per farm', whisky: 1, money: 1},
  {borders: 'gg1m-m1m1', farms:1, whisky: 1},
  {borders: 'wg1w-g-m1', sheep: 1, ships: 1},
  {borders: 'gm-w-w-w-', sheep: 2, ships: 1},
  {borders: 'gw-g-w-m-', sheep: 2},
  {borders: 'mw-m1m-w-', whisky: 1, brochs: 1},
  {borders: 'mw-m1m1w-', ships: 1, scroll: 'one per broch'},
  {borders: 'gm1g1g-w-', farms: 1, scroll: 'one per two sheep'},
  {borders: 'mg-g1g1w-', cattle: 1, whisky: 1, lighthouses: 1},
  {borders: 'mw-g1m1w-', ships: 1, whisky: 1},
  {borders: 'wg-w-g-w-', lighthouses: 1},
  {borders: 'ew-w-g-w-', lighthouses: 1, scroll: 'one per two ships'},
  {borders: 'gg1w-g-g1', sheep: 1, cattle: 1, farms: 1},
  {borders: 'mw-m1m1g1', whisky: 1},
  {borders: 'mg1w-g1m1', whisky: 1, brochs: 1, lighthouses: 1},
  {borders: 'mm1g1g1w-', whisky: 1, farms: 1, lighthouses: 1},
  {borders: 'wg-m-g-g-', sheep: 1, cattle: 1, ships: 1},
  {borders: 'wg1m-g1w-', ships: 1},
  {borders: 'ww-w-w-g-', ships: 1},
  {borders: 'mg-g1m1m-', sheep: 1, whisky: 1},
  {borders: 'mg1m-m-m1', brochs: 1},
  {borders: 'ww-w-g-g-', lighthouses: 1},
  {borders: 'gg-g1w-w-', whisky: 1, cattle: 1, ships: 1},
  {borders: 'gg1m-g1g1', whisky: 1, sheep: 2},
  {borders: 'mw-g1m1m-', brochs: 1},
  {borders: 'gm1w-m-w-', whisky: 1, cattle: 1, lighthouses: 1},
  {borders: 'mm1g-m1w-', whisky: 1, lighthouses: 1},
  {borders: 'ww-w-w-m-', ships: 2},
  {borders: 'gm1g2g2g1', scroll: 'one per cattle'},
  {borders: 'mw-m1w-m1', ships: 2},
  {borders: 'mw-g1m1w-', ships: 2, whisky: 1},
  {borders: 'gw-w-m1g1', ships: 1, sheep: 1, farms: 1},
  {borders: 'gw-g1m1g-', cattle: 1, scroll: 'one per two sheep'},
  {borders: 'gg1w-w-w-', cattle: 1, whisky: 1, farms: 1},
  {borders: 'mg1g-g1m1', cattle: 1, sheep: 1,  whisky: 1},
  {borders: 'mw-w-w-g1', whisky: 1, brochs: 1},
  {borders: 'wg1m-g1m1', ships: 1},
  {borders: 'wm1g1g-w-', sheep: 1, lighthouses: 1},
  {borders: 'ww-m1m1g-', lighthouses: 1},
  {borders: 'gw-g-g-w-', sheep: 1, scroll: 'one per farm'},
  {borders: 'mg-w-g-w-', brochs: 1, lighthouses: 1},
  {borders: 'wg1m-m1m-', brochs: 1},
  {borders: 'gm1m1m-w-', farms: 1, whisky: 1},
  {borders: 'gw-w-g1m1', farms: 1, cattle: 1, ships: 1},
  {borders: 'mg1m-g1m1', brochs: 1, whisky: 1},
  {borders: 'ww-g1g1w-', ships: 1, scroll: 'one per lighthouse'},
  {borders: 'wg-w-w-g-', lighthouses: 1, scroll: 'one per two ships'},
  {borders: 'mg1m1w-m-', brochs: 1, scroll: 'one per two whisky'},
  {borders: 'gg1w-g1w-', whisky: 1, scroll: 'one per cattle'},
  {borders: 'mw-m1m1m-', brochs: 1, whisky: 1},
  {borders: 'gg1g-g1m1', whisky: 1, cattle: 2, sheep: 1},
  {borders: 'mg1m1m-m-', whisky: 1, brochs: 1},
  {borders: 'gm1g1g-w-', sheep: 1, cattle: 1, farms: 1},
  {borders: 'gg1w-g1w-', cattle: 1, whisky: 1},
  {borders: 'wm-w-m-w-', ships: 2},
  {borders: 'ww-w-g-g-', ships: 1, scroll: 'one per lighthouse'},
  {borders: 'gw-g-m1m1', sheep: 3},
  {borders: 'wm-g1g-m1', farms: 1},
]

const SCROLL_SCORES: {[scroll: string]: (g: IsleOfSkye, p: Graph) => number} = {
  'one per broch': (g,p) => countFeatures(g, p, 'broch'),
  'one per two whisky': (g,p) => Math.floor(countFeatures(g, p, 'whisky')/2),
  'one per farm': (g,p) => countFeatures(g, p, 'farm'),
  'one per two sheep': (g,p) => Math.floor(countFeatures(g, p, 'sheep')/2),
  'one per two ships': (g,p) => Math.floor(countFeatures(g, p, 'ships')/2),
  'one per cattle': (g,p) => countFeatures(g, p, 'cattle'),
  'one per lighthouse': (g,p) => countFeatures(g, p, 'lighthouses'),
}

function calcScrollValue(g: IsleOfSkye, playerGraph: Graph, scroll: string) {
  return SCROLL_SCORES[scroll](g, playerGraph)
}

function countFeatures(g: IsleOfSkye, playerGraph: Graph, key: string): number {
  let score = 0
  for (let tile of getUsedTiles(g, playerGraph)) {
    const cardData = g.getCardData(tile)
    if (cardData[key]) {
      score += cardData[key]
    }
  }
  return score
}

// returns an array of tiles for this 'areaType'. A tile may be present in multiple
// areas. There is an option to only return areas that are completely enclosed
// by other types of areas
function calcJoinedAreas(g: IsleOfSkye, playerGraph: Graph, areaType: AreaType, onlyCompletedAreas = false): string[][] {
  const locations = getUsedLocations(g, playerGraph)
  const connections: {tile: string, direction: string}[][] = []
  let joinedAreas: string[][] = []

  // build a list of tiles that
  for (let location of locations) {
    const tile = g.getCards(location)[0]
    const tileData = g.getCardData(tile)
    const northType = getBorder(tileData, 'north')
    const southType = getBorder(tileData, 'south')
    const eastType = getBorder(tileData, 'east')
    const westType = getBorder(tileData, 'west')
    const centerType = getCenter(tileData)
    const adjacentLocations = playerGraph.getAdjacentSectors(location)
    let matchingBorders = 0

    // Possible intra-tile connections are: NE, ES, SW, WN, NCS, ECW, NESW, NES, ESW, SWN, WNE
    // Thus non-connections are E and W with no interconnections and N and S with no interconnections
    if (eastType === areaType && westType === areaType && northType !== areaType && southType !== areaType && centerType !== areaType) {
      connections.push([{tile, direction: 'west'}])
      connections.push([{tile, direction: 'east'}])
    } else if (northType === areaType && southType === areaType && eastType !== areaType && westType !== areaType && centerType !== areaType) {
      connections.push([{tile, direction: 'north'}])
      connections.push([{tile, direction: 'south'}])
    } else {
      let intraTileConnections: {tile: string, direction: string}[] = []
      for (let direction of DIRECTIONS) {
        if (getBorder(tileData, direction) === areaType) {
          intraTileConnections.push({tile, direction})
        }
      }

      if (intraTileConnections.length > 0) {
        connections.push(intraTileConnections)
      } else if (centerType === areaType) {
        // if there are no borders of the area type, but the center matches
        // then a completed area must be in the center of the tile
        joinedAreas.push([tile])
      }
    }

    // for each of the adjacent sectors, if the shared border is the type we are
    // looking for then push it onto 'areaTiles'.  If this border does not
    // connect to other borders, then complete this 'landArea'
    for (let directionString in adjacentLocations) {
      const direction = stringToDirection(directionString)
      if (getBorder(tileData, direction) === areaType) {
        const adjacentLocation = adjacentLocations[direction]
        const adjacentTiles = g.getCards(adjacentLocation)
        if (adjacentTiles.length > 0) {
          console.assert(adjacentTiles.length === 1, `location '${adjacentLocation}' contains too many tiles ${adjacentTiles}`)
          const adjacentTileData = g.getCardData(adjacentTiles[0])
          const oppositeDirection = getOppositeDirection(direction)
          if (getBorder(adjacentTileData, oppositeDirection) === areaType) {
            connections.push([{tile, direction}, {tile: adjacentTiles[0], direction: oppositeDirection}])
          }
        }
      }
    }
  }

  // for all connections
  for (let i = 0; i < connections.length; ++i) {
    const landList = connections[i]

    // look at each land border in this sequence
    for (let k = 0; k < landList.length; ++k) {
      const land = landList[k]
      let matchFound = false

      // look for the matching land border in a later sequence
      for (let j = i + 1; !matchFound && i < connections.length; ++j) {
        const otherLandList = connections[j]

        for (let otherLand of otherLandList) {
          if (land.tile === otherLand.tile && land.direction === otherLand.direction) {
            matchFound = true
            break
          }
        }

        // if there was a matching land border then merge the sequence into the earlier one
        // and remove it from the 'connections' list
        if (matchFound) {
          for (let otherLand of otherLandList) {
            if (landList.indexOf(otherLand) === -1) {
              landList.push(otherLand)
            }
          }
          connections.splice(j, 1)
        }
      }
    }
  }

  // extract the tile information from the connections
  for (let landLists of connections) {
    let areas = []
    for (let land of landLists) {
      if (areas.indexOf(land.tile) === -1) {
        areas.push(land.tile)
      }
    }
    console.assert(areas.length > 0)
    joinedAreas.push(areas)
  }

  return joinedAreas
}

const DIRECTION_ROTATION_MATRIX: {[key: string]: GridDirection[]} = {
    north: ['north', 'east', 'south', 'west'],
    east: ['east', 'south', 'west', 'north'],
    south: ['south', 'west', 'north', 'east'],
    west: ['west', 'north', 'east', 'south'],
}

function rotateDirection(direction: GridDirection, rotation: GridOrientation): GridDirection {
  return DIRECTION_ROTATION_MATRIX[direction][Math.floor(rotation as number/90)]
}

const ORIENTATION_ROTATION_MATRIX: GridOrientation[][] = [
  [0, 90, 180, 270],
  [90, 180, 270, 0],
  [180, 270, 0, 90],
  [90, 180, 270, 0],
]

function rotateOrientation(orientation: GridOrientation, rotation: GridOrientation): GridOrientation {
  return ORIENTATION_ROTATION_MATRIX[Math.floor(orientation as number/90)][Math.floor(rotation as number/90)]
}

function stringToDirection(direction: string): GridDirection {
    switch (direction) {
      case 'north':
      case 'south':
      case 'east':
      case 'west':
        return direction as GridDirection
      default:
        console.assert(false, `unknown direction '${direction}'`)
    }
}

function directionToOrientation(direction: GridDirection): GridOrientation {
  switch (direction) {
    case 'north': return 0
    case 'east': return 90
    case 'south': return 180
    case 'west': return 270
  }
}

function orientationToDirection(orientation: GridOrientation): GridDirection {
  switch (orientation) {
    case 0: return 'north'
    case 90: return 'east'
    case 180: return 'south'
    case 270: return 'west'
  }
}

function stringToAreaType(areaType: string): AreaType {
  switch (areaType) {
    case 'g':
    case 'm':
    case 'w':
      return areaType as AreaType
    default:
      console.assert(false, `unknown areaType '${areaType}'`)
  }
}

function getLandName(prefix: string, x: number, y: number) {
  return `${prefix}-${x},${y}`
}

function getLandIndices(landName: string): {x: number, y: number} {
  const parts = landName.split('-')
  const indices = parts[1].split(',')
  const x = parseInt(indices[0])
  const y = parseInt(indices[1])
  return {x,y}
}

// orientation turns the tile clockwise
function rotateBorders(borders: string, orientation: GridOrientation): string {
  let center = borders[0]
  switch (orientation) {
    case 0:
      return borders
    case 90:
      return center + borders.substr(-2) + borders.substr(1,6)
    case 180:
      return center + borders.substr(-4) + borders.substr(1,4)
    case 270:
      return center + borders.substr(-6) + borders.substr(1,2)
  }
}

// a side is two characters, first is for the border area type and second represents the road
function getSide(tileData: IIoSCardData, direction: GridDirection): string {
  switch(direction) {
    case 'north':
      return tileData.borders.substr(1,2)
    case 'south':
      return tileData.borders.substr(3,2)
    case 'east':
      return tileData.borders.substr(5,2)
    case 'west':
      return tileData.borders.substr(7,2)
  }
}

function getBorder(tileData: IIoSCardData, direction: GridDirection): AreaType {
  const borders = rotateBorders(tileData.borders, tileData.orientation)
  switch(direction) {
    case 'north':
      return stringToAreaType(borders.substr(1,1))
    case 'south':
      return stringToAreaType(borders.substr(3,1))
    case 'east':
      return stringToAreaType(borders.substr(5,1))
    case 'west':
      return stringToAreaType(borders.substr(7,1))
  }
}

function getCenter(borders: string): AreaType {
  return stringToAreaType(borders[0])
}

function getOppositeDirection(direction: GridDirection): GridDirection {
  switch(direction) {
    case 'north': return 'south'
    case 'south': return 'north'
    case 'east': return 'west'
    case 'west': return 'east'
  }
}

function isBorderValid(a: string, b: string, useRoad: boolean = false): boolean {
  return a[0] === b[0] && (!useRoad || (a[1] === 'r' && a[1] === b[1]))
}

function populateGrid(g: IsleOfSkye, prefix: string, xmin: number, ymin: number, xmax: number, ymax: number): Graph {
  let graph = new Graph()
  for (let x = xmin; x < xmax; ++x) {
    for (let y = ymin; y < ymax; ++y) {
      const name = getLandName(prefix, x, y)
      g.addLocation(name)

      let adjacent = {}
      if (x > xmin) {
        adjacent['east'] = getLandName(prefix, x - 1, y)
      }
      if (x < xmax) {
        adjacent['west'] = getLandName(prefix, x + 1, y)
      }
      if (y > ymin) {
        adjacent['north'] = getLandName(prefix, x, y - 1)
      }
      if (y < ymax) {
        adjacent['south'] = getLandName(prefix, x, y + 1)
      }

      graph.addSector({name, sectors: adjacent})
    }
  }
  return graph
}

// unoccipied locations that are adjacent to an occupied location, floods from 0,0
function getBorderLocations(g: IsleOfSkye, playerGraph: Graph, prefix: string, start = PLAYER_CASTLE_POS): string[] {
  let borders: string[] = []
  let pending: string[] = []

  const center = getLandName(prefix, start.x, start.y)
  if (g.getCardCount(center) === 0) {
    return [center] // if start unoccipied, then it has a single border location
  }

  pending.push(center)
  let pendingIndex = 0

  while (pendingIndex < pending.length) {
    const land = pending[pendingIndex++]

    if (g.getCardCount(land) > 0) {
      let sectors = playerGraph.getAdjacentSectors(land)

      for (let direction in sectors) {
        const adjacent = sectors[direction]

        if (g.getCardCount(adjacent) > 0) {
          if (pending.indexOf(adjacent) === -1) {
            pending.push(adjacent)
          }
        } else if (borders.indexOf(adjacent) === -1) {
          borders.push(adjacent)
        }
      }
    }
  }
  return borders
}

// returns the possible orientations for a 'tile' at this 'location', returns
// an empty array if there are no possible orientations
function calcTileOrientations(g: IsleOfSkye, playerGraph: Graph, tile: string, location: string): GridOrientation[] {
  if (g.getCardCount(location) > 0) {
    return [] // location already occupied
  }

  let orientations: GridOrientation[] = [0,90,180,270]
  const adjacentSectors = playerGraph.getAdjacentSectors(location)
  const tileData = g.getCardData(tile)

  for (let key in adjacentSectors) {
    const direction = stringToDirection(key)
    const adjacents = g.getCards(adjacentSectors[key])
    if (adjacents.length === 0) {
      continue
    }

    console.assert(adjacents.length === 1, `too many cards at location '${location}'`)
    const adjacentData: IIoSCardData = g.getCardData(adjacents[0])
    console.assert(typeof adjacentData.borders !== 'undefined', `incorrect card '${adjacents[0]}' in location '${location}', no borders information`)

    // loop backwards so we can remove orientations that do not have matching borders with this adjacent tile
    const adjacentBorder = getBorder( adjacentData, rotateDirection(getOppositeDirection(direction), adjacentData.orientation) )
    for (let j = orientations.length - 1; j >= 0; --j) {
      const orientation = orientations[j]
      const tileDirection = rotateDirection(direction, orientation)
      if ( !isBorderValid(adjacentBorder, getBorder(tileData.borders, tileDirection), false) ) {
        orientations.splice(j, 1)
      }
    }
  }

  return orientations
}

function getUsedTiles(g: IsleOfSkye, playerGraph: Graph): string[] {
  let tiles = []
  for (let land of playerGraph.getSectors()) {
    let cards = g.getCards(land)
    if (cards.length > 0) {
      tiles.push(...cards)
    }
  }

  return tiles
}

function getUsedLocations(g: IsleOfSkye, playerGraph: Graph): string[] {
  let locations = []
  for (let land of playerGraph.getSectors()) {
    if (g.getCardCount(land) > 0) {
      locations.push(land)
    }
  }

  return locations
}

function setup(g: IsleOfSkye, numPlayers: number) {
  console.assert(numPlayers >= 2 && numPlayers <= 5)

  const xmin = -10, xmax = 10, ymin = -10, ymax = 10
  g.landGraphs = {}

  for (let i = 0; i < numPlayers; ++i) {
    const player = i.toString()
    g.addPlayer('Player_' + player)
    g.addLocation('Hand_' + player, {maxCards: 3} as IIoSLocationData)
    g.addLocation('Money_' + player)
    g.addLocation('Discard_' + player, {maxCards: 3} as IIoSLocationData)

    let prefix = 'Land_' + player
    g.landGraphs[prefix] = populateGrid(g, prefix, xmin, ymin, xmax, ymax)
  }

  g.rounds = numPlayers === 5 ? ROUNDS_FIVE_PLAYER : ROUNDS_TWO_TO_FOUR_PLAYER

  for (let i = 0; i < g.rounds.length; ++i) {
    g.addLocation('Round_' + (i + 1))
  }

  for (let x of SCORES) {
    g.addLocation('Score_' + x)
  }

  g.addLocation('ScoringDeck')
  g.addLocation('LandscapeDeck')

  for (let x of SCORING_TILES) {
    g.addCard('ScoringDeck', x)
  }

  let i = 0
  for (let tile of TILES) {
    let name = tile.name || tile.borders
    g.addCard('LandscapeDeck', name, Object.assign({orientation: 0}, tile))
  }
}

async function rules(g: IsleOfSkye) {
  const numPlayers = g.getAllPlayers().length

  g.round = 1
  g.shuffle('ScoringDeck')

  for (let x of SCORES) {
    g.move('ScoringDeck', 'Score_' + x, 1)
  }

  for (let player = 0; player < numPlayers; ++player) {
    // would it be simpler to say 'Land_0/0,0/0deg' or use three parameters 'Land', [0,0] and 0 deg?
    g.moveCards(COLORS[player] + '_start', 'Land_' + player, 1, [0,0])
  }
}
