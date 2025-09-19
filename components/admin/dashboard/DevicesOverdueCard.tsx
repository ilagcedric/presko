import { useState } from 'react'
import { Search, Calendar, ChevronLeft, ChevronRight, AlertTriangle, Clock } from 'lucide-react'
import { DeviceOverdue } from '@/types/database'

interface DevicesOverdueCardProps {
  devices: DeviceOverdue[]
  stats: { overdueCount: number }
}

export default function DevicesOverdueCard({ devices, stats }: DevicesOverdueCardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5 // Reduced for client groups since each group can contain multiple devices

  // Group devices by client and location, then by device (showing only the most critical overdue service per device)
  const groupedDevices = devices.reduce((acc, device) => {
    const clientKey = `${device.client_name}-${device.location_name}`
    if (!acc[clientKey]) {
      acc[clientKey] = {
        client_name: device.client_name,
        location_name: device.location_name,
        devices: new Map()
      }
    }
    
    const deviceKey = `${device.id}-${device.name}`
    const existingDevice = acc[clientKey].devices.get(deviceKey)
    
    // Service priority: 6_months > 4_months > 3_months
    const getServicePriority = (dueType: string) => {
      if (dueType === 'due_6_months') return 3
      if (dueType === 'due_4_months') return 2
      return 1 // due_3_months
    }
    
    // Keep the service with higher priority, or if same priority, the one with more days overdue
    if (!existingDevice) {
      acc[clientKey].devices.set(deviceKey, device)
    } else {
      const currentPriority = getServicePriority(device.due_type)
      const existingPriority = getServicePriority(existingDevice.due_type)
      
      if (currentPriority > existingPriority) {
        // Higher priority service (e.g., 6-month over 4-month)
        acc[clientKey].devices.set(deviceKey, device)
      } else if (currentPriority === existingPriority) {
        // Same priority, keep the one with more days overdue
        const today = new Date()
        const currentDue = new Date(device.due_date)
        const currentDaysOverdue = Math.ceil((today.getTime() - currentDue.getTime()) / (1000 * 60 * 60 * 24))
        const existingDue = new Date(existingDevice.due_date)
        const existingDaysOverdue = Math.ceil((today.getTime() - existingDue.getTime()) / (1000 * 60 * 60 * 24))
        
        if (currentDaysOverdue > existingDaysOverdue) {
          acc[clientKey].devices.set(deviceKey, device)
        }
      }
    }
    
    return acc
  }, {} as Record<string, { client_name: string; location_name: string; devices: Map<string, DeviceOverdue> }>)

  // Convert to array format for filtering and pagination
  const clientGroups = Object.values(groupedDevices).map(group => ({
    ...group,
    devices: Array.from(group.devices.values())
  }))

  // Filter grouped devices based on search term and date
  const filteredGroups = clientGroups.filter(group => {
    const matchesSearch = searchTerm === '' || 
      group.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.devices.some(device => device.name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesDate = dateFilter === '' || 
      group.devices.some(device => device.due_date === dateFilter)
    
    return matchesSearch && matchesDate
  }).map(group => ({
    ...group,
    devices: group.devices.filter(device => 
      dateFilter === '' || device.due_date === dateFilter
    )
  })).filter(group => group.devices.length > 0)

  // Pagination
  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedGroups = filteredGroups.slice(startIndex, startIndex + itemsPerPage)

  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const handleDateChange = (value: string) => {
    setDateFilter(value)
    setCurrentPage(1)
  }

  // Reset current page if it exceeds total pages
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages)
  }

  const getDaysOverdue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = today.getTime() - due.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getDueTypeLabel = (dueType: 'due_3_months' | 'due_4_months' | 'due_6_months') => {
    switch (dueType) {
      case 'due_3_months': return '3-Month Service'
      case 'due_4_months': return '4-Month Service'
      case 'due_6_months': return '6-Month Service'
      default: return 'Service'
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-red-100 rounded-lg">
          <AlertTriangle size={24} className="text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Overdue Devices</h3>
          <p className="text-sm text-gray-600">
            {stats.overdueCount} device{stats.overdueCount !== 1 ? 's' : ''} past maintenance schedule
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search client or device..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div className="relative">
          <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Client Groups List */}
      <div className="space-y-4">
        {paginatedGroups.length === 0 ? (
          <div className="text-center py-8">
            <Clock size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">
              {searchTerm || dateFilter ? 'No overdue devices match your filters' : 'No overdue devices found'}
            </p>
          </div>
        ) : (
          paginatedGroups.map((group, groupIndex) => (
            <div key={`${group.client_name}-${group.location_name}`} className="border border-red-200 rounded-xl bg-red-50">
              {/* Client Header */}
              <div className="p-4 border-b border-red-200 bg-red-100 rounded-t-xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-800 text-lg">{group.client_name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600">{group.location_name}</span>
                      <span className="px-2 py-1 bg-red-200 text-red-700 text-xs rounded-full">
                        {group.devices.length} device{group.devices.length !== 1 ? 's' : ''} overdue
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      Max overdue: {Math.max(...group.devices.map(d => getDaysOverdue(d.due_date)))} days
                    </div>
                  </div>
                </div>
              </div>

              {/* Devices List */}
              <div className="p-4 space-y-3">
                {group.devices.map((device, deviceIndex) => {
                  const daysOverdue = getDaysOverdue(device.due_date)
                  return (
                    <div
                      key={`${device.id}-${device.due_type}`}
                      className="bg-white border border-red-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <div className="font-medium text-gray-800">{device.name}</div>
                            <div className="flex items-center gap-2">
                              {device.brand_name && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                  {device.brand_name}
                                </span>
                              )}
                              {device.ac_type_name && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded">
                                  {device.ac_type_name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            {getDueTypeLabel(device.due_type)} • Due: {new Date(device.due_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-lg font-bold text-red-600">
                            {daysOverdue} day{daysOverdue !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-gray-500">overdue</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {filteredGroups.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredGroups.length)} of {filteredGroups.length} clients
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 py-2 text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}