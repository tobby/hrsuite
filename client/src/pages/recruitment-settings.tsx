import { useState, useEffect } from "react";
import { Redirect } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRole, canEditOrgSettings } from "@/lib/role-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, GripVertical, Loader2 } from "lucide-react";

type PipelineStage = { key: string; label: string; color: string };

const PRESET_COLORS = [
  "#6b7280", "#3b82f6", "#6366f1", "#8b5cf6", "#7c3aed",
  "#ec4899", "#f59e0b", "#22c55e", "#ef4444", "#14b8a6",
  "#f97316", "#0ea5e9",
];

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export default function RecruitmentSettings() {
  const { role } = useRole();
  const { toast } = useToast();

  if (!canEditOrgSettings(role)) {
    return <Redirect to="/" />;
  }

  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [stageLabel, setStageLabel] = useState("");
  const [stageKey, setStageKey] = useState("");
  const [stageColor, setStageColor] = useState("#3b82f6");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { data: fetchedStages, isLoading } = useQuery<PipelineStage[]>({
    queryKey: ["/api/recruitment/pipeline-stages"],
  });

  useEffect(() => {
    if (fetchedStages && !hasChanges) {
      setStages(fetchedStages);
    }
  }, [fetchedStages]);

  const saveMutation = useMutation({
    mutationFn: async (data: PipelineStage[]) => {
      await apiRequest("PUT", "/api/recruitment/pipeline-stages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recruitment/pipeline-stages"] });
      toast({ title: "Pipeline stages saved" });
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenCreate = () => {
    setStageLabel("");
    setStageKey("");
    setStageColor("#3b82f6");
    setEditingIndex(null);
    setIsStageDialogOpen(true);
  };

  const handleOpenEdit = (index: number) => {
    const stage = stages[index];
    setStageLabel(stage.label);
    setStageKey(stage.key);
    setStageColor(stage.color);
    setEditingIndex(index);
    setIsStageDialogOpen(true);
  };

  const handleSaveStage = () => {
    if (!stageLabel.trim()) return;
    const key = stageKey.trim() || slugify(stageLabel);
    if (!key) return;

    const newStage: PipelineStage = { key, label: stageLabel.trim(), color: stageColor };
    const updated = [...stages];

    if (editingIndex !== null) {
      updated[editingIndex] = newStage;
    } else {
      const exists = stages.some(s => s.key === key);
      if (exists) {
        toast({ title: "Duplicate key", description: `A stage with key "${key}" already exists.`, variant: "destructive" });
        return;
      }
      updated.push(newStage);
    }

    setStages(updated);
    setHasChanges(true);
    setIsStageDialogOpen(false);
  };

  const handleDelete = (index: number) => {
    const updated = stages.filter((_, i) => i !== index);
    setStages(updated);
    setHasChanges(true);
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const updated = [...stages];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(dropIndex, 0, moved);
    setStages(updated);
    setHasChanges(true);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight" data-testid="text-page-title">Recruitment Settings</h1>
        <p className="text-muted-foreground" data-testid="text-page-subtitle">
          Manage your recruitment pipeline configuration
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Pipeline Stages</CardTitle>
            <CardDescription>
              Configure the stages candidates move through in your hiring pipeline. Drag to reorder.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button
                onClick={() => saveMutation.mutate(stages)}
                disabled={saveMutation.isPending}
                data-testid="button-save-stages"
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            )}
            <Button variant="outline" onClick={handleOpenCreate} data-testid="button-add-stage">
              <Plus className="h-4 w-4 mr-2" />
              Add Stage
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12" data-testid="loading-stages">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : stages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-stages">
              No pipeline stages configured. Add stages to get started.
            </div>
          ) : (
            <div className="space-y-1" data-testid="stage-list">
              {stages.map((stage, index) => (
                <div
                  key={stage.key}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${
                    dragIndex === index ? "opacity-50" : ""
                  } ${dragOverIndex === index && dragIndex !== index ? "border-primary bg-primary/5" : ""}
                  hover:bg-muted/50`}
                  data-testid={`stage-row-${stage.key}`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />
                  <div
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`stage-label-${stage.key}`}>{stage.label}</p>
                    <p className="text-xs text-muted-foreground">{stage.key}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenEdit(index)}
                      data-testid={`button-edit-stage-${stage.key}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(index)}
                      data-testid={`button-delete-stage-${stage.key}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? "Edit Stage" : "Add Stage"}</DialogTitle>
            <DialogDescription>
              {editingIndex !== null ? "Update the pipeline stage." : "Add a new stage to your hiring pipeline."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Stage Name</Label>
              <Input
                placeholder="e.g., Technical Interview"
                value={stageLabel}
                onChange={(e) => {
                  setStageLabel(e.target.value);
                  if (editingIndex === null) {
                    setStageKey(slugify(e.target.value));
                  }
                }}
                data-testid="input-stage-label"
              />
            </div>
            <div className="space-y-2">
              <Label>Key</Label>
              <Input
                placeholder="e.g., technical_interview"
                value={stageKey}
                onChange={(e) => setStageKey(e.target.value)}
                disabled={editingIndex !== null}
                data-testid="input-stage-key"
              />
              <p className="text-xs text-muted-foreground">Unique identifier. Auto-generated from name.</p>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={stageColor}
                  onChange={(e) => setStageColor(e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer"
                  data-testid="input-stage-color"
                />
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-6 w-6 rounded-full border-2 transition-transform ${
                        stageColor === color ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setStageColor(color)}
                      data-testid={`color-preset-${color.replace("#", "")}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStageDialogOpen(false)} data-testid="button-cancel-stage">
              Cancel
            </Button>
            <Button
              onClick={handleSaveStage}
              disabled={!stageLabel.trim()}
              data-testid="button-save-stage"
            >
              {editingIndex !== null ? "Update Stage" : "Add Stage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
