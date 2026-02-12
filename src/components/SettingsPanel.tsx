import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { usersApi, type UserManagement } from "@/lib/users-api";
import { auth } from "@/lib/auth";

export function SettingsPanel() {
  const [users, setUsers] = useState<UserManagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [editingUser, setEditingUser] = useState<UserManagement | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    rank: '',
    badge_number: '',
    department: '',
    role: 'user'
  });

  useEffect(() => {
    loadUsers();
  }, [filter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const token = auth.getToken();
      if (!token) return;
      
      const data = await usersApi.getUsers(token, filter);
      setUsers(data);
    } catch (error) {
      toast.error('Ошибка загрузки', {
        description: error instanceof Error ? error.message : 'Не удалось загрузить пользователей'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (userId: number) => {
    try {
      const token = auth.getToken();
      if (!token) return;
      
      await usersApi.activateUser(token, userId);
      toast.success('Пользователь активирован');
      loadUsers();
    } catch (error) {
      toast.error('Ошибка', {
        description: error instanceof Error ? error.message : 'Не удалось активировать'
      });
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
      rank: user.rank || '',
      badge_number: user.badge_number || '',
      department: user.department || '',
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
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Все ({users.length})
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('active')}
          >
            Активные ({activeUsers.length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            Ожидают ({pendingUsers.length})
          </Button>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Активные аккаунты</TabsTrigger>
          <TabsTrigger value="pending">Ожидают активации</TabsTrigger>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeactivate(user.id)}
                      >
                        <Icon name="Ban" size={16} className="mr-1" />
                        Заблокировать
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
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Звание</p>
                      <p className="font-medium">{user.rank || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Номер</p>
                      <p className="font-medium">{user.badge_number || '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Подразделение</p>
                      <p className="font-medium">{user.department || '—'}</p>
                    </div>
                  </div>
                </CardContent>
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
                        onClick={() => handleActivate(user.id)}
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
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Звание</p>
                      <p className="font-medium">{user.rank || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Номер</p>
                      <p className="font-medium">{user.badge_number || '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Подразделение</p>
                      <p className="font-medium">{user.department || '—'}</p>
                    </div>
                  </div>
                </CardContent>
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
              Изменение данных пользователя {editingUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Полное имя</Label>
              <Input
                id="edit-name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-rank">Звание</Label>
              <Input
                id="edit-rank"
                value={editForm.rank}
                onChange={(e) => setEditForm({ ...editForm, rank: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-badge">Служебный номер</Label>
              <Input
                id="edit-badge"
                value={editForm.badge_number}
                onChange={(e) => setEditForm({ ...editForm, badge_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-dept">Подразделение</Label>
              <Input
                id="edit-dept"
                value={editForm.department}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
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
                  <SelectItem value="moderator">Модератор</SelectItem>
                  <SelectItem value="manager">Менеджер</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                </SelectContent>
              </Select>
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
    </div>
  );
}
