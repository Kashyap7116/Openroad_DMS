'use client'

import { useState } from 'react'
import { signInWithPassword } from '@/lib/supabase-auth-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function QuickTestPage() {
  const [email, setEmail] = useState('admin@openroad.com')
  const [password, setPassword] = useState('vJ16@160181vj')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testLogin = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const loginResult = await signInWithPassword(email, password)
      setResult(loginResult)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Quick Login Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button 
            onClick={testLogin} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test Login'}
          </Button>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Status:</strong> {result.success ? 'SUCCESS' : 'FAILED'}</p>
                  {result.error && <p><strong>Error:</strong> {result.error}</p>}
                  {result.user && (
                    <div>
                      <p><strong>User:</strong> {result.user.name} ({result.user.email})</p>
                      <p><strong>Role:</strong> {result.user.role}</p>
                      <p><strong>Modules:</strong> {result.user.modules?.join(', ')}</p>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              If login is successful, you'll be able to use the main login page at <a href="/" className="underline">localhost:3000</a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
