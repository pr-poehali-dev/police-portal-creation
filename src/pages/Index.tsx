import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";

type CrewStatus = "active" | "patrol" | "responding" | "offline";

interface Crew {
  id: string;
  callSign: string;
  location: string;
  status: CrewStatus;
  officers: string[];
  lastUpdate: string;
}

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [crews, setCrews] = useState<Crew[]>([
    {
      id: "1",
      callSign: "А-101",
      location: "Центральный район, ул. Ленина",
      status: "patrol",
      officers: ["Иванов И.И.", "Петров П.П."],
      lastUpdate: "2 мин назад"
    },
    {
      id: "2",
      callSign: "Б-205",
      location: "Северный район, пр. Мира",
      status: "active",
      officers: ["Сидоров С.С.", "Козлов К.К."],
      lastUpdate: "5 мин назад"
    },
    {
      id: "3",
      callSign: "В-312",
      location: "Южный район, ул. Победы",
      status: "responding",
      officers: ["Морозов М.М.", "Новиков Н.Н."],
      lastUpdate: "1 мин назад"
    }
  ]);

  const [notifications, setNotifications] = useState([
    { id: "1", message: "Экипаж В-312 изменил статус на 'Выезд на вызов'", time: "1 мин назад", type: "warning" },
    { id: "2", message: "Экипаж А-101 завершил патрулирование", time: "15 мин назад", type: "info" }
  ]);

  const statusConfig: Record<CrewStatus, { label: string; color: string; icon: string }> = {
    active: { label: "Готов", color: "bg-green-500", icon: "CheckCircle" },
    patrol: { label: "Патрулирование", color: "bg-blue-500", icon: "Route" },
    responding: { label: "Выезд на вызов", color: "bg-amber-500", icon: "Siren" },
    offline: { label: "Не на смене", color: "bg-gray-400", icon: "CircleOff" }
  };

  const handleCreateCrew = () => {
    const newCrew: Crew = {
      id: String(crews.length + 1),
      callSign: "Г-" + (400 + crews.length),
      location: "Новое местоположение",
      status: "active",
      officers: ["Новый сотрудник"],
      lastUpdate: "только что"
    };
    setCrews([...crews, newCrew]);
    setShowCreateDialog(false);
    toast.success("Экипаж успешно создан", {
      description: `Позывной: ${newCrew.callSign}`
    });
  };

  const handleStatusChange = (crewId: string, newStatus: CrewStatus) => {
    setCrews(crews.map(crew => 
      crew.id === crewId ? { ...crew, status: newStatus, lastUpdate: "только что" } : crew
    ));
    const crew = crews.find(c => c.id === crewId);
    toast.info("Статус обновлен", {
      description: `Экипаж ${crew?.callSign} → ${statusConfig[newStatus].label}`
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-secondary/90 to-primary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                <Icon name="Shield" size={32} className="text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Портал МВД</CardTitle>
            <CardDescription className="text-center">Система управления экипажами</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login">Логин</Label>
                <Input id="login" placeholder="Введите логин" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input id="password" type="password" placeholder="Введите пароль" />
              </div>
              <Button className="w-full" onClick={() => setIsAuthenticated(true)}>
                Войти
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary border-b border-secondary-foreground/10 sticky top-0 z-50 backdrop-blur-sm bg-secondary/95">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Icon name="Shield" size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Портал МВД</h1>
                <p className="text-sm text-white/70">Управление экипажами</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative text-white hover:text-white hover:bg-white/10">
                <Icon name="Bell" size={20} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center animate-pulse-soft">
                    {notifications.length}
                  </span>
                )}
              </Button>
              
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary text-white">ИИ</AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-white">Иванов Иван</p>
                  <p className="text-xs text-white/70">Старший лейтенант</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardDescription className="text-green-100">Активные экипажи</CardDescription>
              <CardTitle className="text-4xl font-bold">
                {crews.filter(c => c.status === "active").length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Icon name="CheckCircle" size={16} />
                <span className="text-sm">Готовы к выезду</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardDescription className="text-blue-100">На патруле</CardDescription>
              <CardTitle className="text-4xl font-bold">
                {crews.filter(c => c.status === "patrol").length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Icon name="Route" size={16} />
                <span className="text-sm">Патрулируют район</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardDescription className="text-amber-100">На вызове</CardDescription>
              <CardTitle className="text-4xl font-bold">
                {crews.filter(c => c.status === "responding").length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Icon name="Siren" size={16} />
                <span className="text-sm">Выезд на место</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary to-primary/80 text-white border-0">
            <CardHeader className="pb-2">
              <CardDescription className="text-primary-foreground/80">Всего экипажей</CardDescription>
              <CardTitle className="text-4xl font-bold">{crews.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Icon name="Users" size={16} />
                <span className="text-sm">В системе</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Активные экипажи</h2>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Icon name="Plus" size={18} />
                Создать экипаж
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Создание нового экипажа</DialogTitle>
                <DialogDescription>
                  Заполните информацию о новом экипаже
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="callsign">Позывной</Label>
                  <Input id="callsign" placeholder="А-101" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Местоположение</Label>
                  <Input id="location" placeholder="Центральный район, ул. Ленина" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Статус</Label>
                  <Select defaultValue="active">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Готов</SelectItem>
                      <SelectItem value="patrol">Патрулирование</SelectItem>
                      <SelectItem value="responding">Выезд на вызов</SelectItem>
                      <SelectItem value="offline">Не на смене</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="officers">Состав экипажа</Label>
                  <Input id="officers" placeholder="Иванов И.И., Петров П.П." />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Отмена
                </Button>
                <Button onClick={handleCreateCrew}>
                  Создать
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {crews.map((crew) => (
            <Card key={crew.id} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl mb-2">{crew.callSign}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Icon name="MapPin" size={14} />
                      {crew.location}
                    </CardDescription>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${statusConfig[crew.status].color} animate-pulse-soft`} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Icon name={statusConfig[crew.status].icon} size={14} />
                    {statusConfig[crew.status].label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{crew.lastUpdate}</span>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Состав:</p>
                  <div className="flex flex-col gap-1">
                    {crew.officers.map((officer, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon name="User" size={14} />
                        {officer}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t space-y-2">
                  <Label className="text-xs">Изменить статус:</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      size="sm" 
                      variant={crew.status === "active" ? "default" : "outline"}
                      onClick={() => handleStatusChange(crew.id, "active")}
                      className="gap-1"
                    >
                      <Icon name="CheckCircle" size={14} />
                      Готов
                    </Button>
                    <Button 
                      size="sm" 
                      variant={crew.status === "patrol" ? "default" : "outline"}
                      onClick={() => handleStatusChange(crew.id, "patrol")}
                      className="gap-1"
                    >
                      <Icon name="Route" size={14} />
                      Патруль
                    </Button>
                    <Button 
                      size="sm" 
                      variant={crew.status === "responding" ? "default" : "outline"}
                      onClick={() => handleStatusChange(crew.id, "responding")}
                      className="gap-1"
                    >
                      <Icon name="Siren" size={14} />
                      Вызов
                    </Button>
                    <Button 
                      size="sm" 
                      variant={crew.status === "offline" ? "default" : "outline"}
                      onClick={() => handleStatusChange(crew.id, "offline")}
                      className="gap-1"
                    >
                      <Icon name="CircleOff" size={14} />
                      Офлайн
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
