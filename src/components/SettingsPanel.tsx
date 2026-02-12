import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { usersApi, type UserManagement } from "@/lib/users-api";
import { auth } from "@/lib/auth";

export function SettingsPanel() {
  const [users, setUsers] = useState<UserManagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('user');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<UserManagement | null>(null);
  const [activatingUser, setActivatingUser] = useState<UserManagement | null>(null);
  const [activationRole, setActivationRole] = useState<string>('user');
  const [editForm, setEditForm] = useState({
    full_name: '',
    role: 'user'
  });

  useEffect(() => {
    loadUsers();
    const storedUser = auth.getStoredUser();
    if (storedUser?.role) {
      setCurrentUserRole(storedUser.role);
    }
    if (storedUser?.id) {
      setCurrentUserId(storedUser.id);
    }
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const token = auth.getToken();
      if (!token) {
        console.log('No token found');
        toast.error('Нет токена авторизации');
        return;
      }
      
      console.log('Loading users with token:', token.substring(0, 10) + '...');
      const data = await usersApi.getUsers(token, 'all');
      console.log('Users loaded:', data.length);
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Ошибка загрузки', {
        description: error instanceof Error ? error.message : 'Не удалось загрузить пользователей'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!activatingUser) return;
    
    try {
      const token = auth.getToken();
      if (!token) return;
      
      await usersApi.activateUser(token, activatingUser.id);
      if (activationRole !== 'user') {
        await usersApi.updateUser(token, activatingUser.id, { role: activationRole });
      }
      
      toast.success('Пользователь активирован', {
        description: `Роль: ${getRoleName(activationRole)}`
      });
      setActivatingUser(null);
      setActivationRole('user');
      loadUsers();
    } catch (error) {
      toast.error('Ошибка', {
        description: error instanceof Error ? error.message : 'Не удалось активировать'
      });
    }
  };

  const getAvailableRoles = (forEdit: boolean = false) => {
    if (currentUserRole === 'manager') {
      return ['user', 'moderator', 'admin'];
    }
    if (currentUserRole === 'admin') {
      return ['user', 'moderator'];
    }
    return ['user'];
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'manager': return 'Менеджер';
      case 'moderator': return 'Модератор';
      default: return 'Пользователь';
    }
  };

  const handleDeactivate = async (userId: number) => {
    try {
      const token = auth.getToken();
      if (!token) return;
      
      await usersApi.deactivateUser(token, userId);
      toast.success('Пользователь заблокирован');
      loadUsers();
    } catch (error) {
      toast.error('Ошибка', {
        description: error instanceof Error ? error.message : 'Не удалось заблокировать'
      });
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Вы уверены? Это действие нельзя отменить.')) return;
    
    try {
      const token = auth.getToken();
      if (!token) return;
      
      await usersApi.deleteUser(token, userId);
      toast.success('Пользователь удалён');
      loadUsers();
    } catch (error) {
      toast.error('Ошибка', {
        description: error instanceof Error ? error.message : 'Не удалось удалить'
      });
    }
  };

  const handleEdit = (user: UserManagement) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name,
      role: user.role
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    
    try {
      const token = auth.getToken();
      if (!token) return;
      
      await usersApi.updateUser(token, editingUser.id, editForm);
      toast.success('Данные обновлены');
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      toast.error('Ошибка', {
        description: error instanceof Error ? error.message : 'Не удалось сохранить'
      });
    }
  };

  const activeUsers = users.filter(u => u.is_active);
  const pendingUsers = users.filter(u => !u.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-bold">Управление пользователями</h2>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Активные ({activeUsers.length})</TabsTrigger>
          <TabsTrigger value="pending">Ожидают активации ({pendingUsers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
          ) : activeUsers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Нет активных пользователей
              </CardContent>
            </Card>
          ) : (
            activeUsers.map(user => (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {user.full_name}
                        <Badge variant="outline" className="font-mono">ID: {user.user_id}</Badge>
                        <Badge variant={
                          user.role === 'admin' ? 'destructive' :
                          user.role === 'manager' ? 'default' :
                          user.role === 'moderator' ? 'secondary' : 'outline'
                        }>
                          {user.role === 'admin' ? 'Администратор' :
                           user.role === 'manager' ? 'Менеджер' :
                           user.role === 'moderator' ? 'Модератор' : 'Пользователь'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{user.email}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(user)}
                      >
                        <Icon name="Edit" size={16} className="mr-1" />
                        Изменить
                      </Button>
                      {currentUserId !== user.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeactivate(user.id)}
                        >
                          <Icon name="Ban" size={16} className="mr-1" />
                          Заблокировать
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                      >
                        <Icon name="Trash2" size={16} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
          ) : pendingUsers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Нет пользователей, ожидающих активации
              </CardContent>
            </Card>
          ) : (
            pendingUsers.map(user => (
              <Card key={user.id} className="border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {user.full_name}
                        <Badge variant="outline" className="font-mono">ID: {user.user_id}</Badge>
                        <Badge variant="outline" className="bg-orange-100">
                          Ожидает активации
                        </Badge>
                      </CardTitle>
                      <CardDescription>{user.email}</CardDescription>
                      <p className="text-xs text-muted-foreground mt-1">
                        Зарегистрирован: {new Date(user.created_at).toLocaleString('ru-RU')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setActivatingUser(user);
                          setActivationRole('user');
                        }}
                      >
                        <Icon name="CheckCircle" size={16} className="mr-1" />
                        Активировать
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                      >
                        <Icon name="Trash2" size={16} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактирование пользователя</DialogTitle>
            <DialogDescription>
              {editingUser?.full_name} (ID: {editingUser?.user_id})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Имя и фамилия</Label>
              <Input
                id="edit-name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Роль</Label>
              <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value })}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Пользователь</SelectItem>
                  {getAvailableRoles().includes('moderator') && (
                    <SelectItem value="moderator">Модератор</SelectItem>
                  )}
                  {getAvailableRoles().includes('admin') && (
                    <SelectItem value="admin">Администратор</SelectItem>
                  )}
                  {currentUserRole === 'manager' && (
                    <SelectItem value="manager">Менеджер</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {currentUserRole === 'admin' && (
                <p className="text-xs text-muted-foreground">
                  Администратор может назначать роли до Модератора
                </p>
              )}
              {currentUserRole === 'manager' && (
                <p className="text-xs text-muted-foreground">
                  Менеджер может назначать роли до Администратора
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveEdit} className="flex-1">
                Сохранить
              </Button>
              <Button variant="outline" onClick={() => setEditingUser(null)} className="flex-1">
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!activatingUser} onOpenChange={(open) => !open && setActivatingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Активация пользователя</DialogTitle>
            <DialogDescription>
              {activatingUser?.full_name} (ID: {activatingUser?.user_id})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="activation-role">Назначить роль</Label>
              <Select value={activationRole} onValueChange={setActivationRole}>
                <SelectTrigger id="activation-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Пользователь</SelectItem>
                  {getAvailableRoles().includes('moderator') && (
                    <SelectItem value="moderator">Модератор</SelectItem>
                  )}
                  {getAvailableRoles().includes('admin') && (
                    <SelectItem value="admin">Администратор</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {currentUserRole === 'admin' && (
                <p className="text-xs text-muted-foreground">
                  Вы можете назначить роль до Модератора
                </p>
              )}
              {currentUserRole === 'manager' && (
                <p className="text-xs text-muted-foreground">
                  Вы можете назначить роль до Администратора
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleActivate} className="flex-1">
                Активировать
              </Button>
              <Button variant="outline" onClick={() => setActivatingUser(null)} className="flex-1">
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}