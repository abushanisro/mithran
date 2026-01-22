'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { X, Download, FileText, Maximize2, Upload, Loader2, Box } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { BOMItem } from '@/lib/api/hooks/useBOMItems';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { ModelViewer } from '@/components/ui/model-viewer';

interface BOMItemDetailPanelProps {
  item: BOMItem | null;
  onClose: () => void;
  onUpdate?: () => void;
  preferredView?: '2d' | '3d';
}

export function BOMItemDetailPanel({ item, onClose, onUpdate, preferredView = '3d' }: BOMItemDetailPanelProps) {
  const [file2dUrl, setFile2dUrl] = useState<string | null>(null);
  const [file3dUrl, setFile3dUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageView, setImageView] = useState<'fit' | 'full'>('fit');
  const [selectedFile2d, setSelectedFile2d] = useState<File | null>(null);
  const [selectedFile3d, setSelectedFile3d] = useState<File | null>(null);
  const file2dInputRef = useRef<HTMLInputElement>(null);
  const file3dInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!item) {
      setFile2dUrl(null);
      setFile3dUrl(null);
      setSelectedFile2d(null);
      setSelectedFile3d(null);
      return;
    }

    const loadFileUrls = async () => {
      setLoading(true);
      try {
        if (item.file2dPath) {
          const response = await apiClient.get<{ url: string }>(`/bom-items/${item.id}/file-url/2d`);
          if (response) {
            setFile2dUrl(response.url);
          }
        }
        if (item.file3dPath) {
          const response = await apiClient.get<{ url: string }>(`/bom-items/${item.id}/file-url/3d`);
          if (response) {
            setFile3dUrl(response.url);
          }
        }
      } catch (error) {
        console.error('Failed to load file URLs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFileUrls();
  }, [item]);

  const handleFileUpload = async () => {
    if (!item || (!selectedFile2d && !selectedFile3d)) {
      toast.error('Please select at least one file to upload');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      if (selectedFile2d) {
        formData.append('file2d', selectedFile2d);
      }
      if (selectedFile3d) {
        formData.append('file3d', selectedFile3d);
      }

      const updatedItem = await apiClient.uploadFiles<BOMItem>(`/bom-items/${item.id}/upload-files`, formData);

      toast.success('Files uploaded successfully');

      // Capture which files were uploaded before clearing state
      const uploaded2d = selectedFile2d;
      const uploaded3d = selectedFile3d;

      setSelectedFile2d(null);
      setSelectedFile3d(null);

      // Clear file inputs
      if (file2dInputRef.current) file2dInputRef.current.value = '';
      if (file3dInputRef.current) file3dInputRef.current.value = '';

      // Refresh the item data in parent component
      onUpdate?.();

      // Reload file URLs for newly uploaded files
      setTimeout(async () => {
        try {
          if (uploaded2d && updatedItem.file2dPath) {
            const response2d = await apiClient.get<{ url: string }>(`/bom-items/${item.id}/file-url/2d`);
            if (response2d) {
              setFile2dUrl(response2d.url);
            }
          }
          if (uploaded3d && updatedItem.file3dPath) {
            const response3d = await apiClient.get<{ url: string }>(`/bom-items/${item.id}/file-url/3d`);
            if (response3d) {
              setFile3dUrl(response3d.url);
            }
          }
        } catch (error) {
          console.error('Failed to load file URLs after upload:', error);
        }
      }, 500);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error?.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  if (!item) return null;

  const lowerPath = item.file2dPath?.toLowerCase();
  const isImage2d = lowerPath && (
    lowerPath.endsWith('.png') ||
    lowerPath.endsWith('.jpg') ||
    lowerPath.endsWith('.jpeg')
  );

  const isPdf2d = lowerPath && lowerPath.endsWith('.pdf');

  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-[90vw] lg:w-[80vw] xl:w-[75vw] bg-background border-l shadow-2xl z-50 overflow-y-auto">
      <Card className="h-full rounded-none border-0">
        <CardHeader className="border-b sticky top-0 bg-background z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-xl">{item.name}</CardTitle>
                {(item.file3dPath || item.file2dPath) && (
                  <Badge
                    variant={
                      (preferredView === '3d' && item.file3dPath) || (!item.file2dPath && item.file3dPath)
                        ? 'default'
                        : 'secondary'
                    }
                    className="text-xs"
                  >
                    {(preferredView === '3d' && item.file3dPath) || (!item.file2dPath && item.file3dPath) ? (
                      <>
                        <Box className="h-3 w-3 mr-1" />
                        3D Model
                      </>
                    ) : (
                      <>
                        <FileText className="h-3 w-3 mr-1" />
                        2D Drawing
                      </>
                    )}
                  </Badge>
                )}
              </div>
              {item.partNumber && (
                <p className="text-sm text-muted-foreground">Part #: {item.partNumber}</p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mt-6">


            {/* Files Section - Respects Preferred View */}
            {(item.file2dPath || item.file3dPath) && (
              <div className="border-t pt-6">
                {/* Show based on preferredView, or fallback logic */}
                {(preferredView === '3d' && item.file3dPath) || (!item.file2dPath && item.file3dPath) ? (
                  <div className="space-y-4">
                    {loading && (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}


                    {!loading && file3dUrl && (
                      <ModelViewer
                        key={file3dUrl}
                        fileUrl={file3dUrl}
                        fileName={item.file3dPath?.split('/').pop() || 'model'}
                        fileType={item.file3dPath?.split('.').pop() || 'stl'}
                        bomItemId={item.id}
                      />
                    )}

                    {!loading && !file3dUrl && (
                      <div className="text-center py-12 text-muted-foreground">
                        <p className="text-sm">No 3D model available</p>
                      </div>
                    )}
                  </div>
                ) : item.file2dPath ? (
                  <div className="space-y-4">
                    {loading && (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}

                    {!loading && file2dUrl && isImage2d && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            {item.file2dPath?.split('/').pop()}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setImageView(imageView === 'fit' ? 'full' : 'fit')}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className={`border rounded-lg overflow-hidden bg-muted/30 ${imageView === 'fit' ? 'max-h-[400px]' : ''}`}>
                          <img
                            src={file2dUrl}
                            alt={item.name}
                            className={`w-full ${imageView === 'fit' ? 'object-contain max-h-[400px]' : 'object-cover'}`}
                          />
                        </div>
                        <Button variant="outline" className="w-full" asChild>
                          <a href={file2dUrl} download target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" />
                            Download Image
                          </a>
                        </Button>
                      </div>
                    )}

                    {!loading && file2dUrl && isPdf2d && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {item.file2dPath?.split('/').pop()}
                        </p>
                        <div className="border rounded-lg overflow-hidden" style={{ height: '800px' }}>
                          <iframe
                            src={file2dUrl}
                            className="w-full h-full"
                            title="PDF Preview"
                          />
                        </div>
                        <Button variant="outline" className="w-full" asChild>
                          <a href={file2dUrl} download target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </a>
                        </Button>
                      </div>
                    )}

                    {!loading && file2dUrl && !isImage2d && !isPdf2d && (
                      <div className="text-center py-8">
                        <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-4">
                          {item.file2dPath?.split('/').pop()}
                        </p>
                        <Button variant="outline" asChild>
                          <a href={file2dUrl} download target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-2" />
                            Download File
                          </a>
                        </Button>
                      </div>
                    )}

                    {!loading && !file2dUrl && (
                      <div className="text-center py-12 text-muted-foreground">
                        <p className="text-sm">No 2D drawing available</p>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Add Missing Files */}
                {(!item.file2dPath || !item.file3dPath) && (
                  <div className="mt-6 border rounded-lg p-4 bg-muted/30">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Add {!item.file2dPath && !item.file3dPath ? 'Files' : !item.file2dPath ? '2D Drawing' : '3D Model'}
                    </h4>
                    <div className="space-y-3">
                      {!item.file2dPath && (
                        <div className="space-y-2">
                          <Label htmlFor="add-2d" className="text-xs">
                            2D Drawing (PDF, PNG, JPG)
                          </Label>
                          <Input
                            id="add-2d"
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf"
                            onChange={(e) => setSelectedFile2d(e.target.files?.[0] || null)}
                            disabled={uploading}
                            className="text-sm"
                          />
                          {selectedFile2d && (
                            <p className="text-xs text-muted-foreground">
                              {selectedFile2d.name} ({(selectedFile2d.size / 1024).toFixed(1)} KB)
                            </p>
                          )}
                        </div>
                      )}
                      {!item.file3dPath && (
                        <div className="space-y-2">
                          <Label htmlFor="add-3d" className="text-xs">
                            3D Model (STEP, STL, OBJ)
                          </Label>
                          <Input
                            id="add-3d"
                            type="file"
                            accept=".stp,.step,.stl,.obj,.iges,.igs"
                            onChange={(e) => setSelectedFile3d(e.target.files?.[0] || null)}
                            disabled={uploading}
                            className="text-sm"
                          />
                          {selectedFile3d && (
                            <p className="text-xs text-muted-foreground">
                              {selectedFile3d.name} ({(selectedFile3d.size / 1024).toFixed(1)} KB)
                            </p>
                          )}
                        </div>
                      )}
                      <Button
                        onClick={handleFileUpload}
                        disabled={uploading || (!selectedFile2d && !selectedFile3d)}
                        size="sm"
                        className="w-full"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!item.file2dPath && !item.file3dPath && (
              <div className="border rounded-lg p-6">
                <div className="text-center mb-6">
                  <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground mb-1">No technical files attached</p>
                  <p className="text-xs text-muted-foreground">Upload 2D drawings and 3D models</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="upload-2d" className="text-sm font-medium">
                      2D Drawing (PDF, PNG, JPG)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        ref={file2dInputRef}
                        id="upload-2d"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf"
                        onChange={(e) => setSelectedFile2d(e.target.files?.[0] || null)}
                        disabled={uploading}
                        className="flex-1"
                      />
                    </div>
                    {selectedFile2d && (
                      <p className="text-xs text-muted-foreground">
                        Selected: {selectedFile2d.name} ({(selectedFile2d.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="upload-3d" className="text-sm font-medium">
                      3D Model (STEP, STL, OBJ)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        ref={file3dInputRef}
                        id="upload-3d"
                        type="file"
                        accept=".stp,.step,.stl,.obj,.iges,.igs"
                        onChange={(e) => setSelectedFile3d(e.target.files?.[0] || null)}
                        disabled={uploading}
                        className="flex-1"
                      />
                    </div>
                    {selectedFile3d && (
                      <p className="text-xs text-muted-foreground">
                        Selected: {selectedFile3d.name} ({(selectedFile3d.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleFileUpload}
                    disabled={uploading || (!selectedFile2d && !selectedFile3d)}
                    className="w-full"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Files
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
