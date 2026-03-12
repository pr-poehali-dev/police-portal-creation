import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { crewsApi, Crew } from "@/lib/crews-api";
import { User } from "@/lib/auth";

type CrewStatus = "available" | "busy" | "delay" | "need_help";

const STATUS_CONFIG: Record<CrewStatus, { label: string; color: string; icon: string; activeClass: string }> = {
  available: { label: "Доступен",           color: "bg-green-500",  icon: "CheckCircle",  activeClass: "bg-green-600 hover:bg-green-700" },
  busy:      { label: "Занят",              color: "bg-yellow-500", icon: "Clock",        activeClass: "bg-yellow-500 hover:bg-yellow-600" },
  delay:     { label: "Задержка на ситуации", color: "bg-orange-600", icon: "AlertTriangle", activeClass: "bg-orange-600 hover:bg-orange-700" },
  need_help: { label: "Требуется поддержка", color: "bg-red-600",    icon: "AlertOctagon", activeClass: "bg-red-600 hover:bg-red-700" },
};

interface Props {
  user: User;
  crews: Crew[];
  onRefresh: () => void;
  onGoToCrews: () => void;
}

export function MyCrewPanel({ user, crews, onRefresh, onGoToCrews }: Props) {
  const myCrew = crews.find(c => c.members.some(m => m.user_id === user.id));
  const [locationInput, setLocationInput] = useState(myCrew?.location || '');

  useEffect(() => {
    if (myCrew) setLocationInput(myCrew.location || '');
  }, [myCrew]);

  const canManage = (crew: Crew) => {
    if (['moderator', 'admin', 'manager'].includes(user.role || '')) return true;
    if (crew.creator_id === user.id) return true;
    if (crew.members.some(m => m.user_id === user.id)) return true;
    return false;
  };

  const handleStatusChange = async (crewId: number, status: CrewStatus) => {
    try {
      await crewsApi.updateCrewStatus(crewId, status);
      toast.info('Статус обновлён');
      onRefresh();
    } catch (error) {
      toast.error('Ошибка', { description: error instanceof Error ? error.message : 'Не удалось обновить статус' });
    }
  };

  const handleDeleteCrew = async (crewId: number) => {
    if (!confirm('Удалить экипаж?')) return;
    try {
      await crewsApi.deleteCrew(crewId);
      toast.success('Экипаж удалён');
      onRefresh();
    } catch (error) {
      toast.error('Ошибка', { description: error instanceof Error ? error.message : 'Не удалось удалить экипаж' });
    }
  };

  const handleSaveLocation = async () => {
    if (!myCrew) return;
    try {
      await crewsApi.updateCrewLocation(myCrew.id, locationInput);
      toast.success('Местоположение обновлено');
      onRefresh();
    } catch (error) {
      toast.error('Ошибка', { description: error instanceof Error ? error.message : 'Не удалось обновить местоположение' });
    }
  };

  if (!myCrew) {
    return (
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Мой экипаж</h2>
        <Card>
          <CardContent className="py-12 text-center">
            <Icon name="Users" size={48} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Вы не состоите в экипаже</p>
            <p className="text-sm text-muted-foreground mb-4">Создайте новый экипаж или дождитесь приглашения</p>
            <Button onClick={onGoToCrews}>Перейти к экипажам</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[myCrew.status];

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Мой экипаж</h2>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{myCrew.callsign}</CardTitle>
              <div className="flex items-center gap-2">
                <Icon name="MapPin" size={14} />
                {myCrew.location && <CardDescription>{myCrew.location}</CardDescription>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Icon name={cfg.icon} size={14} />
                {cfg.label}
              </Badge>
              {canManage(myCrew) && (
                <Button variant="destructive" size="sm" onClick={() => handleDeleteCrew(myCrew.id)}>
                  <Icon name="Trash2" size={16} className="mr-1" />
                  Удалить
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Состав экипажа</h3>
            <div className="grid gap-3">
              {myCrew.members.map((member, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-white">
                      {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.full_name}</p>
                    <p className="text-sm text-muted-foreground">ID: {member.user_id_str}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {canManage(myCrew) && (
            <>
              <div>
                <h3 className="font-semibold mb-3">Местоположение</h3>
                <div className="flex gap-2">
                  <Input placeholder="Введите местоположение" value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)} />
                  <Button onClick={handleSaveLocation}>Сохранить</Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Изменить статус</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.entries(STATUS_CONFIG) as [CrewStatus, typeof STATUS_CONFIG[CrewStatus]][]).map(([status, s]) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={myCrew.status === status ? "default" : "outline"}
                      className={`gap-2 ${myCrew.status === status ? s.activeClass : ""}`}
                      onClick={() => handleStatusChange(myCrew.id, status)}
                    >
                      <Icon name={s.icon} size={16} />
                      {s.label.split(' ')[0]}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
