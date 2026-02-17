
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import PendingActivation from "./pages/PendingActivation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/main" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pending" element={<PendingActivation />} />
          <Route path="/main" element={<Index initialTab="my-crew" />} />
          <Route path="/units" element={<Index initialTab="crews" />} />
          <Route path="/bolo" element={<Index initialTab="bolo" />} />
          <Route path="/profile" element={<Index initialTab="profile" />} />
          <Route path="/settings" element={<Index initialTab="settings" />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;