"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  NavigationMenu, 
  NavigationMenuItem, 
  NavigationMenuLink, 
  NavigationMenuList,
  navigationMenuTriggerStyle 
} from "@/components/ui/navigation-menu"
import { 
  FolderOpen, 
  Server, 
  Database, 
  Settings,
  User,
  Bell
} from "lucide-react"

const navigation = [
  {
    name: "Workspaces",
    href: "/workspaces",
    icon: FolderOpen,
  },
  {
    name: "MCP Servers",
    href: "/mcp-servers",
    icon: Server,
  },
  {
    name: "Databases",
    href: "/databases",
    icon: Database,
  },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="flex items-center space-x-4 lg:space-x-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">GM</span>
              </div>
              <span className="font-bold text-xl">Granular MCP</span>
            </span>
          </Link>
          
          <NavigationMenu>
            <NavigationMenuList>
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <NavigationMenuItem key={item.name}>
                    <NavigationMenuLink asChild className={cn(
                      navigationMenuTriggerStyle(),
                      "flex items-center space-x-2",
                      isActive && "bg-accent text-accent-foreground"
                    )}>
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )
              })}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        
        <div className="ml-auto flex items-center space-x-4">
          <Button variant="ghost" size="icon">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
} 