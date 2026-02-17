import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { auth } from "@/lib/auth";

const Login = () => {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const rememberMe = formData.get('rememberMe') === 'on';

    try {
      const result = await auth.login(email, password, rememberMe);
      toast.success('Вход выполнен', {
        description: `Добро пожаловать, ${result.user.full_name}!`
      });
      
      if (result.user.is_active) {
        navigate('/main');
      } else {
        navigate('/pending');
      }
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
                  <Input id="login-email" name="email" placeholder="Введите email или ID" required />
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
                  <Input id="reg-full-name" name="full_name" placeholder="Джон Смит" required />
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
};

export default Login;