import { PageLayout } from "@/components/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Database, 
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  HardDrive,
  Settings,
  Play,
  Pause,
  BarChart3,
  Zap
} from "lucide-react"

const databases = [
  {
    id: 1,
    name: "User Database",
    description: "Main user management and authentication database",
    type: "PostgreSQL",
    status: "online",
    size: "2.4 GB",
    connections: 45,
    lastBackup: "2 hours ago",
    location: "us-east-1"
  },
  {
    id: 2,
    name: "Analytics DB",
    description: "Data warehouse for analytics and reporting",
    type: "ClickHouse",
    status: "online",
    size: "15.7 GB",
    connections: 12,
    lastBackup: "1 hour ago",
    location: "us-west-2"
  },
  {
    id: 3,
    name: "Cache Store",
    description: "Redis cache for session and data caching",
    type: "Redis",
    status: "online",
    size: "512 MB",
    connections: 128,
    lastBackup: "30 minutes ago",
    location: "us-east-1"
  },
  {
    id: 4,
    name: "File Metadata",
    description: "MongoDB for file metadata and indexing",
    type: "MongoDB",
    status: "maintenance",
    size: "890 MB",
    connections: 8,
    lastBackup: "4 hours ago",
    location: "eu-west-1"
  },
  {
    id: 5,
    name: "Logs Archive",
    description: "Time-series database for application logs",
    type: "InfluxDB",
    status: "online",
    size: "8.2 GB",
    connections: 3,
    lastBackup: "6 hours ago",
    location: "us-central-1"
  },
  {
    id: 6,
    name: "Test Database",
    description: "Development and testing environment",
    type: "SQLite",
    status: "offline",
    size: "156 MB",
    connections: 0,
    lastBackup: "1 day ago",
    location: "local"
  }
]

export default function DatabasesPage() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Databases</h1>
            <p className="text-muted-foreground">
              Manage and monitor your database connections and performance
            </p>
          </div>
          <Button className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Connect Database</span>
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Databases</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">6</div>
              <p className="text-xs text-muted-foreground">+1 from last week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online</CardTitle>
              <HardDrive className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">4</div>
              <p className="text-xs text-muted-foreground">66.7% uptime</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Size</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">27.8 GB</div>
              <p className="text-xs text-muted-foreground">+2.1 GB this month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">196</div>
              <p className="text-xs text-muted-foreground">+15% from yesterday</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search databases..."
              className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button variant="outline" className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </Button>
        </div>

        {/* Databases Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {databases.map((db) => (
            <Card key={db.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-lg ${
                      db.status === 'online' ? 'bg-green-100 dark:bg-green-900' :
                      db.status === 'offline' ? 'bg-red-100 dark:bg-red-900' :
                      'bg-yellow-100 dark:bg-yellow-900'
                    }`}>
                      <Database className={`h-4 w-4 ${
                        db.status === 'online' ? 'text-green-600 dark:text-green-400' :
                        db.status === 'offline' ? 'text-red-600 dark:text-red-400' :
                        'text-yellow-600 dark:text-yellow-400'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{db.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          db.status === 'online' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          db.status === 'offline' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {db.status}
                        </span>
                        <span className="text-xs text-muted-foreground">{db.type}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {db.description}
                </CardDescription>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Size:</span>
                    <span>{db.size}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Connections:</span>
                    <span>{db.connections}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last Backup:</span>
                    <span>{db.lastBackup}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-mono text-xs">{db.location}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Settings className="h-3 w-3 mr-1" />
                    Configure
                  </Button>
                  <Button variant="outline" size="sm">
                    {db.status === 'online' ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance Monitoring */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Performance Monitoring</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Query Performance</CardTitle>
                <CardDescription>
                  Average query response times by database
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {databases.slice(0, 4).map((db) => (
                    <div key={db.id} className="flex items-center justify-between">
                      <span className="text-sm">{db.name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.random() * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.floor(Math.random() * 500 + 50)}ms
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Storage Usage</CardTitle>
                <CardDescription>
                  Database storage consumption
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {databases.slice(0, 4).map((db) => (
                    <div key={db.id} className="flex items-center justify-between">
                      <span className="text-sm">{db.name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${Math.random() * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {db.size}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  )
} 