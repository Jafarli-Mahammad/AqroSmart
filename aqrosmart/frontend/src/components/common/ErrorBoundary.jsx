import React from 'react'
import ErrorCard from './ErrorCard'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    // BUG FIX: Keep section-level crashes from blanking the entire page.
    console.error(error)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorCard message={this.props.message || 'Something went wrong in this section.'} />
    }
    return this.props.children
  }
}
