import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { auth, User } from "@/lib/auth";

const PendingActivation = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = auth.getStoredUser();
    if (!storedUser) {
      navigate('/login');
      return;
    }
    
    if (storedUser.is_active) {
      navigate('/main');
      return;
    }
    
    setUser(storedUser);
  }, [navigate]);

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
    toast.info('Выход выполнен');
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Вы действительно хотите удалить свой аккаунт? Данное действие невозможно отменить.')) {
      return;
    }

    try {
      await auth.deleteSelf();
      navigate('/login');
      toast.success('Аккаунт удалён');
    } catch (error) {
      toast.error('Ошибка', {
        description: error instanceof Error ? error.message : 'Не удалось удалить аккаунт'
      });
    }
  };

  if (!user) {
    return null;
  }

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
          <CardTitle className="text-2xl text-center">Ожидание активации</CardTitle>
          <CardDescription className="text-center">
            {user.full_name} ({user.email})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              Ваш аккаунт ожидает активации администратором. Вы получите доступ ко всем функциям после одобрения.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="w-full"
            >
              Выйти
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount}
              className="w-full"
            >
              Удалить аккаунт
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingActivation;
