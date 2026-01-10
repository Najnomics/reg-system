import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useApp } from '../../contexts/AppContext'
import Sidebar from '../common/Sidebar'
import Header from '../common/Header'
import NotificationContainer from '../common/NotificationContainer'

const AdminLayout = () => {
  const { sidebarOpen } = useApp()

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-200 ${
        sidebarOpen ? 'ml-64' : 'ml-0'
      }`}>
        <Header />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="container mx-auto px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
      
      <NotificationContainer />
    </div>
  )
}

export default AdminLayout