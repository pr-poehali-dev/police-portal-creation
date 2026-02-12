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
import { logsApi, type ActivityLog, type LogsParams } from "@/lib/logs-api";
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
    role: 'user',
    email: '',
    user_id: '',
    password: ''
  });

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [logsFilters, setLogsFilters] = useState<LogsParams>({
    sort_by: 'created_at',
    sort_order: 'DESC'
  });

  useEffect(() => {
    loadUsers();
    loadLogs();
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
      const data = await usersApi.getUsers('all');
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

  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      const data = await logsApi.getLogs(logsFilters);
      setLogs(data.logs);
      setActionTypes(data.action_types);
    } catch (error) {
      console.error('Failed to load logs:', error);
      toast.error('Ошибка загрузки логов', {
        description: error instanceof Error ? error.message : 'Не удалось загрузить логи'
      });
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [logsFilters]);

  const handleActivate = async () => {
    if (!activatingUser) return;
    
    try {
      await usersApi.activateUser(activatingUser.id);
      if (activationRole !== 'user') {
        await usersApi.updateUser(activatingUser.id, { role: activationRole });
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
      return ['user', 'moderator', 'admin', 'manager'];
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
      await usersApi.deactivateUser(userId);
      toast.success('Пользователь заблокирован');
      loadUsers();
    } catch (error) {
      toast.error('Ошибка', {
        description: error instanceof Error ? error.message : 'Не удалось заблокировать'
      });
    }
  };

  const [deletingUser, setDeletingUser] = useState<UserManagement | null>(null);
  
  const handleDelete = async () => {
    if (!deletingUser) return;
    
    try {
      await usersApi.deleteUser(deletingUser.id);
      toast.success('Пользователь удалён');
      setDeletingUser(null);
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
      role: user.role,
      email: user.email,
      user_id: user.user_id,
      password: ''
    });
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    
    try {
      const updateData: {
        full_name?: string;
        role?: string;
        email?: string;
        user_id?: string;
        password?: string;
      } = {};
      
      if (editForm.full_name !== editingUser.full_name) {
        updateData.full_name = editForm.full_name;
      }
      if (editForm.role !== editingUser.role) {
        updateData.role = editForm.role;
      }
      if (editForm.email !== editingUser.email) {
        updateData.email = editForm.email;
      }
      if (editForm.user_id !== editingUser.user_id) {
        updateData.user_id = editForm.user_id;
      }
      if (editForm.password) {
        updateData.password = editForm.password;
      }
      
      await usersApi.updateUser(editingUser.id, updateData);
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
        <h2 className="text-2xl md:text-3xl font-bold">Настройки системы</h2>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Активные ({activeUsers.length})</TabsTrigger>
          <TabsTrigger value="pending">Ожидают активации ({pendingUsers.length})</TabsTrigger>
          <TabsTrigger value="logs">Логи активности</TabsTrigger>
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
                          {getRoleName(user.role)}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{user.email}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {(currentUserRole === 'admin' || currentUserRole === 'manager') && currentUserId !== user.id && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                            <Icon name="Edit" size={16} className="mr-2" />
                            Изменить
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeactivate(user.id)}>
                            <Icon name="Ban" size={16} className="mr-2" />
                            Заблокировать
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => setDeletingUser(user)}>
                            <Icon name="Trash2" size={16} className="mr-2" />
                            Удалить
                          </Button>
                        </>
                      )}
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
                Нет пользователей ожидающих активации
              </CardContent>
            </Card>
          ) : (
            pendingUsers.map(user => (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {user.full_name}
                        <Badge variant="outline" className="font-mono">ID: {user.user_id}</Badge>
                      </CardTitle>
                      <CardDescription>{user.email}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
                        <>
                          <Button onClick={() => setActivatingUser(user)}>
                            <Icon name="UserCheck" size={16} className="mr-2" />
                            Активировать
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => setDeletingUser(user)}>
                            <Icon name="Trash2" size={16} className="mr-2" />
                            Удалить
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Логи активности пользователей</CardTitle>
              <CardDescription>
                История действий за последние 72 часа
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Поиск по описанию или пользователю..."
                  value={logsFilters.search || ''}
                  onChange={(e) => setLogsFilters({ ...logsFilters, search: e.target.value })}
                  className="flex-1"
                />
                <Select
                  value={logsFilters.action_type || 'all'}
                  onValueChange={(value) => setLogsFilters({ ...logsFilters, action_type: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Тип действия" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    {actionTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={logsFilters.sort_by || 'created_at'}
                  onValueChange={(value) => setLogsFilters({ ...logsFilters, sort_by: value as 'created_at' | 'user_name' | 'action_type' })}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Сортировка" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">По дате</SelectItem>
                    <SelectItem value="user_name">По пользователю</SelectItem>
                    <SelectItem value="action_type">По типу</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setLogsFilters({ 
                    ...logsFilters, 
                    sort_order: logsFilters.sort_order === 'DESC' ? 'ASC' : 'DESC' 
                  })}
                >
                  <Icon name={logsFilters.sort_order === 'DESC' ? 'ArrowDown' : 'ArrowUp'} size={16} />
                </Button>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadLogs}
                >
                  <Icon name="RefreshCw" size={16} className="mr-2" />
                  Обновить
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (!confirm('Вы уверены? Все логи будут удалены безвозвратно.')) return;
                    try {
                      await logsApi.deleteAllLogs();
                      toast.success('Все логи удалены');
                      loadLogs();
                    } catch (error) {
                      toast.error('Ошибка удаления логов');
                    }
                  }}
                >
                  <Icon name="Trash2" size={16} className="mr-2" />
                  Очистить все логи
                </Button>
              </div>

              {logsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Загрузка логов...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Icon name="FileText" size={48} className="mx-auto mb-3 opacity-50" />
                  <p>Логов не найдено</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {logs.map(log => (
                    <div key={log.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">{log.action_type}</Badge>
                          <span className="text-sm font-medium">{log.user_name}</span>
                          {log.ip_address && (
                            <span className="text-xs text-muted-foreground font-mono">IP: {log.ip_address}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{log.action_description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          try {
                            await logsApi.deleteLog(log.id);
                            toast.success('Лог удален');
                            loadLogs();
                          } catch (error) {
                            toast.error('Ошибка удаления лога');
                          }
                        }}
                      >
                        <Icon name="Trash2" size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
              <Label htmlFor="role">Назначить роль</Label>
              <Select value={activationRole} onValueChange={setActivationRole}>
                <SelectTrigger id="role">
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
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-id">ID пользователя</Label>
              <Input
                id="edit-user-id"
                value={editForm.user_id}
                onChange={(e) => setEditForm({ ...editForm, user_id: e.target.value })}
                placeholder="00001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Новый пароль (оставьте пустым, если не хотите менять)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Минимум 6 символов"
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
                  ⚠️ Администраторы могут назначать только роли user и moderator
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleUpdate} className="flex-1">
                Сохранить изменения
              </Button>
              <Button variant="outline" onClick={() => setEditingUser(null)} className="flex-1">
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение удаления</DialogTitle>
            <DialogDescription>
              Вы действительно хотите удалить пользователя {deletingUser?.full_name}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Это действие необратимо. Все данные пользователя будут удалены.
            </p>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={handleDelete} className="flex-1">
                Удалить пользователя
              </Button>
              <Button variant="outline" onClick={() => setDeletingUser(null)} className="flex-1">
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}