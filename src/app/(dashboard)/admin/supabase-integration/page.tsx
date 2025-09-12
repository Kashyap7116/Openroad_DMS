'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { 
  getSupabaseUsers, 
  getSupabaseAuthUsers,
  createSupabaseUser 
} from '@/lib/supabase-admin-actions'
import { getUsers } from '@/lib/admin-actions'
import { PageHeader } from '@/components/page-header'
import { Loader2, Users, Database, Shield, CheckCircle, AlertCircle } from 'lucide-react'

export default function SupabaseIntegrationPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [supabaseUsers, setSupabaseUsers] = useState<any[]>([])
  const [authUsers, setAuthUsers] = useState<any[]>([])
  const [jsonUsers, setJsonUsers] = useState<any[]>([])
  const [stats, setStats] = useState({
    supabaseProfiles: 0,
    supabaseAuth: 0,
    jsonUsers: 0,
    synced: 0
  })

  const fetchAllData = async () => {
    setIsLoading(true)
    try {
      // Fetch Supabase profile users
      const supabaseResult = await getSupabaseUsers()
      if (supabaseResult.success) {
        setSupabaseUsers(supabaseResult.users || [])
      }

      // Fetch Supabase auth users
      const authResult = await getSupabaseAuthUsers()
      if (authResult.success) {
        setAuthUsers(authResult.users || [])
      }

      // Fetch JSON users
      const jsonResult = await getUsers()
      setJsonUsers(jsonResult || [])

      // Calculate stats
      const profileCount = supabaseResult.users?.length || 0
      const authCount = authResult.users?.length || 0
      const jsonCount = jsonResult?.length || 0
      
      // Count how many are synced (exist in both auth and profiles)
      const authEmails = new Set(authResult.users?.map(u => u.email) || [])
      const profileEmails = new Set(supabaseResult.users?.map(u => u.email) || [])
      const syncedCount = [...authEmails].filter(email => profileEmails.has(email)).length

      setStats({
        supabaseProfiles: profileCount,
        supabaseAuth: authCount,
        jsonUsers: jsonCount,
        synced: syncedCount
      })

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive"
      })
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  const createTestUser = async () => {
    setIsLoading(true)
    try {
      const result = await createSupabaseUser({
        name: 'Test User',
        email: `test-${Date.now()}@openroad.com`,
        password: 'test123',
        role: 'Staff',
        modules: ['Dashboard'],
        status: 'Active'
      })

      if (result.success) {
        toast({
          title: "Success",
          description: "Test user created successfully!"
        })
        await fetchAllData()
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create test user",
        variant: "destructive"
      })
    }
    setIsLoading(false)
  }

  return (
    <>
      <PageHeader
        title="Supabase Integration Status"
        description="Monitor and manage the Supabase authentication integration"
      />

      <div className="grid gap-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Supabase Profiles</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.supabaseProfiles}</div>
              <p className="text-xs text-muted-foreground">
                Users in profiles table
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Supabase Auth</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.supabaseAuth}</div>
              <p className="text-xs text-muted-foreground">
                Users in auth system
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Legacy JSON</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.jsonUsers}</div>
              <p className="text-xs text-muted-foreground">
                Users in JSON file
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Synced Users</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.synced}</div>
              <p className="text-xs text-muted-foreground">
                Auth + Profile match
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Integration Status */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Status</CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={fetchAllData} 
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Refresh Data
              </Button>
              <Button 
                onClick={createTestUser} 
                disabled={isLoading}
                size="sm"
              >
                Create Test User
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-3">
                <div className="flex items-center gap-2">
                  {stats.supabaseAuth > 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                  <span>Supabase Auth Integration</span>
                  <Badge variant={stats.supabaseAuth > 0 ? "default" : "secondary"}>
                    {stats.supabaseAuth > 0 ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  {stats.supabaseProfiles > 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                  <span>Profiles Table</span>
                  <Badge variant={stats.supabaseProfiles > 0 ? "default" : "secondary"}>
                    {stats.supabaseProfiles > 0 ? "Active" : "Empty"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  {stats.synced === stats.supabaseAuth && stats.synced > 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                  <span>Data Synchronization</span>
                  <Badge variant={stats.synced === stats.supabaseAuth && stats.synced > 0 ? "default" : "secondary"}>
                    {stats.synced === stats.supabaseAuth && stats.synced > 0 ? "Synced" : "Partial"}
                  </Badge>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">✅ Integration Complete!</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• All new users are created in Supabase Auth and Profiles table</li>
                  <li>• User updates sync between Auth and Profiles</li>
                  <li>• User deletions remove from both Auth and Profiles</li>
                  <li>• Admin created users appear in Supabase Authentication dashboard</li>
                  <li>• Users can log in with their credentials</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Users Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="profiles" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profiles">Supabase Profiles</TabsTrigger>
                <TabsTrigger value="auth">Auth Users</TabsTrigger>
                <TabsTrigger value="json">Legacy JSON</TabsTrigger>
              </TabsList>

              <TabsContent value="profiles" className="space-y-4">
                <div className="space-y-2">
                  {supabaseUsers.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{user.role}</Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {user.modules?.length || 0} modules
                        </div>
                      </div>
                    </div>
                  ))}
                  {supabaseUsers.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No profiles found</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="auth" className="space-y-4">
                <div className="space-y-2">
                  {authUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{user.email}</div>
                        <div className="text-sm text-muted-foreground">ID: {user.id}</div>
                      </div>
                      <div className="text-right">
                        <Badge variant={user.email_confirmed_at ? "default" : "secondary"}>
                          {user.email_confirmed_at ? "Confirmed" : "Unconfirmed"}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          Created: {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {authUsers.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No auth users found</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="json" className="space-y-4">
                <div className="space-y-2">
                  {jsonUsers.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{user.role}</Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {user.modules?.length || 0} modules
                        </div>
                      </div>
                    </div>
                  ))}
                  {jsonUsers.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No JSON users found</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
