import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const scrollToSection = (sectionId: string) => {
    if (isHomePage) {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleNavClick = (sectionId: string, fallbackPath: string) => {
    if (isHomePage) {
      scrollToSection(sectionId);
    } else {
      window.location.href = `/#${sectionId}`;
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300",
        isScrolled
          ? "bg-white/90 backdrop-blur-sm shadow-sm dark:bg-gray-900/90"
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link
              to="/"
              className="flex items-center font-heading font-bold text-xl"
            >
              <span className="gradient-text">Voxio</span>
              <span className="ml-1">AI</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <NavigationMenu>
              <NavigationMenuList>
                {/* Products */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Products</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      <li className="row-span-4">
                        <NavigationMenuLink asChild>
                          <button
                            onClick={() =>
                              handleNavClick("features", "/products")
                            }
                            className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-brand-purple/50 to-brand-blue/50 p-6 no-underline outline-none focus:shadow-md"
                          >
                            <div className="mb-2 mt-4 text-lg font-medium text-black dark:text-white">
                              AI Assistant Platform
                            </div>
                            <p className="text-sm leading-tight text-black/90 dark:text-white/90">
                              Discover our full suite of AI-powered
                              conversational solutions for web, voice, and
                              avatar interactions.
                            </p>
                          </button>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <button
                            onClick={() =>
                              handleNavClick("features", "/products")
                            }
                            className="block group select-none space-y-1 text-left rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent "
                          >
                            <div className="text-sm font-medium leading-none text-left">
                              Chatbot
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug group-hover:text-white focus:text-white text-muted-foreground">
                              Intelligent text-based support, available 24/7
                            </p>
                          </button>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <button
                            onClick={() =>
                              handleNavClick("features", "/products")
                            }
                            className="block group text-left select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="text-sm font-medium leading-none">
                              Website VoiceBot
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground group-hover:text-white focus:text-white">
                              Hands-free website interaction with voice
                            </p>
                          </button>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <button
                            onClick={() =>
                              handleNavClick("features", "/products")
                            }
                            className="block text-left group select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="text-sm font-medium leading-none">
                              Call VoiceBot
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground group-hover:text-white focus:text-white">
                              Automate and enhance phone support
                            </p>
                          </button>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <button
                            onClick={() =>
                              handleNavClick("features", "/products")
                            }
                            className="block group text-left select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="text-sm font-medium leading-none">
                              Avatar VoiceBot
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground group-hover:text-white focus:text-white">
                              Engaging visual presence with voice interaction
                            </p>
                          </button>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Solutions */}
                {/* <NavigationMenuItem>
                  <NavigationMenuTrigger>Solutions</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-2">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            to="/solutions/customer-support"
                            className="block select-none group space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="text-sm font-medium leading-none">Customer Support</div>
                            <p className="line-clamp-2 text-sm group-hover:text-white focus:text-white leading-snug text-muted-foreground">
                              24/7 automated support with human-like conversations
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            to="/solutions/lead-generation"
                            className="block select-none space-y-1 group rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="text-sm font-medium leading-none">Lead Generation</div>
                            <p className="line-clamp-2 text-sm group-hover:text-white focus:text-white leading-snug text-muted-foreground">
                              Convert more visitors into qualified leads
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            to="/solutions/ecommerce"
                            className="block select-none space-y-1 group rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="text-sm font-medium leading-none">E-commerce Assistant</div>
                            <p className="line-clamp-2 text-sm group-hover:text-white focus:text-white leading-snug text-muted-foreground">
                              Personalized shopping experiences and support
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            to="/solutions/internal-helpdesk"
                            className="block group select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="text-sm font-medium leading-none">Internal Helpdesk</div>
                            <p className="line-clamp-2 group-hover:text-white focus:text-white text-sm leading-snug text-muted-foreground">
                              Streamline internal support and knowledge sharing
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem> */}

                {/* Regular Navigation Items */}
                {/* <NavigationMenuItem>
                  <button
                    onClick={() => handleNavClick('pricing', '/pricing')}
                    className={navigationMenuTriggerStyle()}
                  >
                    Pricing
                  </button>
                </NavigationMenuItem> */}

                <NavigationMenuItem>
                  <button
                    onClick={() =>
                      handleNavClick("how-it-works", "/how-it-works")
                    }
                    className={navigationMenuTriggerStyle()}
                  >
                    How it Works
                  </button>
                </NavigationMenuItem>

                {/* Resources Dropdown */}
                {/* <NavigationMenuItem>
                  <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[200px] gap-3 p-4">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            to="/blog"
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="text-sm font-medium leading-none">Blog</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Latest articles and insights
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            to="/docs"
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="text-sm font-medium leading-none">Documentation</div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              Guides and API references
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem> */}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button asChild variant="outline">
              <Link to="/contact">Contact</Link>
            </Button>
            <Button asChild>
              <Link to="/demo">Request Demo</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white dark:bg-gray-900 shadow-lg">
            <button
              onClick={() => {
                handleNavClick("features", "/products");
                toggleMobileMenu();
              }}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-accent"
            >
              Products
            </button>
            {/* <Link
              to="/solutions"
              className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent"
              onClick={toggleMobileMenu}
            >
              Solutions
            </Link> */}
            {/* <button
              onClick={() => {
                handleNavClick('pricing', '/pricing');
                toggleMobileMenu();
              }}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-accent"
            >
              Pricing
            </button> */}
            <button
              onClick={() => {
                handleNavClick("how-it-works", "/how-it-works");
                toggleMobileMenu();
              }}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-accent"
            >
              How it Works
            </button>
            {/* <Link
              to="/blog"
              className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent"
              onClick={toggleMobileMenu}
            >
              Blog
            </Link>
            <Link
              to="/docs"
              className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent"
              onClick={toggleMobileMenu}
            >
              Documentation
            </Link> */}
            <Link
              to="/contact"
              className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent"
              onClick={toggleMobileMenu}
            >
              Contact
            </Link>
            <div className="pt-4">
              <Button asChild className="w-full">
                <Link to="/demo" onClick={toggleMobileMenu}>
                  Request Demo
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
