import { ComponentClass, Props, ReactElement } from 'react';

export as namespace ReactTransitionGroup

interface TransitionProps extends Props<any> {
  in?: boolean
  mountOnEnter?: boolean
  unmountOnExit?: boolean
  appear?: boolean
  enter?: boolean
  exit?: boolean
  timeout?: number | {enter?: number, exit?: number}
  addEndListener?: (node: HTMLElement, isAppearing: boolean) => void
  onEnter?: (node: HTMLElement, isAppearing: boolean) => void
  onEntering?: (node: HTMLElement, isAppearing: boolean) => void
  onEntered?: (node: HTMLElement, isAppearing: boolean) => void
  onExit?: (node: HTMLElement) => void
  onExiting?: (node: HTMLElement) => void
  onExited?: (node: HTMLElement) => void
}

interface TransitionGroupProps extends Props<any> {
  component?: any
  children?: any
  appear?: boolean
  enter?: boolean
  exit?: boolean
  childFactory?: (child: ReactElement<any>) => ReactElement<any>;
}

interface CSSTransitionProps extends TransitionProps {
  classNames?: string | {appear?: string, appearActive?: string, enter?: string, enterActive?: string, exit?: string, exitActive?: string }
}

type TransitionGroup = ComponentClass<TransitionGroupProps>;
type CSSTransition = ComponentClass<CSSTransitionProps>;
type Transition = ComponentClass<TransitionProps>

export const TransitionGroup: TransitionGroup;
export const CSSTransition: CSSTransition;
export const Transition: Transition
