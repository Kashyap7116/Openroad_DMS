'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle, AlertTriangle, Database, User, Key, Users } from 'lucide-react'

interface DiagnosticResult {
  test: string
  status: 'success' | 'error' | 'warning'
  message: string
  details?: string
}

export default function AuthDiagnosticsPage() {
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [fixResult, setFixResult] = useState<{ success: boolean; message: string; details?: string } | null>(null)

  const runDiagnostics = async () => {
    setIsRunning(true)
    setResults([])
    const diagnostics: DiagnosticResult[] = []

    try {
      // Test 1: Environment Variables
      const response1 = await fetch('/api/diagnostics/env-check')
      const envResult = await response1.json()
      diagnostics.push({
        test: 'Environment Variables',
        status: envResult.success ? 'success' : 'error',
        message: envResult.message,
        details: envResult.details
      })

      // Test 2: Supabase Connection
      const response2 = await fetch('/api/diagnostics/supabase-connection')
      const connResult = await response2.json()
      diagnostics.push({
        test: 'Supabase Connection',
        status: connResult.success ? 'success' : 'error',
        message: connResult.message,
        details: connResult.details
      })

      // Test 3: Database Schema
      const response3 = await fetch('/api/diagnostics/database-schema')
      const schemaResult = await response3.json()
      diagnostics.push({
        test: 'Database Schema (profiles table)',
        status: schemaResult.success ? 'success' : 'error',
        message: schemaResult.message,
        details: schemaResult.details
      })

      // Test 4: Check Existing Users
      const response4 = await fetch('/api/diagnostics/existing-users')
      const usersResult = await response4.json()
      diagnostics.push({
        test: 'Existing Users Check',
        status: usersResult.success ? (usersResult.hasUsers ? 'success' : 'warning') : 'error',
        message: usersResult.message,
        details: usersResult.details
      })

      // Test 5: Test Login Credentials
      const response5 = await fetch('/api/diagnostics/test-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@openroad.com', password: 'vJ16@160181vj' })
      })
      const credResult = await response5.json()
      diagnostics.push({
        test: 'Test Admin Credentials',
        status: credResult.success ? 'success' : 'error',
        message: credResult.message,
        details: credResult.details
      })

    } catch (error) {
      diagnostics.push({
        test: 'Diagnostic Error',
        status: 'error',
        message: 'Failed to run diagnostics',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    setResults(diagnostics)
    setIsRunning(false)
  }

  const fixAuthIssues = async () => {
    setIsRunning(true)
    setFixResult(null)

    try {
      const response = await fetch('/api/fix-auth-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@openroad.com', password: 'vJ16@160181vj' })
      })
      
      const result = await response.json()
      setFixResult(result)
    } catch (error) {
      setFixResult({
        success: false,
        message: 'Failed to fix auth issues',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />
      default: return null
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'default',
      warning: 'secondary',
      error: 'destructive'
    } as const
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">🔍 Authentication Diagnostics</h1>
        <p className="text-muted-foreground mt-2">
          Diagnose and fix Supabase authentication issues for admin@openroad.com
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Diagnostic Tools</CardTitle>
            <CardDescription>
              Run comprehensive tests to identify authentication issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={runDiagnostics} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRunning ? 'Running Diagnostics...' : 'Run Full Diagnostic'}
            </Button>

            <Button 
              onClick={fixAuthIssues} 
              disabled={isRunning}
              variant="secondary"
              className="w-full"
            >
              {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              🔧 Fix Authentication Issues
            </Button>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Diagnostic Results</CardTitle>
              <CardDescription>
                Review the test results below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <h4 className="font-medium">{result.test}</h4>
                      </div>
                      {getStatusBadge(result.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{result.message}</p>
                    {result.details && (
                      <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        {result.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {fixResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {fixResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                Fix Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant={fixResult.success ? 'default' : 'destructive'}>
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>{fixResult.message}</strong></p>
                    {fixResult.details && (
                      <p className="text-sm">{fixResult.details}</p>
                    )}
                    {fixResult.success && (
                      <div className="mt-4">
                        <Button asChild>
                          <a href="/">Try Logging In Now</a>
                        </Button>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Common Issues & Solutions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <Alert>
                <User className="h-4 w-4" />
                <AlertDescription>
                  <strong>Issue #1:</strong> User exists in JSON but not in Supabase. 
                  <br />
                  <strong>Solution:</strong> Create Supabase auth user and profile record.
                </AlertDescription>
              </Alert>

              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  <strong>Issue #2:</strong> Supabase auth user exists but no profile record.
                  <br />
                  <strong>Solution:</strong> Create profile record linked to auth user.
                </AlertDescription>
              </Alert>

              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  <strong>Issue #3:</strong> Database schema not set up.
                  <br />
                  <strong>Solution:</strong> Run SQL script from database/supabase-schema.sql.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
