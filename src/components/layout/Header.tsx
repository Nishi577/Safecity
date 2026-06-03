import { Shield, Menu, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="border-b bg-card w-full">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">SafeCity</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8">
          <a href="#how-it-works" className="text-sm font-medium hover:text-primary">How It Works</a>
          <a href="#features" className="text-sm font-medium hover:text-primary">Features</a>
          <a href="#transparency" className="text-sm font-medium hover:text-primary">Transparency</a>
        </nav>

        {/* Auth Actions */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <Link to="/dashboard">
                <Button variant="outline" size="sm">Dashboard</Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign Out</Button>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link to="/auth">
                <Button size="sm">Report Incident</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t p-4 space-y-4">
          <a href="#how-it-works" className="block text-sm font-medium">How It Works</a>
          <a href="#features" className="block text-sm font-medium">Features</a>
          <a href="#transparency" className="block text-sm font-medium">Transparency</a>
          <div className="pt-4 border-t flex flex-col gap-2">
            {user ? (
              <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>Dashboard</Button>
            ) : (
              <Button className="w-full" onClick={() => navigate("/auth")}>Get Started</Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
