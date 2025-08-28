"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Edit } from "lucide-react";
import React from "react";
import {
  Device,
  ClientLocation,
  Brand,
  ACType,
  HorsepowerOption,
  UUID,
} from "../../../types/database";

interface ClientDevicesTableProps {
  devices: Device[];
  locations: ClientLocation[];
  brands: Brand[];
  acTypes: ACType[];
  horsepowerOptions: HorsepowerOption[];
  onEditDevice: (device: Device) => void;
  itemsPerPage?: number;
}

export function ClientDevicesTable({
  devices,
  locations,
  brands,
  acTypes,
  horsepowerOptions,
  onEditDevice,
  itemsPerPage = 5,
}: ClientDevicesTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);

  const totalPages = Math.ceil(devices.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDevices = devices.slice(startIndex, startIndex + itemsPerPage);

  const getLocationName = (id: UUID | null) =>
    id ? locations.find((l) => l.id === id)?.name || "-" : "-";
  const getBrandName = (id: UUID | null) =>
    id ? brands.find((b) => b.id === id)?.name || "-" : "-";
  const getACTypeName = (id: UUID | null) =>
    id ? acTypes.find((t) => t.id === id)?.name || "-" : "-";
  const getHorsepowerName = (id: UUID | null) =>
    id ? horsepowerOptions.find((h) => h.id === id)?.display_name || "-" : "-";

    const getDeviceStatus = (device: Device): string => {
    if (device.last_repair_date) return "repair";

    if (device.due_3_months || device.due_4_months || device.due_6_months) {
        const now = new Date();
        const dueDates = [device.due_3_months, device.due_4_months, device.due_6_months]
        .filter(Boolean)
        .map((d) => new Date(d as string));

        const nearestDue = dueDates.sort((a, b) => a.getTime() - b.getTime())[0];

        if (nearestDue && nearestDue.getTime() < now.getTime()) {
        return "due";
        } else {
        return "maintain"; // ✅ instead of up-to-date
        }
    }

    if (!device.last_cleaning_date) return "scheduled";
        return "scheduled";
    };



  return (
    <Card className="rounded-xl shadow-lg p-6 bg-white">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-xl font-bold flex items-center">
          Client Devices
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">AC Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horsepower</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>

              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedDevices.length > 0 ? (
                paginatedDevices.map((device) => (
                  <tr key={device.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {device.name || "Unnamed"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getLocationName(device.location_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getBrandName(device.brand_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getACTypeName(device.ac_type_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getHorsepowerName(device.horsepower_id)}
                    </td>
                    <td className="px-4 py-2">
                    {(() => {
                        const status = getDeviceStatus(device);
                        switch (status) {
                        case "scheduled":
                            return <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">Scheduled</span>;
                        case "due":
                            return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">Due</span>;
                        case "maintain":
                            return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">Well Maintained</span>;
                        case "no-service":
                            return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">No Service</span>;
                        case "repair":
                            return <span className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-700">Repair</span>;
                        default:
                            return <span>-</span>;
                        }
                    })()}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditDevice(device)}
                        className="flex items-center space-x-2 rounded-lg w-full sm:w-auto rounded-lg border-teal-400 text-teal-600 shadow-md bg-white hover:bg-white"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No devices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 px-6">
            <Button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </Button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
