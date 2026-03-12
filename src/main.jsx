import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { NotificationProvider } from './context/NotificationContext'
import { MessageProvider } from './context/MessageContext'
import ErrorBoundary from './components/shared/ErrorBoundary'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <NotificationProvider>
            <MessageProvider>
              <App />
            </MessageProvider>
          </NotificationProvider>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
