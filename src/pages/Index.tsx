import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { auth, User } from "@/lib/auth";
import { SettingsPanel } from "@/components/SettingsPanel";
import { crewsApi, Crew as ApiCrew } from "@/lib/crews-api";

type CrewStatus = "active" | "patrol" | "responding" | "offline";

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"my-crew" | "crews" | "profile" | "settings">(
    () => (localStorage.getItem('active_tab') as "my-crew" | "crews" | "profile" | "settings") || "crews"
  );
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [crews, setCrews] = useState<ApiCrew[]>([]);
  const [crewsLoading, setCrewsLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<{ id: number; user_id: string; full_name: string; email: string }[]>([]);
  const [createForm, setCreateForm] = useState({
    callsign: '',
    location: '',
    second_member_id: null as number | null
  });

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

  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = auth.getStoredUser();
      if (storedUser) {
        const verifiedUser = await auth.verify();
        if (verifiedUser) {
          setUser(verifiedUser);
          setIsAuthenticated(true);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadCrews();
    }
  }, [isAuthenticated]);

  const loadCrews = async () => {
    try {
      setCrewsLoading(true);
      const token = auth.getToken();
      if (!token) return;
      
      const data = await crewsApi.getCrews(token);
      setCrews(data);
    } catch (error) {
      console.error('Failed to load crews:', error);
      toast.error('Ошибка загрузки экипажей');
    } finally {
      setCrewsLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const token = auth.getToken();
      if (!token) return;
      
      const users = await crewsApi.getAvailableUsers(token);
      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to load available users:', error);
    }
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

  const handleCreateCrew = async () => {
    try {
      const token = auth.getToken();
      if (!token) return;
      
      await crewsApi.createCrew(token, {
        callsign: createForm.callsign,
        location: createForm.location,
        second_member_id: createForm.second_member_id || undefined
      });
      
      toast.success("Экипаж успешно создан", {
        description: `Позывной: ${createForm.callsign}`
      });
      
      setShowCreateDialog(false);
      setCreateForm({ callsign: '', location: '', second_member_id: null });
      loadCrews();
    } catch (error) {
      toast.error('Ошибка создания', {
        description: error instanceof Error ? error.message : 'Не удалось создать экипаж'
      });
    }
  };

  const handleStatusChange = async (crewId: number, newStatus: CrewStatus) => {
    try {
      const token = auth.getToken();
      if (!token) return;
      
      await crewsApi.updateCrewStatus(token, crewId, newStatus);
      
      const crew = crews.find(c => c.id === crewId);
      const notifMessage = `Экипаж ${crew?.callsign} изменил статус на '${statusConfig[newStatus].label}'`;
      
      addNotification(notifMessage, newStatus === "offline" ? "error" : newStatus === "responding" ? "warning" : "info");
      
      toast.info("Статус обновлен", {
        description: `Экипаж ${crew?.callsign} → ${statusConfig[newStatus].label}`
      });
      
      loadCrews();
    } catch (error) {
      toast.error('Ошибка', {
        description: error instanceof Error ? error.message : 'Не удалось обновить статус'
      });
    }
  };

  const handleDeleteCrew = async (crewId: number) => {
    if (!confirm('Удалить экипаж?')) return;
    
    try {
      const token = auth.getToken();
      if (!token) return;
      
      await crewsApi.deleteCrew(token, crewId);
      toast.success('Экипаж удалён');
      loadCrews();
    } catch (error) {
      toast.error('Ошибка', {
        description: error instanceof Error ? error.message : 'Не удалось удалить экипаж'
      });
    }
  };

  const canManageCrew = (crew: ApiCrew) => {
    if (!user) return false;
    if (['moderator', 'admin', 'manager'].includes(user.role || '')) return true;
    if (crew.creator_id === user.id) return true;
    if (crew.members.some(m => m.user_id === user.id)) return true;
    return false;
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const rememberMe = formData.get('rememberMe') === 'on';

    try {
      const result = await auth.login(email, password, rememberMe);
      setUser(result.user);
      setIsAuthenticated(true);
      toast.success('Вход выполнен', {
        description: `Добро пожаловать, ${result.user.full_name}!`
      });
    } catch (error) {
      toast.error('Ошибка входа', {
        description: error instanceof Error ? error.message : 'Неверный email или пароль'
      });
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      full_name: formData.get('full_name') as string,
    };

    try {
      await auth.register(data);
      toast.success('Регистрация завершена', {
        description: 'Ваш аккаунт ожидает активации администратором. Вы получите доступ после одобрения.'
      });
      setAuthMode('login');
    } catch (error) {
      toast.error('Ошибка регистрации', {
        description: error instanceof Error ? error.message : 'Проверьте введённые данные'
      });
    }
  };

  const handleLogout = () => {
    auth.logout();
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('active_tab');
    toast.info('Выход выполнен');
  };

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('active_tab', activeTab);
    }
  }, [activeTab, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-secondary/90 to-primary/20 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

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
          </CardHeader>
          <CardContent>
            <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Вход</TabsTrigger>
                <TabsTrigger value="register">Регистрация</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email или ID</Label>
                    <Input id="login-email" name="email" placeholder="00001 или manager@demo.ru" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Пароль</Label>
                    <Input id="login-password" name="password" type="password" placeholder="Введите пароль" required />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="rememberMe" name="rememberMe" />
                    <label
                      htmlFor="rememberMe"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Запомнить меня
                    </label>
                  </div>
                  <Button type="submit" className="w-full">Войти</Button>
                  
                  <div className="mt-4 p-3 bg-muted rounded-lg text-xs space-y-1.5">
                    <p className="font-semibold text-foreground mb-2">Тестовые учетные записи:</p>
                    <div className="space-y-1">
                      <p><span className="font-medium">Менеджер:</span> 00001 или manager@demo.ru</p>
                      <p><span className="font-medium">Администратор:</span> 00002 или admin@demo.ru</p>
                      <p><span className="font-medium">Модератор:</span> 00003 или moderator@demo.ru</p>
                      <p><span className="font-medium">Пользователь:</span> 00004 или user@demo.ru</p>
                      <p className="pt-1 text-muted-foreground">Пароль для всех: <span className="font-medium">demo123</span></p>
                    </div>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input id="reg-email" name="email" type="email" placeholder="user@example.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Пароль</Label>
                    <Input id="reg-password" name="password" type="password" placeholder="Минимум 6 символов" required minLength={6} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-full-name">Имя и фамилия</Label>
                    <Input id="reg-full-name" name="full_name" placeholder="Иван Иванов" required />
                  </div>
                  <Button type="submit" className="w-full">Зарегистрироваться</Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    После регистрации ваш аккаунт ожидает активации администратором
                  </p>
                </form>
              </TabsContent>
            </Tabs>
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
              </div>
            </div>

            <TooltipProvider>
              <nav className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeTab === "my-crew" ? "secondary" : "ghost"}
                      className={activeTab === "my-crew" ? "text-foreground" : "text-white hover:text-white hover:bg-white/10"}
                      onClick={() => setActiveTab("my-crew")}
                      size="sm"
                    >
                      <Icon name="Users" size={16} className="md:mr-2" />
                      <span className="hidden sm:inline">Мой экипаж</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="sm:hidden">
                    <p>Мой экипаж</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeTab === "crews" ? "secondary" : "ghost"}
                      className={activeTab === "crews" ? "text-foreground" : "text-white hover:text-white hover:bg-white/10"}
                      onClick={() => setActiveTab("crews")}
                      size="sm"
                    >
                      <Icon name="Shield" size={16} className="md:mr-2" />
                      <span className="hidden sm:inline">Экипажи</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="sm:hidden">
                    <p>Экипажи</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeTab === "profile" ? "secondary" : "ghost"}
                      className={activeTab === "profile" ? "text-foreground" : "text-white hover:text-white hover:bg-white/10"}
                      onClick={() => setActiveTab("profile")}
                      size="sm"
                    >
                      <Icon name="User" size={16} className="md:mr-2" />
                      <span className="hidden sm:inline">Профиль</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="sm:hidden">
                    <p>Профиль</p>
                  </TooltipContent>
                </Tooltip>
                {(user?.role === 'admin' || user?.role === 'manager') && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={activeTab === "settings" ? "secondary" : "ghost"}
                        className={activeTab === "settings" ? "text-foreground" : "text-white hover:text-white hover:bg-white/10"}
                        onClick={() => setActiveTab("settings")}
                        size="sm"
                      >
                        <Icon name="Settings" size={16} className="md:mr-2" />
                        <span className="hidden sm:inline">Настройки</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="sm:hidden">
                      <p>Настройки</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </nav>
            </TooltipProvider>
            
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
                  <AvatarFallback className="bg-primary text-white text-sm">
                    {user?.full_name.split(' ').map(n => n[0]).join('').slice(0, 2) || 'ИИ'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:block">
                  <p className="text-sm font-medium text-white">{user?.full_name || 'Пользователь'}</p>
                  <p className="text-xs text-white/70">{user?.rank || 'Сотрудник'}</p>
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
                    <AvatarFallback className="bg-primary text-white text-2xl">
                      {user?.full_name.split(' ').map(n => n[0]).join('').slice(0, 2) || 'ИИ'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl">{user?.full_name || 'Пользователь'}</CardTitle>
                    <CardDescription>ID: {user?.user_id || '—'} • {user?.role === 'admin' ? 'Администратор' : user?.role === 'manager' ? 'Менеджер' : user?.role === 'moderator' ? 'Модератор' : 'Пользователь'}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{user?.email || 'Не указан'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">ID пользователя</Label>
                    <p className="font-medium font-mono">{user?.user_id || '—'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Текущий экипаж</Label>
                    <p className="font-medium">А-101</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full" onClick={handleLogout}>
                    <Icon name="LogOut" size={18} className="mr-2" />
                    Выйти из системы
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "settings" && (user?.role === 'admin' || user?.role === 'manager') && (
          <div className="max-w-6xl mx-auto">
            <SettingsPanel />
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
          <Dialog open={showCreateDialog} onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (open) loadAvailableUsers();
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
                <DialogDescription>
                  Заполните информацию о новом экипаже
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="callsign">Позывной</Label>
                  <Input 
                    id="callsign" 
                    placeholder="L-1" 
                    value={createForm.callsign}
                    onChange={(e) => setCreateForm({...createForm, callsign: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Местоположение</Label>
                  <Input 
                    id="location" 
                    placeholder="Центральный район, ул. Ленина"
                    value={createForm.location}
                    onChange={(e) => setCreateForm({...createForm, location: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="second-member">Второй участник (необязательно)</Label>
                  <Select 
                    value={createForm.second_member_id?.toString() || 'none'} 
                    onValueChange={(value) => setCreateForm({...createForm, second_member_id: value === 'none' ? null : parseInt(value)})}
                  >
                    <SelectTrigger id="second-member">
                      <SelectValue placeholder="Выберите пользователя" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без второго участника</SelectItem>
                      {availableUsers.filter(u => u.id !== user?.id).map((u) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.full_name} (ID: {u.user_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Вы автоматически добавитесь в экипаж как создатель
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Отмена
                </Button>
                <Button onClick={handleCreateCrew} disabled={!createForm.callsign}>
                  Создать
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {crewsLoading ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">Загрузка экипажей...</div>
          ) : crews.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              <p>Нет активных экипажей</p>
              <p className="text-sm mt-2">Создайте первый экипаж</p>
            </div>
          ) : crews.map((crew) => (
            <Card key={crew.id} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{crew.callsign}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Icon name="MapPin" size={14} />
                      {crew.location || 'Местоположение не указано'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${statusConfig[crew.status].color} animate-pulse-soft`} />
                    {canManageCrew(crew) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteCrew(crew.id)}
                      >
                        <Icon name="Trash2" size={16} />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Icon name={statusConfig[crew.status].icon} size={14} />
                    {statusConfig[crew.status].label}
                  </Badge>
                </div>

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
                  <div className="pt-2 border-t space-y-2">
                    <Label className="text-xs">Изменить статус:</Label>
                    <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
                      <Button 
                        size="sm" 
                        variant={crew.status === "active" ? "default" : "outline"}
                        onClick={() => handleStatusChange(crew.id, "active")}
                        className={`gap-1 ${crew.status === "active" ? "bg-green-600 hover:bg-green-700" : ""}`}
                      >
                        <Icon name="CheckCircle" size={14} />
                        Доступен
                      </Button>
                      <Button 
                        size="sm" 
                        variant={crew.status === "patrol" ? "default" : "outline"}
                        onClick={() => handleStatusChange(crew.id, "patrol")}
                        className={`gap-1 ${crew.status === "patrol" ? "bg-yellow-500 hover:bg-yellow-600" : ""}`}
                      >
                        <Icon name="Clock" size={14} />
                        Занят
                      </Button>
                      <Button 
                        size="sm" 
                        variant={crew.status === "responding" ? "default" : "outline"}
                        onClick={() => handleStatusChange(crew.id, "responding")}
                        className={`gap-1 ${crew.status === "responding" ? "bg-orange-600 hover:bg-orange-700" : ""}`}
                      >
                        <Icon name="AlertTriangle" size={14} />
                        Задержка
                      </Button>
                      <Button 
                        size="sm" 
                        variant={crew.status === "offline" ? "default" : "outline"}
                        onClick={() => handleStatusChange(crew.id, "offline")}
                        className={`gap-1 ${crew.status === "offline" ? "bg-red-600 hover:bg-red-700" : ""}`}
                      >
                        <Icon name="AlertOctagon" size={14} />
                        Поддержка
                      </Button>
                    </div>
                  </div>
                )}
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