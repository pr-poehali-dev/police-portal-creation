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
  const [activeTab, setActiveTab] = useState<"my-crew" | "crews" | "profile">("crews");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
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
    { id: "1", message: "Экипаж В-312 изменил статус на 'Задержка на ситуации'", time: "1 мин назад", type: "warning" },
    { id: "2", message: "Экипаж А-101 завершил патрулирование", time: "15 мин назад", type: "info" }
  ]);
  
  const [showNotifications, setShowNotifications] = useState(false);

  const statusConfig: Record<CrewStatus, { label: string; color: string; icon: string }> = {
    active: { label: "Доступен", color: "bg-green-500", icon: "CheckCircle" },
    patrol: { label: "Занят", color: "bg-yellow-500", icon: "Clock" },
    responding: { label: "Задержка на ситуации", color: "bg-orange-600", icon: "AlertTriangle" },
    offline: { label: "Требуется поддержка", color: "bg-red-600", icon: "AlertOctagon" }
  };

  const addNotification = (message: string, type: "info" | "warning" | "error") => {
    const newNotif = {
      id: String(Date.now()),
      message,
      time: "только что",
      type
    };
    setNotifications(prev => [newNotif, ...prev]);
    
    const audio = new Audio();
    audio.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFA==";
    audio.play().catch(() => {});
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
    const notifMessage = `Экипаж ${crew?.callSign} изменил статус на '${statusConfig[newStatus].label}'`;
    
    addNotification(notifMessage, newStatus === "offline" ? "error" : newStatus === "responding" ? "warning" : "info");
    
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
              <img 
                src="https://cdn.poehali.dev/projects/a58cc482-61d1-44bc-80a2-439e4fdb9f16/bucket/606da78c-a0cf-4d2e-b111-08e476ccf73a.png" 
                alt="Police Logo"
                className="w-24 h-24 object-contain"
              />
            </div>
            <CardTitle className="text-2xl text-center">Портал полиции</CardTitle>
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
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 md:gap-3">
              <img 
                src="https://cdn.poehali.dev/projects/a58cc482-61d1-44bc-80a2-439e4fdb9f16/bucket/606da78c-a0cf-4d2e-b111-08e476ccf73a.png" 
                alt="Police Logo"
                className="w-8 h-8 md:w-10 md:h-10 object-contain"
              />
              <div className="hidden sm:block">
                <h1 className="text-lg md:text-xl font-bold text-white">Портал полиции</h1>
                <p className="text-xs md:text-sm text-white/70">Управление экипажами</p>
              </div>
            </div>

            <nav className="flex items-center gap-1">
              <Button
                variant={activeTab === "my-crew" ? "secondary" : "ghost"}
                className={activeTab === "my-crew" ? "text-foreground" : "text-white hover:text-white hover:bg-white/10"}
                onClick={() => setActiveTab("my-crew")}
                size="sm"
              >
                <Icon name="Users" size={16} className="md:mr-2" />
                <span className="hidden sm:inline">Мой экипаж</span>
              </Button>
              <Button
                variant={activeTab === "crews" ? "secondary" : "ghost"}
                className={activeTab === "crews" ? "text-foreground" : "text-white hover:text-white hover:bg-white/10"}
                onClick={() => setActiveTab("crews")}
                size="sm"
              >
                <Icon name="Shield" size={16} className="md:mr-2" />
                <span className="hidden sm:inline">Экипажи</span>
              </Button>
              <Button
                variant={activeTab === "profile" ? "secondary" : "ghost"}
                className={activeTab === "profile" ? "text-foreground" : "text-white hover:text-white hover:bg-white/10"}
                onClick={() => setActiveTab("profile")}
                size="sm"
              >
                <Icon name="User" size={16} className="md:mr-2" />
                <span className="hidden sm:inline">Профиль</span>
              </Button>
            </nav>
            
            <div className="flex items-center gap-2 md:gap-4">
              <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative text-white hover:text-white hover:bg-white/10">
                    <Icon name="Bell" size={20} />
                    {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center animate-pulse-soft">
                        {notifications.length}
                      </span>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>История уведомлений</DialogTitle>
                    <DialogDescription>
                      Все изменения статусов и события в системе
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[400px] overflow-y-auto space-y-3 py-4">
                    {notifications.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <Icon name="Bell" size={48} className="mx-auto mb-3 opacity-50" />
                        <p>Нет уведомлений</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`p-4 rounded-lg border-l-4 ${
                            notif.type === "error" ? "border-red-500 bg-red-50" :
                            notif.type === "warning" ? "border-orange-500 bg-orange-50" :
                            "border-blue-500 bg-blue-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">{notif.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                            </div>
                            <Icon 
                              name={notif.type === "error" ? "AlertOctagon" : notif.type === "warning" ? "AlertTriangle" : "Info"} 
                              size={18} 
                              className={notif.type === "error" ? "text-red-600" : notif.type === "warning" ? "text-orange-600" : "text-blue-600"}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setNotifications([])}>
                      Очистить всё
                    </Button>
                    <Button onClick={() => setShowNotifications(false)}>
                      Закрыть
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <div className="hidden md:flex items-center gap-3">
                <Avatar className="w-8 h-8 md:w-10 md:h-10">
                  <AvatarFallback className="bg-primary text-white text-sm">ИИ</AvatarFallback>
                </Avatar>
                <div className="hidden lg:block">
                  <p className="text-sm font-medium text-white">Иванов Иван</p>
                  <p className="text-xs text-white/70">Старший лейтенант</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        {activeTab === "my-crew" && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Мой экипаж</h2>
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2">А-101</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Icon name="MapPin" size={14} />
                      Центральный район, ул. Ленина
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Icon name="Clock" size={14} />
                    Занят
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Состав экипажа</h3>
                  <div className="grid gap-3">
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Avatar>
                        <AvatarFallback className="bg-primary text-white">ИИ</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">Иванов Иван Иванович</p>
                        <p className="text-sm text-muted-foreground">Старший лейтенант • Командир</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Avatar>
                        <AvatarFallback className="bg-secondary text-white">ПП</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">Петров Петр Петрович</p>
                        <p className="text-sm text-muted-foreground">Лейтенант • Водитель</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Изменить статус</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="gap-2">
                      <Icon name="CheckCircle" size={16} />
                      Доступен
                    </Button>
                    <Button variant="default" className="gap-2">
                      <Icon name="Clock" size={16} />
                      Занят
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <Icon name="AlertTriangle" size={16} />
                      Задержка
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <Icon name="AlertOctagon" size={16} />
                      Поддержка
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Обновить местоположение</h3>
                  <div className="flex gap-2">
                    <Input placeholder="Введите новое местоположение" />
                    <Button>Обновить</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Профиль</h2>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20">
                    <AvatarFallback className="bg-primary text-white text-2xl">ИИ</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl">Иванов Иван Иванович</CardTitle>
                    <CardDescription>Старший лейтенант</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div>
                    <Label className="text-muted-foreground">Служебный номер</Label>
                    <p className="font-medium">№ 12345</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Подразделение</Label>
                    <p className="font-medium">Центральный отдел полиции</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Текущий экипаж</Label>
                    <p className="font-medium">А-101</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Должность</Label>
                    <p className="font-medium">Командир экипажа</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Контактный телефон</Label>
                    <p className="font-medium">+7 (900) 123-45-67</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full">
                    <Icon name="LogOut" size={18} className="mr-2" />
                    Выйти из системы
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "crews" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardDescription className="text-green-100">Доступные экипажи</CardDescription>
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

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardDescription className="text-yellow-100">Занятые экипажи</CardDescription>
              <CardTitle className="text-4xl font-bold">
                {crews.filter(c => c.status === "patrol").length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Icon name="Clock" size={16} />
                <span className="text-sm">На задании</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-600 to-orange-700 text-white border-0">
            <CardHeader className="pb-2">
              <CardDescription className="text-orange-100">Задержка на ситуации</CardDescription>
              <CardTitle className="text-4xl font-bold">
                {crews.filter(c => c.status === "responding").length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Icon name="AlertTriangle" size={16} />
                <span className="text-sm">Требуют внимания</span>
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

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-0 mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold">Активные экипажи</h2>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto">
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
                      <SelectItem value="active">Доступен</SelectItem>
                      <SelectItem value="patrol">Занят</SelectItem>
                      <SelectItem value="responding">Задержка на ситуации</SelectItem>
                      <SelectItem value="offline">Требуется поддержка</SelectItem>
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
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
                  <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
                    <Button 
                      size="sm" 
                      variant={crew.status === "active" ? "default" : "outline"}
                      onClick={() => handleStatusChange(crew.id, "active")}
                      className="gap-1"
                    >
                      <Icon name="CheckCircle" size={14} />
                      Доступен
                    </Button>
                    <Button 
                      size="sm" 
                      variant={crew.status === "patrol" ? "default" : "outline"}
                      onClick={() => handleStatusChange(crew.id, "patrol")}
                      className="gap-1"
                    >
                      <Icon name="Clock" size={14} />
                      Занят
                    </Button>
                    <Button 
                      size="sm" 
                      variant={crew.status === "responding" ? "default" : "outline"}
                      onClick={() => handleStatusChange(crew.id, "responding")}
                      className="gap-1"
                    >
                      <Icon name="AlertTriangle" size={14} />
                      Задержка
                    </Button>
                    <Button 
                      size="sm" 
                      variant={crew.status === "offline" ? "default" : "outline"}
                      onClick={() => handleStatusChange(crew.id, "offline")}
                      className="gap-1"
                    >
                      <Icon name="AlertOctagon" size={14} />
                      Поддержка
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;