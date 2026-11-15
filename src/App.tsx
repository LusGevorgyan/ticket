import { useState } from 'react'
import './App.css'
import HallSeatsTable from './HallSeatsTable'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="center">
        <HallSeatsTable />
        </section>
    </>
  )
}

export default App
