
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, FileText, Loader2, CheckCircle, Bug, BrainCircuit, FilterX } from 'lucide-react';
import { generateDocumentExpiryAlerts } from '@/ai/flows/document-expiry-alerts';
import { contractIssueAlerts, ContractIssueAlertsInput, ContractIssueAlertsOutput } from '@/ai/flows/contract-issue-alerts';
import { errorAnalysisAlerts, ErrorAnalysisAlertsInput, ErrorAnalysisAlertsOutput } from '@/ai/flows/error-analysis-alerts';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from '@/lib/utils';
import { getErrorLogs, saveErrorLog } from '@/lib/alerts-actions';
import { getAllVehicles } from '@/lib/vehicle-actions';
import { getEmployees } from '@/lib/hr-actions';
import type { VehicleRecord } from '@/app/(dashboard)/purchase/page';

const alertThresholdDays = 30;

type ExpirableDocument = {
    documentType: string;
    documentName: string;
    ownerName: string;
    expiryDate: string;
    alertMessage: string;
}

const DOCUMENT_TYPES = ['Vehicle Insurance', 'Vehicle Tax', 'Employee Contract'];

function DocumentExpiryAlerts() {
    const [allAlerts, setAllAlerts] = useState<ExpirableDocument[]>([]);
    const [filteredAlerts, setFilteredAlerts] = useState<ExpirableDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState('');
    const [documentCount, setDocumentCount] = useState(0);
    const [filters, setFilters] = useState({ docType: '', ownerName: '' });

    useEffect(() => {
        setCurrentDate(new Date().toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        if (!currentDate) return;

        async function checkDocuments() {
            setIsLoading(true);
            const docsToCheck: Omit<ExpirableDocument, 'alertMessage'>[] = [];

            // Fetch vehicles and check for insurance/tax expiry
            const vehicles = await getAllVehicles();
            vehicles.forEach(v => {
                if (v.fullData.insuranceExpiry) {
                    docsToCheck.push({
                        documentType: 'Vehicle Insurance',
                        documentName: `${v.vehicle} (${v.license_plate})`,
                        ownerName: 'System',
                        expiryDate: v.fullData.insuranceExpiry,
                    });
                }
                if (v.fullData.taxExpiry) {
                    docsToCheck.push({
                        documentType: 'Vehicle Tax',
                        documentName: `${v.vehicle} (${v.license_plate})`,
                        ownerName: 'System',
                        expiryDate: v.fullData.taxExpiry,
                    });
                }
            });

            // Fetch employees and check for contract expiry
            const employees = await getEmployees();
            employees.forEach(emp => {
                if (emp.job_details.contract_expiry_date) {
                    docsToCheck.push({
                        documentType: 'Employee Contract',
                        documentName: `Employment Contract`,
                        ownerName: emp.personal_info.name,
                        expiryDate: emp.job_details.contract_expiry_date,
                    });
                }
            });
            
            setDocumentCount(docsToCheck.length);

            const generatedAlerts: ExpirableDocument[] = [];
            for (const doc of docsToCheck) {
                const result = await generateDocumentExpiryAlerts({
                    documentType: doc.documentType,
                    documentName: doc.documentName,
                    ownerName: doc.ownerName,
                    expiryDate: doc.expiryDate,
                    alertThresholdDays,
                    currentDate,
                });
                if (result.alertMessage) {
                    generatedAlerts.push({...doc, alertMessage: result.alertMessage});
                }
            }
            setAllAlerts(generatedAlerts);
            setIsLoading(false);
        }
        checkDocuments();
    }, [currentDate]);

    useEffect(() => {
        let filtered = allAlerts;
        if (filters.docType) {
            filtered = filtered.filter(alert => alert.documentType === filters.docType);
        }
        if (filters.ownerName) {
            const searchTerm = filters.ownerName.toLowerCase();
            filtered = filtered.filter(alert => 
                alert.ownerName.toLowerCase().includes(searchTerm) ||
                alert.documentName.toLowerCase().includes(searchTerm)
            );
        }
        setFilteredAlerts(filtered);
    }, [allAlerts, filters]);

    const handleFilterChange = (id: string, value: string) => {
        setFilters(prev => ({...prev, [id]: value}));
    }
    
    const clearFilters = () => {
        setFilters({ docType: '', ownerName: '' });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Document Expiry</CardTitle>
                <CardDescription>
                    AI-powered alerts for documents nearing their expiration date. Checking {documentCount} documents.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                         <div className="space-y-2">
                            <Label>Filter by Document Type</Label>
                             <Select value={filters.docType} onValueChange={(value) => handleFilterChange('docType', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Document Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DOCUMENT_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                </SelectContent>
                             </Select>
                         </div>
                          <div className="space-y-2">
                            <Label>Search by Owner or Vehicle</Label>
                            <Input 
                                placeholder="e.g. John Doe or 1AB-1234" 
                                value={filters.ownerName} 
                                onChange={(e) => handleFilterChange('ownerName', e.target.value)}
                            />
                         </div>
                         <Button variant="outline" onClick={clearFilters} className="md:col-span-2">
                            <FilterX className="mr-2 h-4 w-4" /> Clear All Filters
                         </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Analyzing documents...</span>
                    </div>
                ) : filteredAlerts.length > 0 ? (
                    filteredAlerts.map((alert, index) => (
                        <Alert key={index} variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>{alert.documentType} Expiry Alert</AlertTitle>
                            <AlertDescription>{alert.alertMessage}</AlertDescription>
                        </Alert>
                    ))
                ) : (
                    <Alert>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <AlertTitle>All Clear!</AlertTitle>
                        <AlertDescription>No documents match your filter criteria or none are nearing expiry within the {alertThresholdDays}-day threshold.</AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}

const exampleContract = `SALES AGREEMENT

This Sales Agreement (the "Agreement") is entered into as of June 25, 2024, by and between Openroad DMS ("Seller") and John Smith ("Buyer").

1.  Vehicle. Seller agrees to sell to Buyer the following vehicle:
    -   Make: Honda
    -   Model: Civic
    -   Year: 2023
    -   VIN: 1HGFC...

2.  Purchase Price. The total purchase price for the Vehicle is $25,000.00.

3.  Payment. Buyer shall pay the Purchase Price in full upon execution of this Agreement.

4.  Warranty. The Vehicle is sold "AS IS" with no warranties, express or implied.

5.  Unlimited Liability. The Seller assumes unlimited liability for any and all defects, known or unknown, that may arise after the sale.

6.  Governing Law. This Agreement shall be governed by the laws of the State of California.
`;

function ContractAnalysis() {
    const [formState, setFormState] = useState<ContractIssueAlertsInput>({
        contractText: exampleContract,
        contractType: 'sales',
        additionalContext: 'Standard vehicle sale to an individual.',
    });
    const [result, setResult] = useState<ContractIssueAlertsOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleAnalyze = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const analysisResult = await contractIssueAlerts(formState);
            setResult(analysisResult);
        } catch (error) {
            console.error("Contract analysis failed:", error);
            // You might want to show a toast or an error message here
        }
        setIsLoading(false);
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Analyze Contract</CardTitle>
                    <CardDescription>
                        Paste a contract below to have it analyzed for potential issues by our AI.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="contract-text">Contract Text</Label>
                        <Textarea
                            id="contract-text"
                            placeholder="Paste your contract text here..."
                            className="h-64 font-mono text-xs"
                            value={formState.contractText}
                            onChange={(e) => setFormState({ ...formState, contractText: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="contract-type">Contract Type</Label>
                             <Select
                                value={formState.contractType}
                                onValueChange={(value: 'sales' | 'purchase') => setFormState({ ...formState, contractType: value })}
                            >
                                <SelectTrigger id="contract-type">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sales">Sales Contract</SelectItem>
                                    <SelectItem value="purchase">Purchase Contract</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="additional-context">Additional Context</Label>
                             <Input
                                id="additional-context"
                                placeholder="e.g., High-value client"
                                value={formState.additionalContext || ''}
                                onChange={(e) => setFormState({ ...formState, additionalContext: e.target.value })}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleAnalyze} disabled={isLoading || !formState.contractText}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                             <>
                                <FileText className="mr-2 h-4 w-4" />
                                Analyze Contract
                             </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
            
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>Analysis Result</CardTitle>
                    <CardDescription>
                        The AI's findings will be displayed below.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    {isLoading && (
                         <div className="flex items-center justify-center h-full">
                            <div className="text-center space-y-2 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                                <p>Generating analysis...</p>
                             </div>
                         </div>
                    )}
                    {result && (
                        <div className="space-y-4">
                            <div>
                               <Badge variant={result.hasIssues ? 'destructive' : 'default'} className={!result.hasIssues ? "bg-accent hover:bg-accent/90" : ""}>
                                {result.hasIssues ? "Issues Found" : "No Issues Found"}
                               </Badge>
                            </div>
                            <h3 className="font-semibold text-lg">Summary</h3>
                            <p className="text-sm text-muted-foreground">{result.summary}</p>
                            {result.hasIssues && result.issues.length > 0 && (
                                <>
                                    <h3 className="font-semibold text-lg mt-4">Potential Issues</h3>
                                    <div className="space-y-3 mt-2">
                                        {result.issues.map((issue, index) => (
                                          <Alert variant="destructive" key={index}>
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertDescription>{issue}</AlertDescription>
                                          </Alert>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    {!isLoading && !result && (
                         <div className="flex items-center justify-center h-full">
                             <div className="text-center text-muted-foreground space-y-2">
                                <FileText className="h-8 w-8 mx-auto" />
                                <p>Click "Analyze Contract" to see results.</p>
                             </div>
                         </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

const severityStyles: { [key: string]: string } = {
  'Low': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  'Medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  'High': 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
  'Critical': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

type ErrorLog = ErrorAnalysisAlertsOutput & { log_id: string; errorText: string, context?: string, created_at: string };

function ErrorLogAnalysis() {
    const [formState, setFormState] = useState<ErrorAnalysisAlertsInput>({ errorText: '', context: '' });
    const [result, setResult] = useState<ErrorAnalysisAlertsOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
    const [isLogLoading, setIsLogLoading] = useState(true);

    const fetchLogs = async () => {
        setIsLogLoading(true);
        const logs = await getErrorLogs();
        setErrorLogs(logs.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        setIsLogLoading(false);
    }

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleAnalyze = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const analysisResult = await errorAnalysisAlerts(formState);
            setResult(analysisResult);
            // Save the log after successful analysis
            await saveErrorLog({ ...formState, ...analysisResult });
            // Refresh logs
            await fetchLogs();
        } catch (error) {
            console.error("Error analysis failed:", error);
            // Show toast or error message
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>AI-Powered Error Analysis</CardTitle>
                    <CardDescription>
                        Paste a raw error message or stack trace to get an AI-generated analysis and solution.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="error-text">Error Message / Stack Trace</Label>
                        <Textarea
                            id="error-text"
                            placeholder="e.g., TypeError: Cannot read properties of undefined (reading 'map')"
                            className="h-40 font-mono text-xs"
                            value={formState.errorText}
                            onChange={(e) => setFormState({ ...formState, errorText: e.target.value })}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="error-context">Context (Optional)</Label>
                         <Input
                            id="error-context"
                            placeholder="e.g., User was trying to generate a payroll report for March 2024"
                            value={formState.context || ''}
                            onChange={(e) => setFormState({ ...formState, context: e.target.value })}
                        />
                    </div>
                </CardContent>
                <CardFooter className="justify-between">
                    <Button onClick={handleAnalyze} disabled={isLoading || !formState.errorText}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing Error...</> : <><BrainCircuit className="mr-2 h-4 w-4" /> Analyze Error</>}
                    </Button>
                    {result && (
                        <div className="flex items-center gap-2">
                            <Label>Severity:</Label>
                            <Badge className={cn(severityStyles[result.severity])}>{result.severity}</Badge>
                        </div>
                    )}
                </CardFooter>
            </Card>

            {result && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Analysis Result</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div>
                            <h3 className="font-semibold mb-2">Probable Cause</h3>
                            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{result.probableCause}</p>
                         </div>
                          <div>
                            <h3 className="font-semibold mb-2">Suggested Solution</h3>
                            <pre className="text-sm bg-muted p-3 rounded-md overflow-x-auto"><code>{result.suggestedSolution}</code></pre>
                         </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Error Log History</CardTitle>
                    <CardDescription>A record of all AI-analyzed errors.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Severity</TableHead>
                                <TableHead>Probable Cause</TableHead>
                                <TableHead>Original Error</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLogLoading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                            ) : errorLogs.length > 0 ? (
                                errorLogs.map(log => (
                                    <TableRow key={log.log_id}>
                                        <TableCell className="text-xs">{new Date(log.created_at).toLocaleString()}</TableCell>
                                        <TableCell><Badge className={cn(severityStyles[log.severity])}>{log.severity}</Badge></TableCell>
                                        <TableCell className="max-w-xs truncate">{log.probableCause}</TableCell>
                                        <TableCell className="max-w-xs truncate font-mono text-xs">{log.errorText}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No error logs found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

export function AlertsClient() {
  return (
    <Tabs defaultValue="expiry-alerts" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3 md:w-[600px]">
        <TabsTrigger value="expiry-alerts"><AlertTriangle className="mr-2 h-4 w-4"/> Document Expiry</TabsTrigger>
        <TabsTrigger value="contract-analysis"><FileText className="mr-2 h-4 w-4"/> Contract Analysis</TabsTrigger>
        <TabsTrigger value="error-analysis"><Bug className="mr-2 h-4 w-4"/> Error Analysis</TabsTrigger>
      </TabsList>
      <TabsContent value="expiry-alerts">
        <DocumentExpiryAlerts />
      </TabsContent>
      <TabsContent value="contract-analysis">
        <ContractAnalysis />
      </TabsContent>
      <TabsContent value="error-analysis">
        <ErrorLogAnalysis />
      </TabsContent>
    </Tabs>
  );
}
