"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Car,
  LayoutDashboard,
  ShoppingCart,
  DollarSign,
  Banknote,
  Wrench,
  Users,
  BarChart,
  AlertTriangle,
  FileText,
  CalendarCheck,
  ChevronDown,
  Settings,
  LogOut,
  User,
  Clock,
  Shield,
  Award,
} from "lucide-react";
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";
import { getCurrentUser, signOut } from "@/lib/supabase-auth-actions";
import type { UserProfile } from "@/lib/supabase-auth-actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

// Logo component - currently using SVG
// To use an image logo instead, replace with:
// import Image from 'next/image';
// const Logo = () => (
//   <Image src="/logo.png" alt="Openroad Thailand" width={160} height={40} />
// );
const Logo = () => (
  <svg width="160" height="40" viewBox="0 0 160 40" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", maxWidth: "100%" }}>
  <defs>
    <linearGradient id="bmw-m1" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#3A5CA8"/>
      <stop offset="100%" stopColor="#7CB9E8"/>
    </linearGradient>
    <linearGradient id="bmw-m2" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#212C53"/>
      <stop offset="100%" stopColor="#232D53"/>
    </linearGradient>
    <linearGradient id="bmw-m3" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#b81e3a"/>
      <stop offset="100%" stopColor="#E2453C"/>
    </linearGradient>
  </defs>
  <g>
    <rect x="6" y="3" width="8" height="34" fill="url(#bmw-m1)" transform="skewX(-20)"/>
    <rect x="16" y="3" width="8" height="34" fill="url(#bmw-m2)" transform="skewX(-20)"/>
    <rect x="26" y="3" width="8" height="34" fill="url(#bmw-m3)" transform="skewX(-20)"/>
  </g>
  <text x="42" y="26" fontFamily="Times New Roman, serif" fontSize="18" fontWeight="bold" fill="#222" letterSpacing="1.5">
    OPENROAD
  </text>
  <text x="76" y="33" fontFamily="Times New Roman, serif" fontSize="6" fontWeight="lighter" fill="#222" letterSpacing="1.5">
    THAILAND
  </text>
</svg>
);


// Module definitions with their required access
const ALL_MODULES = [
  {
    key: 'Dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    key: 'Purchase',
    title: 'Purchase',
    icon: ShoppingCart,
    href: '/purchase',
  },
  {
    key: 'Sales',
    title: 'Sales',
    icon: Car,
    href: '/sales',
  },
  {
    key: 'Finance',
    title: 'Finance',
    icon: DollarSign,
    href: '/finance',
  },
  {
    key: 'Maintenance',
    title: 'Maintenance',
    icon: Wrench,
    href: '/maintenance',
  },
  {
    key: 'HR',
    title: 'HR',
    icon: Users,
    href: '/hr',
    subItems: [
      { title: 'Employees', href: '/hr/employees', icon: User },
      { title: 'Attendance', href: '/hr/attendance', icon: CalendarCheck },
      { title: 'Payroll', href: '/hr/payroll', icon: Banknote },
    ],
  },
  {
    key: 'Reports',
    title: 'Reports',
    icon: BarChart,
    href: '/reports',
  },
  {
    key: 'Alerts',
    title: 'Alerts',
    icon: AlertTriangle,
    href: '/alerts',
  },
  {
    key: 'Admin',
    title: 'Admin',
    icon: Shield,
    href: '/admin',
    subItems: [
      { title: 'Users', href: '/admin/users', icon: Users },
      { title: 'Roles', href: '/admin/roles', icon: Award },
      { title: 'Logs', href: '/admin/logs', icon: FileText },
    ],
  },
];

export default function RBACAppSidebar() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userModules, setUserModules] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load user data and modules
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setUserModules(currentUser.modules || []);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Filter modules based on user permissions
  const availableModules = ALL_MODULES.filter(module => {
    // Admin role gets access to everything
    if (user?.role === 'Admin') {
      return true;
    }
    
    // Check if user has access to this module
    return userModules.includes(module.key);
  });

  const handleLogout = async () => {
    try {
      const result = await signOut();
      if (result.success) {
        toast({
          title: "Logged Out",
          description: "You have been successfully logged out.",
        });
        router.push('/');
      } else {
        toast({
          title: "Logout Failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred during logout.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-center py-3 px-2 w-full">
          <Link 
            href="/dashboard" 
            className="transition-all duration-200 hover:opacity-80 hover:scale-[1.02] cursor-pointer rounded-lg p-1 hover:bg-sidebar-accent/50 w-full flex justify-center"
          >
            <Logo />
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {availableModules.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            
            if (item.subItems) {
              return (
                <SidebarMenuItem key={item.key}>
                  <Collapsible defaultOpen={isActive}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className={cn(
                        "w-full justify-between",
                        isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}>
                        <div className="flex items-center">
                          <item.icon className="h-4 w-4" />
                          <span className="ml-3">{t(item.title)}</span>
                        </div>
                        <ChevronDown className="h-4 w-4" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-6 mt-1 space-y-1">
                        {item.subItems.map((subItem) => {
                          const isSubActive = pathname === subItem.href;
                          return (
                            <div key={subItem.href}>
                              <SidebarMenuButton asChild className={cn(
                                isSubActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                              )}>
                                <Link href={subItem.href}>
                                  <subItem.icon className="h-4 w-4" />
                                  <span className="ml-3">{t(subItem.title)}</span>
                                </Link>
                              </SidebarMenuButton>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              );
            }

            return (
              <SidebarMenuItem key={item.key}>
                <SidebarMenuButton asChild className={cn(
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}>
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span className="ml-3">{t(item.title)}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.image || undefined} alt={user.name} />
              <AvatarFallback>
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user.name}
              </p>
              <p className="text-xs text-sidebar-foreground/70 truncate">
                {user.role} • {user.email}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-1">
            <SidebarMenuButton asChild className="flex-1">
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span className="ml-2">{t('Settings')}</span>
              </Link>
            </SidebarMenuButton>
            
            <SidebarMenuButton onClick={handleLogout} className="flex-1">
              <LogOut className="h-4 w-4" />
              <span className="ml-2">{t('Logout')}</span>
            </SidebarMenuButton>
          </div>
        </div>
      </SidebarFooter>
    </>
  );
}
