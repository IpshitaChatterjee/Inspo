import * as React from "react"

type ComponentBoundaryProps = {
  fallback: React.ReactNode
  resetKey?: unknown
  children: React.ReactNode
}

// A component someone made can throw; this keeps that to its own preview.
export class ComponentBoundary extends React.Component<
  ComponentBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error("A component failed to render:", error)
  }

  componentDidUpdate(prev: ComponentBoundaryProps) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) {
      this.setState({ failed: false })
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
