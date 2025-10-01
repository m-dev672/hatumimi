import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { Provider } from './components/ui/provider.tsx'
import { AuthProvider } from '@/context/Auth/AuthProvider.tsx'
import { FirebaseUserProvider } from './context/FirebaseUser/FirebaseUserProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider>
      <FirebaseUserProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </FirebaseUserProvider>
    </Provider>
  </StrictMode>,
)
