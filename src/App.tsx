function App() {
  return (
    <main className="init-screen">
      <div className="init-card">
        <div className="init-badge" aria-hidden="true">
          ₴
        </div>
        <h1>Personal Finance Planner</h1>
        <p className="init-status">Project initialized successfully</p>
        <p className="init-meta">Milestone 0 — Repository &amp; deployment</p>
        <p className="init-build">build: {__APP_COMMIT__}</p>
      </div>
    </main>
  )
}

export default App
