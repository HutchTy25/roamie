import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Quiz from './pages/Quiz'
import Results from './pages/Results'
import Success from './pages/Success'
import Gate from './pages/Gate'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/quiz" element={<Quiz />} />
      <Route path="/results" element={<Results />} />
      <Route path="/success" element={<Success />} />
      <Route path="/gate" element={<Gate />} />
    </Routes>
  )
}
