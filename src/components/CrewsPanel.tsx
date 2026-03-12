import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { crewsApi, Crew } from "@/lib/crews-api";
import { User } from "@/lib/auth";

type CrewStatus = "available" | "busy" | "delay" | "need_help";

const STATUS_CONFIG: Record<CrewStatus, { label: string; color: string; icon: string; activeClass: string }> = {
  available: { label: "Доступен",            color: "bg-green-500",  icon: "CheckCircle",  activeClass: "bg-green-600 hover:bg-green-700" },
  busy:      { label: "Занят",               color: "bg-yellow-500", icon: "Clock",        activeClass: "bg-yellow-500 hover:bg-yellow-600" },
  delay:     { label: "Задержка",            color: "bg-orange-600", icon: "AlertTriangle", activeClass: "bg-orange-600 hover:bg-orange-700" },
  need_help: { label: "Поддержка",           color: "bg-red-600",    icon: "AlertOctagon", activeClass: "bg-red-600 hover:bg-red-700" },
};

const STATUS_PRIORITY: Record<CrewStatus, number> = { need_help: 4, delay: 3, busy: 2, available: 1 };

const STAT_CARDS = [
  { key: "available" as CrewStatus, label: "Доступные экипажи", desc: "Доступны для вызовов", icon: "CheckCircle", from: "from-green-500", to: "to-green-600", textDesc: "text-green-100" },
  { key: "busy_delay" as string,    label: "Занятые экипажи",   desc: "На задании",          icon: "Clock",        from: "from-yellow-500", to: "to-yellow-600", textDesc: "text-yellow-100" },
  { key: "need_help" as CrewStatus, label: "Запрос поддержки",  desc: "Требуют помощи",      icon: "AlertOctagon", from: "from-red-600",    to: "to-red-700",    textDesc: "text-red-100" },
  { key: "total" as string,         label: "Всего экипажей",    desc: "В системе",           icon: "Users",        from: "from-primary",    to: "to-primary/80", textDesc: "text-primary-foreground/80" },
];

interface Props {
  user: User;
  crews: Crew[];
  loading: boolean;
  onRefresh: () => void;
  onNotify: (message: string, type: "info" | "warning" | "error" | "success") => void;
}

export function CrewsPanel({ user, crews, loading, onRefresh, onNotify }: Props) {
  const [sortBy, setSortBy] = useState<'time' | 'callsign' | 'status-priority' | 'status-available'>('time');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<{ id: number; user_id: string; full_name: string }[]>([]);
  const [createForm, setCreateForm] = useState({ callsign: '', location: '', second_member_id: null as number | null });

  const canManageCrew = (crew: Crew) => {
    if (['moderator', 'admin', 'manager'].includes(user.role || '')) return true;
    if (crew.creator_id === user.id) return true;
    if (crew.members.some(m => m.user_id === user.id)) return true;
    return false;
  };

  const handleCreateCrew = async () => {
    try {
      await crewsApi.createCrew({ callsign: createForm.callsign, location: createForm.location, second_member_id: createForm.second_member_id || undefined });
      onNotify(`Экипаж ${createForm.callsign} создан`, 'success');
      toast.success("Экипаж успешно создан", { description: `Позывной: ${createForm.callsign}` });
      setShowCreateDialog(false);
      setCreateForm({ callsign: '', location: '', second_member_id: null });
      onRefresh();
    } catch (error) {
      toast.error('Ошибка создания', { description: error instanceof Error ? error.message : 'Не удалось создать экипаж' });
    }
  };

  const handleStatusChange = async (crewId: number, newStatus: CrewStatus) => {
    try {
      await crewsApi.updateCrewStatus(crewId, newStatus);
      const crew = crews.find(c => c.id === crewId);
      onNotify(`Экипаж ${crew?.callsign} изменил статус на '${STATUS_CONFIG[newStatus].label}'`, newStatus === "need_help" ? "error" : newStatus === "delay" ? "warning" : "info");
      toast.info("Статус обновлен", { description: `Экипаж ${crew?.callsign} → ${STATUS_CONFIG[newStatus].label}` });
      onRefresh();
    } catch (error) {
      toast.error('Ошибка', { description: error instanceof Error ? error.message : 'Не удалось обновить статус' });
    }
  };

  const handleDeleteCrew = async (crewId: number) => {
    if (!confirm('Удалить экипаж?')) return;
    try {
      const crew = crews.find(c => c.id === crewId);
      await crewsApi.deleteCrew(crewId);
      onNotify(`Экипаж ${crew?.callsign || 'экипаж'} удалён пользователем ${user.full_name}`, 'warning');
      toast.success('Экипаж удалён');
      onRefresh();
    } catch (error) {
      toast.error('Ошибка', { description: error instanceof Error ? error.message : 'Не удалось удалить экипаж' });
    }
  };

  const getStatCount = (key: string) => {
    if (key === 'available') return crews.filter(c => c.status === 'available').length;
    if (key === 'busy_delay') return crews.filter(c => c.status === 'busy' || c.status === 'delay').length;
    if (key === 'need_help') return crews.filter(c => c.status === 'need_help').length;
    return crews.length;
  };

  const sortedCrews = [...crews].sort((a, b) => {
    if (sortBy === 'time') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === 'callsign') return a.callsign.localeCompare(b.callsign);
    if (sortBy === 'status-priority') return STATUS_PRIORITY[b.status] - STATUS_PRIORITY[a.status];
    if (sortBy === 'status-available') return STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
    return 0;
  });

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {STAT_CARDS.map(s => (
          <Card key={s.key} className={`bg-gradient-to-br ${s.from} ${s.to} text-white border-0`}>
            <CardHeader className="pb-2">
              <CardDescription className={s.textDesc}>{s.label}</CardDescription>
              <CardTitle className="text-4xl font-bold">{getStatCount(s.key)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Icon name={s.icon} size={16} />
                <span className="text-sm">{s.desc}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold">Активные экипажи</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="time">По времени создания</SelectItem>
              <SelectItem value="callsign">По позывному</SelectItem>
              <SelectItem value="status-priority">По приоритету (срочные)</SelectItem>
              <SelectItem value="status-available">По статусу (доступные)</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={showCreateDialog} onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (open) crewsApi.getAvailableUsers().then(setAvailableUsers).catch(console.error);
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto">
                <Icon name="Plus" size={18} />
                Создать экипаж
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Создание нового экипажа</DialogTitle>
                <DialogDescription>Заполните информацию о новом экипаже</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="callsign">Позывной</Label>
                  <Input id="callsign" placeholder="L-1"
                    value={createForm.callsign}
                    onChange={(e) => setCreateForm({ ...createForm, callsign: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Местоположение</Label>
                  <Input id="location" placeholder="Линкольн, 1"
                    value={createForm.location}
                    onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="second-member">Второй участник (необязательно)</Label>
                  <Select
                    value={createForm.second_member_id?.toString() || 'none'}
                    onValueChange={(value) => setCreateForm({ ...createForm, second_member_id: value === 'none' ? null : parseInt(value) })}
                  >
                    <SelectTrigger id="second-member"><SelectValue placeholder="Выберите пользователя" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без второго участника</SelectItem>
                      {availableUsers.filter(u => u.id !== user.id).map((u) => (
                        <SelectItem key={u.id} value={u.id.toString()}>{u.full_name} (ID: {u.user_id})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Вы автоматически добавитесь в экипаж как создатель</p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Отмена</Button>
                <Button onClick={handleCreateCrew} disabled={!createForm.callsign}>Создать</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">Загрузка экипажей...</div>
        ) : crews.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <p>Нет активных экипажей</p>
            <p className="text-sm mt-2">Создайте первый экипаж</p>
          </div>
        ) : sortedCrews.map((crew) => {
          const cfg = STATUS_CONFIG[crew.status];
          return (
            <Card key={crew.id} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{crew.callsign}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Icon name="MapPin" size={16} />
                      {crew.location && <p className="text-base font-semibold text-foreground">{crew.location}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`gap-1 ${cfg.color} text-white border-0`}>
                      <Icon name={cfg.icon} size={14} />
                      {cfg.label}
                    </Badge>
                    {canManageCrew(crew) && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteCrew(crew.id)}>
                        <Icon name="Trash2" size={16} />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Состав:</p>
                  <div className="flex flex-col gap-1">
                    {crew.members.map((member, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon name="User" size={14} />
                        {member.full_name}
                      </div>
                    ))}
                  </div>
                </div>

                {canManageCrew(crew) && (
                  <>
                    <div className="pt-2 border-t space-y-2">
                      <Label className="text-xs font-semibold">Местоположение</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Введите местоположение"
                          defaultValue={crew.location || ''}
                          onChange={(e) => {
                            e.target.dataset.crewId = crew.id.toString();
                            e.target.dataset.location = e.target.value;
                          }}
                        />
                        <Button size="sm" onClick={async (e) => {
                          const input = (e.target as HTMLElement).closest('div')?.querySelector('input');
                          if (!input) return;
                          const location = input.dataset.location || input.value;
                          try {
                            await crewsApi.updateCrewLocation(crew.id, location);
                            toast.success('Местоположение обновлено');
                            onRefresh();
                          } catch (error) {
                            toast.error('Ошибка', { description: error instanceof Error ? error.message : 'Не удалось обновить местоположение' });
                          }
                        }}>Сохранить</Button>
                      </div>
                    </div>
                    <div className="pt-2 border-t space-y-2">
                      <Label className="text-xs font-semibold">Изменить статус</Label>
                      <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
                        {(Object.entries(STATUS_CONFIG) as [CrewStatus, typeof STATUS_CONFIG[CrewStatus]][]).map(([status, s]) => (
                          <Button
                            key={status}
                            size="sm"
                            variant={crew.status === status ? "default" : "outline"}
                            className={`gap-1 ${crew.status === status ? s.activeClass : ""}`}
                            onClick={() => handleStatusChange(crew.id, status)}
                          >
                            <Icon name={s.icon} size={14} />
                            {s.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
