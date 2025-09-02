import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Products from "./pages/Products";
import ProductChatbot from "./pages/ProductChatbot";
import ProductWebsiteVoiceBot from "./pages/ProductWebsiteVoiceBot";
import ProductCallVoiceBot from "./pages/ProductCallVoiceBot";
import ProductAvatarVoiceBot from "./pages/ProductAvatarVoiceBot";
import Solutions from "./pages/Solutions";
import CustomerSupport from "./pages/CustomerSupport";
import LeadGeneration from "./pages/LeadGeneration";
import Ecommerce from "./pages/Ecommerce";
import InternalHelpdesk from "./pages/InternalHelpdesk";
import Pricing from "./pages/Pricing";
import HowItWorks from "./pages/HowItWorks";
import Blog from "./pages/Blog";
import Docs from "./pages/Docs";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Demo from "./pages/Demo";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          
          {/* Product Routes */}
          <Route path="/products" element={<Products />} />
          <Route path="/products/chatbot" element={<ProductChatbot />} />
          <Route path="/products/website-voicebot" element={<ProductWebsiteVoiceBot />} />
          <Route path="/products/call-voicebot" element={<ProductCallVoiceBot />} />
          <Route path="/products/avatar-voicebot" element={<ProductAvatarVoiceBot />} />
          
          {/* Solution Routes */}
          <Route path="/solutions" element={<Solutions />} />
          <Route path="/solutions/customer-support" element={<CustomerSupport />} />
          <Route path="/solutions/lead-generation" element={<LeadGeneration />} />
          <Route path="/solutions/ecommerce" element={<Ecommerce />} />
          <Route path="/solutions/internal-helpdesk" element={<InternalHelpdesk />} />
          
          {/* Other Routes */}
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/demo" element={<Demo />} />
          
          {/* Catch All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
