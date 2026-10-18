import { Component, type ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="error-page">
          <h1>Let’s get your campus back.</h1>
          <p>
            The demo could not load. Reload the page, or reset locally saved
            data if the problem persists.
          </p>
          <div className="actions">
            <button
              className="button primary"
              onClick={() => location.reload()}
            >
              Reload page
            </button>
            <button
              className="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Remove saved demo data and restore sample records?",
                  )
                ) {
                  localStorage.removeItem("campuspulse-v1");
                  location.reload();
                }
              }}
            >
              Reset saved demo data
            </button>
          </div>
        </div>
      );
    return this.props.children;
  }
}
