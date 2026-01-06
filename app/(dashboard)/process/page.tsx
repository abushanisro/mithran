'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Edit2, Trash2, Plus, Save, XCircle, Loader2 } from 'lucide-react';
import {
  useProcesses,
  useReferenceTables,
  useBulkUpdateTableRows,
  type ReferenceTable,
  type TableRow as ProcessTableRow,
} from '@/lib/api/hooks/useProcesses';

// Helper function to convert snake_case to camelCase
const snakeToCamel = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

// Helper function to get value from row data with fallback for both naming conventions
const getRowValue = (row: any, columnName: string): any => {
  // Try exact match first
  if (row[columnName] !== undefined) {
    return row[columnName];
  }

  // Try camelCase version
  const camelCaseName = snakeToCamel(columnName);
  if (row[camelCaseName] !== undefined) {
    return row[camelCaseName];
  }

  // Return undefined if neither exists
  return undefined;
};

export default function ProcessPage() {
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editedTableData, setEditedTableData] = useState<Record<string, any[]>>({});

  // Fetch processes from database
  const { data: processesData, isLoading: loadingProcesses } = useProcesses();

  // Fetch reference tables for selected process
  const { data: referenceTables, isLoading: loadingTables } = useReferenceTables(selectedProcessId || undefined);

  // Bulk update mutation
  const bulkUpdateMutation = useBulkUpdateTableRows();

  const handleProcessClick = (processId: string) => {
    setSelectedProcessId(processId === selectedProcessId ? null : processId);
    setEditingTableId(null);
    setEditedTableData({});
  };

  const handleEditTable = (tableId: string) => {
    setEditingTableId(tableId);
    // Initialize edited data with current table rows
    const table = referenceTables?.find(t => t.id === tableId);
    if (table?.rows) {
      setEditedTableData({
        ...editedTableData,
        [tableId]: table.rows.map(row => {
          const rowData = (row as any).row_data || row.rowData || {};

          // Normalize data to have both snake_case and camelCase keys
          const normalizedData: any = { ...rowData };

          // For each column definition, ensure both naming conventions exist
          table.columnDefinitions.forEach(col => {
            const snakeCase = col.name;
            const camelCase = snakeToCamel(col.name);

            // If we have the value in either format, copy to both
            if (rowData[snakeCase] !== undefined) {
              normalizedData[camelCase] = rowData[snakeCase];
            } else if (rowData[camelCase] !== undefined) {
              normalizedData[snakeCase] = rowData[camelCase];
            }
          });

          return {
            ...normalizedData,
            _id: row.id,
            _order: (row as any).row_order || row.rowOrder
          };
        })
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingTableId(null);
    setEditedTableData({});
  };

  const handleSaveTable = async (tableId: string) => {
    const tableData = editedTableData[tableId];
    if (!tableData) return;

    // Convert to the format expected by the API
    const rows = tableData.map((row, index) => ({
      row_data: Object.fromEntries(
        Object.entries(row).filter(([key]) => !key.startsWith('_'))
      ),
      row_order: index
    }));

    try {
      await bulkUpdateMutation.mutateAsync({ tableId, rows });
      setEditingTableId(null);
      setEditedTableData({});
    } catch (error) {
      console.error('Failed to save table:', error);
    }
  };

  // Generic handlers for any table
  const handleAddRow = (tableId: string) => {
    const table = referenceTables?.find(t => t.id === tableId);
    if (!table) return;

    // Create empty row based on column definitions with both naming conventions
    const newRow: Record<string, any> = {};
    table.columnDefinitions.forEach(col => {
      const defaultValue = col.type === 'number' ? 0 : '';
      newRow[col.name] = defaultValue;  // snake_case
      newRow[snakeToCamel(col.name)] = defaultValue;  // camelCase
    });

    const currentData = editedTableData[tableId] || [];
    setEditedTableData({
      ...editedTableData,
      [tableId]: [...currentData, newRow]
    });
  };

  const handleDeleteRow = (tableId: string, index: number) => {
    const currentData = editedTableData[tableId] || [];
    setEditedTableData({
      ...editedTableData,
      [tableId]: currentData.filter((_, i) => i !== index)
    });
  };

  const handleUpdateRow = (tableId: string, index: number, field: string, value: any, fieldType?: string) => {
    const currentData = editedTableData[tableId] || [];
    const updated = [...currentData];

    // Store in both snake_case and camelCase for compatibility
    const camelCaseField = snakeToCamel(field);
    const processedValue = fieldType === 'number' ? Number(value) : value;

    updated[index] = {
      ...updated[index],
      [field]: processedValue,  // snake_case (for backend)
      [camelCaseField]: processedValue  // camelCase (for display)
    };

    setEditedTableData({
      ...editedTableData,
      [tableId]: updated
    });
  };

  const renderEditableTable = (table: ReferenceTable) => {
    const isEditing = editingTableId === table.id;

    // Enhanced data mapping - handle both snake_case and camelCase
    const mapRowData = (row: any) => {
      // Try row_data (snake_case from DB) first, then rowData (camelCase)
      const rowData = row.row_data || row.rowData || row;

      // Debug log for problematic tables
      if (!rowData || Object.keys(rowData).length === 0) {
        console.warn('Empty row data detected:', row);
      }

      return rowData;
    };

    const displayData = isEditing
      ? (editedTableData[table.id] || table.rows?.map(mapRowData) || [])
      : (table.rows?.map(mapRowData) || []);

    return (
      <Card key={table.id}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{table.tableName}</CardTitle>
              {table.tableDescription && (
                <CardDescription>{table.tableDescription}</CardDescription>
              )}
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditTable(table.id)}
                  disabled={!table.isEditable}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleSaveTable(table.id)}
                    disabled={bulkUpdateMutation.isPending}
                  >
                    {bulkUpdateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  {table.columnDefinitions.map((col, colIdx) => (
                    <TableHead key={col.name} className={colIdx !== 0 ? 'text-right' : ''}>
                      {col.label}
                    </TableHead>
                  ))}
                  {isEditing && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={table.columnDefinitions.length + (isEditing ? 1 : 0)} className="text-center text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                ) : (
                  displayData.map((row, idx) => (
                    <TableRow key={idx}>
                      {table.columnDefinitions.map((col, colIdx) => {
                        const cellValue = getRowValue(row, col.name);
                        return (
                          <TableCell key={col.name} className={colIdx !== 0 ? 'text-right' : ''}>
                            {isEditing ? (
                              <Input
                                type={col.type === 'number' ? 'number' : 'text'}
                                value={cellValue ?? ''}
                                onChange={(e) => handleUpdateRow(table.id, idx, col.name, e.target.value, col.type)}
                                className="h-8"
                              />
                            ) : (
                              <span className={colIdx === 0 ? 'font-medium' : ''}>
                                {cellValue}
                              </span>
                            )}
                          </TableCell>
                        );
                      })}
                      {isEditing && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRow(table.id, idx)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {isEditing && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddRow(table.id)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Row
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderProcessTables = () => {
    if (!selectedProcessId) return null;

    const process = processesData?.processes.find(p => p.id === selectedProcessId);
    if (!process) return null;

    return (
      <Card className="mt-6 border-2 border-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{process.processName} - Reference Tables</CardTitle>
              <CardDescription>Click Edit to modify tables, add or remove rows</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedProcessId(null)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTables ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading reference tables...</span>
            </div>
          ) : referenceTables && referenceTables.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {referenceTables.map((table) => renderEditableTable(table))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No reference tables found for this process.</p>
              <p className="text-sm mt-2">Reference tables can be added via the database migration.</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Process"
        description="Click on any process to view, edit, and manage detailed specifications"
      />

      <div className="space-y-6">
        {/* MANUFACTURING PROCESSES */}
        <Card>
          <CardHeader>
            <CardTitle>Manufacturing Processes</CardTitle>
            <CardDescription>Click on a process to view and edit reference tables</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingProcesses ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading processes...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {processesData?.processes.map((process) => (
                  <Card
                    key={process.id}
                    className={`border-l-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedProcessId === process.id
                        ? 'border-l-primary bg-primary/5 shadow-md'
                        : 'border-l-primary/30'
                    }`}
                    onClick={() => handleProcessClick(process.id)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{process.processName}</p>
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {process.processCategory}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PROCESS-SPECIFIC TABLES */}
        {renderProcessTables()}
      </div>
    </div>
  );
}
