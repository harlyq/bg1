import {Game, GameSystem, IGameState, IGameOptions} from "../system/game.js"
import * as React from "react"
import * as ReactDom from "react-dom"
import * as ReactTransitionGroup from "react-transition-group"


const h = React.createElement

interface IBGCard {
  name: string
}

class BGCard extends React.Component<IBGCard, {}> {
  render() {
    return (
      h('div', {className: 'bg-card'}, this.props.name)
    )
  }
}

interface IBGPlace {
  name: string
  cards?: string[]
}

class BGPlace extends React.Component<IBGPlace, {}> {
  render() {
    return (
      h('div', {className: 'bg-place'},
        h('div', null, this.props.name),
        this.props.cards.slice().reverse().map(cardName =>
          h(BGCard, {name: cardName, key: cardName})
        )
      )
    )
  }
}

interface IBGGame {
  gamesystem: GameSystem
}

export class BGGame extends React.Component<IBGGame, {}> {
  // state = {places: [
  //   {name: 'PlaceA', cards: ['a1', 'a2', 'a3']},
  //   {name: 'PlaceB', cards: ['b1', 'b2', 'b3', 'b4']},
  //   {name: 'PlaceC', cards: ['c1', 'c2']},
  // ]}
  constructor(props?: IBGGame, context?: any) {
    super(props, context)
    this.update()
  }

  // TODO is there a better way to update the game?
  update() {
    if (this.props.gamesystem) {
      this.props.gamesystem.update()
      this.forceUpdate()
    }
    requestAnimationFrame(() => this.update())
  }

  render() {
    return (
      h('div', {className: 'bg-game'},
        h(BGHistory, {gamesystem: this.props.gamesystem}),
        //h(ReactTransitionGroup.TransitionGroup, null,
          Object.keys(this.props.gamesystem.g.data.allPlaces).map(placeName => {
            // Need 'in' to set the state, and 'appear' to make the transition occur when mounted
            const place = this.props.gamesystem.g.data.allPlaces[placeName]
            return h(BGPlace, {name: place.name, cards: place.cards, key: place.name})
          }),
        //)
      )
    )
  }
}

interface IBGHistory {
  gamesystem: GameSystem
}

export class BGHistory extends React.Component<IBGHistory, {}> {
  constructor(props?: IBGHistory, context?: any) {
    super(props, context)
    this.handleChange = this.handleChange.bind(this)
    this.handleInput = this.handleInput.bind(this)
    this.handleNext = this.handleNext.bind(this)
    this.handlePrevious = this.handlePrevious.bind(this)
    this.handleTogglePause = this.handleTogglePause.bind(this)
  }

  handleChange(e) {
    this.props.gamesystem.seek(parseInt(e.target.value))
  }

  handleInput(e) {
    this.props.gamesystem.seek(parseInt(e.target.value))
  }

  handleTogglePause() {
    this.props.gamesystem.togglePause()
  }

  handleNext() {
    this.props.gamesystem.stepForward()
  }

  handlePrevious() {
    this.props.gamesystem.stepBack()
  }

  render() {
    return (
      h('div', {className: 'bg-history'},
        h('button', {onClick: this.handleTogglePause}, 'P'),
        h('button', {onClick: this.handleNext}, '<'),
        h('button', {onClick: this.handlePrevious}, '>'),
        h('input', {
          type: 'range', min: 0, max: this.props.gamesystem.history.length - 1,
          onChange: this.handleChange, onInput: this.handleInput
        })
      )
    )
  }
}
