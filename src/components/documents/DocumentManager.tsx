import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, Download, Folder, File, Plus, Share2, Lock, Unlock, 
  Eye, Edit, Trash2, MoreHorizontal, Search, Filter, Grid, List 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/database';
import { toast } from 'sonner';
import { getAgencyId } from '@/utils/agencyUtils';
import { logError } from '@/utils/consoleLogger';
import { getApiRoot } from '@/config/api';

interface DocumentFolder {
  id: string;
  name: string;
  description: string;
  parent_folder_id: string | null;
  created_by: string;
  agency_id: string;
  created_at: string;
}

interface Document {
  id: string;
  name: string;
  description: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  folder_id: string | null;
  tags: string[];
  is_public: boolean;
  download_count: number;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_path: string;
  uploaded_by: string;
  upload_date: string;
  change_summary: string;
  is_current: boolean;
}

interface DocumentPermission {
  id: string;
  document_id: string;
  user_id: string;
  role: string;
  permission_type: 'read' | 'write' | 'admin';
  granted_by: string;
  created_at: string;
}

export function DocumentManager() {
  const { user, profile } = useAuth();
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [folderForm, setFolderForm] = useState({
    name: '',
    description: ''
  });

  const fetchFolders = async () => {
    try {
      if (!agencyId) return;
      
      const { data, error } = await db
        .from('document_folders')
        .select('*')
        .eq('agency_id', agencyId)
        .order('name');

      if (error) throw error;
      setFolders((data as DocumentFolder[]) || []);
    } catch (error: any) {
      logError('Error fetching folders:', error);
      toast.error(error?.message || 'Failed to load folders');
    }
  };

  const fetchDocuments = async () => {
    try {
      if (!agencyId) return;
      
      let query = db
        .from('documents')
        .select('*')
        .eq('agency_id', agencyId);

      if (currentFolder) {
        query = query.eq('folder_id', currentFolder);
      } else {
        query = query.is('folder_id', null);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      // Ensure tags is always an array
      const docs = (data as Document[]) || [];
      const normalizedDocs = docs.map(doc => ({
        ...doc,
        tags: Array.isArray(doc.tags) ? doc.tags : (doc.tags ? [doc.tags] : []),
        download_count: doc.download_count || 0
      }));
      setDocuments(normalizedDocs);
    } catch (error: any) {
      logError('Error fetching documents:', error);
      toast.error(error?.message || 'Failed to load documents');
    }
  };

  useEffect(() => {
    const initializeAgency = async () => {
      const id = await getAgencyId(profile, user?.id);
      setAgencyId(id);
      if (id) {
        await Promise.all([fetchFolders(), fetchDocuments()]);
      }
      setLoading(false);
    };
    if (user?.id) {
      initializeAgency();
    }
  }, [user?.id, profile?.agency_id, currentFolder]);

  const handleCreateFolder = async () => {
    if (!user || !folderForm.name || !agencyId) {
      toast.error('Please provide a folder name');
      return;
    }

    try {
      const { error } = await db
        .from('document_folders')
        .insert({
          name: folderForm.name,
          description: folderForm.description || null,
          parent_folder_id: currentFolder || null,
          created_by: user.id,
          agency_id: agencyId
        });

      if (error) throw error;

      toast.success('Folder created successfully');
      setShowFolderDialog(false);
      setFolderForm({ name: '', description: '' });
      await fetchFolders();
    } catch (error: any) {
      logError('Error creating folder:', error);
      toast.error(error?.message || 'Failed to create folder');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      if (!agencyId) {
        throw new Error('Agency ID not found');
      }
      
      // Upload file to file storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      // Store path without bucket prefix - bucket is passed separately
      const filePath = fileName;

      // Set current user ID for file upload
      (window as any).__currentUserId = user.id;

      const { error: uploadError, data: uploadData } = await db.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Use the file path from upload result
      // uploadData.path should be in format "documents/filename.ext" from the API
      let finalFilePath = uploadData?.path;
      
      // If path doesn't include bucket, add it
      if (finalFilePath && !finalFilePath.startsWith('documents/')) {
        finalFilePath = `documents/${finalFilePath}`;
      } else if (!finalFilePath) {
        // Fallback: construct path
        finalFilePath = `documents/${filePath}`;
      }

      // Save document metadata
      const { error: dbError } = await db
        .from('documents')
        .insert({
          name: file.name,
          file_path: finalFilePath,
          file_size: file.size,
          file_type: file.type || 'application/octet-stream',
          uploaded_by: user.id,
          folder_id: currentFolder || null,
          agency_id: agencyId,
          tags: [],
          is_public: false,
          download_count: 0
        });

      if (dbError) throw dbError;

      toast.success('File uploaded successfully');
      fetchDocuments();
      
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    } catch (error: any) {
      logError('Error uploading file:', error);
      toast.error(error?.message || 'Failed to upload file');
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      // Extract bucket and path from file_path
      // file_path format: "documents/filename.ext"
      const pathParts = document.file_path.split('/');
      const bucket = pathParts[0] || 'documents';
      const filePath = pathParts.slice(1).join('/') || document.file_path;

      // Use API endpoint to download file
      const baseUrl = getApiRoot();
      const token = localStorage.getItem('auth_token') || '';
      
      const response = await fetch(`${baseUrl}/files/${bucket}/${encodeURIComponent(filePath)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(errorData.error?.message || errorData.message || `Failed to download file: ${response.statusText}`);
      }

      // Download from API
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = globalThis.document.createElement('a');
      a.href = url;
      a.download = document.name;
      globalThis.document.body.appendChild(a);
      a.click();
      globalThis.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update download count
      await db
        .from('documents')
        .update({ download_count: (document.download_count || 0) + 1 })
        .eq('id', document.id);

      toast.success('File downloaded successfully');
    } catch (error: any) {
      logError('Error downloading file:', error);
      toast.error(error?.message || 'Failed to download file');
    }
  };

  const handleOpen = async (document: Document) => {
    try {
      // Extract bucket and path from file_path
      // file_path format: "documents/filename.ext"
      const pathParts = document.file_path.split('/');
      const bucket = pathParts[0] || 'documents';
      const filePath = pathParts.slice(1).join('/') || document.file_path;

      // Use API endpoint to get file URL
      const baseUrl = getApiRoot();
      const token = localStorage.getItem('auth_token') || '';
      const fileUrl = `${baseUrl}/files/${bucket}/${encodeURIComponent(filePath)}`;

      // For files that can be viewed in browser (images, PDFs, etc.)
      // Create a temporary link with auth token in query param
      // Note: In production, use proper auth headers or signed URLs
      if (typeof window !== 'undefined' && window.document) {
        const link = window.document.createElement('a');
        link.href = fileUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
      }
    } catch (error: any) {
      logError('Error opening file:', error);
      toast.error(error?.message || 'Failed to open file');
    }
  };

  const handleSettings = (document: Document) => {
    setSelectedDocument(document);
    setShowSettingsDialog(true);
  };

  const handleDeleteDocument = async (document: Document) => {
    if (!confirm(`Are you sure you want to delete "${document.name}"?`)) {
      return;
    }

    try {
      // Delete file from storage
      const pathParts = document.file_path.split('/');
      const bucket = pathParts[0] || 'documents';
      const filePath = pathParts.slice(1).join('/') || document.file_path;

      await db.storage
        .from(bucket)
        .remove([filePath]);

      // Delete document record
      const { error } = await db
        .from('documents')
        .delete()
        .eq('id', document.id);

      if (error) throw error;

      toast.success('Document deleted successfully');
      fetchDocuments();
    } catch (error: any) {
      logError('Error deleting document:', error);
      toast.error(error?.message || 'Failed to delete document');
    }
  };

  const handleDeleteFolder = async (folder: DocumentFolder) => {
    if (!confirm(`Are you sure you want to delete folder "${folder.name}"? This will also delete all documents inside.`)) {
      return;
    }

    try {
      // Delete folder (cascade will handle subfolders and documents)
      const { error } = await db
        .from('document_folders')
        .delete()
        .eq('id', folder.id);

      if (error) throw error;

      toast.success('Folder deleted successfully');
      if (currentFolder === folder.id) {
        setCurrentFolder(null);
      }
      await fetchFolders();
      await fetchDocuments();
    } catch (error: any) {
      logError('Error deleting folder:', error);
      toast.error(error?.message || 'Failed to delete folder');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📽️';
    return '📄';
  };

  const filteredDocuments = (documents || []).filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.tags || []).some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const currentFolderData = (folders || []).find(f => f.id === currentFolder);
  const subFolders = (folders || []).filter(f => f.parent_folder_id === currentFolder);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading documents...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Document Management</h1>
          <p className="text-muted-foreground">Organize and manage your files with version control</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setShowFolderDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          <Button onClick={() => document.getElementById('file-upload')?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentFolder(null)}
          className={!currentFolder ? 'text-foreground' : ''}
        >
          Root
        </Button>
        {currentFolderData && (
          <>
            <span>/</span>
            <span className="text-foreground">{currentFolderData.name}</span>
          </>
        )}
      </div>

      {/* Search and View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Folders */}
      {subFolders.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3">Folders</h3>
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4' : 'space-y-2'}>
            {(subFolders || []).map((folder) => (
              <Card
                key={folder.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setCurrentFolder(folder.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Folder className="h-8 w-8 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{folder.name}</p>
                      {folder.description && (
                        <p className="text-sm text-muted-foreground truncate">{folder.description}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium">Documents ({filteredDocuments.length})</h3>
        </div>

        {filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <File className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No documents found</p>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Try adjusting your search terms' : 'Upload your first document to get started'}
              </p>
              {!searchTerm && (
                <Button onClick={() => document.getElementById('file-upload')?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
            {(filteredDocuments || []).map((document) => (
              <Card key={document.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">{getFileIcon(document.file_type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{document.name}</p>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpen(document)}
                            title="Open/View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(document)}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSettings(document)}
                            title="Settings"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDocument(document);
                              setShowPermissionsDialog(true);
                            }}
                            title="Share"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(document)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-muted-foreground">{formatFileSize(document.file_size)}</span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          Downloaded {document.download_count} times
                        </span>
                        {document.is_public ? (
                          <Unlock className="h-3 w-3 text-green-500" />
                        ) : (
                          <Lock className="h-3 w-3 text-gray-500" />
                        )}
                      </div>
                      {(document.tags || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(document.tags || []).slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {(document.tags || []).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(document.tags || []).length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document Settings</DialogTitle>
            <DialogDescription>
              Manage settings for {selectedDocument?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="doc-name">Document Name</Label>
                <Input
                  id="doc-name"
                  value={selectedDocument.name}
                  onChange={async (e) => {
                    try {
                      await db
                        .from('documents')
                        .update({ name: e.target.value })
                        .eq('id', selectedDocument.id);
                      setSelectedDocument({ ...selectedDocument, name: e.target.value });
                      fetchDocuments();
                      toast.success('Document name updated');
                    } catch (error: any) {
                      toast.error(error?.message || 'Failed to update name');
                    }
                  }}
                />
              </div>
              <div>
                <Label htmlFor="doc-description">Description</Label>
                <Textarea
                  id="doc-description"
                  value={selectedDocument.description || ''}
                  onChange={async (e) => {
                    try {
                      await db
                        .from('documents')
                        .update({ description: e.target.value || null })
                        .eq('id', selectedDocument.id);
                      setSelectedDocument({ ...selectedDocument, description: e.target.value || null });
                      fetchDocuments();
                    } catch (error: any) {
                      toast.error(error?.message || 'Failed to update description');
                    }
                  }}
                  placeholder="Add a description..."
                />
              </div>
              <div>
                <Label htmlFor="doc-public">Visibility</Label>
                <Select
                  value={selectedDocument.is_public ? 'public' : 'private'}
                  onValueChange={async (value) => {
                    try {
                      await db
                        .from('documents')
                        .update({ is_public: value === 'public' })
                        .eq('id', selectedDocument.id);
                      setSelectedDocument({ ...selectedDocument, is_public: value === 'public' });
                      fetchDocuments();
                      toast.success(`Document is now ${value}`);
                    } catch (error: any) {
                      toast.error(error?.message || 'Failed to update visibility');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>File Information</Label>
                <div className="text-sm text-muted-foreground space-y-1 mt-2">
                  <p>Type: {selectedDocument.file_type}</p>
                  <p>Size: {formatFileSize(selectedDocument.file_size)}</p>
                  <p>Path: {selectedDocument.file_path}</p>
                  <p>Downloads: {selectedDocument.download_count}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Folder Creation Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your documents
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={folderForm.name}
                onChange={(e) => setFolderForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Folder name"
              />
            </div>

            <div>
              <Label htmlFor="folder-description">Description (Optional)</Label>
              <Textarea
                id="folder-description"
                value={folderForm.description}
                onChange={(e) => setFolderForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Folder description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document Permissions</DialogTitle>
            <DialogDescription>
              Manage who can access "{selectedDocument?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <Share2 className="h-12 w-12 mx-auto mb-4" />
              <p>Permission management coming soon</p>
              <p className="text-sm">This feature will allow you to control document access</p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowPermissionsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}