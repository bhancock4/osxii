import { createRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
import '98.css'
import './styles.css'
import App from './App'

inject()
createRoot(document.getElementById('root')!).render(<App />)
