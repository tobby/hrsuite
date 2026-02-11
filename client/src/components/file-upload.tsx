import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Paperclip, X, FileText, Image, File, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface UploadedFile {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType === "application/pdf" || mimeType.includes("document") || mimeType.includes("text")) return FileText;
  return File;
}

interface FileUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
}

export function FileUpload({ files, onFilesChange, disabled }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append("files", selectedFiles[i]);
      }

      const res = await fetch("/api/uploads", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Upload failed");
      }

      const uploaded: UploadedFile[] = await res.json();
      onFilesChange([...files, ...uploaded]);
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-file-upload"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        data-testid="button-attach-files"
      >
        {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Paperclip className="h-4 w-4 mr-2" />}
        {uploading ? "Uploading..." : "Attach Files"}
      </Button>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, idx) => {
            const Icon = getFileIcon(file.mimeType);
            return (
              <Badge
                key={idx}
                variant="secondary"
                className="gap-1.5 pr-1"
                data-testid={`badge-attachment-${idx}`}
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span className="max-w-[120px] truncate text-xs">{file.fileName}</span>
                <span className="text-[10px] text-muted-foreground">({formatFileSize(file.fileSize)})</span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                  data-testid={`button-remove-attachment-${idx}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface AttachmentDisplayProps {
  attachments: Array<{ id: string; fileName: string; fileUrl: string; fileSize: number; mimeType: string }>;
}

export function AttachmentDisplay({ attachments }: AttachmentDisplayProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {attachments.map((att) => {
        const Icon = getFileIcon(att.mimeType);
        const isImage = att.mimeType.startsWith("image/");
        const downloadUrl = `/api/attachments/${att.id}/download`;
        return (
          <a
            key={att.id}
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group"
            data-testid={`link-attachment-${att.id}`}
          >
            {isImage ? (
              <div className="relative rounded-md border overflow-hidden w-24 h-24">
                <img src={downloadUrl} alt={att.fileName} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5">
                  <span className="text-[10px] text-white truncate block">{att.fileName}</span>
                </div>
              </div>
            ) : (
              <Badge variant="outline" className="gap-1.5 hover-elevate cursor-pointer">
                <Icon className="h-3 w-3 shrink-0" />
                <span className="max-w-[150px] truncate text-xs">{att.fileName}</span>
                <span className="text-[10px] text-muted-foreground">({formatFileSize(att.fileSize)})</span>
              </Badge>
            )}
          </a>
        );
      })}
    </div>
  );
}
