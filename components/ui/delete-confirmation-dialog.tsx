import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  itemName: string;
  warnings?: string[];
  blockers?: string[];
  impactSummary?: {
    label: string;
    count: number;
  }[];
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  title,
  itemName,
  warnings = [],
  blockers = [],
  impactSummary = [],
  onConfirm,
  isLoading = false,
}: DeleteConfirmationDialogProps) {
  const canDelete = blockers.length === 0;
  const hasImpact = warnings.length > 0 || impactSummary.length > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {canDelete ? (
              <Trash2 className="h-5 w-5 text-red-500" />
            ) : (
              <X className="h-5 w-5 text-red-500" />
            )}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">"{itemName}"</span>?
              {canDelete && " This action cannot be undone."}
            </p>

            {/* Blockers - prevent deletion */}
            {blockers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Cannot Delete
                </h4>
                <ul className="text-xs space-y-1">
                  {blockers.map((blocker, index) => (
                    <li key={index} className="flex items-start gap-2 text-red-300">
                      <span className="block w-1 h-1 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                      {blocker}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings - proceed with caution */}
            {warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-yellow-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Warning
                </h4>
                <ul className="text-xs space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2 text-yellow-300">
                      <span className="block w-1 h-1 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Impact Summary */}
            {impactSummary.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-400">
                  Related Data That Will Be Deleted
                </h4>
                <div className="flex flex-wrap gap-2">
                  {impactSummary.map((impact, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-xs"
                    >
                      {impact.count} {impact.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {hasImpact && canDelete && (
              <p className="text-xs text-gray-400 italic">
                All related data will be permanently removed.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          {canDelete && (
            <AlertDialogAction
              onClick={onConfirm}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}