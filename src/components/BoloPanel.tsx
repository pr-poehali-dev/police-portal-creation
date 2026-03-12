import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { boloApi, Bolo } from "@/lib/bolo-api";

const EMPTY_FORM = { type: 'person' as 'person' | 'vehicle', mainInfo: '', additionalInfo: '', isArmed: false };

interface Props {
  bolos: Bolo[];
  loading: boolean;
  onRefresh: () => void;
}

export function BoloPanel({ bolos, loading, onRefresh }: Props) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingBolo, setEditingBolo] = useState<Bolo | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const openDialog = (bolo?: Bolo) => {
    if (bolo) {
      setEditingBolo(bolo);
      setForm({ type: bolo.type, mainInfo: bolo.mainInfo, additionalInfo: bolo.additionalInfo || '', isArmed: bolo.isArmed });
    } else {
      setEditingBolo(null);
      setForm(EMPTY_FORM);
    }
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingBolo) {
        await boloApi.update(editingBolo.id, form);
        toast.success('Ориентировка обновлена');
      } else {
        await boloApi.create(form);
        toast.success('Ориентировка создана');
      }
      setShowDialog(false);
      setForm(EMPTY_FORM);
      onRefresh();
    } catch (error) {
      toast.error('Ошибка', { description: error instanceof Error ? error.message : 'Не удалось сохранить ориентировку' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await boloApi.delete(id);
      toast.success('Ориентировка удалена');
      onRefresh();
    } catch (error) {
      toast.error('Ошибка', { description: error instanceof Error ? error.message : 'Не удалось удалить ориентировку' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold">BOLO</h2>
        <Button onClick={() => openDialog()}>
          <Icon name="Plus" size={18} className="mr-2" />
          Добавить ориентировку
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
      ) : bolos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Icon name="Search" size={48} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Нет активных ориентировок</p>
            <p className="text-sm text-muted-foreground mb-4">Добавьте первую ориентировку</p>
            <Button onClick={() => openDialog()}>
              <Icon name="Plus" size={18} className="mr-2" />
              Добавить ориентировку
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 items-start">
          {bolos.map((bolo) => (
            <Card key={bolo.id} className="h-full">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant={bolo.type === 'person' ? 'default' : 'secondary'}>
                        {bolo.type === 'person' ? 'Личность' : 'Транспортное средство'}
                      </Badge>
                      {bolo.isArmed && (
                        <Badge className="bg-red-600 hover:bg-red-700 text-white border-0">
                          <Icon name="AlertTriangle" size={12} className="mr-1" />
                          Вооружен(а)
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl font-bold break-words">{bolo.mainInfo}</CardTitle>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(bolo)}>
                      <Icon name="Pencil" size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(bolo.id)}>
                      <Icon name="Trash2" size={16} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {bolo.additionalInfo && (
                  <div>
                    <Label className="text-sm text-muted-foreground font-semibold">Дополнительные сведения</Label>
                    <p className="text-base mt-1 leading-relaxed break-words">{bolo.additionalInfo}</p>
                  </div>
                )}
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <p>Создано: {new Date(bolo.createdAt).toLocaleString('ru-RU')}</p>
                  {bolo.createdByName && <p>Автор: {bolo.createdByName}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingBolo ? 'Редактировать ориентировку' : 'Новая ориентировка'}</DialogTitle>
            <DialogDescription>Заполните информацию об объекте розыска</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select value={form.type} onValueChange={(value: 'person' | 'vehicle') => setForm({ ...form, type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="person">Личность</SelectItem>
                  <SelectItem value="vehicle">Транспортное средство</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Основная информация *</Label>
              <Input placeholder="Краткое описание наиболее важных примет"
                value={form.mainInfo} onChange={(e) => setForm({ ...form, mainInfo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Дополнительные сведения</Label>
              <Input placeholder="Подробное описание подозреваемого или ТС"
                value={form.additionalInfo} onChange={(e) => setForm({ ...form, additionalInfo: e.target.value })} />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="armed" checked={form.isArmed}
                onCheckedChange={(checked) => setForm({ ...form, isArmed: checked as boolean })} />
              <label htmlFor="armed" className="text-sm font-medium leading-none cursor-pointer">
                Имеется информация о наличии оружия
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Отмена</Button>
            <Button onClick={handleSubmit} disabled={!form.mainInfo.trim()}>
              {editingBolo ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
