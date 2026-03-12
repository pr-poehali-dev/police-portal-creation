import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { auth, User } from "@/lib/auth";
import { Crew } from "@/lib/crews-api";

const getRoleName = (role?: string) => {
  if (role === 'admin') return 'Администратор';
  if (role === 'manager') return 'Менеджер';
  if (role === 'moderator') return 'Модератор';
  return 'Пользователь';
};

interface Props {
  user: User;
  crews: Crew[];
  onUserUpdate: (user: User) => void;
}

export function ProfilePanel({ user, crews, onUserUpdate }: Props) {
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });

  const currentCrew = crews.find(c => c.members.some(m => m.user_id === user.id))?.callsign || 'Не состоите в экипаже';
  const initials = user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2) || 'ИИ';

  const handleSaveName = async () => {
    const input = document.getElementById('profile-name') as HTMLInputElement;
    const newName = input?.value.trim();
    if (!newName) { toast.error('Введите имя'); return; }
    try {
      const result = await auth.updateProfile({ full_name: newName });
      onUserUpdate(result.user);
      toast.success('Имя обновлено');
    } catch (error) {
      toast.error('Ошибка', { description: error instanceof Error ? error.message : 'Не удалось обновить' });
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current) { toast.error('Введите текущий пароль'); return; }
    if (!passwordForm.newPass || passwordForm.newPass.length < 6) { toast.error('Новый пароль должен быть минимум 6 символов'); return; }
    if (passwordForm.newPass !== passwordForm.confirm) { toast.error('Пароли не совпадают'); return; }
    try {
      await auth.updateProfile({ current_password: passwordForm.current, new_password: passwordForm.newPass });
      setPasswordForm({ current: '', newPass: '', confirm: '' });
      toast.success('Пароль обновлён');
    } catch (error) {
      toast.error('Ошибка', { description: error instanceof Error ? error.message : 'Не удалось обновить пароль' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold">Профиль</h2>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-primary text-white text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{user.full_name || 'Пользователь'}</CardTitle>
              <CardDescription>ID: {user.user_id || '—'} • {getRoleName(user.role)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium">{user.email || 'Не указан'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">ID пользователя</Label>
              <p className="font-medium font-mono">{user.user_id || '—'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Текущий экипаж</Label>
              <p className="font-medium">{currentCrew}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Изменить данные</CardTitle>
          <CardDescription>Обновите своё имя или пароль</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Имя и фамилия</Label>
              <Input id="profile-name" defaultValue={user.full_name} placeholder="Иван Иванов" />
              <div className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                Будьте внимательны! Изменить имя можно только один раз в 6 часов.
              </div>
            </div>
            <Button onClick={handleSaveName}>Сохранить имя</Button>
          </div>

          <div className="pt-6 border-t space-y-4">
            <h3 className="font-semibold">Изменить пароль</h3>
            <div className="space-y-2">
              <Label htmlFor="current-password">Текущий пароль</Label>
              <Input id="current-password" type="password" placeholder="Введите текущий пароль"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Новый пароль</Label>
              <Input id="new-password" type="password" placeholder="Минимум 6 символов" minLength={6}
                value={passwordForm.newPass}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Повторите новый пароль</Label>
              <Input id="confirm-password" type="password" placeholder="Повторите новый пароль"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
              {passwordForm.confirm && passwordForm.newPass !== passwordForm.confirm && (
                <p className="text-sm text-red-500">Пароли не совпадают</p>
              )}
            </div>
            <Button onClick={handleChangePassword}>Изменить пароль</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
