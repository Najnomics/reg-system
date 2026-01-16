import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useApp } from '../../contexts/SimpleAppContext'
import Sidebar from '../common/Sidebar'
import Header from '../common/Header'
import NotificationContainer from '../common/NotificationContainer'

const AdminLayout = () => {
  const { sidebarOpen } = useApp()

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-200 ${
        sidebarOpen ? 'lg:ml-64' : 'ml-0'
      }`}>
        <Header />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
      
      <NotificationContainer />
    </div>
  )
}

export default AdminLayout