'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Wrench, AlertTriangle, Calendar, MapPin, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react'
import { DeviceDueSoon, DashboardStats } from '@/types/database'
import { format } from 'date-fns'

interface DevicesDueCardProps {
  devices: DeviceDueSoon[]
  stats: DashboardStats['devicesData']
}

interface GroupedClient {
  clientName: string
  locationName: string
  devices: DeviceDueSoon[]
  earliestDueDate: string
  totalDevices: number
}

export default function DevicesDueCard({ devices, stats }: DevicesDueCardProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const itemsPerPage = 5

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch (error) {
      return dateString
    }
  }

  const getDueTypeLabel = (dueType: string) => {
    switch (dueType) {
      case '3_months':
        return '3 Month'
      case '4_months':
        return '4 Month'
      case '6_months':
        return '6 Month'
      default:
        return 'Unknown'
    }
  }

  const getDueTypeColor = (dueType: string) => {
    switch (dueType) {
      case '3_months':
        return 'bg-red-100 text-red-700 border-red-200'
      case '4_months':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case '6_months':
        return 'bg-green-100 text-green-700 border-green-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const isOverdue = (dateString: string) => {
    const today = new Date()
    const dueDate = new Date(dateString)
    return dueDate < today
  }

  const getDaysUntilDue = (dateString: string) => {
    const today = new Date()
    const dueDate = new Date(dateString)
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Group devices by client and location
  const groupedClients = useMemo(() => {
    const clientMap = new Map<string, GroupedClient>()

    devices.forEach((device) => {
      const key = `${device.client_name}-${device.location_name}`
      
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          clientName: device.client_name,
          locationName: device.location_name,
          devices: [],
          earliestDueDate: device.due_date,
          totalDevices: 0
        })
      }

      const group = clientMap.get(key)!
      group.devices.push(device)
      group.totalDevices = group.devices.length
      
      // Update earliest due date
      if (device.due_date < group.earliestDueDate) {
        group.earliestDueDate = device.due_date
      }
    })

    return Array.from(clientMap.values()).sort((a, b) => 
      new Date(a.earliestDueDate).getTime() - new Date(b.earliestDueDate).getTime()
    )
  }, [devices])

  // Filter clients based on search and date filters
  const filteredClients = useMemo(() => {
    return groupedClients.filter((client) => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        client.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.devices.some(device => 
          device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          device.brand_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          device.ac_type_name?.toLowerCase().includes(searchQuery.toLowerCase())
        )

      // Date filter
      const matchesDate = dateFilter === '' || 
        client.devices.some(device => device.due_date === dateFilter)

      return matchesSearch && matchesDate
    })
  }, [groupedClients, searchQuery, dateFilter])

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage)

  // Reset to first page when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [searchQuery, dateFilter])

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Due Within 30 Days
            </CardTitle>
            <div className="bg-orange-100 text-orange-600 rounded-full p-2">
              <Wrench size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">
              {stats.dueWithin30Days}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Devices requiring maintenance
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Churn Risk
            </CardTitle>
            <div className="bg-red-100 text-red-600 rounded-full p-2">
              <AlertTriangle size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">
              {stats.churnRisk}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Clients at risk of churning
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Devices Due List */}
      <Card className="bg-white rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Calendar size={20} />
            Devices Due Soon
          </CardTitle>
          <p className="text-sm text-gray-500">Clients with devices requiring maintenance in the next 30 days</p>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by client, location, or device..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Filter size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="date"
                placeholder="Filter by due date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-10 w-full sm:w-48"
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {paginatedClients.length > 0 ? (
            <div className="space-y-4">
              {paginatedClients.map((client, index) => {
                const earliestDaysUntilDue = getDaysUntilDue(client.earliestDueDate)
                const hasOverdueDevice = client.devices.some(device => isOverdue(device.due_date))

                return (
                  <div
                    key={`${client.clientName}-${client.locationName}-${index}`}
                    className={`p-4 rounded-lg border transition-colors hover:shadow-md ${
                      hasOverdueDevice
                        ? 'bg-red-50 border-red-200'
                        : earliestDaysUntilDue <= 7
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {/* Client Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 text-lg">{client.clientName}</h3>
                        <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                          <MapPin size={12} />
                          <span>{client.locationName}</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {client.totalDevices} Device{client.totalDevices !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    {/* Device List */}
                    <div className="ml-4 space-y-2">
                      {client.devices.map((device, deviceIndex) => {
                        const deviceDaysUntilDue = getDaysUntilDue(device.due_date)
                        const deviceOverdue = isOverdue(device.due_date)

                        return (
                          <div key={`${device.id}-${device.due_type}-${deviceIndex}`} className="flex items-center justify-between gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">•</span>
                              <span className="font-medium text-gray-700">{device.name}</span>
                              {(device.brand_name || device.ac_type_name) && (
                                <>
                                  <span className="text-gray-400">(</span>
                                  <span className="text-gray-600">
                                    {device.brand_name && <span>{device.brand_name}</span>}
                                    {device.brand_name && device.ac_type_name && <span>, </span>}
                                    {device.ac_type_name && <span>{device.ac_type_name}</span>}
                                  </span>
                                  <span className="text-gray-400">)</span>
                                </>
                              )}
                              <span className="text-gray-400">-</span>
                              <span className={`px-2 py-1 text-xs border rounded-full ${getDueTypeColor(device.due_type)}`}>
                                {getDueTypeLabel(device.due_type)} Service
                              </span>
                              {deviceOverdue && (
                                <span className="px-2 py-1 text-xs bg-red-600 text-white rounded-full">
                                  Overdue
                                </span>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-medium text-gray-800">
                                {formatDate(device.due_date)}
                              </div>
                              <div className={`text-sm ${
                                deviceOverdue
                                  ? 'text-red-600'
                                  : deviceDaysUntilDue <= 7
                                  ? 'text-orange-600'
                                  : 'text-gray-500'
                              }`}>
                                {deviceOverdue 
                                  ? `${Math.abs(deviceDaysUntilDue)} days overdue`
                                  : deviceDaysUntilDue === 0
                                  ? 'Due today'
                                  : deviceDaysUntilDue === 1
                                  ? 'Due tomorrow'
                                  : `${deviceDaysUntilDue} days left`
                                }
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredClients.length)} of {filteredClients.length} clients
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1"
                    >
                      Next
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Wrench size={48} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery || dateFilter ? 'No Results Found' : 'No Maintenance Due'}
              </h3>
              <p className="text-sm">
                {searchQuery || dateFilter 
                  ? 'Try adjusting your search or filter criteria'
                  : 'No devices require maintenance in the next 30 days'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}