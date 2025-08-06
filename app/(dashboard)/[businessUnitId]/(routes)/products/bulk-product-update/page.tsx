"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Plus, Trash, Search, Package, Edit, CheckCircle, AlertCircle, X, Upload, Download } from "lucide-react";

import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { AlertModal } from "@/components/modals/alert-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// --- TYPES ---
type ProductWithDetails = {
    id: string;
    name: string;
    barCode: string;
    price: number;
    category: { name: string };
};

type ProductChanges = {
    name?: string;
    barCode?: string;
    price?: string;
};

type ImportedRow = {
    barcode?: string;
    name?: string;
    price?: string;
};

export default function BulkUpdateProductsPage() {
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
    const [changes, setChanges] = useState<Record<string, ProductChanges>>({});
    const [errors, setErrors] = useState<Record<string, Partial<Record<keyof ProductChanges, string>>>>({});
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);

    // --- NEW: TEMPLATE DOWNLOAD LOGIC ---
    const handleDownloadTemplate = () => {
        const csvContent = "barcode,name\n123456789,New T-Shirt Name";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", "bulk_update_template.csv");
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
                    }) as ImportedRow[];
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
        if (stagedProducts.some(p => p.id === product.id)) {
            toast({ title: "Product Already Staged" }); return;
        }
        setStagedProducts(prev => [...prev, product]);
        toast({ title: "Product Added" });
    };

    const removeProductFromStage = (productId: string) => {
        setStagedProducts(prev => prev.filter(p => p.id !== productId));
        setChanges(prev => { const c = { ...prev }; delete c[productId]; return c; });
        setErrors(prev => { const e = { ...prev }; delete e[productId]; return e; });
    };

    // --- DYNAMIC CHANGE AND VALIDATION LOGIC ---
    const handleFieldChange = (productId: string, field: keyof ProductChanges, value: string) => {
        setChanges(prev => ({ ...prev, [productId]: { ...prev[productId], [field]: value } }));
        let error: string | undefined;
        if (field === 'name' && value.trim() === '') error = "Name cannot be empty.";
        else if (field === 'price' && value !== '') {
            const numValue = parseFloat(value);
            if (isNaN(numValue) || numValue <= 0) error = "Must be a positive number.";
        }
        setErrors(prev => {
            const newErrors = { ...prev };
            if (!newErrors[productId]) newErrors[productId] = {};
            if (error) newErrors[productId][field] = error;
            else {
                delete newErrors[productId][field];
                if (Object.keys(newErrors[productId]!).length === 0) delete newErrors[productId];
            }
            return newErrors;
        });
    };
    
    // --- SUBMIT LOGIC ---
    const onBulkUpdate = async () => {
        setLoading(true);
        try {
            const payload = Object.entries(changes).map(([productId, changedFields]) => {
                const parsedFields: { id: string, [key: string]: any } = { id: productId };
                let hasValidChange = false;
                if (changedFields.name?.trim()) { parsedFields.name = changedFields.name.trim(); hasValidChange = true; }
                if (changedFields.barCode?.trim()) { parsedFields.barCode = changedFields.barCode.trim(); hasValidChange = true; }
                if (changedFields.price) {
                    const numPrice = parseFloat(changedFields.price);
                    if (!isNaN(numPrice) && numPrice > 0) { parsedFields.price = numPrice; hasValidChange = true; }
                }
                return hasValidChange ? parsedFields : null;
            }).filter(p => p !== null);

            if (payload.length === 0) {
                toast({ title: "No valid changes to save.", variant: "destructive" });
                setLoading(false);
                return;
            }
            await axios.patch(`/api/${params.storeId}/products/bulk-product-update`, { products: payload });
            toast({ title: "Update Successful" });
            setStagedProducts([]); setChanges({}); setErrors({});
        } catch (error) {
            toast({ title: "Update Failed", variant: "destructive" });
        } finally {
            setLoading(false);
            setIsConfirmModalOpen(false);
        }
    };

    const productsWithValidChanges = Object.keys(changes).filter(id => Object.values(changes[id]).some(val => val && val.trim() !== '') && !errors[id]).length;
    const hasErrors = Object.keys(errors).length > 0;

    return (
        <>
            <AlertModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={onBulkUpdate} loading={loading} />
            <div className="flex-col">
                <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
                    <Heading title="Bulk Product Update" description="Search, import, and efficiently update multiple fields for your products." />
                    <Separator />

                    {/* --- UPDATED Search & Import Section --- */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Find Products</CardTitle>
                            <CardDescription>Search for items, import a file with changes, or download a template.</CardDescription>
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

                    {/* --- Staged Products Editable Table --- */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Edit /> Product Updates ({stagedProducts.length})</CardTitle>
                            <CardDescription>Modify product details below. Only non-empty fields will be updated.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {stagedProducts.length === 0 ? (
                                <div className="text-center py-12"><Edit className="h-16 w-16 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-semibold">No Products Staged</h3><p className="text-muted-foreground">Search or import products to begin editing.</p></div>
                            ) : (
                                <div className="border rounded-lg overflow-x-auto">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Name</TableHead><TableHead>Barcode</TableHead><TableHead>Price</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {stagedProducts.map(product => {
                                                const productChanges = changes[product.id] || {};
                                                const productErrors = errors[product.id] || {};
                                                return (
                                                    <TableRow key={product.id}>
                                                        <TableCell className="font-medium"><div>{product.name}</div><div className="text-xs text-muted-foreground">{product.barCode}</div></TableCell>
                                                        <TableCell><Input placeholder={product.name} value={productChanges.name ?? ''} onChange={(e) => handleFieldChange(product.id, 'name', e.target.value)} className={cn(productErrors.name && "border-destructive")} disabled={loading} /></TableCell>
                                                        <TableCell><Input placeholder={product.barCode} value={productChanges.barCode ?? ''} onChange={(e) => handleFieldChange(product.id, 'barCode', e.target.value)} disabled={loading} /></TableCell>
                                                        <TableCell><Input placeholder={product.price.toFixed(2)} value={productChanges.price ?? ''} onChange={(e) => handleFieldChange(product.id, 'price', e.target.value)} className={cn("font-mono", productErrors.price && "border-destructive")} disabled={loading} /></TableCell>
                                                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeProductFromStage(product.id)} disabled={loading}><Trash className="h-4 w-4" /></Button></TableCell>
                                                    </TableRow>
                                                );
                                            })}
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
                                        {hasErrors ? <AlertCircle className="h-5 w-5 text-destructive" /> : <CheckCircle className="h-5 w-5 text-green-600" />}
                                        <span className="font-medium">{hasErrors ? `${Object.keys(errors).length} products have errors` : `${productsWithValidChanges} products ready`}</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button variant="outline" onClick={() => { setStagedProducts([]); setChanges({}); setErrors({}); }} disabled={loading}>Clear All</Button>
                                        <Button onClick={() => setIsConfirmModalOpen(true)} disabled={loading || productsWithValidChanges === 0 || hasErrors}>
                                            {loading ? "Updating..." : `Update ${productsWithValidChanges} Products`}
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