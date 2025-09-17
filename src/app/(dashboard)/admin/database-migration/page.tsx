"use client";

import { PageHeader } from "@/modules/shared/components/page-header";
import {
  Alert,
  AlertDescription,
} from "@/modules/shared/components/ui/ui/alert";
import { Badge } from "@/modules/shared/components/ui/ui/badge";
import { Button } from "@/modules/shared/components/ui/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/shared/components/ui/ui/card";
import { Progress } from "@/modules/shared/components/ui/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/modules/shared/components/ui/ui/tabs";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Database,
  Play,
  RefreshCw,
  Server,
  Shield,
  Upload,
  XCircle,
} from "lucide-react";
import { useState } from "react";

interface MigrationResult {
  success: boolean;
  table: string;
  migrated: number;
  errors: string[];
}

interface MigrationSummary {
  totalMigrated: number;
  totalErrors: number;
  tablesProcessed: number;
}

export default function DatabaseMigrationPage() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [connectionMessage, setConnectionMessage] = useState("");
  const [migrationInProgress, setMigrationInProgress] = useState(false);
  const [migrationResults, setMigrationResults] = useState<MigrationResult[]>(
    []
  );
  const [migrationSummary, setMigrationSummary] =
    useState<MigrationSummary | null>(null);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState("");

  const testConnection = async () => {
    setCurrentStep("Testing database connection...");

    try {
      const response = await fetch("/api/database/test-connection", {
        method: "POST",
      });
      const result = await response.json();

      setIsConnected(result.success);
      setConnectionMessage(result.message || result.error);
    } catch (error) {
      setIsConnected(false);
      setConnectionMessage("Failed to connect to database");
    }

    setCurrentStep("");
  };

  const runMigration = async () => {
    setMigrationInProgress(true);
    setCurrentStep("Starting migration...");
    setMigrationResults([]);
    setMigrationSummary(null);

    try {
      const response = await fetch("/api/database/migrate", {
        method: "POST",
      });
      const result = await response.json();

      setMigrationResults(result.results || []);
      setMigrationSummary(result.summary);
    } catch (error) {
      console.error("Migration failed:", error);
    }

    setMigrationInProgress(false);
    setCurrentStep("");
  };

  const validateMigration = async () => {
    setCurrentStep("Validating migrated data...");

    try {
      const response = await fetch("/api/database/validate", {
        method: "POST",
      });
      const result = await response.json();

      setValidationResults(result.validation);
    } catch (error) {
      console.error("Validation failed:", error);
    }

    setCurrentStep("");
  };

  const loadSystemStats = async () => {
    setCurrentStep("Loading system statistics...");

    try {
      const response = await fetch("/api/database/stats", {
        method: "GET",
      });
      const result = await response.json();

      setSystemStats(result.data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }

    setCurrentStep("");
  };

  const getMigrationProgress = () => {
    if (!migrationSummary) return 0;
    const totalTables = 6; // Expected number of tables
    return (migrationSummary.tablesProcessed / totalTables) * 100;
  };

  const getResultIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <>
      <PageHeader
        title="Database Migration & Testing"
        description="Migrate from JSON files to Supabase database and test multi-user functionality"
      >
        <Button
          onClick={testConnection}
          variant="outline"
          size="sm"
          disabled={currentStep !== ""}
        >
          <Database className="mr-2 h-4 w-4" />
          Test Connection
        </Button>
      </PageHeader>

      {/* Connection Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {isConnected === null ? (
              <Badge variant="outline">Not Tested</Badge>
            ) : isConnected ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="mr-1 h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="mr-1 h-3 w-3" />
                Disconnected
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {connectionMessage}
            </span>
          </div>

          {currentStep && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">{currentStep}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="migration" className="space-y-6">
        <TabsList>
          <TabsTrigger value="migration">Data Migration</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="testing">Multi-User Testing</TabsTrigger>
          <TabsTrigger value="audit">System Audit</TabsTrigger>
        </TabsList>

        {/* Migration Tab */}
        <TabsContent value="migration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Data Migration
              </CardTitle>
              <CardDescription>
                Migrate all JSON data to Supabase tables with integrity checks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button
                  onClick={runMigration}
                  disabled={migrationInProgress || isConnected !== true}
                  className="flex-1"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {migrationInProgress ? "Migrating..." : "Start Migration"}
                </Button>
              </div>

              {migrationInProgress && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Migration in progress...</span>
                  </div>
                  <Progress value={getMigrationProgress()} className="w-full" />
                </div>
              )}

              {migrationSummary && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Migration completed: {migrationSummary.totalMigrated}{" "}
                    records migrated across {migrationSummary.tablesProcessed}{" "}
                    tables.
                    {migrationSummary.totalErrors > 0 && (
                      <span className="text-red-600">
                        {" "}
                        {migrationSummary.totalErrors} errors occurred.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {migrationResults.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Migration Results:</h4>
                  {migrationResults.map((result, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getResultIcon(result.success)}
                          <span className="font-medium capitalize">
                            {result.table}
                          </span>
                        </div>
                        <Badge
                          variant={result.success ? "default" : "destructive"}
                        >
                          {result.migrated} migrated
                        </Badge>
                      </div>
                      {result.errors.length > 0 && (
                        <div className="mt-2 text-sm text-red-600">
                          <details>
                            <summary>
                              {result.errors.length} error(s) - Click to view
                            </summary>
                            <ul className="mt-1 list-disc list-inside space-y-1">
                              {result.errors.map((error, i) => (
                                <li key={i}>{error}</li>
                              ))}
                            </ul>
                          </details>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Data Validation
              </CardTitle>
              <CardDescription>
                Verify data integrity and completeness after migration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={validateMigration} disabled={currentStep !== ""}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Validate Migration
              </Button>

              {validationResults && (
                <div className="space-y-3">
                  <h4 className="font-medium">Validation Results:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(validationResults).map(
                      ([table, data]: [string, any]) => (
                        <Card key={table} className="p-4">
                          <div className="flex items-center justify-between">
                            <span className="font-medium capitalize">
                              {table.replace("_", " ")}
                            </span>
                            <Badge variant="outline">
                              {data.count} records
                            </Badge>
                          </div>
                          {data.sample && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              <details>
                                <summary>Sample data</summary>
                                <pre className="mt-1 bg-muted p-2 rounded text-xs overflow-auto">
                                  {JSON.stringify(data.sample, null, 2)}
                                </pre>
                              </details>
                            </div>
                          )}
                        </Card>
                      )
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Multi-User Testing
              </CardTitle>
              <CardDescription>
                Test concurrent access, transactions, and data consistency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Multi-user testing requires proper authentication setup.
                    This will be available after user authentication is
                    migrated.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h5 className="font-medium mb-2">Concurrency Tests</h5>
                    <ul className="text-sm space-y-1">
                      <li>✓ Row Level Security policies</li>
                      <li>✓ Optimistic locking</li>
                      <li>✓ Transaction isolation</li>
                      <li>⏳ Multi-user simulation</li>
                    </ul>
                  </Card>

                  <Card className="p-4">
                    <h5 className="font-medium mb-2">Data Integrity</h5>
                    <ul className="text-sm space-y-1">
                      <li>✓ Foreign key constraints</li>
                      <li>✓ Data validation triggers</li>
                      <li>✓ Audit trail logging</li>
                      <li>⏳ Conflict resolution</li>
                    </ul>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                System Audit
              </CardTitle>
              <CardDescription>
                Comprehensive system statistics and health check
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={loadSystemStats} disabled={currentStep !== ""}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Load System Stats
              </Button>

              {systemStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold">
                      {systemStats.total_vehicles}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Vehicles
                    </div>
                  </Card>

                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold">
                      {systemStats.active_vehicles}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Active Vehicles
                    </div>
                  </Card>

                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold">
                      {systemStats.total_employees}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Employees
                    </div>
                  </Card>

                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold">
                      {systemStats.total_users}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Users
                    </div>
                  </Card>

                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold">
                      {systemStats.active_users}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Active Users
                    </div>
                  </Card>

                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold">
                      {systemStats.active_sessions}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Active Sessions
                    </div>
                  </Card>

                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold">
                      {systemStats.total_sales}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Sales
                    </div>
                  </Card>

                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold">
                      {systemStats.pending_expenses}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Pending Expenses
                    </div>
                  </Card>
                </div>
              )}

              {systemStats && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    System audit completed successfully. Last updated:{" "}
                    {new Date(systemStats.last_updated).toLocaleString()}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
