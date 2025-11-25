import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import DigitalTwin from './pages/DigitalTwin'
import Predictor from './pages/Predictor'
import Explorer from './pages/Explorer'
import Network from './pages/Network'
import Commissions from './pages/Commissions'
import Login from './pages/Login'

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-dark-900 overflow-x-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid-pattern opacity-50 pointer-events-none" />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route path="/*" element={
          <ProtectedRoute>
            <div className="relative z-10 flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-grow pt-24 sm:pt-32 md:pt-44">
                <Routes>
                  <Route path="/" element={<Home />} />
                  {/* <Route path="/digital-twin" element={<DigitalTwin />} /> */}
                  <Route path="/predictor" element={<Predictor />} />
                  {/* <Route path="/explorer" element={<Explorer />} /> */}
                  <Route path="/network" element={<Network />} />
                  <Route path="/commissions" element={<Commissions />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  )
}

export default App
