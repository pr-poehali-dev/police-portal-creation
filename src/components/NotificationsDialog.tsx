import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { notificationsApi, Notification } from "@/lib/notifications-api";

const NOTIF_STYLES: Record<string, { border: string; bg: string; icon: string; iconColor: string }> = {
  error:   { border: "border-red-500",    bg: "bg-red-50",    icon: "AlertOctagon",  iconColor: "text-red-600" },
  warning: { border: "border-orange-500", bg: "bg-orange-50", icon: "AlertTriangle", iconColor: "text-orange-600" },
  success: { border: "border-green-500",  bg: "bg-green-50",  icon: "CheckCircle",   iconColor: "text-green-600" },
  info:    { border: "border-blue-500",   bg: "bg-blue-50",   icon: "Info",          iconColor: "text-blue-600" },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: Notification[];
  onRead: () => void;
}

export function NotificationsDialog({ open, onOpenChange, notifications, onRead }: Props) {
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-white hover:text-white hover:bg-white/10">
          <Icon name="Bell" size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center animate-pulse-soft">
              {unreadCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>История уведомлений</DialogTitle>
          <DialogDescription>Все изменения статусов и события в системе</DialogDescription>
        </DialogHeader>
        <div className="max-h-[400px] overflow-y-auto space-y-3 py-4">
          {notifications.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Icon name="Bell" size={48} className="mx-auto mb-3 opacity-50" />
              <p>Нет уведомлений</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const style = NOTIF_STYLES[notif.type] || NOTIF_STYLES.info;
              return (
                <div
                  key={notif.id}
                  className={`p-4 rounded-lg border-l-4 ${style.border} ${style.bg} ${notif.is_read ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notif.created_at
                          ? new Date(notif.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : 'Только что'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon name={style.icon} size={18} className={style.iconColor} />
                      {!notif.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={async () => {
                            await notificationsApi.markAsRead(notif.id);
                            onRead();
                          }}
                        >
                          <Icon name="Check" size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Закрыть</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
