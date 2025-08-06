"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Plus, Trash, Search, Package, ShieldX, X, ShieldOff, Upload, Download, AlertCircle } from "lucide-react";

import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertModal } from "@/components/modals/alert-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// --- TYPES ---
type ProductWithDetails = {
    id: string; name: string; barCode: string; price: number;
    category: { name: string }; size: { name: string }; color: { name: string };
};
type ImportedRow = {
    barcode?: string;
};

export default function DeactivateProductsPage() {
    const params = useParams();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- STATE MANAGEMENT ---
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [importLoading, setImportLoading] = useState(false); // NEW
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<ProductWithDetails[]>([]);
    const [stagedProducts, setStagedProducts] = useState<ProductWithDetails[]>([]);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);

    // --- NEW: TEMPLATE DOWNLOAD LOGIC ---
    const handleDownloadTemplate = () => {
        const csvContent = "barcode\n1234567890123\n9876543210987";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", "deactivation_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- NEW: IMPORT LOGIC ---
    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImportLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = e.target?.result;
                let importedData: ImportedRow[] = [];
                if (file.name.endsWith('.csv')) {
                    importedData = Papa.parse(data as string, { header: true, skipEmptyLines: true, transformHeader: h => h.toLowerCase().trim() }).data as ImportedRow[];
                } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const jsonData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                    importedData = jsonData.map(row => {
                        const newRow: { [key: string]: any } = {};
                        for (const key in row) { newRow[key.toLowerCase().trim()] = row[key]; }
                        return newRow;
                    });
                }
                await processImportedData(importedData);
            } catch (error) {
                toast({ title: "Import Error", variant: "destructive" });
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = "";
                setImportLoading(false);
            }
        };
        reader.onerror = () => { toast({ title: "File Error", variant: "destructive"}); setImportLoading(false); };
        if (file.name.endsWith('.csv')) reader.readAsText(file); else reader.readAsBinaryString(file);
    };

    const processImportedData = async (importedData: ImportedRow[]) => {
        const validRows = importedData.filter(row => row.barcode);
        if (validRows.length === 0) {
            toast({ title: "Invalid File", description: "No 'barcode' column found.", variant: "destructive" });
            return;
        }
        const barcodesToLookup = [...new Set(validRows.map(row => String(row.barcode!)))];
        try {
            const response = await axios.post(`/api/${params.storeId}/products/bulk-lookup`, { barcodes: barcodesToLookup });
            const foundProducts: ProductWithDetails[] = response.data;
            const newProductsToStage = foundProducts.filter(p => !stagedProducts.some(sp => sp.id === p.id));
            
            setStagedProducts(prev => [...prev, ...newProductsToStage]);
            toast({ title: "Import Complete", description: `${newProductsToStage.length} new products staged.` });
        } catch (error) {
            toast({ title: "API Error", description: "Could not look up products from file.", variant: "destructive" });
        }
    };

    // --- SEARCH & STAGING LOGIC ---
    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            setSearchResults([]); setShowSearchResults(false); return;
        }
        try {
            setSearchLoading(true);
            const response = await axios.get(`/api/${params.storeId}/products/search?q=${searchTerm}`);
            setSearchResults(response.data);
            setShowSearchResults(true);
        } catch (error) {
            toast({ title: "Search Failed", variant: "destructive" });
        } finally {
            setSearchLoading(false);
        }
    };

    const addProductToStage = (product: ProductWithDetails) => {
        if (stagedProducts.find(p => p.id === product.id)) {
            toast({ title: "Product Already Added" }); return;
        }
        setStagedProducts(prev => [...prev, product]);
        toast({ title: "Product Added", description: `${product.name} has been staged.` });
    };
    
    const removeProductFromStage = (productId: string) => {
        setStagedProducts(prev => prev.filter(p => p.id !== productId));
    };

    // --- SUBMIT LOGIC ---
    const onBulkDeactivate = async () => {
        try {
            setLoading(true);
            const payload = { productIds: stagedProducts.map(p => p.id) };
            if (payload.productIds.length === 0) {
                toast({ title: "No Products to Deactivate", variant: "destructive" }); return;
            }
            // NOTE: Ensure your API endpoint is correct. You had '/deactivate', but '/bulk-deactivate' is more conventional.
            await axios.patch(`/api/${params.storeId}/products/bulk-deactivate`, payload);
            toast({ title: "Products Deactivated", description: `${payload.productIds.length} products have been deactivated.` });
            setStagedProducts([]);
        } catch (error) {
            toast({ title: "Deactivation Failed", variant: "destructive" });
        } finally {
            setLoading(false);
            setIsConfirmModalOpen(false);
        }
    };

    return (
        <>
            <AlertModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={onBulkDeactivate} loading={loading} />
            <div className="flex-col">
                <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
                    <div className="flex items-center justify-between">
                        <Heading title="Bulk Product Deactivation" description="Search for products or import a file to deactivate items." />
                        {stagedProducts.length > 0 && <Badge variant="destructive" className="text-sm">{stagedProducts.length} Products Staged</Badge>}
                    </div>
                    <Separator />

                    {/* --- UPDATED Search & Import Section --- */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Find Products to Deactivate</CardTitle>
                            <CardDescription>Search for items or import a file of barcodes.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input type="file" accept=".csv, .xlsx, .xls" ref={fileInputRef} onChange={handleFileImport} className="hidden"/>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative flex-1 min-w-[250px] max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search by name or barcode..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="pl-10" disabled={loading || importLoading} />
                                </div>
                                <Button onClick={handleSearch} disabled={searchLoading || loading || importLoading || !searchTerm.trim()}>
                                    {searchLoading ? "Searching..." : "Search"}
                                </Button>
                                <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={loading || searchLoading || importLoading}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    {importLoading ? "Importing..." : "Import File"}
                                </Button>
                                <Button variant="outline" onClick={handleDownloadTemplate} disabled={loading || searchLoading || importLoading}>
                                    <Download className="mr-2 h-4 w-4" /> Template
                                </Button>
                            </div>
                            
                            {showSearchResults && (
                                <div className="border rounded-lg mt-4">
                                    {searchLoading ? <div className="p-4 space-y-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div> : 
                                    searchResults.length > 0 ? (
                                        <div className="max-h-60 overflow-y-auto">
                                            {searchResults.map(product => (
                                                <div key={product.id} className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer border-b last:border-b-0" onClick={() => addProductToStage(product)}>
                                                    <div><div className="font-medium">{product.name}</div><div className="text-sm text-muted-foreground">{product.barCode}</div></div>
                                                    <Button size="sm" variant="ghost"><Plus className="h-4 w-4" /></Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center"><Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" /> <h3 className="font-semibold">No Products Found</h3></div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* --- Staged Products Section --- */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ShieldOff /> Products for Deactivation ({stagedProducts.length})</CardTitle>
                            <CardDescription>Review selected products before deactivating them.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {stagedProducts.length === 0 ? (
                                <div className="text-center py-12"><ShieldOff className="h-16 w-16 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-semibold">No Products Staged</h3><p className="text-muted-foreground">Search or import to begin.</p></div>
                            ) : (
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Product Details</TableHead><TableHead>Barcode</TableHead><TableHead>Category</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {stagedProducts.map(product => (
                                                <TableRow key={product.id}>
                                                    <TableCell><div><div className="font-medium">{product.name}</div><div className="text-sm text-muted-foreground">{product.size.name} • {product.color.name}</div></div></TableCell>
                                                    <TableCell><span className="font-mono text-sm">{product.barCode}</span></TableCell>
                                                    <TableCell><Badge variant="outline">{product.category.name}</Badge></TableCell>
                                                    <TableCell><Button variant="ghost" size="icon" onClick={() => removeProductFromStage(product.id)} disabled={loading}><Trash className="h-4 w-4" /></Button></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* --- Action Section --- */}
                    {stagedProducts.length > 0 && (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-destructive" />
                                        <span className="font-medium">{stagedProducts.length} products will be deactivated.</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button variant="outline" onClick={() => setStagedProducts([])} disabled={loading}>Clear All</Button>
                                        <Button variant="destructive" onClick={() => setIsConfirmModalOpen(true)} disabled={loading || stagedProducts.length === 0}>
                                            <ShieldX className="mr-2 h-4 w-4" />
                                            {loading ? "Deactivating..." : `Deactivate ${stagedProducts.length} Products`}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </>
    );
}