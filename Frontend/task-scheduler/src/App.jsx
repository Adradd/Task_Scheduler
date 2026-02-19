import { useState } from 'react'
import './App.css'
import Navbar from "./components/Navbar.jsx";
import TaskView from "./components/TaskView.jsx";
import Footer from "./components/Footer.jsx";

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
        <Navbar />
        <TaskView />
        <Footer />
    </>
  )
}

export default App
